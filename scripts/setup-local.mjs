import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (!existsSync('.env.local-development')) {
  writeFileSync(
    '.env.local-development',
    readFileSync('.env.example', 'utf8').replace(
      'replace_with_64_hex_characters',
      randomBytes(32).toString('hex'),
    ),
  );
  chmodSync('.env.local-development', 0o600);
}
console.log('Local configuration ready. Run pnpm db:up and pnpm db:migrate:local.');
