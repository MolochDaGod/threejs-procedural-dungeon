/**
 * CDN kit dressing — KayKit torch / chest / banner on generated cells.
 * Procedural flame + extra flicker lights stay for motion.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRESSING } from '../ssot.js';
import { cellCenter } from '../gen/cells.js';

const loader = new GLTFLoader();
const cache = new Map();

const KIT = DRESSING;

function loadGltf(url) {
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

function fitProp(root, targetH) {
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const h = box.getSize(new THREE.Vector3()).y || 1;
  root.scale.setScalar(targetH / Math.max(h, 0.01));
  root.updateMatrixWorld(true);
  const planted = new THREE.Box3().setFromObject(root);
  root.position.y -= planted.min.y;
}

async function cloneProp(url, targetH) {
  const gltf = await loadGltf(url);
  const obj = gltf.scene.clone(true);
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material) {
        o.material = o.material.clone();
        if (o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace;
      }
    }
  });
  fitProp(obj, targetH);
  return obj;
}

export class DungeonDressing {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'dungeon-dressing';
    this.lights = [];
    this.ready = false;
  }

  async apply(dungeon, parent, theme) {
    this.dispose();
    if (!dungeon?.valid) return;
    parent.add(this.root);
    const flame = theme?.flame ?? 0xffa640;
    const [iTorch, iChest] = theme?.torchLight || [0xff8c3a, 1.7, 11];

    const jobs = [];
    for (const t of dungeon.torches || []) {
      jobs.push(this.placeTorch(dungeon, t, flame, iTorch, iChest));
    }
    for (const r of dungeon.rooms || []) {
      if (r.type === 'treasure') jobs.push(this.placeChest(dungeon, r));
    }
    await Promise.allSettled(jobs);
    this.ready = true;
  }

  async placeTorch(d, t, flame, intensity, dist) {
    try {
      const mesh = await cloneProp(KIT.torch, 0.85);
      const w = cellCenter(d, t.x, t.y);
      mesh.position.x = w.x + t.dx * 0.42;
      mesh.position.z = w.z + t.dy * 0.42;
      mesh.rotation.y = Math.atan2(t.dx, t.dy);
      mesh.name = 'kit-torch';
      this.root.add(mesh);
      const L = new THREE.PointLight(flame, intensity * 1.15, dist + 1.5, 2);
      L.position.set(w.x + t.dx * 0.62, 1.72, w.z + t.dy * 0.62);
      L.userData = { base: intensity * 1.15, ph: (t.x * 13 + t.y * 7) * 0.17 };
      this.root.add(L);
      this.lights.push(L);
    } catch {
      /* kit miss — procedural torch remains */
    }
  }

  async placeChest(d, r) {
    try {
      const mesh = await cloneProp(KIT.chest, 0.62);
      const w = cellCenter(d, r.cx, r.cy);
      mesh.position.x = w.x;
      mesh.position.z = w.z;
      mesh.rotation.y = (r.id * 1.7) % (Math.PI * 2);
      mesh.name = 'kit-chest';
      this.root.add(mesh);
    } catch { /* optional */ }
  }

  update(time) {
    for (const L of this.lights) {
      const flicker = 0.82 + 0.28 * Math.sin(time * 11 + L.userData.ph) * Math.sin(time * 5.1 + L.userData.ph * 1.4);
      L.intensity = L.userData.base * flicker;
    }
  }

  setTorchVisible(on) {
    this.root.traverse((o) => {
      if (o.name === 'kit-torch' || o.isLight) o.visible = on;
    });
  }

  dispose() {
    if (this.root.parent) this.root.parent.remove(this.root);
    while (this.root.children.length) this.root.remove(this.root.children[0]);
    this.lights = [];
    this.ready = false;
  }
}
