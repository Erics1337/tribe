import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
const env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  PUBLIC_URL: z.url().default('http://localhost:4000'),
  WEB_URL: z.url().default('http://localhost:8081'),
  ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/),
  OAUTH_PRIVATE_JWK: z.string().optional(),
  ADMIN_DIDS: z.string().default(''),
  MEDIA_DIR: z.string().default(fileURLToPath(new URL('../../../.data/media', import.meta.url))),
  S3_ENDPOINT: z.url().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_REGION: z.string().default('auto'),
});
export type Config = z.infer<typeof env>;
export function config() {
  const c = env.parse({
    ...process.env,
    S3_ENDPOINT: process.env.S3_ENDPOINT ?? process.env.AWS_ENDPOINT_URL_S3,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY,
    S3_REGION: process.env.S3_REGION ?? process.env.AWS_REGION,
  });
  if (
    c.NODE_ENV === 'production' &&
    (!c.PUBLIC_URL.startsWith('https://') ||
      !c.WEB_URL.startsWith('https://') ||
      !c.OAUTH_PRIVATE_JWK ||
      !c.S3_BUCKET)
  )
    throw new Error('Production requires HTTPS, OAuth key and private S3 storage.');
  return c;
}
