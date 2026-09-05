/**
 * Team lobby on the downloaded cave-mountain overlook.
 * Disk: D:\Games\Models\3_evil_rock_mountains_with_cave_stylized.glb
 * Kit: triad_mountain (public/warlords-dungeon-kit.json). 142 MB — lazy, SI 14 m.
 * Five glowing pads: player + 3 allies + dungeon mouth. Camera looks at the cave.
 */
import * as THREE from 'three';
import { loadGltf } from './assets.js';

export const LOBBY_PAD_COUNT = 5;
export const MOUNTAIN_HEIGHT_M = 14;

export const MOUNTAIN_URLS = [
  '/@fs/D:/Games/Models/3_evil_rock_mountains_with_cave_stylized.glb',
  '/models/props/cave-gate.glb',
];

const PAD_COLOR = [0xffe08a, 0x3fd0bb, 0x9b6cf0, 0x5a8fe8, 0xe8973f];

function glowMat(color, opacity = 0.85) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export class TeamLobby {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'team-lobby';
    this.pads = [];
    this.lookAt = new THREE.Vector3(0, 2.2, 8);
    this.camFrom = new THREE.Vector3(0, 4.2, -7.5);
    this.ready = false;
  }

  async mount(origin) {
    this.dispose();
    this.group.position.set(origin.x, origin.y || 0, origin.z);
    this.scene.add(this.group);

    let mountain = null;
    for (const url of MOUNTAIN_URLS) {
      try {
        const gltf = await loadGltf(url);
        if (!gltf?.scene) continue;
        mountain = gltf.scene.clone(true);
        break;
      } catch {
        /* try next */
      }
    }
    if (mountain) {
      mountain.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mountain);
      const size = box.getSize(new THREE.Vector3());
      const tall = Math.max(size.y, 0.001);
      mountain.scale.multiplyScalar(MOUNTAIN_HEIGHT_M / tall);
      mountain.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(mountain);
      mountain.position.y -= box2.min.y;
      mountain.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      this.group.add(mountain);
      const top = box2.max.y - box2.min.y;
      this._placePads(0, Math.max(3.2, top * 0.42), 0);
      this.lookAt.set(0, 2.4, Math.max(6, size.z * 0.18));
      this.camFrom.set(0, Math.max(4.4, top * 0.48), -8.2);
    } else {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(6.5, MOUNTAIN_HEIGHT_M, 7),
        new THREE.MeshStandardMaterial({ color: 0x3a342e, roughness: 0.92, metalness: 0.04 }),
      );
      cone.position.y = MOUNTAIN_HEIGHT_M * 0.5;
      this.group.add(cone);
      this._placePads(0, MOUNTAIN_HEIGHT_M * 0.38, 0);
      this.lookAt.set(0, 2.2, 9);
      this.camFrom.set(0, 5.2, -8);
    }
    this.ready = true;
    return this;
  }

  _placePads(cx, cy, cz) {
    const spread = 1.55;
    for (let i = 0; i < LOBBY_PAD_COUNT; i++) {
      const x = cx + (i - 2) * spread;
      const root = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), glowMat(PAD_COLOR[i], 0.55));
      disc.rotation.x = -Math.PI / 2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 24), glowMat(PAD_COLOR[i], 0.95));
      ring.rotation.x = Math.PI / 2;
      root.add(disc, ring);
      root.position.set(x, cy + 0.04, cz);
      this.group.add(root);
      this.pads.push({ root, index: i, local: new THREE.Vector3(x, cy, cz) });
    }
  }

  worldPad(i) {
    const p = this.pads[i];
    if (!p) return this.group.position.clone();
    const w = p.local.clone();
    this.group.localToWorld(w);
    return w;
  }

  cameraPose() {
    const from = this.camFrom.clone();
    const at = this.lookAt.clone();
    this.group.localToWorld(from);
    this.group.localToWorld(at);
    return { from, at };
  }

  update(t) {
    for (const p of this.pads) {
      const pulse = 0.55 + 0.35 * Math.sin(t * 3.2 + p.index * 0.9);
      p.root.children.forEach((c) => {
        if (c.material) c.material.opacity = pulse;
      });
    }
  }

  dispose() {
    if (this.group.parent) this.group.parent.remove(this.group);
    this.group.traverse((o) => {
      o.geometry?.dispose?.();
      if (o.material?.dispose) o.material.dispose();
    });
    this.pads.length = 0;
    this.ready = false;
    this.group = new THREE.Group();
    this.group.name = 'team-lobby';
  }
}
