import { attachDatabasePool } from '@neon/functions';
import { createPool } from '@tribe/db';
import { config } from './config.js';
import { createServer } from './server.js';
const c = config(),
  db = createPool(c.DATABASE_URL);
attachDatabasePool(db);
const app = createServer(db, c);
export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (request.body) {
      const reader = request.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 10 * 1024 * 1024) {
            await reader.cancel();
            return Response.json({ message: 'Upload is too large.' }, { status: 413 });
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const bytes = request.body ? Buffer.concat(chunks) : undefined;
    const server = await app;
    const r = await server.inject({
      method: request.method as any,
      url: url.pathname + url.search,
      headers: Object.fromEntries(request.headers),
      payload: bytes,
    });
    const headers = new Headers();
    for (const [name, value] of Object.entries(r.headers))
      if (value !== undefined)
        headers.set(name, Array.isArray(value) ? value.join(', ') : String(value));
    return new Response(
      request.method === 'HEAD' || [204, 205, 304].includes(r.statusCode)
        ? null
        : new Uint8Array(r.rawPayload),
      {
        status: r.statusCode,
        headers,
      },
    );
  },
};
