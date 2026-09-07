/**
 * Play GLTF loader — converted / SI-sized / textured kits.
 * One GLTFLoader + Draco + Meshopt. Never AABB-autoScale into ~1 unit (that is 100×).
 * Skinned clones go through SkeletonUtils at spawn, not scene.clone().
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const DRACO_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

let playLoader = null;

export function getPlayGltfLoader() {
  if (playLoader) return playLoader;
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_PATH);
  draco.preload();
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  playLoader = loader;
  import('three/addons/libs/meshopt_decoder.module.js').then((m) => {
    const dec = m.MeshoptDecoder;
    if (dec) loader.setMeshoptDecoder(dec);
  }).catch(() => { /* Draco-only kits still load */ });
  return loader;
}

/** Albedo SRGB, data maps linear, skins not frustum-culled. No unit squash. */
export function normalizePlayGltf(root, { yaw = 0 } = {}) {
  if (!root) return root;
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.receiveShadow = true;
    o.castShadow = !!o.isSkinnedMesh;
    if (o.isSkinnedMesh) o.frustumCulled = false;
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (!m) continue;
      if (m.map?.isTexture) {
        m.map.colorSpace = THREE.SRGBColorSpace;
        m.map.flipY = false;
      }
      if (m.emissiveMap?.isTexture) m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
      if (m.normalMap?.isTexture) m.normalMap.colorSpace = THREE.LinearSRGBColorSpace;
      if (m.metalnessMap?.isTexture) m.metalnessMap.colorSpace = THREE.LinearSRGBColorSpace;
      if (m.roughnessMap?.isTexture) m.roughnessMap.colorSpace = THREE.LinearSRGBColorSpace;
    }
  });
  if (yaw) root.rotation.y = yaw;
  return root;
}

export function loadPlayGltf(url, cache) {
  const store = cache || loadPlayGltf._cache || (loadPlayGltf._cache = new Map());
  if (store.has(url)) return store.get(url);
  const loader = getPlayGltfLoader();
  const p = new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        normalizePlayGltf(gltf.scene);
        resolve(gltf);
      },
      undefined,
      (err) => {
        store.delete(url);
        reject(err);
      },
    );
  });
  store.set(url, p);
  return p;
}

loadPlayGltf._cache = new Map();
