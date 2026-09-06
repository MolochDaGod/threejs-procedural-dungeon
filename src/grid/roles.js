import { TILE } from '../physics/colliders.js';

export const CELL_ROLE = {
  NONE: 0,
  CARPET: 1,
  DAIS: 2,
  FURNITURE: 3,
  EVENT: 4,
  LAVA: 5,
  VOID: 6,
};

const ROLE_TILE = {
  lava: TILE.POOL,
  void: TILE.VOID,
  floor: TILE.FLOOR,
};

export function carveRoleRect(d, spec, y0, x1, y1, role) {
  let x0, yy0, xx1, yy1, r;
  if (spec && typeof spec === 'object' && spec.x0 != null) {
    x0 = spec.x0; yy0 = spec.y0; xx1 = spec.x1; yy1 = spec.y1; r = spec.role;
  } else {
    x0 = spec; yy0 = y0; xx1 = x1; yy1 = y1; r = role;
  }
  if (!d.cellRole) d.cellRole = new Uint8Array(d.W * d.H);
  const tile = ROLE_TILE[r];
  let n = 0;
  for (let y = yy0; y <= yy1; y++) {
    for (let x = x0; x <= xx1; x++) {
      if (x < 0 || y < 0 || x >= d.W || y >= d.H) continue;
      const i = y * d.W + x;
      d.cellRole[i] = r === 'lava' ? CELL_ROLE.LAVA : r === 'void' ? CELL_ROLE.VOID : CELL_ROLE.EVENT;
      if (tile != null) d.grid[i] = tile;
      n++;
    }
  }
  return n;
}
