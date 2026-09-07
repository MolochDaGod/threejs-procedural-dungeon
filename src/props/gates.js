/**
 * Theme-tinted room gates — the_gate.glb in doorway gaps (d.arches).
 * Extends clear_gate: E opens. Instant if the hall is clear; 5s cast + room aggro if not.
 */
import * as THREE from 'three';
import { DRESSING, DUNGEON_SI, PLAY } from '../ssot.js';
import { loadGltf } from '../play/assets.js';
import { CELL_M, worldOf } from '../gen/cells.js';
import { isGatedRoom } from '../ruleset.js';
import { lookOf } from '../content/looks/matlib.js';
import { applyBiomeLook } from './saharaKit.js';

let proto = null;

export const GATE_URL = DRESSING.gate;
export const GATE_FORCE_SEC = PLAY.gate?.forceSec || 5;

async function loadProto() {
  if (proto) return proto;
  const gltf = await loadGltf(GATE_URL);
  proto = gltf;
  return proto;
}

function roomsBeside(d, arch) {
  const ids = [];
  const idx = (x, y) => y * d.W + x;
  const px = arch.px || 0;
  const py = arch.py || 0;
  const half = Math.max(0, (arch.len || 1) / 2);
  for (let k = -half; k <= half; k += 0.5) {
    const gx = Math.round(arch.x + px * k);
    const gy = Math.round(arch.y + py * k);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) {
      const x = gx + dx;
      const y = gy + dy;
      if (x < 0 || y < 0 || x >= d.W || y >= d.H) continue;
      const id = d.roomId[idx(x, y)];
      if (id >= 0 && !ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

function assignRooms(d, arch) {
  const ids = roomsBeside(d, arch);
  const rooms = ids.map((id) => d.rooms[id]).filter(Boolean);
  rooms.sort((a, b) => (a.depth || 0) - (b.depth || 0) || a.id - b.id);
  const fromRoom = rooms[0]?.id ?? -1;
  const toRoom = rooms.length > 1 ? rooms[rooms.length - 1].id : (rooms[0]?.id ?? -1);
  return { fromRoom, toRoom, gated: rooms.some((r) => isGatedRoom(r)) };
}

function fitGate(root, wantW, wantH, wantD) {
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  if (Math.max(size.x, size.y, size.z) > 40) root.scale.setScalar(0.01);
  root.updateMatrixWorld(true);
  const s2 = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  root.scale.x *= wantW / Math.max(s2.x, 0.001);
  root.scale.y *= wantH / Math.max(s2.y, 0.001);
  root.scale.z *= wantD / Math.max(s2.z, 0.001);
  root.updateMatrixWorld(true);
  const planted = new THREE.Box3().setFromObject(root);
  root.position.y -= planted.min.y;
}

function paintTheme(root, themeKey) {
  const look = lookOf(themeKey);
  const mats = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    if (o.material) {
      o.material = o.material.clone();
      mats.push(o.material);
    }
  });
  applyBiomeLook(themeKey, mats, { keepInstanceTint: false }).then((applied) => {
    if (!applied) return;
    for (const m of mats) {
      if (look?.tint) m.color.set(look.tint);
      m.roughness = 0.72;
      m.metalness = 0.12;
      m.needsUpdate = true;
    }
  });
}

export class DungeonGates {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'dungeon-gates';
    this.items = [];
  }

  async plant(dungeon, parent, { cellSpace = false } = {}) {
    this.dispose();
    if (!dungeon?.arches?.length || !parent) return 0;
    parent.add(this.root);
    let gltf;
    try {
      gltf = await loadProto();
    } catch (err) {
      console.warn('[grudge-dungeon] gate miss', err);
      return 0;
    }
    const theme = dungeon.params?.themeKey || 'ancient';
    const cell = cellSpace ? 1 : CELL_M;
    const wantH = (PLAY.gate?.heightM || 3.25) / (cellSpace ? CELL_M : 1);
    const wantD = (PLAY.gate?.thickM || 0.55) / (cellSpace ? CELL_M : 1);
    for (const arch of dungeon.arches) {
      const rooms = assignRooms(dungeon, arch);
      if (!rooms.gated && rooms.toRoom < 0) continue;
      const src = gltf.scene.clone(true);
      const wrap = new THREE.Group();
      wrap.name = `gate-${rooms.fromRoom}-${rooms.toRoom}`;
      wrap.add(src);
      const local = cellSpace
        ? { x: arch.x - dungeon.W / 2 + 0.5, z: arch.y - dungeon.H / 2 + 0.5 }
        : worldOf(dungeon, arch.x, arch.y);
      const world = worldOf(dungeon, arch.x, arch.y);
      wrap.position.set(local.x, DUNGEON_SI.groundY, local.z);
      wrap.rotation.y = arch.px === 1 ? 0 : Math.PI / 2;
      this.root.add(wrap);
      const wantW = Math.max(cell * 0.9, arch.len * cell * 0.95);
      fitGate(wrap, wantW, wantH, wantD);
      wrap.position.set(local.x, DUNGEON_SI.groundY, local.z);
      paintTheme(src, theme);
      const mixer = gltf.animations?.length ? new THREE.AnimationMixer(src) : null;
      const actions = mixer
        ? gltf.animations.map((clip) => {
          const a = mixer.clipAction(clip);
          a.setLoop(THREE.LoopOnce, 1);
          a.clampWhenFinished = true;
          return a;
        })
        : [];
      const item = {
        wrap,
        mixer,
        actions,
        arch,
        fromRoom: rooms.fromRoom,
        toRoom: rooms.toRoom,
        open: false,
        pos: new THREE.Vector3(world.x, 0, world.z),
        halfW: Math.max(CELL_M * 0.55, (arch.len || 1) * CELL_M * 0.5),
        cellSpace,
      };
      wrap.userData.gate = item;
      this.items.push(item);
    }
    return this.items.length;
  }

  near(wx, wz, reach = PLAY.gate?.reach || 2.2) {
    let best = null;
    let bestD = reach;
    for (const g of this.items) {
      if (g.open) continue;
      const dx = g.pos.x - wx;
      const dz = g.pos.z - wz;
      const d = Math.hypot(dx, dz);
      if (d < bestD) { best = g; bestD = d; }
    }
    return best;
  }

  blocks(wx, wz) {
    for (const g of this.items) {
      if (g.open) continue;
      const alongX = g.arch?.px === 1;
      const dx = Math.abs(wx - g.pos.x);
      const dz = Math.abs(wz - g.pos.z);
      const halfW = g.halfW || CELL_M * 0.7;
      const halfD = (PLAY.gate?.thickM || 0.55) * 0.7 + 0.35;
      if (alongX) {
        if (dx <= halfW && dz <= halfD) return true;
      } else if (dx <= halfD && dz <= halfW) return true;
    }
    return false;
  }

  playOpen(g) {
    if (!g || g.open) return false;
    g.open = true;
    if (g.actions?.length) {
      for (const a of g.actions) a.reset().play();
    } else {
      g.wrap.rotation.y += Math.PI * 0.45;
      g.wrap.position.y += 0.15;
    }
    return true;
  }

  openForRoom(roomId) {
    let n = 0;
    for (const g of this.items) {
      if (g.open) continue;
      if (g.fromRoom === roomId) {
        this.playOpen(g);
        n++;
      }
    }
    return n;
  }

  update(dt) {
    for (const g of this.items) g.mixer?.update(dt);
  }

  dispose() {
    if (this.root.parent) this.root.parent.remove(this.root);
    while (this.root.children.length) this.root.remove(this.root.children[0]);
    this.items = [];
  }
}
