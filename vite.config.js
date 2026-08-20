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

export default defineConfig({
  base: './',
  plugins: [fixRapierInitDeprecation()],
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
