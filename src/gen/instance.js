/**
 * MMO dungeon instance payload.
 *
 * Node (Colyseus / grudge-api) and the Vite client both consume this shape.
 * Generation stays deterministic from { seed, theme, rooms, linear }.
 * Physics is Rapier cuboids from the same grid — no visual-mesh collision.
 */
import { VOID, FLOOR, WALL, POOL, CELL_M } from './cells.js';
import { buildNavMesh } from './navmesh.js';
import { compileDressPlan, dressSummary } from './dressPlan.js';

export const INSTANCE_VERSION = 3;

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
  const dress = extras.dress || compileDressPlan(dungeon);
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
      fixedDt: 1 / 60,
      tickHz: 60,
      nav: extras.catalog?.nav || 'grid-8',
      cellM: extras.catalog?.cellM || CELL_M,
      host: extras.host || 'node+browser',
      baked: extras.catalog?.baked || [],
      three: 'r185',
      nodes: extras.nodes || [
        { name: 'Terrain', kind: 'static' },
        { name: 'Cover', kind: 'instanced' },
        { name: 'Dress', kind: 'kit-isolate' },
        { name: 'Actors', kind: 'skinned' },
        { name: 'Vfx', kind: 'transient' },
        { name: 'Pinata', kind: 'dynamic-chunks' },
      ],
    },
    map: {
      W: dungeon.W,
      H: dungeon.H,
      gridB64: packGrid(dungeon.grid),
      flagsB64: dungeon.flags ? packGrid(dungeon.flags) : null,
      cells: { void: VOID, floor: FLOOR, wall: WALL, pool: POOL },
      cellRole: dungeon.cellRole ? Array.from(dungeon.cellRole) : null,
      platforms: dungeon.platforms || [],
    },
    graph: {
      rooms,
      edges: dungeon.edges.map((e) => ({ a: e.a, b: e.b, isCritical: !!e.isCritical, isLoop: !!e.isLoop })),
      entrance: dungeon.entrance,
      boss: dungeon.boss,
      sockets: extras.sockets || dungeon.eventRoom?.sockets || null,
      eventRoom: dungeon.eventRoom || null,
    },
    nav: {
      kind: nav.kind,
      walkableCount: nav.walkableCount,
    },
    dress,
    dressSummary: dressSummary(dress),
    encounters: extras.encounters || null,
    skills: extras.skills || null,
    kind: extras.kind || dungeon.params?.kind || 'biome',
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
