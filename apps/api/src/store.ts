import { createHash } from 'node:crypto';
import { transaction, type DB, type Tx } from '@tribe/db';
import {
  assertCapacity,
  includesTier,
  tiers,
  type Tier,
  type Profile,
  type Connection,
  type Post,
} from '@tribe/domain';
import { HttpError, deny } from './security.js';
type Query = DB | Tx;
export const profile = (r: Record<string, any>): Profile => ({
  id: r.id,
  did: r.did,
  handle: r.handle,
  displayName: r.display_name,
  avatarUrl: r.avatar_url,
  bio: r.bio,
  onboarded: r.onboarded,
});
// Every private surface uses this predicate; blocking denies in both directions.
export const visibility = `p.deleted_at IS NULL AND a.active AND (p.author_id=$1 OR EXISTS (SELECT 1 FROM post_grants g WHERE g.post_id=p.id AND g.recipient_did=$2 AND g.revoked_at IS NULL)) AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.owner_id=$1 AND b.target_did=a.did) OR (b.owner_id=a.id AND b.target_did=$2))`;
export class Store {
  constructor(public db: DB) {}
  async user(id: string, q: Query = this.db) {
    const r = await q.query('SELECT * FROM users WHERE id=$1 AND active', [id]);
    if (!r.rows[0]) throw new HttpError(401, 'Please sign in again.');
    return profile(r.rows[0]);
  }
  async upsertIdentity(
    did: string,
    handle: string,
    displayName: string,
    avatarUrl: string | null,
    q: Query = this.db,
  ) {
    const r = await q.query(
      `INSERT INTO users (did,handle,display_name,avatar_url) VALUES ($1,$2,$3,$4) ON CONFLICT (did) DO UPDATE SET handle=CASE WHEN excluded.handle=excluded.did THEN users.handle ELSE excluded.handle END,avatar_url=coalesce(excluded.avatar_url,users.avatar_url) WHERE users.active RETURNING *`,
      [did, handle, displayName, avatarUrl],
    );
    if (!r.rows[0]) throw new HttpError(403, 'This account has been deleted.');
    return profile(r.rows[0]);
  }
  async connections(owner: string, q: Query = this.db): Promise<Connection[]> {
    const r = await q.query(
      `SELECT c.*,u.handle,u.display_name,u.avatar_url,coalesce(u.active,false) AS joined FROM connections c LEFT JOIN users u ON u.did=c.target_did WHERE c.owner_id=$1 ORDER BY array_position(ARRAY['inner','close','tribe','village'],c.tier),c.created_at`,
      [owner],
    );
    return r.rows.map((r) => ({
      did: r.target_did,
      tier: r.tier,
      handle: r.handle ?? r.target_did,
      displayName: r.display_name ?? 'Not on Tribe yet',
      avatarUrl: r.avatar_url ?? null,
      joined: r.joined,
    }));
  }
  async setConnection(owner: string, did: string, tier: Tier) {
    return transaction(this.db, async (q) => {
      const u = await q.query('SELECT * FROM users WHERE id=$1 AND active FOR UPDATE', [owner]);
      if (!u.rows[0]) throw new HttpError(401, 'Please sign in again.');
      if (u.rows[0].did === did) throw new HttpError(400, 'Your circles are for other people.');
      const blocked = await q.query(
        `SELECT 1 FROM blocks b JOIN users u ON u.id=b.owner_id WHERE (b.owner_id=$1 AND b.target_did=$2) OR (u.did=$2 AND b.target_did=$3)`,
        [owner, did, u.rows[0].did],
      );
      if (blocked.rowCount) throw new HttpError(409, 'This connection is unavailable.');
      const list = (await this.connections(owner, q)).filter((c) => c.did !== did);
      try {
        assertCapacity([...list, { tier }]);
      } catch (e) {
        throw new HttpError(409, (e as Error).message);
      }
      await q.query(
        'INSERT INTO connections (owner_id,target_did,tier) VALUES ($1,$2,$3) ON CONFLICT (owner_id,target_did) DO UPDATE SET tier=excluded.tier',
        [owner, did, tier],
      );
      await q.query('UPDATE users SET graph_version=graph_version+1 WHERE id=$1', [owner]);
      return this.connections(owner, q);
    });
  }
  async removeConnection(owner: string, did: string) {
    await transaction(this.db, async (q) => {
      await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [owner]);
      await q.query('DELETE FROM connections WHERE owner_id=$1 AND target_did=$2', [owner, did]);
      await q.query(
        'UPDATE post_grants SET revoked_at=now() WHERE recipient_did=$2 AND post_id IN (SELECT id FROM posts WHERE author_id=$1) AND revoked_at IS NULL',
        [owner, did],
      );
      await q.query('UPDATE users SET graph_version=graph_version+1 WHERE id=$1', [owner]);
    });
  }
  async preview(owner: string, tier: Tier, q: Query = this.db) {
    const u = await this.user(owner, q);
    const list = (await this.connections(owner, q)).filter(
      (c) => c.joined && includesTier(tier, c.tier),
    );
    const blocked = await q.query(
      `SELECT b.target_did AS did FROM blocks b WHERE b.owner_id=$1 UNION SELECT u.did FROM blocks b JOIN users u ON u.id=b.owner_id WHERE b.target_did=$2`,
      [owner, u.did],
    );
    const denied = new Set(blocked.rows.map((r) => r.did));
    const recipients = list.filter((c) => !denied.has(c.did));
    const version = createHash('sha256')
      .update(JSON.stringify({ tier, dids: recipients.map((c) => c.did).sort() }))
      .digest('hex');
    return { version, recipients };
  }
  async createPost(
    owner: string,
    input: {
      body: string;
      tier: Tier;
      previewVersion: string;
      mediaIds: string[];
      idempotencyKey: string;
    },
  ) {
    return transaction(this.db, async (q) => {
      await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [owner]);
      const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
      const old = await q.query(
        'SELECT id,request_hash FROM posts WHERE author_id=$1 AND idempotency_key=$2',
        [owner, input.idempotencyKey],
      );
      if (old.rows[0]) {
        if (old.rows[0].request_hash !== requestHash)
          throw new HttpError(409, 'This retry belongs to a different moment.');
        return old.rows[0].id as string;
      }
      const preview = await this.preview(owner, input.tier, q);
      if (preview.version !== input.previewVersion)
        throw new HttpError(409, 'Your audience changed. Review the names before sharing.');
      if (!preview.recipients.length)
        throw new HttpError(400, 'Add someone who has joined Tribe before sharing.');
      if (new Set(input.mediaIds).size !== input.mediaIds.length)
        throw new HttpError(400, 'Choose each photo once.');
      if (input.mediaIds.length) {
        const assets = await q.query(
          'SELECT id FROM media WHERE id=ANY($1::uuid[]) AND owner_id=$2 AND post_id IS NULL FOR UPDATE',
          [input.mediaIds, owner],
        );
        if (assets.rowCount !== input.mediaIds.length)
          throw new HttpError(400, 'One of your photos is unavailable.');
      }
      const r = await q.query(
        'INSERT INTO posts (author_id,body,tier,preview_version,idempotency_key,request_hash) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [owner, input.body, input.tier, input.previewVersion, input.idempotencyKey, requestHash],
      );
      const id = r.rows[0].id as string;
      await q.query(
        'INSERT INTO post_grants (post_id,recipient_did) SELECT $1,unnest($2::text[])',
        [id, preview.recipients.map((c) => c.did)],
      );
      await q.query('UPDATE media SET post_id=$1 WHERE id=ANY($2::uuid[])', [id, input.mediaIds]);
      return id;
    });
  }
  async allowed(viewer: string, postId: string, q: Query = this.db, lock = false) {
    const u = await this.user(viewer, q);
    const r = await q.query(
      `SELECT p.*,a.did AS author_did FROM posts p JOIN users a ON a.id=p.author_id WHERE p.id=$3 AND ${visibility} ${lock ? 'FOR UPDATE OF p' : ''}`,
      [viewer, u.did, postId],
    );
    if (!r.rows[0]) deny();
    return r.rows[0];
  }
  async post(viewer: string, id: string): Promise<Post> {
    await this.allowed(viewer, id);
    const u = await this.user(viewer);
    const r = await this.db.query(
      `SELECT p.*,row_to_json(a) AS author,(SELECT count(*)::int FROM comments c WHERE c.post_id=p.id AND c.deleted_at IS NULL) AS comment_count,(SELECT count(*)::int FROM reactions r WHERE r.post_id=p.id) AS reaction_count,EXISTS(SELECT 1 FROM reactions r WHERE r.post_id=p.id AND r.author_id=$1) AS reacted FROM posts p JOIN users a ON a.id=p.author_id WHERE p.id=$3 AND ${visibility}`,
      [viewer, u.did, id],
    );
    if (!r.rows[0]) deny();
    const row = r.rows[0];
    const media = await this.db.query(
      'SELECT id,alt,width,height FROM media WHERE post_id=$1 ORDER BY created_at,id',
      [id],
    );
    return {
      id: row.id,
      body: row.body,
      createdAt: row.created_at.toISOString(),
      author: profile(row.author),
      media: media.rows,
      commentCount: row.comment_count,
      reactionCount: row.reaction_count,
      reacted: row.reacted,
    };
  }
  async feed(
    viewer: string,
    tier: Tier | undefined,
    watermark: string,
    cursor?: { time: string; id: string },
  ) {
    const u = await this.user(viewer);
    const r = await this.db.query(
      `SELECT p.id,p.created_at FROM posts p JOIN users a ON a.id=p.author_id WHERE ${visibility} AND p.created_at<=$3 AND NOT EXISTS(SELECT 1 FROM mutes m WHERE m.owner_id=$1 AND m.target_did=a.did) AND ($4::text IS NULL OR p.author_id=$1 OR EXISTS(SELECT 1 FROM connections c WHERE c.owner_id=$1 AND c.target_did=a.did AND array_position(ARRAY['inner','close','tribe','village'],c.tier)<=array_position(ARRAY['inner','close','tribe','village'],$4))) AND ($5::timestamptz IS NULL OR (p.created_at,p.id)<($5::timestamptz,$6::uuid)) ORDER BY p.created_at DESC,p.id DESC LIMIT 21`,
      [viewer, u.did, watermark, tier ?? null, cursor?.time ?? null, cursor?.id ?? null],
    );
    const page = r.rows.slice(0, 20);
    const items: Post[] = [];
    for (const row of page) {
      try {
        items.push(await this.post(viewer, row.id));
      } catch (e) {
        if (!(e instanceof HttpError && e.status === 404)) throw e;
      }
    }
    const last = page.at(-1);
    return {
      items,
      watermark,
      cursor:
        r.rows.length > 20 && last
          ? Buffer.from(
              JSON.stringify({ time: last.created_at.toISOString(), id: last.id }),
            ).toString('base64url')
          : null,
    };
  }
  async comments(viewer: string, id: string) {
    await this.allowed(viewer, id);
    const rows = await this.db.query(
      'SELECT c.*,row_to_json(u) AS author FROM comments c JOIN users u ON u.id=c.author_id WHERE c.post_id=$1 AND c.deleted_at IS NULL AND u.active AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.owner_id=$2 AND b.target_did=u.did) OR (b.owner_id=u.id AND b.target_did=$3)) ORDER BY c.created_at,c.id',
      [id, viewer, (await this.user(viewer)).did],
    );
    return rows.rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at.toISOString(),
      author: profile(r.author),
    }));
  }
  async interact(viewer: string, id: string, kind: 'comment' | 'reaction', body?: string) {
    return transaction(this.db, async (q) => {
      const p = await this.allowed(viewer, id, q, true);
      if (kind === 'comment')
        await q.query('INSERT INTO comments (post_id,author_id,body) VALUES ($1,$2,$3)', [
          id,
          viewer,
          body,
        ]);
      else {
        const removed = await q.query(
          'DELETE FROM reactions WHERE post_id=$1 AND author_id=$2 RETURNING author_id',
          [id, viewer],
        );
        if (removed.rowCount) return;
        await q.query('INSERT INTO reactions (post_id,author_id) VALUES ($1,$2)', [id, viewer]);
      }
      if (p.author_id !== viewer) {
        const r = await q.query(
          'INSERT INTO activity (recipient_id,actor_id,post_id,kind) VALUES ($1,$2,$3,$4) RETURNING id',
          [p.author_id, viewer, id, kind],
        );
        await q.query('INSERT INTO outbox (activity_id) VALUES ($1)', [r.rows[0].id]);
      }
    });
  }
  async block(owner: string, did: string) {
    await transaction(this.db, async (q) => {
      const u = await this.user(owner, q);
      if (u.did === did) throw new HttpError(400, 'Choose another account.');
      await q.query('SELECT id FROM users WHERE id=$1 OR did=$2 ORDER BY id FOR UPDATE', [
        owner,
        did,
      ]);
      await q.query(
        'INSERT INTO blocks (owner_id,target_did) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [owner, did],
      );
      await q.query(
        `UPDATE post_grants SET revoked_at=now() WHERE revoked_at IS NULL AND ((recipient_did=$2 AND post_id IN (SELECT id FROM posts WHERE author_id=$1)) OR (recipient_did=$3 AND post_id IN (SELECT p.id FROM posts p JOIN users u ON u.id=p.author_id WHERE u.did=$2)))`,
        [owner, did, u.did],
      );
      await q.query(
        `DELETE FROM connections WHERE (owner_id=$1 AND target_did=$2) OR (target_did=$3 AND owner_id IN (SELECT id FROM users WHERE did=$2))`,
        [owner, did, u.did],
      );
      await q.query('UPDATE users SET graph_version=graph_version+1 WHERE id=$1 OR did=$2', [
        owner,
        did,
      ]);
    });
  }
  async activity(viewer: string) {
    const u = await this.user(viewer);
    const r = await this.db.query(
      `SELECT n.*,row_to_json(actor) AS actor FROM activity n JOIN posts p ON p.id=n.post_id JOIN users a ON a.id=p.author_id JOIN users actor ON actor.id=n.actor_id WHERE n.recipient_id=$1 AND actor.active AND ${visibility} AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.owner_id=$1 AND b.target_did=actor.did) OR (b.owner_id=actor.id AND b.target_did=$2)) ORDER BY n.created_at DESC LIMIT 100`,
      [viewer, u.did],
    );
    return r.rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      postId: r.post_id,
      read: r.read,
      createdAt: r.created_at.toISOString(),
      actor: profile(r.actor),
    }));
  }
  async export(viewer: string) {
    const u = await this.user(viewer);
    const owned = await this.db.query(
      'SELECT id FROM posts WHERE author_id=$1 AND deleted_at IS NULL ORDER BY created_at',
      [viewer],
    );
    const posts = [];
    for (const p of owned.rows) posts.push(await this.post(viewer, p.id));
    const comments = await this.db.query(
      'SELECT id,post_id,body,created_at FROM comments WHERE author_id=$1 AND deleted_at IS NULL',
      [viewer],
    );
    return {
      format: 'tribe-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: u,
      connections: await this.connections(viewer),
      posts: posts.map((p) => ({
        ...p,
        commentCount: undefined,
        reactionCount: undefined,
        reacted: undefined,
      })),
      comments: comments.rows,
    };
  }
  async deleteAccount(viewer: string) {
    await transaction(this.db, async (q) => {
      const u = await this.user(viewer, q);
      await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [viewer]);
      await q.query(
        "UPDATE users SET active=false,did='deleted:'||id::text,handle='deleted',display_name='Deleted account',avatar_url=NULL,bio='',push_token=NULL,notifications=false WHERE id=$1",
        [viewer],
      );
      await q.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1', [viewer]);
      await q.query("UPDATE posts SET deleted_at=now(),body='' WHERE author_id=$1", [viewer]);
      await q.query("UPDATE comments SET deleted_at=now(),body='' WHERE author_id=$1", [viewer]);
      await q.query(
        'DELETE FROM post_grants WHERE recipient_did=$1 OR post_id IN (SELECT id FROM posts WHERE author_id=$2)',
        [u.did, viewer],
      );
      await q.query(
        'DELETE FROM refresh_history WHERE session_id IN (SELECT id FROM sessions WHERE user_id=$1)',
        [viewer],
      );
      await q.query('DELETE FROM sessions WHERE user_id=$1', [viewer]);
      await q.query('DELETE FROM blocks WHERE owner_id=$1 OR target_did=$2', [viewer, u.did]);
      await q.query('DELETE FROM mutes WHERE owner_id=$1 OR target_did=$2', [viewer, u.did]);
      await q.query('DELETE FROM reactions WHERE author_id=$1', [viewer]);
      await q.query('DELETE FROM connections WHERE owner_id=$1 OR target_did=$2', [viewer, u.did]);
      await q.query('DELETE FROM auth_data WHERE key=$1', ['session:' + u.did]);
      await q.query('DELETE FROM login_transactions WHERE did=$1', [u.did]);
      await q.query('DELETE FROM invitations WHERE owner_id=$1', [viewer]);
    });
  }
}
