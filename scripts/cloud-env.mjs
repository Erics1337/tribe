import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
function parse(path) {
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i), l.slice(i + 1)];
      }),
  );
}
const current = parse('.env'),
  cloud = parse('.env.neon');
const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const keys = {
  ...current,
  ...cloud,
  NODE_ENV: 'production',
  PUBLIC_URL: 'https://br-round-tree-b5lbzcui-api.compute.c-7.us-east-2.aws.neon.tech',
  WEB_URL: process.env.TRIBE_WEB_URL ?? 'https://erics1337.github.io/tribe',
  ENCRYPTION_KEY:
    cloud.ENCRYPTION_KEY ??
    (current.ENCRYPTION_KEY?.match(/^[a-f0-9]{64}$/)
      ? current.ENCRYPTION_KEY
      : randomBytes(32).toString('hex')),
  OAUTH_PRIVATE_JWK:
    cloud.OAUTH_PRIVATE_JWK ??
    current.OAUTH_PRIVATE_JWK ??
    JSON.stringify({ ...privateKey.export({ format: 'jwk' }), kid: 'tribe-oauth-1', alg: 'ES256' }),
  S3_BUCKET: 'uploads',
};
writeFileSync(
  '.env.neon',
  Object.entries(keys)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n',
);
chmodSync('.env.neon', 0o600);
console.log('Cloud environment saved privately. No credentials printed.');
