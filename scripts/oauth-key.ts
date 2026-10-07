import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const jwk = { ...privateKey.export({ format: 'jwk' }), kid: 'tribe-oauth-1', alg: 'ES256' };
writeFileSync('.data-oauth-key.json', JSON.stringify(jwk), { mode: 0o600 });
console.log(
  'Private OAuth key saved to .data-oauth-key.json. Add its JSON as OAUTH_PRIVATE_JWK in server secrets.',
);
