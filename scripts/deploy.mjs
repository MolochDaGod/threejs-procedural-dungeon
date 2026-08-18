/**
 * Clean dungeon deploy:
 *   1. vite build
 *   2. HEAD-check CDN baked assets
 *   3. upload kit JSON to existing R2
 *   4. vercel --prod on linked grudge-dungeons
 *   5. verify production HTML
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROD = 'https://grudge-dungeons.vercel.app';

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, cwd: root, ...opts });
  if ((r.status ?? 1) !== 0) {
    console.error(`failed: ${cmd}`);
    process.exit(r.status ?? 1);
  }
}

run('npm', ['run', 'build']);
run('node', ['scripts/verify-cdn.mjs']);
run('node', ['scripts/upload-kit.mjs']);
run('vercel', ['deploy', '--prod', '--yes', '--scope', 'grudgenexus']);

const html = await fetch(`${PROD}/`).then((r) => r.text());
if (!html.includes('Grudge Dungeons') && !html.includes('GRUDGE')) {
  console.error('production HTML missing dungeon title');
  process.exit(1);
}
const ssot = await fetch(`${PROD}/ssot.json`).then((r) => r.json());
console.log(`\n## Deploy Result`);
console.log(`- URL: ${PROD}`);
console.log(`- Also: https://grudge-dungeons-grudgenexus.vercel.app/`);
console.log(`- Target: production`);
console.log(`- SSOT: ${ssot.version || '?'}  nav=${ssot.nav}  cellM=${ssot.cellM}`);
console.log(`- Kit: ${ssot.kit}`);
console.log(`- Status: READY`);
