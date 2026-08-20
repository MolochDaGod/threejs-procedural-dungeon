/**
 * Physical collider assets from a carved dungeon grid.
 *
 * Greedy-merged cuboids, Rapier-ready (fixed box / sensor). Play uses the
 * same descriptors for kinematic capsule vs AABB — no second physics lib.
 *
 * Node contract matches fleet WorldMeshNode collider fields
 * (gameopen worldMeshDeploy): id, kind, physicsLayer, collider, position, location.
 */
import { DUNGEON_SI, PLAY } from '../ssot.js';
import { poolRule } from '../ruleset.js';

export const TILE = { VOID: 0, FLOOR: 1, WALL: 2, POOL: 3 };

export const COLLIDER_KIND = {
  wall: 'wall',
  void_shell: 'void_shell',
  floor: 'floor',
  pool: 'pool',
  doorway: 'doorway',
  room: 'room',
  cover: 'cover',
};

function at(grid, W, H, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return TILE.VOID;
  return grid[y * W + x];
}

function cellCenter(d, gx, gy) {
  const c = DUNGEON_SI.cell;
  return {
    x: (gx - d.W / 2 + 0.5) * c,
    z: (gy - d.H / 2 + 0.5) * c,
  };
}

function rectWorld(d, rx, ry, rw, rh, y, hy) {
  const c = DUNGEON_SI.cell;
  const cx = (rx + rw / 2 - d.W / 2) * c;
  const cz = (ry + rh / 2 - d.H / 2) * c;
  return {
    position: [cx, y, cz],
    collider: { kind: 'box', params: [(rw * c) / 2, hy, (rh * c) / 2] },
  };
}

/** Greedy rectangle merge over a boolean mask (Uint8 / 0-1). */
export function greedyRects(mask, W, H) {
  const used = new Uint8Array(W * H);
  const rects = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!mask[i] || used[i]) continue;
      let w = 1;
      while (x + w < W && mask[y * W + x + w] && !used[y * W + x + w]) w++;
      let h = 1;
      grow: while (y + h < H) {
        for (let dx = 0; dx < w; dx++) {
          const j = (y + h) * W + x + dx;
          if (!mask[j] || used[j]) break grow;
        }
        h++;
      }
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) used[(y + dy) * W + x + dx] = 1;
      }
      rects.push({ x, y, w, h });
    }
  }
  return rects;
}

function maskEq(grid, W, H, pred) {
  const m = new Uint8Array(W * H);
  for (let i = 0; i < m.length; i++) m[i] = pred(grid[i], i) ? 1 : 0;
  return m;
}

function node(id, kind, physicsLayer, world, extra = {}) {
  return {
    id,
    meshKey: `dungeon/${kind}`,
    kind,
    position: world.position,
    physicsLayer,
    collider: world.collider,
    location: extra.location || { tags: ['dungeon', kind] },
    solid: extra.solid !== false,
    sensor: !!extra.sensor,
    ...extra,
  };
}

/**
 * @param {object} dungeon — generateDungeon document (grid, rooms, doorway)
 * @returns {object[]} WorldMeshNode-shaped colliders
 */
export function buildColliderAssets(dungeon) {
  const d = dungeon;
  const W = d.W;
  const H = d.H;
  const grid = d.grid;
  const doorway = d.doorway;
  const roomId = d.roomId;
  const nodes = [];
  const wallH = DUNGEON_SI.wallH;
  const cell = DUNGEON_SI.cell;
  const groundY = DUNGEON_SI.groundY;
  const floorH = DUNGEON_SI.floorH;

  const wallMask = maskEq(grid, W, H, (t) => t === TILE.WALL);
  greedyRects(wallMask, W, H).forEach((r, i) => {
    nodes.push(node(
      `col-wall-${i}`,
      COLLIDER_KIND.wall,
      'Terrain',
      rectWorld(d, r.x, r.y, r.w, r.h, groundY + wallH / 2, wallH / 2),
      { location: { tags: ['dungeon', 'wall'] } },
    ));
  });

  const voidMask = maskEq(grid, W, H, (t) => t === TILE.VOID);
  greedyRects(voidMask, W, H).forEach((r, i) => {
    nodes.push(node(
      `col-void-${i}`,
      COLLIDER_KIND.void_shell,
      'Terrain',
      rectWorld(d, r.x, r.y, r.w, r.h, groundY + wallH / 2, wallH / 2),
      { location: { tags: ['dungeon', 'void'] } },
    ));
  });

  const floorMask = maskEq(grid, W, H, (t, i) => t === TILE.FLOOR && !(doorway && doorway[i]));
  greedyRects(floorMask, W, H).forEach((r, i) => {
    nodes.push(node(
      `col-floor-${i}`,
      COLLIDER_KIND.floor,
      'Terrain',
      rectWorld(d, r.x, r.y, r.w, r.h, groundY - floorH / 2, floorH / 2),
      { solid: false, location: { tags: ['dungeon', 'floor'] } },
    ));
  });

  const pool = poolRule(d.params?.themeKey);
  const poolMask = maskEq(grid, W, H, (t) => t === TILE.POOL);
  greedyRects(poolMask, W, H).forEach((r, i) => {
    nodes.push(node(
      `col-pool-${i}`,
      COLLIDER_KIND.pool,
      'Water',
      rectWorld(d, r.x, r.y, r.w, r.h, 0.28, 0.28),
      {
        solid: !!pool.solid,
        sensor: true,
        hazard: pool.dps > 0,
        dps: pool.dps,
        slow: pool.slow,
        location: { tags: ['dungeon', 'pool', pool.label] },
      },
    ));
  });

  const doorMask = maskEq(grid, W, H, (_t, i) => !!(doorway && doorway[i]));
  greedyRects(doorMask, W, H).forEach((r, i) => {
    const cx = r.x + Math.floor(r.w / 2);
    const cy = r.y + Math.floor(r.h / 2);
    const rid = roomId ? roomId[cy * W + cx] : -1;
    const nbrs = new Set();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = at(roomId || grid, W, H, cx + dx, cy + dy);
      if (roomId && n >= 0) nbrs.add(n);
    }
    const rooms = [...nbrs];
    nodes.push(node(
      `col-door-${i}`,
      COLLIDER_KIND.doorway,
      'Trigger',
      rectWorld(d, r.x, r.y, r.w, r.h, DUNGEON_SI.doorH / 2, DUNGEON_SI.doorH / 2),
      {
        solid: false,
        sensor: true,
        roomId: rid,
        linkRooms: rooms,
        location: { tags: ['dungeon', 'doorway'], pin: rid >= 0 ? `room-${rid}` : undefined },
      },
    ));
  });

  if (d.flags) {
    const coverMask = new Uint8Array(W * H);
    for (let i = 0; i < coverMask.length; i++) {
      if ((d.flags[i] & 32) && grid[i] === TILE.FLOOR) coverMask[i] = 1;
    }
    greedyRects(coverMask, W, H).forEach((r, i) => {
      nodes.push(node(
        `col-cover-${i}`,
        COLLIDER_KIND.cover,
        'Terrain',
        rectWorld(d, r.x, r.y, r.w, r.h, groundY + 1.4, 1.4),
        { location: { tags: ['dungeon', 'cover', 'pillar'] } },
      ));
    });
  }

  if (d.rooms) {
    for (const r of d.rooms) {
      const w = r.w * cell;
      const h = r.h * cell;
      const p = cellCenter(d, r.cx, r.cy);
      nodes.push(node(
        `col-room-${r.id}`,
        COLLIDER_KIND.room,
        'Trigger',
        {
          position: [p.x, wallH / 2, p.z],
          collider: { kind: 'box', params: [w / 2, wallH / 2, h / 2] },
        },
        {
          solid: false,
          sensor: true,
          roomId: r.id,
          roomType: r.type,
          location: { tags: ['dungeon', 'room', r.type], pin: `room-${r.id}` },
        },
      ));
    }
  }

  return nodes;
}

export function aabbHits(node, x, z, radius) {
  const [px, , pz] = node.position;
  const [hx, , hz] = node.collider.params;
  const r = radius || 0;
  return Math.abs(x - px) <= hx + r && Math.abs(z - pz) <= hz + r;
}

export function hitsSolid(colliders, x, z, radius = PLAY.capsuleR) {
  if (!colliders) return false;
  for (const n of colliders) {
    if (!n.solid || n.collider?.kind !== 'box') continue;
    if (aabbHits(n, x, z, radius)) return true;
  }
  return false;
}

export function queryTriggers(colliders, x, z, radius = PLAY.capsuleR) {
  const hit = [];
  if (!colliders) return hit;
  for (const n of colliders) {
    if (!n.sensor || n.collider?.kind !== 'box') continue;
    if (aabbHits(n, x, z, radius)) hit.push(n);
  }
  return hit;
}

export function rapierDesc(node) {
  const [hx, hy, hz] = node.collider.params;
  return {
    body: 'fixed',
    shape: 'cuboid',
    hx, hy, hz,
    translation: node.position,
    sensor: !!node.sensor,
    layer: node.physicsLayer,
  };
}
