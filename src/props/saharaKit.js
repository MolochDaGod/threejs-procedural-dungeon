/**
 * Load Sahara cartoon pack once, isolate mesh by name, plant SI-sized props.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SAHARA_CM_TO_M, SAHARA_CATALOG, SAHARA_GLB, saharaByBiome } from '../content/props/sahara.js';
import { lookOf } from '../content/looks/matlib.js';
import { DUNGEON_SI } from '../ssot.js';

const loader = new GLTFLoader();
let pack = null;
let catalog = null;
let byBiome = null;
const texLoader = new THREE.TextureLoader();

export async function loadSaharaKit() {
  if (byBiome) return { pack, catalog, byBiome };
  const [gltf, cat] = await Promise.all([
    new Promise((res, rej) => loader.load(SAHARA_GLB, res, undefined, rej)),
    fetch(SAHARA_CATALOG).then((r) => r.json()).catch(() => ({ sahara: { items: [] } })),
  ]);
  pack = gltf;
  catalog = cat;
  byBiome = saharaByBiome(cat);
  pack.scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material?.map) o.material.map.colorSpace = THREE.SRGBColorSpace;
    }
  });
  return { pack, catalog, byBiome };
}

function findMesh(name) {
  let found = null;
  pack?.scene.traverse((o) => {
    if (!found && o.isMesh && o.name === name) found = o;
  });
  return found;
}

function fitProp(root, targetH) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const h = Math.max(size.y, 0.001);
  root.scale.multiplyScalar(targetH / h);
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;
}

export function plantSaharaProp(group, item, x, z, yaw = 0) {
  if (!pack || !item) return null;
  const src = findMesh(item.mesh);
  if (!src) return null;
  const mesh = src.clone();
  mesh.material = src.material;
  const wrap = new THREE.Group();
  wrap.name = `sahara-${item.id}`;
  wrap.add(mesh);
  wrap.scale.setScalar(SAHARA_CM_TO_M);
  wrap.position.set(x, DUNGEON_SI.groundY, z);
  wrap.rotation.y = yaw;
  group.add(wrap);
  fitProp(wrap, item.targetHeightM);
  wrap.position.x = x;
  wrap.position.z = z;
  return wrap;
}

export function scatterSahara(dungeon, group, rng = Math.random) {
  const theme = dungeon.params?.themeKey || 'ancient';
  const list = byBiome?.[theme] || [];
  if (!list.length || !group) return 0;
  const rooms = dungeon.rooms || [];
  let n = 0;
  const wx = (gx) => (gx - dungeon.W / 2 + 0.5) * DUNGEON_SI.cell;
  const wz = (gz) => (gz - dungeon.H / 2 + 0.5) * DUNGEON_SI.cell;
  for (const r of rooms) {
    if (r.type === 'treasure' || r.type === 'shrine') continue;
    const count = r.type === 'boss' ? 6 : r.type === 'entrance' ? 3 : 4;
    for (let k = 0; k < count; k++) {
      const item = list[Math.floor(rng() * list.length) % list.length];
      const gx = r.cx + (rng() - 0.5) * (r.w * 0.55);
      const gz = r.cy + (rng() - 0.5) * (r.h * 0.55);
      const planted = plantSaharaProp(group, item, wx(gx), wz(gz), rng() * Math.PI * 2);
      if (planted) n++;
    }
  }
  return n;
}

const lookCache = {};
export async function applyBiomeLook(themeKey, materials = []) {
  const look = lookOf(themeKey);
  if (!look?.albedo) return look;
  if (!lookCache[look.albedo]) {
    lookCache[look.albedo] = await new Promise((res) => {
      texLoader.load(look.albedo, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(2.2, 2.2);
        t.anisotropy = 8;
        res(t);
      }, undefined, () => res(null));
    });
  }
  const map = lookCache[look.albedo];
  if (!map) return look;
  for (const mat of materials) {
    if (!mat) continue;
    mat.map = map;
    mat.color.set(look.tint);
    mat.needsUpdate = true;
  }
  return look;
}

export { byBiome };
