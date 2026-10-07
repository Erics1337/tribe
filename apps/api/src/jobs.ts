import { createPool, transaction } from '@tribe/db';
import type { Config } from './config.js';
import type { DB } from '@tribe/db';
import { Store } from './store.js';
import { MediaStorage } from './media.js';
import { HttpError } from './security.js';
export function isQuiet(hour: number, start: number, end: number) {
  return start === end
    ? false
    : start < end
      ? hour >= start && hour < end
      : hour >= start || hour < end;
}
export function createJobs(db: DB, c: Config) {
  const store = new Store(db),
    storage = new MediaStorage(c);
  async function deliver() {
    await transaction(db, async (q) => {
      const rows = await q.query(
        `SELECT o.id,o.attempts,n.post_id,n.recipient_id,n.actor_id,u.push_token,u.notifications,u.timezone,u.quiet_start,u.quiet_end FROM outbox o JOIN activity n ON n.id=o.activity_id JOIN users u ON u.id=n.recipient_id WHERE o.finished_at IS NULL AND o.available_at<=now() ORDER BY o.available_at FOR UPDATE OF o SKIP LOCKED LIMIT 1`,
      );
      const r = rows.rows[0];
      if (!r) return;
      try {
        await store.allowed(r.recipient_id, r.post_id, q);
        const user = await store.user(r.recipient_id, q);
        const actor = await store.user(r.actor_id, q);
        const blocked = await q.query(
          'SELECT 1 FROM blocks WHERE (owner_id=$1 AND target_did=$2) OR (owner_id=$3 AND target_did=$4)',
          [user.id, actor.did, actor.id, user.did],
        );
        if (blocked.rowCount || !r.notifications || !r.push_token) {
          await q.query('UPDATE outbox SET finished_at=now() WHERE id=$1', [r.id]);
          return;
        }
        const hour = Number(
          new Intl.DateTimeFormat('en', {
            hour: 'numeric',
            hourCycle: 'h23',
            timeZone: r.timezone,
          }).format(new Date()),
        );
        if (isQuiet(hour, r.quiet_start, r.quiet_end)) {
          await q.query("UPDATE outbox SET available_at=now()+interval '1 hour' WHERE id=$1", [
            r.id,
          ]);
          return;
        }
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: r.push_token,
            title: 'Tribe',
            body: 'Someone connected with you. Open Tribe to catch up.',
            sound: 'default',
            data: { screen: 'activity' },
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error('Push service unavailable');
        const result = (await response.json()) as {
          data?: { status: string; details?: { error: string } };
        };
        if (result.data?.status === 'error') {
          if (result.data.details?.error === 'DeviceNotRegistered')
            await q.query('UPDATE users SET push_token=NULL WHERE id=$1', [r.recipient_id]);
          else throw new Error('Push rejected');
        }
        await q.query('UPDATE outbox SET finished_at=now() WHERE id=$1', [r.id]);
      } catch (e) {
        if (e instanceof HttpError) {
          await q.query('UPDATE outbox SET finished_at=now() WHERE id=$1', [r.id]);
          return;
        }
        await q.query(
          "UPDATE outbox SET attempts=attempts+1,last_error='Delivery failed',available_at=now()+interval '5 minutes',finished_at=CASE WHEN attempts>=4 THEN now() ELSE NULL END WHERE id=$1",
          [r.id],
        );
      }
    });
  }
  async function cleanup() {
    const rows = await db.query(
      `SELECT m.id,m.object_key FROM media m LEFT JOIN posts p ON p.id=m.post_id JOIN users u ON u.id=m.owner_id WHERE NOT u.active OR (p.deleted_at IS NOT NULL AND p.deleted_at<now()-interval '24 hours') OR (m.post_id IS NULL AND m.created_at<now()-interval '24 hours') LIMIT 100`,
    );
    for (const r of rows.rows) {
      await storage.remove(r.object_key);
      await db.query('DELETE FROM media WHERE id=$1', [r.id]);
    }
    await db.query('DELETE FROM auth_data WHERE expires_at<now()');
    await db.query('DELETE FROM login_transactions WHERE expires_at<now()');
    await db.query('DELETE FROM invitations WHERE expires_at<now()');
    const expired = await db.query(
      "SELECT id,evidence FROM reports WHERE created_at<now()-interval '90 days' AND status<>'open' LIMIT 100",
    );
    for (const report of expired.rows) {
      for (const asset of report.evidence.media ?? [])
        if (asset.evidenceKey) await storage.remove(asset.evidenceKey);
      await db.query('DELETE FROM reports WHERE id=$1', [report.id]);
    }
  }
  return {
    async run() {
      for (let i = 0; i < 20; i++) await deliver();
      await cleanup();
    },
  };
}
