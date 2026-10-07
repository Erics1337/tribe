import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { z, ZodError } from 'zod';
import { BskyAgent } from '@atproto/api';
import { transaction, type DB } from '@tribe/db';
import {
  connectionSchema,
  postSchema,
  commentSchema,
  loginSchema,
  redeemSchema,
  didSchema,
  tierSchema,
} from '@tribe/domain';
import { config, type Config } from './config.js';
import { Store, profile } from './store.js';
import { createOAuth } from './oauth.js';
import { MediaStorage } from './media.js';
import { hash, token, issueSession, HttpError, deny } from './security.js';
declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    sessionId: string;
  }
}
export async function createServer(db: DB, c: Config = config()) {
  const app = Fastify({
    bodyLimit: 10 * 1024 * 1024,
    logger: {
      level: c.NODE_ENV === 'test' ? 'silent' : 'info',
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
      serializers: {
        req: (r) => ({ method: r.method, path: r.url?.split('?')[0], remoteAddress: r.ip }),
      },
    },
  });
  const store = new Store(db),
    storage = new MediaStorage(c);
  const oauth = await createOAuth(db, c);
  const directory = new BskyAgent({ service: 'https://public.api.bsky.app' });
  await app.register(cors, {
    origin: new URL(c.WEB_URL).origin,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Photo-Alt'],
  });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
    hook: 'preHandler',
    keyGenerator: (req) => req.userId || req.ip,
  });
  app.decorateRequest('userId', '');
  app.decorateRequest('sessionId', '');
  app.addContentTypeParser(
    ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    { parseAs: 'buffer' },
    (_req, body, done) => done(null, body),
  );
  app.addHook('onRequest', async (req, reply) => {
    reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer');
    const path = req.url.split('?')[0]!;
    if (
      req.method === 'OPTIONS' ||
      [
        '/health',
        '/ready',
        '/oauth-client-metadata.json',
        '/jwks.json',
        '/auth/start',
        '/auth/callback',
        '/auth/redeem',
        '/auth/refresh',
      ].includes(path)
    )
      return;
    const value = req.headers.authorization?.replace(/^Bearer /, '');
    if (!value) throw new HttpError(401, 'Please sign in.');
    const r = await db.query(
      'SELECT s.id,s.user_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.access_hash=$1 AND s.access_expires>now() AND s.revoked_at IS NULL AND u.active',
      [hash(value)],
    );
    if (!r.rows[0]) throw new HttpError(401, 'Please sign in again.');
    req.userId = r.rows[0].user_id;
    req.sessionId = r.rows[0].id;
  });
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError)
      return reply.code(400).send({
        message: 'Check the information and try again.',
        issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
      });
    if (err instanceof HttpError) return reply.code(err.status).send({ message: err.message });
    if ((err as any).statusCode && (err as any).statusCode < 500)
      return reply.code((err as any).statusCode).send({ message: (err as Error).message });
    req.log.error({ name: (err as Error).name, code: (err as any).code }, 'Request failed');
    return reply.code(500).send({ message: 'Something went wrong. Please try again.' });
  });
  app.get('/health', () => ({ ok: true }));
  app.get('/ready', async () => {
    await db.query('SELECT 1');
    return { ok: true };
  });
  app.get('/oauth-client-metadata.json', () => oauth.client.clientMetadata);
  app.get('/jwks.json', () => oauth.client.jwks);
  app.post(
    '/auth/start',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req) => {
      const p = loginSchema.parse(req.body);
      return oauth.start(p.handle, p.challenge, p.platform);
    },
  );
  app.get('/auth/callback', async (req, reply) =>
    reply.redirect(await oauth.callback(new URLSearchParams(req.url.split('?')[1]))),
  );
  app.post('/auth/redeem', async (req) => {
    const p = redeemSchema.parse(req.body);
    return oauth.redeem(p.code, p.verifier);
  });
  app.post('/auth/refresh', async (req, reply) => {
    const p = z.object({ refreshToken: z.string().min(30).max(100) }).parse(req.body);
    const h = hash(p.refreshToken);
    const result = await transaction(db, async (q) => {
      const r = await q.query(
        'SELECT * FROM sessions WHERE refresh_hash=$1 AND revoked_at IS NULL AND refresh_expires>now() FOR UPDATE',
        [h],
      );
      if (!r.rows[0]) {
        const old = await q.query('SELECT session_id FROM refresh_history WHERE hash=$1', [h]);
        if (old.rows[0])
          await q.query('UPDATE sessions SET revoked_at=now() WHERE id=$1', [
            old.rows[0].session_id,
          ]);
        return null;
      }
      const s = r.rows[0];
      const active = await q.query('SELECT 1 FROM users WHERE id=$1 AND active', [s.user_id]);
      if (!active.rowCount) return null;
      const accessToken = token(),
        refreshToken = token();
      await q.query('INSERT INTO refresh_history (hash,session_id) VALUES ($1,$2)', [h, s.id]);
      await q.query(
        "UPDATE sessions SET access_hash=$2,access_expires=now()+interval '15 minutes',refresh_hash=$3 WHERE id=$1",
        [s.id, hash(accessToken), hash(refreshToken)],
      );
      return { accessToken, refreshToken, sessionId: s.id };
    });
    if (!result) return reply.code(401).send({ message: 'Please sign in again.' });
    return result;
  });
  app.post('/auth/logout', async (req) => {
    await db.query('UPDATE sessions SET revoked_at=now() WHERE id=$1', [req.sessionId]);
    return { ok: true };
  });
  app.get('/me', async (req) => {
    const u = await db.query('SELECT * FROM users WHERE id=$1', [req.userId]);
    return {
      ...profile(u.rows[0]),
      notifications: u.rows[0].notifications,
      quietStart: u.rows[0].quiet_start,
      quietEnd: u.rows[0].quiet_end,
      timezone: u.rows[0].timezone,
    };
  });
  app.patch('/me', async (req) => {
    const p = z
      .object({
        displayName: z.string().trim().min(1).max(80).optional(),
        bio: z.string().max(500).optional(),
        onboarded: z.boolean().optional(),
        notifications: z.boolean().optional(),
        pushToken: z
          .string()
          .regex(/^(Exponent|Expo)PushToken\[[A-Za-z0-9_-]+\]$/)
          .nullable()
          .optional(),
        quietStart: z.number().int().min(0).max(23).optional(),
        quietEnd: z.number().int().min(0).max(23).optional(),
        timezone: z
          .string()
          .max(80)
          .refine((v) => {
            try {
              new Intl.DateTimeFormat('en', { timeZone: v });
              return true;
            } catch {
              return false;
            }
          })
          .optional(),
      })
      .parse(req.body);
    await db.query(
      'UPDATE users SET display_name=coalesce($2,display_name),bio=coalesce($3,bio),onboarded=coalesce($4,onboarded),notifications=coalesce($5,notifications),push_token=CASE WHEN $6 THEN $7 ELSE push_token END,quiet_start=coalesce($8,quiet_start),quiet_end=coalesce($9,quiet_end),timezone=coalesce($10,timezone) WHERE id=$1',
      [
        req.userId,
        p.displayName ?? null,
        p.bio ?? null,
        p.onboarded ?? null,
        p.notifications ?? null,
        'pushToken' in p,
        p.pushToken ?? null,
        p.quietStart ?? null,
        p.quietEnd ?? null,
        p.timezone ?? null,
      ],
    );
    return store.user(req.userId);
  });
  app.get(
    '/me/sessions',
    async (req) =>
      (
        await db.query(
          'SELECT id,created_at FROM sessions WHERE user_id=$1 AND revoked_at IS NULL AND refresh_expires>now() ORDER BY created_at DESC',
          [req.userId],
        )
      ).rows,
  );
  app.delete('/me/sessions/:id', async (req) => {
    const id = z.uuid().parse((req.params as any).id);
    await db.query('UPDATE sessions SET revoked_at=now() WHERE id=$1 AND user_id=$2', [
      id,
      req.userId,
    ]);
    return { ok: true };
  });
  app.get('/me/export', async (req) => store.export(req.userId));
  app.get('/me/export/media/:id', async (req, reply) => {
    const id = z.uuid().parse((req.params as any).id);
    const r = await db.query(
      'SELECT m.object_key FROM media m JOIN posts p ON p.id=m.post_id WHERE m.id=$1 AND m.owner_id=$2 AND p.deleted_at IS NULL',
      [id, req.userId],
    );
    if (!r.rows[0]) deny();
    return reply.type('image/jpeg').send(await storage.get(r.rows[0].object_key));
  });
  app.delete('/me', async (req) => {
    await store.deleteAccount(req.userId);
    return { ok: true };
  });
  app.get('/connections', (req) => store.connections(req.userId));
  app.put('/connections', async (req) => {
    const p = connectionSchema.parse(req.body);
    return store.setConnection(req.userId, p.did, p.tier);
  });
  app.delete('/connections/:did', async (req) => {
    await store.removeConnection(req.userId, didSchema.parse((req.params as any).did));
    return { ok: true };
  });
  app.get('/audience', async (req) => {
    const { tier } = z.object({ tier: tierSchema }).parse(req.query);
    return store.preview(req.userId, tier);
  });
  app.get('/feed', async (req) => {
    const p = z
      .object({
        tier: tierSchema.optional(),
        watermark: z.iso.datetime().optional(),
        cursor: z.string().max(300).optional(),
      })
      .parse(req.query);
    let cursor;
    try {
      cursor = p.cursor
        ? z
            .object({ time: z.iso.datetime(), id: z.uuid() })
            .parse(JSON.parse(Buffer.from(p.cursor, 'base64url').toString()))
        : undefined;
    } catch {
      throw new HttpError(400, 'This feed page is invalid.');
    }
    return store.feed(req.userId, p.tier, p.watermark ?? new Date().toISOString(), cursor);
  });
  app.post('/posts', async (req) => {
    const id = await store.createPost(req.userId, postSchema.parse(req.body));
    return store.post(req.userId, id);
  });
  app.get('/posts/:id', (req) => store.post(req.userId, z.uuid().parse((req.params as any).id)));
  app.delete('/posts/:id', async (req) => {
    const id = z.uuid().parse((req.params as any).id);
    const r = await db.query(
      'UPDATE posts SET deleted_at=now() WHERE id=$1 AND author_id=$2 RETURNING id',
      [id, req.userId],
    );
    if (!r.rowCount) deny();
    return { ok: true };
  });
  app.get('/posts/:id/comments', (req) =>
    store.comments(req.userId, z.uuid().parse((req.params as any).id)),
  );
  app.post('/posts/:id/comments', async (req) => {
    await store.interact(
      req.userId,
      z.uuid().parse((req.params as any).id),
      'comment',
      commentSchema.parse(req.body).body,
    );
    return { ok: true };
  });
  app.delete('/comments/:id', async (req) => {
    const id = z.uuid().parse((req.params as any).id);
    const r = await db.query('SELECT post_id FROM comments WHERE id=$1 AND author_id=$2', [
      id,
      req.userId,
    ]);
    if (!r.rows[0]) deny();
    await store.allowed(req.userId, r.rows[0].post_id);
    await db.query('UPDATE comments SET deleted_at=now() WHERE id=$1', [id]);
    return { ok: true };
  });
  app.post('/posts/:id/reaction', async (req) => {
    await store.interact(req.userId, z.uuid().parse((req.params as any).id), 'reaction');
    return { ok: true };
  });
  app.post('/media', async (req) => {
    if (!Buffer.isBuffer(req.body)) throw new HttpError(400, 'Upload a photo file.');
    let alt = '';
    try {
      alt = decodeURIComponent(String(req.headers['x-photo-alt'] ?? ''));
    } catch {
      throw new HttpError(400, 'Invalid photo description.');
    }
    if (alt.length > 500) throw new HttpError(400, 'Photo description is too long.');
    return storage.upload(db, req.userId, req.body, alt);
  });
  app.get('/media/:id', async (req, reply) => {
    const id = z.uuid().parse((req.params as any).id);
    const r = await db.query('SELECT * FROM media WHERE id=$1', [id]);
    const m = r.rows[0];
    if (!m) deny();
    if (m.post_id) await store.allowed(req.userId, m.post_id);
    else if (m.owner_id !== req.userId) deny();
    return reply.type('image/jpeg').send(await storage.get(m.object_key));
  });
  app.get('/safety', async (req) => ({
    blocks: (await db.query('SELECT target_did AS did FROM blocks WHERE owner_id=$1', [req.userId]))
      .rows,
    mutes: (await db.query('SELECT target_did AS did FROM mutes WHERE owner_id=$1', [req.userId]))
      .rows,
  }));
  app.post('/blocks', async (req) => {
    const { did } = z.object({ did: didSchema }).parse(req.body);
    await store.block(req.userId, did);
    return { ok: true };
  });
  app.delete('/blocks/:did', async (req) => {
    await db.query('DELETE FROM blocks WHERE owner_id=$1 AND target_did=$2', [
      req.userId,
      didSchema.parse((req.params as any).did),
    ]);
    return { ok: true };
  });
  app.post('/mutes', async (req) => {
    const { did } = z.object({ did: didSchema }).parse(req.body);
    await db.query(
      'INSERT INTO mutes (owner_id,target_did) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.userId, did],
    );
    return { ok: true };
  });
  app.delete('/mutes/:did', async (req) => {
    await db.query('DELETE FROM mutes WHERE owner_id=$1 AND target_did=$2', [
      req.userId,
      didSchema.parse((req.params as any).did),
    ]);
    return { ok: true };
  });
  app.get('/activity', (req) => store.activity(req.userId));
  app.post('/activity/read', async (req) => {
    await db.query('UPDATE activity SET read=true WHERE recipient_id=$1', [req.userId]);
    return { ok: true };
  });
  app.post('/reports', { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (req) => {
    const p = z
      .object({ postId: z.uuid(), reason: z.string().trim().min(3).max(1000) })
      .parse(req.body);
    const copied: string[] = [];
    try {
      await transaction(db, async (q) => {
        await q.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          'report:' + req.userId + ':' + p.postId,
        ]);
        await store.allowed(req.userId, p.postId, q, true);
        const old = await q.query(
          "SELECT id FROM reports WHERE reporter_id=$1 AND post_id=$2 AND status='open'",
          [req.userId, p.postId],
        );
        if (old.rowCount) return;
        const evidence = await store.post(req.userId, p.postId),
          id = randomUUID();
        const assets = [];
        for (const asset of evidence.media) {
          const original = await q.query(
            'SELECT object_key FROM media WHERE id=$1 AND post_id=$2',
            [asset.id, p.postId],
          );
          if (!original.rows[0])
            throw new HttpError(409, 'This photo changed. Please try reporting again.');
          const evidenceKey = 'report-' + id + '-' + asset.id + '.jpg';
          await storage.put(evidenceKey, await storage.get(original.rows[0].object_key));
          copied.push(evidenceKey);
          assets.push({ ...asset, evidenceKey });
        }
        await q.query(
          'INSERT INTO reports(id,reporter_id,post_id,reason,evidence) VALUES($1,$2,$3,$4,$5)',
          [id, req.userId, p.postId, p.reason, JSON.stringify({ ...evidence, media: assets })],
        );
      });
    } catch (e) {
      for (const key of copied) await storage.remove(key);
      throw e;
    }
    return { ok: true };
  });
  const staff = async (id: string) => {
    const u = await store.user(id);
    if (!c.ADMIN_DIDS.split(',').includes(u.did))
      throw new HttpError(403, 'Staff access required.');
    return u;
  };
  app.get('/admin/reports', async (req) => {
    const u = await staff(req.userId);
    await db.query(
      "INSERT INTO audit (actor_did,action,target_id) VALUES ($1,'read_reports','reports')",
      [u.did],
    );
    return (
      await db.query(
        'SELECT id,post_id,reason,status,created_at,evidence FROM reports ORDER BY created_at DESC LIMIT 100',
      )
    ).rows;
  });
  app.get('/admin/reports/:id/media/:asset', async (req, reply) => {
    const u = await staff(req.userId),
      id = z.uuid().parse((req.params as any).id),
      asset = z.uuid().parse((req.params as any).asset);
    const r = await db.query('SELECT evidence FROM reports WHERE id=$1', [id]);
    const photo = r.rows[0]?.evidence.media?.find((m: any) => m.id === asset);
    if (!photo?.evidenceKey) deny();
    await db.query(
      "INSERT INTO audit(actor_did,action,target_id) VALUES($1,'read_report_photo',$2)",
      [u.did, id],
    );
    return reply.type('image/jpeg').send(await storage.get(photo.evidenceKey));
  });
  app.post('/admin/reports/:id', async (req) => {
    const u = await staff(req.userId);
    const id = z.uuid().parse((req.params as any).id);
    const p = z.object({ action: z.enum(['dismiss', 'takedown']) }).parse(req.body);
    await transaction(db, async (q) => {
      const r = await q.query('SELECT post_id FROM reports WHERE id=$1 FOR UPDATE', [id]);
      if (!r.rows[0]) deny();
      await q.query('UPDATE reports SET status=$2 WHERE id=$1', [id, p.action]);
      if (p.action === 'takedown')
        await q.query('UPDATE posts SET deleted_at=now() WHERE id=$1', [r.rows[0].post_id]);
      await q.query('INSERT INTO audit (actor_did,action,target_id) VALUES ($1,$2,$3)', [
        u.did,
        p.action,
        id,
      ]);
    });
    return { ok: true };
  });
  app.post('/invitations', async (req) => {
    const raw = token();
    await db.query(
      "INSERT INTO invitations (hash,owner_id,expires_at) VALUES ($1,$2,now()+interval '7 days')",
      [hash(raw), req.userId],
    );
    return { url: c.WEB_URL + '/invite?token=' + raw };
  });
  app.post('/invitations/accept', async (req) => {
    const p = z.object({ token: z.string().min(30).max(100) }).parse(req.body);
    const r = await db.query(
      'UPDATE invitations SET accepted_by=$2 WHERE hash=$1 AND expires_at>now() AND accepted_by IS NULL AND owner_id<>$2 RETURNING owner_id',
      [hash(p.token), req.userId],
    );
    if (!r.rows[0]) throw new HttpError(400, 'This invitation is unavailable.');
    return {
      inviter: await store.user(r.rows[0].owner_id),
      message: 'Choose a circle when you are ready. No older posts are shared.',
    };
  });
  app.get('/network/search', async (req) => {
    const p = z.object({ q: z.string().trim().min(1).max(253) }).parse(req.query);
    try {
      const r = await directory.searchActorsTypeahead({ q: p.q, limit: 10 });
      return r.data.actors.map((a) => ({
        did: a.did,
        handle: a.handle,
        displayName: a.displayName ?? a.handle,
        avatarUrl: a.avatar ?? null,
      }));
    } catch {
      throw new HttpError(503, 'The public network is temporarily unavailable.');
    }
  });
  app.get('/network/posts', async (req) => {
    const p = z.object({ did: didSchema }).parse(req.query);
    try {
      const r = await directory.getAuthorFeed({
        actor: p.did,
        limit: 20,
        filter: 'posts_no_replies',
      });
      return r.data.feed
        .filter(
          (f) =>
            !f.post.labels?.some((l) =>
              ['porn', 'sexual', 'nudity', '!hide', '!warn'].includes(l.val),
            ),
        )
        .map((f) => ({
          uri: f.post.uri,
          author: f.post.author,
          record: f.post.record,
          indexedAt: f.post.indexedAt,
        }));
    } catch {
      throw new HttpError(503, 'The public network is temporarily unavailable.');
    }
  });
  return app;
}
