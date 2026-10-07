import { config as dotenv } from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import { createPool } from '../packages/db/src/index.js';
import { Store } from '../apps/api/src/store.js';
import { issueSession } from '../apps/api/src/security.js';
import { MediaStorage } from '../apps/api/src/media.js';
import { config } from '../apps/api/src/config.js';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
dotenv({ path: '.env.local-development', override: true });
const c = config();
if (!/^postgres(?:ql)?:\/\/[^@]+@(localhost|127\.0\.0\.1):54328\/tribe$/.test(c.DATABASE_URL))
  throw new Error('Seed runs only on the explicit local Docker database.');
const db = createPool(c.DATABASE_URL),
  store = new Store(db),
  media = new MediaStorage(c);
const names = ['Alex Morgan', 'Maya Chen', 'Sam Rivera', 'Jules Ellis'];
const did = (i: number) => 'did:plc:' + String.fromCharCode(97 + i).repeat(24);
const users = [];
try {
  for (let i = 0; i < 4; i++) {
    const u = await store.upsertIdentity(
      did(i),
      ['alex', 'maya', 'sam', 'jules'][i]! + '.example',
      names[i]!,
      null,
    );
    await db.query('UPDATE users SET onboarded=true WHERE id=$1', [u.id]);
    users.push(u);
  }
  for (let i = 1; i < 4; i++) {
    await store.setConnection(users[0]!.id, did(i), i === 1 ? 'inner' : 'close');
    await store.setConnection(users[i]!.id, did(0), 'inner');
  }
  const existing = await db.query('SELECT 1 FROM posts LIMIT 1');
  if (!existing.rowCount) {
    for (let i = 1; i < 4; i++) {
      const palette = [
        ['#aac7b0', '#244d40'],
        ['#d2c6ad', '#827360'],
        ['#bacbd4', '#526c76'],
      ][i - 1]!;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="800"><rect width="1000" height="800" fill="${palette[0]}"/><circle cx="720" cy="200" r="90" fill="#f3f0dd"/><path d="M0 640 Q200 280 430 570 T1000 460 V800 H0Z" fill="${palette[1]}"/><path d="M0 730 Q320 520 640 700 T1000 610 V800 H0Z" fill="#ffffff" opacity=".18"/></svg>`;
      const asset = await media.upload(
        db,
        users[i]!.id,
        await sharp(Buffer.from(svg)).jpeg().toBuffer(),
        'A landscape illustration used only for local preview',
      );
      const preview = await store.preview(users[i]!.id, 'inner');
      await store.createPost(users[i]!.id, {
        body: [
          'A slow morning outside. Hope your day has a little breathing room too.',
          'Finally found time for a walk. The small things really do add up.',
          'Leaving this here for our next catch-up. Miss you all.',
        ][i - 1]!,
        tier: 'inner',
        previewVersion: preview.version,
        mediaIds: [asset.id],
        idempotencyKey: randomUUID(),
      });
    }
  }
  await mkdir('.data', { recursive: true });
  const session = await issueSession(db, users[0]!.id);
  await writeFile('.data/local-session.json', JSON.stringify(session), { mode: 0o600 });
  console.log(
    'Local preview ready. Credentials saved in .data/local-session.json; paste them into the development sign-in screen.',
  );
} finally {
  await db.end();
}
