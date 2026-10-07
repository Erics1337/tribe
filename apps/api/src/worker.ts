import { createPool } from '@tribe/db';
import { config } from './config.js';
import { createJobs } from './jobs.js';
const c = config(),
  db = createPool(c.DATABASE_URL),
  jobs = createJobs(db, c);
let stopped = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    stopped = true;
  });
while (!stopped) {
  try {
    await jobs.run();
  } catch {
    console.error('Worker cycle failed; retrying.');
  }
  await new Promise((r) => setTimeout(r, 10000));
}
await db.end();
