/**
 * Dungeon terrain collider + navmesh.
 * three-mesh-bvh (ground ray / capsule) + three-pathfinding (AI clamp).
 * Walk mesh Y is DUNGEON_SI.groundY — same as visual floor top.
 */
import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { Pathfinding } from 'three-pathfinding';
import { DUNGEON_SI } from '../ssot.js';
import { TILE } from '../physics/colliders.js';
import { cellToWorld, makeGridSampler } from './ground.js';

let patched = false;
function patchThree() {
  if (patched) return;
  THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
  THREE.Mesh.prototype.raycast = acceleratedRaycast;
  patched = true;
}

const ZONE = 'dungeon';
const _down = new THREE.Vector3(0, -1, 0);
const _origin = new THREE.Vector3();
const _rc = new THREE.Raycaster();

function buildIndexedWalk(d, cells, y) {
  const c = DUNGEON_SI.cell;
  const pos = new Float32Array(cells.length * 4 * 3);
  const idx = new Uint32Array(cells.length * 6);
  let v = 0, t = 0, vi = 0;
  for (const { gx, gz } of cells) {
    const w = cellToWorld(d, gx, gz);
    const x0 = w.x - c / 2, x1 = w.x + c / 2;
    const z0 = w.z - c / 2, z1 = w.z + c / 2;
    pos.set([x0, y, z0,  x1, y, z0,  x1, y, z1,  x0, y, z1], v);
    idx.set([vi, vi + 1, vi + 2,  vi, vi + 2, vi + 3], t);
    v += 12; t += 6; vi += 4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ visible: false }));
  m.name = 'dungeon-terrain';
  m.geometry.computeBoundsTree({ maxLeafSize: 10 });
  return m;
}

function collectCells(d, pred) {
  const out = [];
  const W = d.W, H = d.H, grid = d.grid;
  for (let gz = 0; gz < H; gz++) {
    for (let gx = 0; gx < W; gx++) {
      if (pred(grid[gz * W + gx], gz * W + gx)) out.push({ gx, gz });
    }
  }
  return out;
}

function buildWalkMesh(d) {
  const y = DUNGEON_SI.groundY;
  const cells = collectCells(d, (t) => t === TILE.FLOOR);
  if (!cells.length) return null;
  return buildIndexedWalk(d, cells, y);
}

function buildWallMesh(d) {
  const cells = collectCells(d, (t) => t === TILE.WALL);
  if (!cells.length) return null;
  const c = DUNGEON_SI.cell;
  const h = DUNGEON_SI.wallH;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const pos = geo.attributes.position;
  const out = new Float32Array(cells.length * pos.count * 3);
  const tmp = new THREE.Vector3();
  let o = 0;
  for (const { gx, gz } of cells) {
    const w = cellToWorld(d, gx, gz);
    for (let i = 0; i < pos.count; i++) {
      tmp.fromBufferAttribute(pos, i);
      tmp.x = w.x + tmp.x * c;
      tmp.y = DUNGEON_SI.groundY + tmp.y * h;
      tmp.z = w.z + tmp.z * c;
      out[o++] = tmp.x; out[o++] = tmp.y; out[o++] = tmp.z;
    }
  }
  geo.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(out, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ visible: false }));
  m.name = 'dungeon-walls';
  m.geometry.computeBoundsTree({ maxLeafSize: 12 });
  return m;
}

/**
 * Attach sampler + BVH walk/walls + pathfinding zone onto the dungeon document.
 * Call once after generateDungeon / compileMechanics.
 */
export function attachDungeonTerrain(dungeon, group = null) {
  patchThree();
  const sampler = makeGridSampler(dungeon);
  const walk = buildWalkMesh(dungeon);
  const walls = buildWallMesh(dungeon);
  let nav = null;
  let zoneOk = false;
  if (walk) {
    try {
      nav = new Pathfinding();
      const zone = Pathfinding.createZone(walk.geometry);
      nav.setZoneData(ZONE, zone);
      zoneOk = true;
    } catch (err) {
      console.warn('[grudge-dungeon] navmesh zone miss', err);
      nav = null;
    }
  }
  if (group) {
    if (walk) group.add(walk);
    if (walls) group.add(walls);
  }
  dungeon.terrain = {
    groundY: DUNGEON_SI.groundY,
    sampler,
    walk,
    walls,
    nav,
    zone: ZONE,
    zoneOk,
    sample(wx, wz) {
      const g = sampler(wx, wz);
      if (g != null) return g;
      if (!walk?.geometry?.boundsTree) return DUNGEON_SI.groundY;
      _origin.set(wx, DUNGEON_SI.groundY + 8, wz);
      _rc.set(_origin, _down);
      _rc.firstHitOnly = true;
      _rc.far = 16;
      const hits = _rc.intersectObject(walk, false);
      return hits[0] ? hits[0].point.y : null;
    },
  };
  return dungeon.terrain;
}

export function disposeDungeonTerrain(dungeon) {
  const t = dungeon?.terrain;
  if (!t) return;
  for (const m of [t.walk, t.walls]) {
    if (!m) continue;
    m.parent?.remove(m);
    m.geometry.disposeBoundsTree?.();
    m.geometry.dispose();
    m.material.dispose?.();
  }
  dungeon.terrain = null;
}

export { ZONE, MeshBVH };
