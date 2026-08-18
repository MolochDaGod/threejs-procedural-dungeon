/**
 * Baked dungeon node loading — one GLB cache, SkeletonUtils clones at spawn.
 * Preload races + clips + kit so instance enter does not hitch.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ANIM_URLS, CLIP_DONOR, DRESSING, RACE_IDS, raceCharacterUrl } from '../ssot.js';
import { CELL_M } from '../gen/cells.js';

const loader = new GLTFLoader();
const cache = new Map();

export function loadGltf(url) {
  if (cache.has(url)) return cache.get(url);
  const p = new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, (err) => {
      cache.delete(url);
      reject(err);
    });
  });
  cache.set(url, p);
  return p;
}

export function bakedUrls() {
  return [
    ...RACE_IDS.map(raceCharacterUrl),
    CLIP_DONOR,
    ...Object.values(ANIM_URLS),
    ...Object.values(DRESSING),
  ];
}

let preloadOnce = null;
export function preloadDungeonAssets() {
  if (preloadOnce) return preloadOnce;
  preloadOnce = Promise.all(
    bakedUrls().map((url) => loadGltf(url).catch((err) => {
      console.warn('[dungeon-assets] miss', url, err?.message || err);
      return null;
    })),
  );
  return preloadOnce;
}

export function instanceCatalog(dungeon) {
  return {
    version: 2,
    cellM: CELL_M,
    nav: 'grid-8',
    renderer: 'three',
    physics: 'rapier3d-compat',
    baked: bakedUrls(),
    seed: dungeon?.seed ?? null,
    theme: dungeon?.params?.themeKey ?? null,
    rooms: dungeon?.rooms?.length ?? 0,
  };
}

export function instancedFromTemplate(gltf, count, material) {
  const mesh = gltf.scene.getObjectByProperty('isMesh', true);
  if (!mesh) return null;
  const inst = new THREE.InstancedMesh(mesh.geometry, material || mesh.material, count);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  inst.castShadow = true;
  inst.receiveShadow = true;
  return inst;
}
