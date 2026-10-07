import { attachDatabasePool } from '@neon/functions';
import { parseTriggerDelivery } from '@neon/functions/triggers';
import { createPool } from '@tribe/db';
import { config } from './config.js';
import { createJobs } from './jobs.js';
const c = config(),
  db = createPool(c.DATABASE_URL);
attachDatabasePool(db);
const jobs = createJobs(db, c);
export default {
  async fetch(request: Request) {
    const parsed = await parseTriggerDelivery(request);
    if (!parsed.ok) return new Response('Unauthorized', { status: 401 });
    if (parsed.invocation.type !== 'schedule' || parsed.invocation.trigger.name !== 'tribe-jobs')
      return new Response('Unknown trigger', { status: 400 });
    await jobs.run();
    return Response.json({ ok: true });
  },
};
