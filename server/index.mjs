/**
 * Node deploy for Grudge Dungeons.
 *   PORT=8788 npm start
 * Serves Vite dist (if built) + /api/mechanic|dungeon/script|dungeon/complete|health.
 * Public host stays grudge-dungeons.vercel.app — this is the same app, Node form.
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeDungeonApi } from './router.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const PORT = Number(process.env.PORT || 8788);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendFile(res, file) {
  const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=60' });
  createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    if (await routeDungeonApi(req, res)) return;
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0] || '/');
    const safe = urlPath.replace(/\.\./g, '');
    let file = join(dist, safe === '/' ? 'index.html' : safe);
    if (existsSync(file) && statSync(file).isFile()) {
      sendFile(res, file);
      return;
    }
    const index = join(dist, 'index.html');
    if (existsSync(index)) {
      sendFile(res, index);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('grudge-dungeons node: dist missing — run npm run build');
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
  }
});

server.listen(PORT, () => {
  console.log(`grudge-dungeons node http://127.0.0.1:${PORT}`);
});
