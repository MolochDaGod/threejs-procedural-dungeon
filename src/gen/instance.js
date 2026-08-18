/**
 * MMO dungeon instance payload.
 *
 * Node (Colyseus / grudge-api) and the Vite client both consume this shape.
 * Generation stays deterministic from { seed, theme, rooms, linear }.
 * Physics is Rapier cuboids from the same grid — no visual-mesh collision.
 */
import { VOID, FLOOR, WALL, POOL } from './cells.js';
import { buildNavMesh } from './navmesh.js';

export const INSTANCE_VERSION = 1;

export function packGrid(grid) {
  if (typeof Buffer !== 'undefined') return Buffer.from(grid).toString('base64');
  let bin = '';
  const bytes = grid instanceof Uint8Array ? grid : Uint8Array.from(grid);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function unpackGrid(b64, length) {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(b64, 'base64');
    return Uint8Array.from(buf.subarray(0, length));
  }
  const bin = atob(b64);
  const out = new Uint8Array(length ?? bin.length);
  for (let i = 0; i < out.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function dungeonToInstance(dungeon, extras = {}) {
  const nav = extras.nav || buildNavMesh(dungeon);
  const rooms = dungeon.rooms.map((r) => ({
    id: r.id,
    type: r.type,
    cx: r.cx,
    cy: r.cy,
    w: r.w,
    h: r.h,
    depth: r.depth,
  }));
  return {
    version: INSTANCE_VERSION,
    id: extras.instanceId || `dng_${dungeon.seed}_${dungeon.params?.themeKey || 'auto'}`,
    seed: dungeon.seed,
    name: dungeon.name,
    theme: dungeon.params?.themeKey || 'ancient',
    linear: extras.linear !== false,
    maxPlayers: extras.maxPlayers ?? 8,
    engine: {
      renderer: 'three',
      physics: 'rapier3d-compat',
      physicsPackage: '@dimforge/rapier3d-compat',
      physicsVersion: '^0.19.3',
      nav: extras.catalog?.nav || 'grid-8',
      cellM: extras.catalog?.cellM || 2,
      host: extras.host || 'node+browser',
      baked: extras.catalog?.baked || [],
    },
    map: {
      W: dungeon.W,
      H: dungeon.H,
      gridB64: packGrid(dungeon.grid),
      cells: { void: VOID, floor: FLOOR, wall: WALL, pool: POOL },
    },
    graph: {
      rooms,
      edges: dungeon.edges.map((e) => ({ a: e.a, b: e.b, isCritical: !!e.isCritical, isLoop: !!e.isLoop })),
      entrance: dungeon.entrance,
      boss: dungeon.boss,
    },
    nav: {
      kind: nav.kind,
      walkableCount: nav.walkableCount,
    },
    stats: dungeon.stats || {},
  };
}

export function instanceToDungeonStub(inst) {
  const grid = unpackGrid(inst.map.gridB64, inst.map.W * inst.map.H);
  return {
    valid: true,
    seed: inst.seed,
    name: inst.name,
    params: { themeKey: inst.theme },
    W: inst.map.W,
    H: inst.map.H,
    grid,
    rooms: inst.graph.rooms,
    edges: inst.graph.edges,
    entrance: inst.graph.entrance,
    boss: inst.graph.boss,
    stats: inst.stats,
  };
}
