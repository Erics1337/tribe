import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
const packages = ['apps/api', 'packages/db', 'packages/domain'];
const external = [
  ...new Set(
    packages
      .flatMap((p) =>
        Object.keys(JSON.parse(readFileSync(p + '/package.json', 'utf8')).dependencies ?? {}),
      )
      .filter((n) => !n.startsWith('@tribe/')),
  ),
];
await build({
  entryPoints: ['apps/api/src/index.ts', 'apps/api/src/worker.ts'],
  outdir: 'apps/api/dist',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  external,
  sourcemap: true,
});
console.log('API and worker production bundles built.');
