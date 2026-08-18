/**
 * Grid navmesh for generated Warlords dungeons.
 * 8-connected FLOOR graph + line-of-sight string pull.
 * Recast stays for authored cave GLBs; this bake ships in the instance payload.
 */
import { WALL, POOL, CELL_M, inBounds, worldOf, isWalkableCell } from './cells.js';

const DIRS8 = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.41421356],
  [1, -1, 1.41421356],
  [-1, 1, 1.41421356],
  [-1, -1, 1.41421356],
];

export function buildNavMesh(dungeon) {
  const { W, H, grid } = dungeon;
  const walkable = [];
  const indexOf = new Int32Array(W * H).fill(-1);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!isWalkableCell(grid[i])) continue;
      indexOf[i] = walkable.length;
      const w = worldOf(dungeon, x, y);
      walkable.push({ x, y, wx: w.x, wz: w.z, i });
    }
  }

  const neighbors = walkable.map((n) => {
    const out = [];
    for (const [dx, dy, cost] of DIRS8) {
      const nx = n.x + dx;
      const ny = n.y + dy;
      if (!inBounds(dungeon, nx, ny)) continue;
      if (dx && dy) {
        if (!isWalkableCell(grid[n.y * W + (n.x + dx)])) continue;
        if (!isWalkableCell(grid[(n.y + dy) * W + n.x])) continue;
      }
      const ni = indexOf[ny * W + nx];
      if (ni >= 0) out.push({ i: ni, cost });
    }
    return out;
  });

  return {
    version: 2,
    kind: 'grid-8',
    cellM: CELL_M,
    walkableCount: walkable.length,
    W,
    H,
    walkable,
    neighbors,
    indexOf,
    dungeon,
  };
}

export function nearestNode(nav, wx, wz) {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < nav.walkable.length; i++) {
    const n = nav.walkable[i];
    const dx = n.wx - wx;
    const dz = n.wz - wz;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** A* on the 4-connected floor graph. Returns world-space waypoints (incl. goal). */
export function findPath(nav, fromWx, fromWz, toWx, toWz) {
  const start = nearestNode(nav, fromWx, fromWz);
  const goal = nearestNode(nav, toWx, toWz);
  if (start < 0 || goal < 0) return [];
  if (start === goal) return [{ x: toWx, z: toWz }];

  const N = nav.walkable.length;
  const gScore = new Float64Array(N).fill(Infinity);
  const fScore = new Float64Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const open = [start];
  const inOpen = new Uint8Array(N);
  inOpen[start] = 1;
  gScore[start] = 0;
  fScore[start] = heur(nav, start, goal);

  while (open.length) {
    let bi = 0;
    let best = open[0];
    for (let i = 1; i < open.length; i++) {
      if (fScore[open[i]] < fScore[best]) {
        best = open[i];
        bi = i;
      }
    }
    if (best === goal) return reconstruct(nav, came, best, toWx, toWz);
    open.splice(bi, 1);
    inOpen[best] = 0;
    for (const nb of nav.neighbors[best]) {
      const tentative = gScore[best] + nb.cost;
      if (tentative >= gScore[nb.i]) continue;
      came[nb.i] = best;
      gScore[nb.i] = tentative;
      fScore[nb.i] = tentative + heur(nav, nb.i, goal);
      if (!inOpen[nb.i]) {
        inOpen[nb.i] = 1;
        open.push(nb.i);
      }
    }
  }
  return [];
}

function heur(nav, a, b) {
  const A = nav.walkable[a];
  const B = nav.walkable[b];
  const dx = Math.abs(A.x - B.x);
  const dy = Math.abs(A.y - B.y);
  return Math.max(dx, dy) + (1.41421356 - 1) * Math.min(dx, dy);
}

function hasLos(nav, ax, az, bx, bz) {
  const d = nav.dungeon;
  if (!d) return true;
  const steps = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / (CELL_M * 0.35)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const { x, y } = { x: ax + (bx - ax) * t, z: az + (bz - az) * t };
    const c = { x: Math.round(x / CELL_M + d.W / 2 - 0.5), y: Math.round(z / CELL_M + d.H / 2 - 0.5) };
    if (!inBounds(d, c.x, c.y) || !isWalkableCell(d.grid[c.y * d.W + c.x])) return false;
  }
  return true;
}

function stringPull(nav, pts) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let best = i + 1;
    for (let j = pts.length - 1; j > i + 1; j--) {
      if (hasLos(nav, pts[i].x, pts[i].z, pts[j].x, pts[j].z)) {
        best = j;
        break;
      }
    }
    out.push(pts[best]);
    i = best;
  }
  return out;
}

function reconstruct(nav, came, cur, toWx, toWz) {
  const cells = [cur];
  while (came[cur] >= 0) {
    cur = came[cur];
    cells.push(cur);
  }
  cells.reverse();
  const pts = cells.map((i) => {
    const n = nav.walkable[i];
    return { x: n.wx, z: n.wz };
  });
  pts[pts.length - 1] = { x: toWx, z: toWz };
  return stringPull(nav, pts);
}

/** Merge wall runs into fewer cuboids for Rapier (same-Y rows / columns). */
export function wallRuns(dungeon) {
  const { W, H, grid } = dungeon;
  const seen = new Uint8Array(W * H);
  const runs = [];

  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const i = y * W + x;
      if (grid[i] !== WALL || seen[i]) {
        x++;
        continue;
      }
      let x1 = x;
      while (x1 + 1 < W && grid[y * W + x1 + 1] === WALL && !seen[y * W + x1 + 1]) x1++;
      for (let xx = x; xx <= x1; xx++) seen[y * W + xx] = 1;
      const a = worldOf(dungeon, x, y);
      const b = worldOf(dungeon, x1, y);
      runs.push({
        kind: 'wall',
        cx: (a.x + b.x) / 2,
        cz: (a.z + b.z) / 2,
        sx: (x1 - x + 1),
        sz: 1,
      });
      x = x1 + 1;
    }
  }

  const pits = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (grid[y * W + x] !== POOL) continue;
      const w = worldOf(dungeon, x, y);
      pits.push({ kind: 'pool', cx: w.x, cz: w.z, sx: 1, sz: 1 });
    }
  }

  return { walls: runs, pits };
}
