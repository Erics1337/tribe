import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { createPool } from './index.js';
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('Set DATABASE_URL_UNPOOLED before running migrations.');
const db = createPool(url);
try {
  await migrate(drizzle(db), {
    migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)),
  });
  console.log('Database migrations applied.');
} finally {
  await db.end();
}
