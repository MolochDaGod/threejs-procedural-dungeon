import { defineConfig } from 'vite';

/**
 * rapier3d-compat embeds wasm as base64 and calls init(Uint8Array).
 * Wrap deprecated init() so the console stays clean (Casting / fleet pin).
 */
function fixRapierInitDeprecation() {
  const needle =
    'Object.getPrototypeOf(I)===Object.prototype?({module_or_path:I}=I):console.warn("using deprecated parameters for the initialization function; pass a single object instead")';
  const replacement =
    'Object.getPrototypeOf(I)===Object.prototype?({module_or_path:I}=I):(I={module_or_path:I},I=I.module_or_path)';
  return {
    name: 'fix-rapier-init-deprecation',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@dimforge/rapier3d-compat')) return null;
      if (!code.includes('using deprecated parameters for the initialization function')) return null;
      if (!code.includes(needle)) return null;
      return { code: code.replaceAll(needle, replacement), map: null };
    },
  };
}

function dungeonApiDev() {
  return {
    name: 'grudge-dungeon-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || '').split('?')[0];
        if (!path.startsWith('/api') && path !== '/health') return next();
        try {
          const { routeDungeonApi } = await import('./server/router.mjs');
          const hit = await routeDungeonApi(req, res);
          if (!hit) next();
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [fixRapierInitDeprecation(), dungeonApiDev()],
  server: {
    fs: { allow: ['F:/GitHub/threejs-procedural-dungeon', 'D:/Games/Models'] },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    chunkSizeWarningLimit: 2500,
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],
  },
  assetsInclude: ['**/*.glb', '**/*.wasm'],
});
