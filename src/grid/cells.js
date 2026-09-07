/**
 * Grid-level dungeon cells — same generateDungeon grid, live in play.
 * Flags ride beside VOID/FLOOR/WALL/POOL. Destroying a tile does not
 * invent a second generator; it mutates this grid and drops the floor collider.
 */
import { DUNGEON_SI } from '../ssot.js';
import { TILE } from '../physics/colliders.js';
import { roomRule } from '../ruleset.js';

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
  if (tile === TILE.VOID) return null;
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
  if (d.grid[i] !== TILE.FLOOR || d.doorway?.[i] || d.corridor?.[i]) return false;
  if (d.flags[i] & (CELL_FLAG.SAFE | CELL_FLAG.DAIS | CELL_FLAG.BLOCK | CELL_FLAG.BARRIER)) return false;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ni = idx(x + dx, y + dy);
    if (ni < 0) continue;
    if (d.doorway?.[ni] || d.corridor?.[ni]) return false;
  }
  return true;
}

function wallTouch(d, x, y, idx) {
  let n = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ni = idx(x + dx, y + dy);
    if (ni >= 0 && d.grid[ni] === TILE.WALL) n++;
  }
  return n;
}

function shuffleCover(list, raw) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(raw() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function spaced(x, y, taken, min = 2) {
  for (const t of taken) {
    if (Math.max(Math.abs(t.x - x), Math.abs(t.y - y)) < min) return false;
  }
  return true;
}

/**
 * Perimeter cover only — barrels / pillars / fallen ruins along Kenney walls.
 * Never a mid-room architecture wall. Walk core + doors stay open.
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
    if (roomRule(r.type).barriers === false) continue;
    if (r.type === 'entrance' || r.type === 'treasure' || r.type === 'shrine') continue;
    const x0 = Math.max(1, Math.floor(r.cx - r.w / 2));
    const x1 = Math.min(W - 2, Math.ceil(r.cx + r.w / 2));
    const y0 = Math.max(1, Math.floor(r.cy - r.h / 2));
    const y1 = Math.min(H - 2, Math.ceil(r.cy + r.h / 2));
    const peri = [];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!coverOk(d, x, y, idx)) continue;
        if (Math.abs(x - r.cx) < 1.35 && Math.abs(y - r.cy) < 1.35) continue;
        const walls = wallTouch(d, x, y, idx);
        if (walls < 1) continue;
        peri.push({ x, y, walls });
      }
    }
    const corners = shuffleCover(peri.filter((c) => c.walls >= 2), raw);
    const edges = shuffleCover(peri.filter((c) => c.walls === 1), raw);
    const taken = [];
    const take = (pool, bits, role, want, minSpace, stage = 0) => {
      let placed = 0;
      for (const c of pool) {
        if (placed >= want) break;
        if (!spaced(c.x, c.y, taken, minSpace)) continue;
        if (mark(c.x, c.y, bits, role, stage)) {
          taken.push(c);
          placed++;
        }
      }
      return placed;
    };

    const nPillar = r.type === 'boss' ? 3 : 2;
    const nRuin = r.type === 'boss' ? 2 : 1;
    const nDebris = r.type === 'boss' || r.type === 'elite' ? 2 : 1;
    take(corners, CELL_FLAG.BLOCK, 2, nPillar, 2);
    take(edges, CELL_FLAG.BLOCK, 1, nRuin, 2);
    take(edges, CELL_FLAG.BLOCK, 3, nDebris, 2);
    if (r.type === 'boss' || r.type === 'elite') {
      take(edges, CELL_FLAG.BARRIER, 4, r.type === 'boss' ? 2 : 1, 3, 0);
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

/**
 * First BLOCK / intact BARRIER / WALL along a world ray (charge / shockwave).
 * @returns {{ gx:number, gz:number, kind:'wall'|'block'|'barrier' } | null}
 */
export function firstObstruction(d, ax, az, bx, bz) {
  const cell = DUNGEON_SI.cell;
  const steps = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / (cell * 0.4)));
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    const wx = ax + (bx - ax) * t;
    const wz = az + (bz - az) * t;
    const gx = Math.round(wx / cell + d.W / 2 - 0.5);
    const gz = Math.round(wz / cell + d.H / 2 - 0.5);
    const i = cellIndex(d, gx, gz);
    if (i < 0) return { gx, gz, kind: 'wall' };
    if (d.grid[i] === TILE.WALL) return { gx, gz, kind: 'wall' };
    const f = d.flags ? d.flags[i] : 0;
    if (f & CELL_FLAG.BLOCK) return { gx, gz, kind: 'block' };
    if ((f & CELL_FLAG.BARRIER) && (!d.barrierStage || d.barrierStage[i] < 3)) {
      return { gx, gz, kind: 'barrier' };
    }
  }
  return null;
}

/** WoW/Albion: pillar between source and target blocks AoE / shockwave / charge. */
export function coveredFrom(d, ax, az, bx, bz) {
  return !!firstObstruction(d, ax, az, bx, bz);
}

/** Adjacent walkable cell behind cover relative to danger origin. */
export function coverSpotNear(d, px, pz, ox, oz, maxR = 6) {
  const me = cellOfWorld(d, px, pz);
  const origin = cellOfWorld(d, ox, oz);
  let best = null;
  let bestScore = 1e9;
  for (let gz = me.gz - maxR; gz <= me.gz + maxR; gz++) {
    for (let gx = me.gx - maxR; gx <= me.gx + maxR; gx++) {
      const i = cellIndex(d, gx, gz);
      if (i < 0) continue;
      const f = d.flags ? d.flags[i] : 0;
      if (!(f & (CELL_FLAG.BLOCK | CELL_FLAG.BARRIER))) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = gx + dx;
        const nz = gz + dz;
        if (!isWalkableOpen(d, nx, nz)) continue;
        if (lineOpen(d, ox, oz, worldX(d, nx), worldZ(d, nz))) continue;
        const wx = worldX(d, nx);
        const wz = worldZ(d, nz);
        const score = Math.hypot(wx - px, wz - pz) + Math.hypot(nx - origin.gx, nz - origin.gz) * 0.15;
        if (score < bestScore) {
          bestScore = score;
          best = { x: wx, z: wz, gx: nx, gz: nz };
        }
      }
    }
  }
  return best;
}

export function cellOfWorld(d, wx, wz) {
  const cell = DUNGEON_SI.cell;
  return {
    gx: Math.round(wx / cell + d.W / 2 - 0.5),
    gz: Math.round(wz / cell + d.H / 2 - 0.5),
  };
}

/** True if a world point sits in wall / block / closed barrier. */
export function isSolidWorld(d, wx, wz) {
  if (!d) return false;
  const { gx, gz } = cellOfWorld(d, wx, wz);
  const i = cellIndex(d, gx, gz);
  if (i < 0) return true;
  if (d.grid[i] === TILE.WALL) return true;
  const f = d.flags ? d.flags[i] : 0;
  if (f & CELL_FLAG.BLOCK) return true;
  if ((f & CELL_FLAG.BARRIER) && (!d.barrierStage || d.barrierStage[i] < 3)) return true;
  return false;
}

function worldX(d, gx) {
  return (gx - d.W / 2 + 0.5) * DUNGEON_SI.cell;
}
function worldZ(d, gz) {
  return (gz - d.H / 2 + 0.5) * DUNGEON_SI.cell;
}

function isWalkableOpen(d, gx, gz) {
  const i = cellIndex(d, gx, gz);
  if (i < 0) return false;
  if (d.grid[i] !== TILE.FLOOR) return false;
  const f = d.flags ? d.flags[i] : 0;
  if (f & CELL_FLAG.BLOCK) return false;
  if ((f & CELL_FLAG.BARRIER) && (!d.barrierStage || d.barrierStage[i] < 3)) return false;
  return true;
}

export function lineOpen(d, ax, az, bx, bz) {
  return !firstObstruction(d, ax, az, bx, bz);
}

export function hideCollider(d, gx, gz) {
  const i = cellIndex(d, gx, gz);
  if (i < 0 || !d.flags) return false;
  if (d.flags[i] & CELL_FLAG.SAFE) return false;
  d.flags[i] |= CELL_FLAG.HIDDEN;
  d.onCellHidden?.(i, gx, gz);
  return true;
}
