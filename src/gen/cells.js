/**
 * Shared dungeon cell contract — client, Node instance server, and D1 kit.
 * Raster stays integer cells; world SI meters use CELL_M so a 1.8 m warlord
 * fits 2-wide corridors and rooms read as halls, not closets.
 */
export const VOID = 0;
export const FLOOR = 1;
export const WALL = 2;
export const POOL = 3;

export const CELL_M = 2.15;
export const WALL_HEIGHT_M = 3.85;
export const WALL_THICK_M = 0.55;
export const FLOOR_THICK_M = 0.28;

export const CELL_NAME = { [VOID]: 'void', [FLOOR]: 'floor', [WALL]: 'wall', [POOL]: 'pool' };

/** Unscaled cell center — forge group is then scaled by CELL_M. */
export function cellCenter(d, x, y) {
  return { x: x - d.W / 2 + 0.5, z: y - d.H / 2 + 0.5 };
}

export function worldOf(d, x, y) {
  const c = cellCenter(d, x, y);
  return { x: c.x * CELL_M, z: c.z * CELL_M };
}

export function cellOf(d, wx, wz) {
  return {
    x: Math.round(wx / CELL_M + d.W / 2 - 0.5),
    y: Math.round(wz / CELL_M + d.H / 2 - 0.5),
  };
}

export function inBounds(d, x, y) {
  return x >= 0 && y >= 0 && x < d.W && y < d.H;
}

export function cellAt(d, x, y) {
  if (!inBounds(d, x, y)) return VOID;
  return d.grid[y * d.W + x];
}

export function isWalkableCell(t) {
  return t === FLOOR;
}

/** BLOCK=32 BARRIER=64 — same bits as grid/cells CELL_FLAG (no circular import). */
function flagsBlockMove(d, x, y) {
  if (!d.flags) return false;
  const i = y * d.W + x;
  const f = d.flags[i];
  if (f & 32) return true;
  if ((f & 64) && (!d.barrierStage || d.barrierStage[i] < 3)) return true;
  return false;
}

export function walkableWorld(d, wx, wz, radius = 0) {
  const ok = (px, pz) => {
    const { x, y } = cellOf(d, px, pz);
    if (!isWalkableCell(cellAt(d, x, y))) return false;
    if (flagsBlockMove(d, x, y)) return false;
    return true;
  };
  if (radius <= 0) return ok(wx, wz);
  return (
    ok(wx, wz) &&
    ok(wx + radius, wz) &&
    ok(wx - radius, wz) &&
    ok(wx, wz + radius) &&
    ok(wx, wz - radius)
  );
}
