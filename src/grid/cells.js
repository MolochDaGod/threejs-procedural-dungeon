/**
 * Grid-level dungeon cells — same generateDungeon grid, live in play.
 * Flags ride beside VOID/FLOOR/WALL/POOL. Destroying a tile does not
 * invent a second generator; it mutates this grid and drops the floor collider.
 */
import { DUNGEON_SI } from '../ssot.js';
import { TILE } from '../physics/colliders.js';

export const CELL_FLAG = {
  BREAKABLE: 1,
  HIDDEN: 2,
  SUBFLOOR: 4,
  DAIS: 8,
  SAFE: 16,
  BLOCK: 32,
  BARRIER: 64,
};

export function cellIndex(d, gx, gz) {
  if (gx < 0 || gz < 0 || gx >= d.W || gz >= d.H) return -1;
  return gz * d.W + gx;
}

export function flagsAt(d, gx, gz) {
  const i = cellIndex(d, gx, gz);
  return i < 0 || !d.flags ? 0 : d.flags[i];
}

export function hasFlag(d, gx, gz, bit) {
  return (flagsAt(d, gx, gz) & bit) !== 0;
}

/**
 * Boss arena layout on the existing BOSS room:
 * safe path from door → center dais; breakable lava-subfloor ring; hidden traps.
 */
export function stampBossArena(d, rng) {
  const r = d.rooms?.[d.boss];
  if (!r || !d.grid || !d.flags) return;
  const W = d.W, H = d.H;
  const idx = (x, y) => y * W + x;
  const inRoom = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    return d.roomId[idx(x, y)] === r.id && d.grid[idx(x, y)] === TILE.FLOOR;
  };

  const cx = Math.round(r.cx), cy = Math.round(r.cy);
  for (let y = cy - 2; y <= cy + 2; y++) {
    for (let x = cx - 2; x <= cx + 2; x++) {
      if (!inRoom(x, y)) continue;
      d.flags[idx(x, y)] |= CELL_FLAG.DAIS | CELL_FLAG.SAFE;
    }
  }

  let door = null;
  for (let y = Math.floor(r.cy - r.h / 2); y <= Math.ceil(r.cy + r.h / 2); y++) {
    for (let x = Math.floor(r.cx - r.w / 2); x <= Math.ceil(r.cx + r.w / 2); x++) {
      if (!inRoom(x, y) || !d.doorway?.[idx(x, y)]) continue;
      door = { x, y };
      break;
    }
    if (door) break;
  }
  if (door) {
    let x = door.x, y = door.y;
    const guard = W * H;
    for (let n = 0; n < guard; n++) {
      if (inRoom(x, y)) d.flags[idx(x, y)] |= CELL_FLAG.SAFE;
      if (x === cx && y === cy) break;
      if (Math.abs(cx - x) >= Math.abs(cy - y)) x += Math.sign(cx - x) || 0;
      else y += Math.sign(cy - y) || 0;
    }
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (inRoom(door.x + ox, door.y + oy)) d.flags[idx(door.x + ox, door.y + oy)] |= CELL_FLAG.SAFE;
    }
  }

  const x0 = Math.max(1, Math.floor(r.cx - r.w / 2) + 2);
  const x1 = Math.min(W - 2, Math.ceil(r.cx + r.w / 2) - 2);
  const y0 = Math.max(1, Math.floor(r.cy - r.h / 2) + 2);
  const y1 = Math.min(H - 2, Math.ceil(r.cy + r.h / 2) - 2);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!inRoom(x, y)) continue;
      const f = d.flags[idx(x, y)];
      if (f & CELL_FLAG.SAFE) continue;
      const t = rng ? rng.raw() : Math.random();
      if (t < 0.10) d.flags[idx(x, y)] |= CELL_FLAG.HIDDEN | CELL_FLAG.SUBFLOOR;
      else if (t < 0.55) d.flags[idx(x, y)] |= CELL_FLAG.BREAKABLE | CELL_FLAG.SUBFLOOR;
    }
  }
}

export function sampleCellHeight(d, gx, gz) {
  const i = cellIndex(d, gx, gz);
  if (i < 0) return null;
  const tile = d.grid[i];
  const f = d.flags ? d.flags[i] : 0;
  const gy = DUNGEON_SI.groundY;
  if (tile === TILE.POOL || (f & CELL_FLAG.HIDDEN)) return gy - 0.12;
  if (tile === TILE.FLOOR) return (f & CELL_FLAG.DAIS) ? gy + 0.18 : gy;
  return null;
}

/**
 * Smash a floor cell. Breakable → lava subfloor (POOL) and drop the floor collider/visual.
 * Hidden already has no collider; smash reveals lava.
 */
export function destroyCell(d, gx, gz) {
  const i = cellIndex(d, gx, gz);
  if (i < 0) return false;
  const f = d.flags ? d.flags[i] : 0;
  if (f & CELL_FLAG.SAFE) return false;
  if (!(f & (CELL_FLAG.BREAKABLE | CELL_FLAG.HIDDEN | CELL_FLAG.SUBFLOOR))) {
    if (d.grid[i] !== TILE.FLOOR) return false;
  }
  if (f & CELL_FLAG.SAFE) return false;
  d.grid[i] = TILE.POOL;
  if (d.flags) d.flags[i] = (f & ~CELL_FLAG.BREAKABLE & ~CELL_FLAG.HIDDEN) | CELL_FLAG.SUBFLOOR;
  d.onCellDestroyed?.(i, gx, gz, d.grid[i]);
  return true;
}

function coverOk(d, x, y, idx) {
  const W = d.W, H = d.H;
  if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return false;
  const i = idx(x, y);
  if (d.grid[i] !== TILE.FLOOR || d.doorway?.[i]) return false;
  if (d.flags[i] & (CELL_FLAG.SAFE | CELL_FLAG.DAIS | CELL_FLAG.BLOCK | CELL_FLAG.BARRIER)) return false;
  return true;
}

/**
 * Pillars / interior wall stubs / debris / smashable barriers for LOS.
 * Keeps FLOOR in the grid (BFS stays valid); play treats BLOCK as solid.
 */
export function stampCover(d, rng) {
  const rooms = d.rooms || [];
  const W = d.W, H = d.H;
  const idx = (x, y) => y * W + x;
  if (!d.flags || !d.grid) return 0;
  if (!d.barrierStage) d.barrierStage = new Uint8Array(W * H);
  if (!d.coverRole) d.coverRole = new Uint8Array(W * H);
  let n = 0;
  const raw = rng?.raw || Math.random;
  const mark = (x, y, bits, role, stage = 0) => {
    if (!coverOk(d, x, y, idx)) return false;
    const i = idx(x, y);
    d.flags[i] |= bits;
    d.coverRole[i] = role;
    if (bits & CELL_FLAG.BARRIER) d.barrierStage[i] = stage;
    n++;
    return true;
  };

  for (const r of rooms) {
    if (r.type === 'entrance' || r.type === 'treasure' || r.type === 'shrine') continue;
    const cx = Math.round(r.cx), cy = Math.round(r.cy);
    const wallLen = r.type === 'boss' ? 3 : 2;
    const horiz = raw() < 0.5;
    const ox = horiz ? 0 : (raw() < 0.5 ? -2 : 2);
    const oy = horiz ? (raw() < 0.5 ? -2 : 2) : 0;
    for (let k = -Math.floor(wallLen / 2); k <= Math.floor(wallLen / 2); k++) {
      const x = cx + ox + (horiz ? k : 0);
      const y = cy + oy + (horiz ? 0 : k);
      if (Math.abs(x - cx) < 1 && Math.abs(y - cy) < 1) continue;
      mark(x, y, CELL_FLAG.BLOCK, 1);
    }

    const pillars = r.type === 'boss' ? 4 : r.type === 'elite' ? 3 : 2;
    let placed = 0, guard = 0;
    while (placed < pillars && guard++ < 40) {
      const x = Math.round(r.cx + (raw() - 0.5) * (r.w * 0.55));
      const y = Math.round(r.cy + (raw() - 0.5) * (r.h * 0.55));
      if (Math.abs(x - cx) < 1 && Math.abs(y - cy) < 1) continue;
      if (mark(x, y, CELL_FLAG.BLOCK, 2)) placed++;
    }

    const debris = r.type === 'boss' ? 3 : 2;
    placed = 0; guard = 0;
    while (placed < debris && guard++ < 30) {
      const x = Math.round(r.cx + (raw() - 0.5) * (r.w * 0.62));
      const y = Math.round(r.cy + (raw() - 0.5) * (r.h * 0.62));
      if (mark(x, y, CELL_FLAG.BLOCK, 3)) placed++;
    }

    if (r.type === 'boss' || r.type === 'elite') {
      const fences = r.type === 'boss' ? 3 : 2;
      placed = 0; guard = 0;
      while (placed < fences && guard++ < 30) {
        const x = Math.round(r.cx + (raw() - 0.5) * (r.w * 0.5));
        const y = Math.round(r.cy + (raw() - 0.5) * (r.h * 0.5));
        if (mark(x, y, CELL_FLAG.BARRIER, 4, 0)) placed++;
      }
    }
  }
  return n;
}

/** Halloween-style barrier: 0 intact → 3 ruined (walkable). Boss smash only. */
export function damageBarrier(d, gx, gz) {
  const i = cellIndex(d, gx, gz);
  if (i < 0 || !d.flags) return false;
  if (!(d.flags[i] & CELL_FLAG.BARRIER)) return false;
  if (!d.barrierStage) d.barrierStage = new Uint8Array(d.W * d.H);
  const next = Math.min(3, (d.barrierStage[i] || 0) + 1);
  d.barrierStage[i] = next;
  if (next >= 3) {
    d.flags[i] = d.flags[i] & ~CELL_FLAG.BARRIER;
    d.onBarrierDamaged?.(i, gx, gz, next, true);
    return true;
  }
  d.onBarrierDamaged?.(i, gx, gz, next, false);
  return true;
}

/** Grid DDA — walls, pillars, intact barriers block line of sight. */
export function lineOpen(d, ax, az, bx, bz) {
  const cell = DUNGEON_SI.cell;
  const steps = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / (cell * 0.45)));
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    const wx = ax + (bx - ax) * t;
    const wz = az + (bz - az) * t;
    const gx = Math.round(wx / cell + d.W / 2 - 0.5);
    const gz = Math.round(wz / cell + d.H / 2 - 0.5);
    const i = cellIndex(d, gx, gz);
    if (i < 0) return false;
    if (d.grid[i] === TILE.WALL) return false;
    const f = d.flags ? d.flags[i] : 0;
    if (f & CELL_FLAG.BLOCK) return false;
    if ((f & CELL_FLAG.BARRIER) && d.grid[i] === TILE.FLOOR) return false;
  }
  return true;
}

export function hideCollider(d, gx, gz) {
  const i = cellIndex(d, gx, gz);
  if (i < 0 || !d.flags) return false;
  if (d.flags[i] & CELL_FLAG.SAFE) return false;
  d.flags[i] |= CELL_FLAG.HIDDEN;
  d.onCellHidden?.(i, gx, gz);
  return true;
}
