/**
 * Event platform room — raised pads inside an existing carved room.
 */
import { CELL_ROLE, carveRoleRect } from './roles.js';
import { DUNGEON_SI } from '../ssot.js';

export function stampEventPlatformRoom(dungeon, rng) {
  const rooms = dungeon.rooms || [];
  const mid = rooms.filter((r) => r.type === 'combat' || r.type === 'elite' || r.type === 'boss');
  const r = mid[0] || rooms[rooms.length - 1];
  if (!r) return null;
  r.type = 'event';
  const cx = Math.round(r.cx);
  const cy = Math.round(r.cy);
  carveRoleRect(dungeon, { x0: cx - 1, y0: cy - 1, x1: cx + 1, y1: cy + 1, role: 'floor' });
  dungeon.platforms = [
    { x: cx - 1, y: cy - 1, w: 1, h: 1, height: 0.45 },
    { x: cx + 1, y: cy - 1, w: 1, h: 1, height: 0.45 },
    { x: cx - 1, y: cy + 1, w: 1, h: 1, height: 0.45 },
    { x: cx + 1, y: cy + 1, w: 1, h: 1, height: 0.45 },
  ];
  dungeon.eventRoom = {
    id: r.id,
    sockets: {
      entrance: { x: r.cx, z: r.cy - r.h * 0.4 },
      exit: { x: r.cx, z: r.cy + r.h * 0.4 },
    },
  };
  return dungeon.eventRoom;
}

export function samplePlatformHeight(dungeon, wx, wz) {
  const plats = dungeon?.platforms;
  if (!plats?.length) return null;
  const cell = DUNGEON_SI.cell;
  for (const p of plats) {
    const x0 = (p.x - dungeon.W / 2) * cell;
    const z0 = (p.y - dungeon.H / 2) * cell;
    const x1 = x0 + (p.w || 1) * cell;
    const z1 = z0 + (p.h || 1) * cell;
    if (wx >= x0 && wx <= x1 && wz >= z0 && wz <= z1) return p.height || 0.45;
  }
  return null;
}
