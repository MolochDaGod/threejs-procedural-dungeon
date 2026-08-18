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
export const WALL_THICK_M = 1.85;
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

export function walkableWorld(d, wx, wz, radius = 0) {
  if (radius <= 0) {
    const { x, y } = cellOf(d, wx, wz);
    return isWalkableCell(cellAt(d, x, y));
  }
  const pts = [
    [wx, wz],
    [wx + radius, wz],
    [wx - radius, wz],
    [wx, wz + radius],
    [wx, wz - radius],
  ];
  return pts.every(([px, pz]) => {
    const { x, y } = cellOf(d, px, pz);
    return isWalkableCell(cellAt(d, x, y));
  });
}
