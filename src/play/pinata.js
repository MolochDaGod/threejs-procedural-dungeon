/**
 * Dungeon pinata — fleet harvest pattern (HP stages + debris chunks).
 * Not ConvexObjectBreaker. Same Rapier world; drop cuboid on break.
 */
import * as THREE from 'three';
import { CELL_FLAG } from '../grid/cells.js';
import { DUNGEON_SI } from '../ssot.js';

export const PINATA_HP = {
  wall: 110,
  pillar: 88,
  debris: 34,
  barrier: 52,
  table: 28,
  barrel: 36,
  chair: 18,
  pot: 12,
  coffin: 55,
  brick: 40,
};

export const PINATA_DROP = {
  wall: 'stone_chip',
  pillar: 'stone_chip',
  debris: 'wood_scrap',
  barrier: 'wood_scrap',
  table: 'wood_scrap',
  barrel: 'wood_scrap',
  chair: 'wood_scrap',
  pot: 'cloth_scrap',
  coffin: 'cloth_scrap',
  brick: 'stone_chip',
};

const SKIP = new Set(['door', 'chest', 'torch', 'scene', 'trap', 'prop']);

export class DungeonPinata {
  constructor(group, { onBreak, flash } = {}) {
    this.group = group;
    this.nodes = new Map();
    this.onBreak = onBreak;
    this.flash = flash;
    this.chunks = [];
    this.geo = new THREE.IcosahedronGeometry(0.12, 0);
    this.mat = new THREE.MeshStandardMaterial({ color: 0x8a7a62, roughness: 0.9 });
  }

  hpFor(role, pieceId) {
    if (PINATA_HP[pieceId]) return PINATA_HP[pieceId];
    return PINATA_HP[role] || 30;
  }

  registerWrap(wrap) {
    const role = wrap.userData?.role;
    if (!role || SKIP.has(role)) return null;
    const id = wrap.name || `pinata-${this.nodes.size}`;
    const maxHp = wrap.userData.hp || this.hpFor(role, wrap.userData.pieceId);
    const node = {
      id,
      role,
      hp: maxHp,
      maxHp,
      mesh: wrap,
      broken: false,
      gx: wrap.userData.gx,
      gz: wrap.userData.gz,
      i: wrap.userData.i,
      drop: PINATA_DROP[role] || 'wood_scrap',
    };
    wrap.userData.harvestId = id;
    wrap.userData.pinata = node;
    this.nodes.set(id, node);
    return node;
  }

  registerDungeon(dungeon) {
    let n = 0;
    const meshes = dungeon?.coverMeshes || {};
    for (const wrap of Object.values(meshes)) {
      if (this.registerWrap(wrap)) n++;
    }
    return n;
  }

  splash(origin, radius, dmg, tool = 'any') {
    let hits = 0;
    let broken = 0;
    const r2 = radius * radius;
    for (const n of this.nodes.values()) {
      if (n.broken || !n.mesh.visible) continue;
      const p = n.mesh.position;
      const dx = p.x - origin.x;
      const dz = p.z - origin.z;
      if (dx * dx + dz * dz > r2) continue;
      const res = this.hit(n.id, dmg, tool);
      if (res.hit) hits++;
      if (res.broken) broken++;
    }
    return { hits, broken };
  }

  nearest(origin, maxDist = 2.8) {
    let best = null;
    let d0 = maxDist;
    for (const n of this.nodes.values()) {
      if (n.broken) continue;
      const d = origin.distanceTo(n.mesh.position);
      if (d < d0) { d0 = d; best = n; }
    }
    return best;
  }

  hit(id, power, tool = 'any') {
    const n = this.nodes.get(id);
    if (!n || n.broken) return { hit: false, broken: false, hp: 0, maxHp: 0 };
    const dmg = Math.max(1, Math.floor(power));
    n.hp = Math.max(0, n.hp - dmg);
    const frac = n.hp / n.maxHp;
    n.mesh.scale.setScalar(0.92 + 0.08 * frac);
    if (n.hp <= 0) {
      n.broken = true;
      n.mesh.visible = false;
      this.burst(n.mesh.position, n.role);
      this.flash?.(`BREAK · ${n.role}`);
      this.onBreak?.(n);
      return { hit: true, broken: true, hp: 0, maxHp: n.maxHp, drop: n.drop, node: n };
    }
    this.flash?.(`${n.role} ${n.hp}/${n.maxHp}`);
    return { hit: true, broken: false, hp: n.hp, maxHp: n.maxHp, node: n };
  }

  burst(pos, role) {
    const col = role === 'wall' || role === 'pillar' || role === 'brick' ? 0x7a7268 : 0x6b5340;
    const n = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.geo, this.mat.clone());
      m.material.color.setHex(col);
      m.position.copy(pos);
      m.position.y += 0.4;
      m.castShadow = true;
      this.group.add(m);
      this.chunks.push({
        mesh: m,
        vel: new THREE.Vector3((Math.random() - 0.5) * 4.2, 2.4 + Math.random() * 2.2, (Math.random() - 0.5) * 4.2),
        life: 1.15 + Math.random() * 0.4,
      });
    }
  }

  update(dt) {
    const g = DUNGEON_SI.gravity || -30;
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      c.life -= dt;
      c.vel.y += g * dt;
      c.mesh.position.addScaledVector(c.vel, dt);
      c.mesh.rotation.x += dt * 4;
      c.mesh.rotation.z += dt * 3;
      if (c.mesh.position.y < 0.05) {
        c.mesh.position.y = 0.05;
        c.vel.y *= -0.25;
        c.vel.x *= 0.6;
        c.vel.z *= 0.6;
      }
      if (c.life <= 0) {
        this.group.remove(c.mesh);
        c.mesh.geometry = this.geo;
        this.chunks.splice(i, 1);
      }
    }
  }

  clear() {
    for (const c of this.chunks) this.group.remove(c.mesh);
    this.chunks.length = 0;
    this.nodes.clear();
  }
}

export function clearPinataCell(dungeon, node) {
  if (!dungeon?.flags || node.i == null) return;
  dungeon.flags[node.i] = dungeon.flags[node.i] & ~(CELL_FLAG.BLOCK | CELL_FLAG.BARRIER);
}
