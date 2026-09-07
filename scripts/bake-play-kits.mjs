/**
 * Rebake dungeon kits: Meshopt geometry + KTX2 textures (WebP fallback).
 * Uses ObjectStore grudge-convert (glb2glb). Does not flatten skinned meshes.
 */
import { spawnSync } from 'node:child_process';
import { mkdir, readdir, copyFile, stat } from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const root = dirname(fileURLToPath(import.meta.url)).replace(/\\scripts$/, '').replace(/\/scripts$/, '');
const CONVERT = 'F:/GitHub/ObjectStore/tools/grudge-convert/bin/grudge-convert.mjs';
const CONVERT_CWD = 'F:/GitHub/ObjectStore/tools/grudge-convert';
const CDN = 'https://assets.grudge-studio.com';

const KAYKIT = [
  'torch.glb', 'chest_rare.glb', 'banner.glb', 'floorDecoration_wood.glb',
  'crate.glb', 'barrel.glb', 'pillar.glb', 'pillar_broken.glb',
];

function convertOne(src, dst) {
  const args = [
    CONVERT, 'glb2glb', src, '-o', dst,
    '--no-colliders', '--no-y-hip',
    '--texture-size', '1024',
    '--texture-format', 'ktx2',
  ];
  const r = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: CONVERT_CWD });
  return (r.status ?? 1) === 0 && existsSync(dst);
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  await mkdir(dirname(dest), { recursive: true });
  await pipeline(res.body, createWriteStream(dest));
}

async function bakeDir(dir, globExt = '.glb') {
  if (!existsSync(dir)) return 0;
  const names = (await readdir(dir)).filter((n) => n.endsWith(globExt) && !n.includes('.bak.'));
  let n = 0;
  for (const name of names) {
    const src = join(dir, name);
    const tmp = join(dir, `.tmp-${name}`);
    const st = await stat(src);
    if (st.size < 200) continue;
    console.log('\n# bake', src);
    if (!convertOne(src, tmp)) {
      console.warn('skip (convert fail)', name);
      continue;
    }
    await copyFile(tmp, src);
    n += 1;
  }
  return n;
}

const rawKay = join(root, 'tmp/kaykit-src');
const optKay = join(root, 'public/models/opt/kaykit');
await mkdir(rawKay, { recursive: true });
await mkdir(optKay, { recursive: true });

let kay = 0;
for (const name of KAYKIT) {
  const url = `${CDN}/game-assets/glb/kaykit/gltf/${name}`;
  const src = join(rawKay, name);
  const dst = join(optKay, name);
  try {
    if (!existsSync(src)) await download(url, src);
    console.log('\n# kaykit', name);
    if (convertOne(src, dst)) kay += 1;
    else console.warn('kaykit fail', name);
  } catch (err) {
    console.warn('kaykit miss', name, err.message);
  }
}

const creatures = await bakeDir(join(root, 'public/models/creatures'));
const props = await bakeDir(join(root, 'public/models/props'));
const forms = existsSync(join(root, 'public/models/forms/iguana'))
  ? await bakeDir(join(root, 'public/models/forms/iguana'))
  : 0;

console.log(JSON.stringify({ kay, creatures, props, forms, convert: CONVERT }, null, 2));
if (kay < 4) process.exit(2);
