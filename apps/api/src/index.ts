import { createPool } from '@tribe/db';
import { config } from './config.js';
import { createServer } from './server.js';
const c = config(),
  db = createPool(c.DATABASE_URL),
  app = await createServer(db, c);
await app.listen({ port: c.PORT, host: '0.0.0.0' });
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, async () => {
    await app.close();
    await db.end();
    process.exit(0);
  });
