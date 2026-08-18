/**
 * Upload warlords-dungeon-kit.json to existing R2 bucket grudge-assets.
 * Uses ObjectStore wrangler config — no new host, no new bucket.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const kit = join(root, 'public', 'warlords-dungeon-kit.json');
const wranglerToml = resolve(root, '..', 'ObjectStore', 'wrangler.toml');

if (!existsSync(kit)) {
  console.error('missing kit', kit);
  process.exit(1);
}
if (!existsSync(wranglerToml)) {
  console.error('missing ObjectStore wrangler.toml', wranglerToml);
  process.exit(1);
}

const args = [
  'wrangler',
  'r2',
  'object',
  'put',
  'grudge-assets/models/dungeons/warlords-dungeon-kit.json',
  '--file',
  kit,
  '--remote',
  '--content-type',
  'application/json',
  '--cache-control=public,max-age=60',
  '--config',
  wranglerToml,
];

console.log('upload kit → r2://grudge-assets/models/dungeons/warlords-dungeon-kit.json');
const r = spawnSync('npx', args, { stdio: 'inherit', shell: true, cwd: resolve(root, '..', 'ObjectStore') });
process.exit(r.status ?? 1);
