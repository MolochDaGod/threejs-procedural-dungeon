/**
 * CDN kit dressing — KayKit torch / chest / banner on generated cells.
 * Wall sconces sit at ~1.6 m and feed a small PointLight pool (soft decay).
 */
import * as THREE from 'three';
import { DRESSING } from '../ssot.js';
import { cellCenter } from '../gen/cells.js';
import { plantObjectOnTerrain } from '../terrain/footPlant.js';
import { loadGltf } from './assets.js';

const KIT = DRESSING;

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

const TORCH_POOL = 8;
const TORCH_SOFT = { intensity: 1.55, distance: 7.2, decay: 2 };

export class DungeonDressing {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'dungeon-dressing';
    this.lights = [];
    this.pool = [];
    this.anchors = [];
    this.ready = false;
  }

  async apply(dungeon, parent, theme) {
    this.dispose();
    if (!dungeon?.valid) return;
    parent.add(this.root);
    const flame = theme?.flame ?? 0xffa640;
    const torchCol = theme?.torchLight?.[0] ?? 0xff9a48;

    const jobs = [];
    for (const t of dungeon.torches || []) {
      jobs.push(this.placeTorch(dungeon, t, flame, torchCol));
    }
    for (const r of dungeon.rooms || []) {
      if (r.type === 'treasure') jobs.push(this.placeChest(dungeon, r));
    }
    await Promise.allSettled(jobs);
    for (let i = 0; i < TORCH_POOL; i++) {
      const L = new THREE.PointLight(torchCol, TORCH_SOFT.intensity, TORCH_SOFT.distance, TORCH_SOFT.decay);
      L.castShadow = false;
      L.visible = false;
      L.userData.pool = true;
      this.root.add(L);
      this.pool.push(L);
      this.lights.push(L);
    }
    this.ready = true;
  }

  async placeTorch(d, t, flame, torchCol) {
    try {
      const mesh = await cloneProp(KIT.torch, 1.05);
      const w = cellCenter(d, t.x, t.y);
      mesh.position.x = w.x + t.dx * 0.36;
      mesh.position.z = w.z + t.dy * 0.36;
      mesh.rotation.y = Math.atan2(t.dx, t.dy);
      mesh.name = 'kit-torch';
      this.root.add(mesh);
      plantObjectOnTerrain(mesh, d.terrain?.sample);
      mesh.position.y += 0.58;
      mesh.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        o.material.emissive = new THREE.Color(flame);
        o.material.emissiveIntensity = 0.62;
        o.castShadow = false;
      });
      this.anchors.push({
        x: w.x + t.dx * 0.62,
        y: mesh.position.y + 0.72,
        z: w.z + t.dy * 0.62,
        color: torchCol,
        ph: (t.x * 13 + t.y * 7) * 0.17,
      });
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
      plantObjectOnTerrain(mesh, d.terrain?.sample);
    } catch { /* optional */ }
  }

  update(time, origin = null, crawl = false) {
    if (!crawl || !origin || !this.anchors.length) {
      for (const L of this.pool) L.visible = false;
      return;
    }
    const ranked = this.anchors.map((a) => {
      const dx = a.x - origin.x;
      const dz = a.z - origin.z;
      return { a, d: dx * dx + dz * dz };
    }).sort((p, q) => p.d - q.d);
    const lim = 16 * 16;
    for (let i = 0; i < this.pool.length; i++) {
      const L = this.pool[i];
      const hit = ranked[i];
      if (!hit || hit.d > lim) {
        L.visible = false;
        continue;
      }
      const a = hit.a;
      L.visible = true;
      L.color.setHex(a.color);
      L.position.set(a.x, a.y, a.z);
      L.distance = TORCH_SOFT.distance;
      L.decay = TORCH_SOFT.decay;
      const flick = 0.91 + 0.09 * Math.sin(time * 5.4 + a.ph) * Math.sin(time * 2.3 + a.ph * 1.3);
      L.intensity = TORCH_SOFT.intensity * flick;
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
    this.pool = [];
    this.anchors = [];
    this.ready = false;
  }
}
