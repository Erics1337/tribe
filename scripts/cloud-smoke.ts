import { createPool } from '../packages/db/src/index.js';
import { Store } from '../apps/api/src/store.js';
import { issueSession } from '../apps/api/src/security.js';
import { config } from '../apps/api/src/config.js';
import { createJobs } from '../apps/api/src/jobs.js';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
const c = config();
if (!c.PUBLIC_URL.includes('br-round-tree-b5lbzcui-api'))
  throw new Error('Cloud smoke runs only on the isolated rebuild preview.');
const db = createPool(c.DATABASE_URL),
  store = new Store(db);
const people = [];
const uniqueDid = () =>
  'did:plc:' +
  Array.from(randomBytes(24), (v) => 'abcdefghijklmnopqrstuvwxyz234567'[v % 32]).join('');
async function call(path: string, token: string, method = 'GET', body?: unknown) {
  return fetch(c.PUBLIC_URL + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
try {
  for (const name of ['Preview sender', 'Preview recipient', 'Preview outsider']) {
    const u = await store.upsertIdentity(uniqueDid(), 'preview.invalid', name, null);
    const s = await issueSession(db, u.id);
    people.push({ u, s });
  }
  const [a, b, x] = people as [
    (typeof people)[number],
    (typeof people)[number],
    (typeof people)[number],
  ];
  let r = await call('/connections', a.s.accessToken, 'PUT', { did: b.u.did, tier: 'inner' });
  if (r.status !== 200) throw new Error('Cloud connection failed: ' + r.status);
  const image = await sharp({
    create: { width: 24, height: 24, channels: 3, background: '#275f49' },
  })
    .jpeg()
    .toBuffer();
  r = await fetch(c.PUBLIC_URL + '/media', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + a.s.accessToken, 'Content-Type': 'image/jpeg' },
    body: image,
  });
  if (r.status !== 200) throw new Error('Cloud private upload failed: ' + r.status);
  const media = (await r.json()) as { id: string };
  const audience = (await (await call('/audience?tier=inner', a.s.accessToken)).json()) as {
    version: string;
  };
  r = await call('/posts', a.s.accessToken, 'POST', {
    body: 'Isolated cloud verification',
    tier: 'inner',
    previewVersion: audience.version,
    mediaIds: [media.id],
    idempotencyKey: crypto.randomUUID(),
  });
  if (r.status !== 200) throw new Error('Cloud publish failed: ' + r.status);
  const post = (await r.json()) as { id: string };
  for (const path of ['/posts/' + post.id, '/media/' + media.id]) {
    if ((await call(path, b.s.accessToken)).status !== 200)
      throw new Error('Recipient access failed');
    if ((await call(path, x.s.accessToken)).status !== 404)
      throw new Error('Outsider access was not denied');
  }
  await call('/connections/' + b.u.did, a.s.accessToken, 'DELETE');
  if ((await call('/media/' + media.id, b.s.accessToken)).status !== 404)
    throw new Error('Cloud revocation failed');
  console.log(
    'Cloud smoke passed: Neon Postgres, private S3 upload, authorized delivery, outsider denial, recipient revocation.',
  );
} finally {
  for (const p of people) await store.deleteAccount(p.u.id);
  await createJobs(db, c).run();
  await db.end();
}
