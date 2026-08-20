/**
 * One terrain height for the dungeon: floor top = walls base = asset plant = feet.
 * Grid sampler is the SSOT; BVH ray is an optional refine in navmesh.js.
 */
import { DUNGEON_SI } from '../ssot.js';
import { TILE } from '../physics/colliders.js';
import { sampleCellHeight } from '../grid/cells.js';

export function cellToWorld(d, gx, gz) {
  const c = DUNGEON_SI.cell;
  return {
    x: (gx - d.W / 2 + 0.5) * c,
    z: (gz - d.H / 2 + 0.5) * c,
  };
}

export function worldToCell(d, wx, wz) {
  const c = DUNGEON_SI.cell;
  return {
    x: Math.round(wx / c + d.W / 2 - 0.5),
    z: Math.round(wz / c + d.H / 2 - 0.5),
  };
}

export function tileAt(d, wx, wz) {
  const { x, z } = worldToCell(d, wx, wz);
  if (x < 0 || z < 0 || x >= d.W || z >= d.H) return TILE.VOID;
  return d.grid[z * d.W + x];
}

/**
 * Height of the walk surface at xz. FLOOR/door = groundY.
 * POOL is a depression. VOID/WALL = null (no terrain).
 */
export function makeGridSampler(dungeon) {
  return function sampleGround(wx, wz) {
    const { x, z } = worldToCell(dungeon, wx, wz);
    return sampleCellHeight(dungeon, x, z);
  };
}

export function plantY(offset = 0, wx = 0, wz = 0, sampler = null) {
  const g = sampler ? sampler(wx, wz) : DUNGEON_SI.groundY;
  return (g == null ? DUNGEON_SI.groundY : g) + offset;
}
