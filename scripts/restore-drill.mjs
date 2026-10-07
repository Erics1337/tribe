import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';
const args = ['compose', 'exec', '-T', 'postgres'];
const sql = (database, statement) =>
  execFileSync(
    'docker',
    [...args, 'psql', '-U', 'tribe', '-d', database, '-v', 'ON_ERROR_STOP=1', '-c', statement],
    { stdio: ['pipe', 'pipe', 'pipe'] },
  );
const folder = '.data/recovery';
mkdirSync(folder, { recursive: true });
const dump = execFileSync('docker', [...args, 'pg_dump', '-U', 'tribe', '-d', 'tribe', '-Fc']);
writeFileSync(folder + '/tribe.dump', dump, { mode: 0o600 });
// This disposable database is never a cloud or production target.
sql('postgres', 'DROP DATABASE IF EXISTS tribe_restore');
sql('postgres', 'CREATE DATABASE tribe_restore');
execFileSync('docker', [...args, 'pg_restore', '-U', 'tribe', '-d', 'tribe_restore'], {
  input: dump,
  stdio: ['pipe', 'pipe', 'pipe'],
});
const source = new Pool({
    connectionString: 'postgresql://tribe:local-tribe@localhost:54328/tribe',
  }),
  restored = new Pool({
    connectionString: 'postgresql://tribe:local-tribe@localhost:54328/tribe_restore',
  });
try {
  for (const table of ['users', 'posts', 'post_grants', 'media']) {
    const one = await source.query(`SELECT count(*)::int AS n FROM ${table}`),
      two = await restored.query(`SELECT count(*)::int AS n FROM ${table}`);
    if (one.rows[0].n !== two.rows[0].n) throw new Error('Restored row counts differ: ' + table);
  }
  const media = await source.query('SELECT object_key FROM media');
  for (const asset of media.rows) {
    const bytes = readFileSync('.data/media/' + asset.object_key);
    writeFileSync(folder + '/' + asset.object_key, bytes, { mode: 0o600 });
    const copied = readFileSync(folder + '/' + asset.object_key);
    if (
      createHash('sha256').update(bytes).digest('hex') !==
      createHash('sha256').update(copied).digest('hex')
    )
      throw new Error('Media restore checksum failed');
  }
  console.log('Local restore drill passed: database relations and private media checksums match.');
} finally {
  await source.end();
  await restored.end();
}
