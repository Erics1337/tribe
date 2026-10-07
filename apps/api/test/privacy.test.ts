import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createPool } from '@tribe/db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Store } from '../src/store.js';
import { createServer } from '../src/server.js';
import { issueSession, challenge, hash, seal, unseal } from '../src/security.js';
import type { Config } from '../src/config.js';
import sharp from 'sharp';
import { safeFetch } from '../src/oauth.js';
const url =
  process.env.TEST_DATABASE_URL ?? 'postgresql://tribe:local-tribe@localhost:54328/tribe_test';
if (!/tribe_test(?:\?|$)/.test(url))
  throw new Error('Tests require a dedicated tribe_test database.');
const db = createPool(url),
  store = new Store(db);
let app: Awaited<ReturnType<typeof createServer>>;
let alice: string, bob: string, charlie: string;
let tokens: Record<string, string> = {};
const did = (i: number) => 'did:plc:' + i.toString(32).replace(/0/g, 'a').padStart(24, 'a');
const cfg: Config = {
  NODE_ENV: 'test',
  DATABASE_URL: url,
  PORT: 4000,
  PUBLIC_URL: 'http://localhost:4000',
  WEB_URL: 'http://localhost:8081',
  ENCRYPTION_KEY: 'a'.repeat(64),
  ADMIN_DIDS: did(1),
  MEDIA_DIR: '/tmp/tribe-test-media',
  S3_REGION: 'auto',
};
const request = (user: string, method: string, path: string, body?: unknown) =>
  app.inject({
    method: method as any,
    url: path,
    headers: { authorization: 'Bearer ' + tokens[user] },
    payload: body as any,
  });
async function shared() {
  await store.setConnection(alice, did(2), 'inner');
  const p = await store.preview(alice, 'inner');
  return store.createPost(alice, {
    body: 'An ordinary afternoon',
    tier: 'inner',
    previewVersion: p.version,
    mediaIds: [],
    idempotencyKey: randomUUID(),
  });
}
beforeAll(async () => {
  await migrate(drizzle(db), { migrationsFolder: 'packages/db/migrations' });
  app = await createServer(db, cfg);
});
afterAll(async () => {
  await app?.close();
  await db.end();
});
beforeEach(async () => {
  await db.query('TRUNCATE users CASCADE');
  const users = [];
  for (let i = 1; i <= 3; i++) {
    const u = await store.upsertIdentity(
      did(i),
      ['alice.test', 'bob.test', 'charlie.test'][i - 1]!,
      ['Alice', 'Bob', 'Charlie'][i - 1]!,
      null,
    );
    users.push(u.id);
    const s = await issueSession(db, u.id);
    tokens[u.id] = s.accessToken;
  }
  [alice, bob, charlie] = users as [string, string, string];
});
describe('private sharing', () => {
  it('lets Bob read and comment while Charlie cannot fetch any surface', async () => {
    const id = await shared();
    expect((await request(bob, 'GET', '/posts/' + id)).statusCode).toBe(200);
    expect(
      (await request(bob, 'POST', `/posts/${id}/comments`, { body: 'Lovely.' })).statusCode,
    ).toBe(200);
    for (const path of ['/posts/' + id, `/posts/${id}/comments`])
      expect((await request(charlie, 'GET', path)).statusCode).toBe(404);
    expect((await request(charlie, 'POST', `/posts/${id}/reaction`)).statusCode).toBe(404);
    expect((await request(charlie, 'GET', '/feed')).json().items).toHaveLength(0);
  });
  it('snapshots recipients and never backfills to a new connection', async () => {
    const id = await shared();
    await store.setConnection(alice, did(3), 'inner');
    expect((await request(charlie, 'GET', '/posts/' + id)).statusCode).toBe(404);
  });
  it('preserves access on moves, revokes on removal, and does not restore on re-add', async () => {
    const id = await shared();
    await store.setConnection(alice, did(2), 'village');
    expect((await request(bob, 'GET', '/posts/' + id)).statusCode).toBe(200);
    await store.removeConnection(alice, did(2));
    await store.setConnection(alice, did(2), 'inner');
    expect((await request(bob, 'GET', '/posts/' + id)).statusCode).toBe(404);
    expect(
      (await request(bob, 'POST', `/posts/${id}/comments`, { body: 'Still here?' })).statusCode,
    ).toBe(404);
  });
  it('blocks in either direction and unblocking never restores grants', async () => {
    const id = await shared();
    await store.block(bob, did(1));
    expect((await request(bob, 'GET', '/posts/' + id)).statusCode).toBe(404);
    expect(await store.connections(alice)).toHaveLength(0);
    await request(bob, 'DELETE', '/blocks/' + did(1));
    expect((await request(bob, 'GET', '/posts/' + id)).statusCode).toBe(404);
  });
  it('rejects a stale audience and duplicate media', async () => {
    await store.setConnection(alice, did(2), 'inner');
    const p = await store.preview(alice, 'inner');
    await store.setConnection(alice, did(3), 'inner');
    expect(
      (
        await request(alice, 'POST', '/posts', {
          body: 'Hi',
          tier: 'inner',
          previewVersion: p.version,
          idempotencyKey: randomUUID(),
        })
      ).statusCode,
    ).toBe(409);
  });
  it('does not expose author tier labels, recipient lists or grant metadata', async () => {
    const id = await shared();
    const post = (await request(bob, 'GET', '/posts/' + id)).json();
    expect(post.tier).toBeUndefined();
    expect(post.recipients).toBeUndefined();
    expect(post.previewVersion).toBeUndefined();
  });
  it('is retry-safe and rejects reusing a key for a different post', async () => {
    await store.setConnection(alice, did(2), 'inner');
    const p = await store.preview(alice, 'inner');
    const body = {
      body: 'Hi',
      tier: 'inner',
      previewVersion: p.version,
      idempotencyKey: randomUUID(),
    };
    const one = await request(alice, 'POST', '/posts', body);
    const two = await request(alice, 'POST', '/posts', body);
    expect(one.statusCode).toBe(200);
    expect(two.json().id).toBe(one.json().id);
    expect((await request(alice, 'POST', '/posts', { ...body, body: 'Changed' })).statusCode).toBe(
      409,
    );
  });
  it('serializes concurrent capacity checks', async () => {
    for (let i = 10; i < 14; i++) await store.setConnection(alice, did(i), 'inner');
    const outcomes = await Promise.allSettled([
      store.setConnection(alice, did(14), 'inner'),
      store.setConnection(alice, did(15), 'inner'),
    ]);
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await store.connections(alice)).length).toBe(5);
  });
  it('delivers processed private media and revokes its gateway', async () => {
    const bytes = await sharp({
      create: { width: 20, height: 20, channels: 3, background: '#336655' },
    })
      .jpeg()
      .toBuffer();
    const upload = await app.inject({
      method: 'POST',
      url: '/media',
      headers: {
        authorization: 'Bearer ' + tokens[alice],
        'content-type': 'image/jpeg',
        'x-photo-alt': 'A%20green%20square',
      },
      payload: bytes,
    });
    expect(upload.statusCode).toBe(200);
    const asset = upload.json();
    await store.setConnection(alice, did(2), 'inner');
    const p = await store.preview(alice, 'inner');
    const id = await store.createPost(alice, {
      body: 'Photo',
      tier: 'inner',
      previewVersion: p.version,
      mediaIds: [asset.id],
      idempotencyKey: randomUUID(),
    });
    expect((await request(bob, 'GET', '/media/' + asset.id)).statusCode).toBe(200);
    expect((await request(charlie, 'GET', '/media/' + asset.id)).statusCode).toBe(404);
    expect(
      (await request(bob, 'POST', '/reports', { postId: id, reason: 'Review this photo' }))
        .statusCode,
    ).toBe(200);
    const report = (await request(alice, 'GET', '/admin/reports')).json()[0];
    const evidencePath = `/admin/reports/${report.id}/media/${asset.id}`;
    expect((await request(bob, 'GET', evidencePath)).statusCode).toBe(403);
    expect((await request(alice, 'GET', evidencePath)).statusCode).toBe(200);
    await store.removeConnection(alice, did(2));
    expect((await request(bob, 'GET', '/media/' + asset.id)).statusCode).toBe(404);
    expect((await request(alice, 'DELETE', '/posts/' + id)).statusCode).toBe(200);
    expect((await request(alice, 'GET', '/media/' + asset.id)).statusCode).toBe(404);
    expect((await request(alice, 'GET', evidencePath)).statusCode).toBe(200);
  });
  it('filters feeds by viewer circles without granting access', async () => {
    await shared();
    expect((await request(bob, 'GET', '/feed?tier=inner')).json().items).toHaveLength(0);
    await store.setConnection(bob, did(1), 'inner');
    expect((await request(bob, 'GET', '/feed?tier=close')).json().items).toHaveLength(1);
    await store.setConnection(charlie, did(1), 'inner');
    expect((await request(charlie, 'GET', '/feed?tier=inner')).json().items).toHaveLength(0);
  });
  it('exports only owned posts and assignments and denies deleted accounts', async () => {
    await shared();
    const archive = (await request(bob, 'GET', '/me/export')).json();
    expect(archive.posts).toHaveLength(0);
    expect(archive.connections).toHaveLength(0);
    await request(alice, 'DELETE', '/me');
    expect((await request(alice, 'GET', '/me')).statusCode).toBe(401);
    expect((await request(bob, 'GET', '/feed')).json().items).toHaveLength(0);
  });
  it('restricts moderation and applies takedowns', async () => {
    const id = await shared();
    expect((await request(charlie, 'GET', '/admin/reports')).statusCode).toBe(403);
    await request(bob, 'POST', '/reports', { postId: id, reason: 'Unwanted content' });
    const report = (await request(alice, 'GET', '/admin/reports')).json()[0];
    expect(
      (await request(alice, 'POST', '/admin/reports/' + report.id, { action: 'takedown' }))
        .statusCode,
    ).toBe(200);
    expect((await request(bob, 'GET', '/posts/' + id)).statusCode).toBe(404);
  });
});
describe('session boundary', () => {
  it('rejects insecure and private OAuth discovery destinations', async () => {
    for (const url of [
      'http://example.com',
      'https://127.0.0.1',
      'https://[::1]',
      'https://169.254.169.254',
      'https://example.com:8443',
    ]) {
      await expect(safeFetch(new Request(url))).rejects.toThrow();
    }
  });
  it('has no client DID exchange or demo-login route', async () => {
    expect(
      (await app.inject({ method: 'POST', url: '/auth/session', payload: { did: did(1) } }))
        .statusCode,
    ).toBe(401);
  });
  it('rotates refresh tokens and revokes their session after replay', async () => {
    const s = await issueSession(db, alice);
    const fresh = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: s.refreshToken },
    });
    expect(fresh.statusCode).toBe(200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/auth/refresh',
          payload: { refreshToken: s.refreshToken },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          url: '/me',
          headers: { authorization: 'Bearer ' + fresh.json().accessToken },
        })
      ).statusCode,
    ).toBe(401);
  });
  it('requires the app verifier and consumes completion codes once', async () => {
    const code = 'c'.repeat(43),
      verifier = 'v'.repeat(43);
    await db.query(
      "INSERT INTO login_transactions(id,challenge,platform,did,code_hash,expires_at) VALUES($1,$2,'native',$3,$4,now()+interval '1 minute')",
      [randomUUID(), challenge(verifier), did(1), hash(code)],
    );
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/auth/redeem',
          payload: { code, verifier: 'x'.repeat(43) },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await app.inject({ method: 'POST', url: '/auth/redeem', payload: { code, verifier } }))
        .statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'POST', url: '/auth/redeem', payload: { code, verifier } }))
        .statusCode,
    ).toBe(400);
  });
  it('encrypts OAuth state with authentication', () => {
    const s = seal({ secret: 'hidden' }, cfg.ENCRYPTION_KEY);
    expect(s).not.toContain('hidden');
    expect(unseal(s, cfg.ENCRYPTION_KEY)).toEqual({ secret: 'hidden' });
    expect(() => unseal(s, 'b'.repeat(64))).toThrow();
  });
});
