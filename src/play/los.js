/**
 * LOS = Kenney WALL + BLOCK cover + intact BARRIER flags.
 * No second occupancy map. Brick-collapse of structural walls is not a thing.
 */
import { firstObstruction, lineOpen } from '../grid/cells.js';

export function createLosField(dungeon) {
  return { dungeon };
}

export function losOpen(los, ax, az, bx, bz) {
  if (!los?.dungeon) return true;
  return lineOpen(los.dungeon, ax, az, bx, bz);
}

export function losHit(los, ax, az, bx, bz) {
  if (!los?.dungeon) return null;
  return firstObstruction(los.dungeon, ax, az, bx, bz);
}
