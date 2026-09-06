/**
 * Intelligent interior dress stamps — chairs, tables, barrels, wall art.
 * Architecture walls stay Kenney TILE.WALL. Furniture is kit-isolate + pinata HP.
 */
import { CELL_M } from './cells.js';
import { PROP_KITS } from '../content/props/kits.js';

function world(d, gx, gz) {
  return {
    x: (gx - d.W / 2 + 0.5) * CELL_M,
    z: (gz - d.H / 2 + 0.5) * CELL_M,
  };
}

function kitForTheme(theme) {
  if (theme === 'grim' || theme === 'verdant') return ['halloween', 'modular', 'dungeon'];
  if (theme === 'molten') return ['brick', 'dungeon'];
  if (theme === 'frost') return ['brick', 'modular'];
  return ['modular', 'dungeon', 'brick'];
}

function piece(kitId, role) {
  const kit = PROP_KITS[kitId];
  if (!kit) return null;
  if (role === 'barrel' || role === 'table' || role === 'pot' || role === 'chair') {
    return kit.pieces.find((p) => p.id === role) || kit.pieces.find((p) => p.role === 'debris') || null;
  }
  if (role === 'chest') {
    return kit.pieces.find((p) => p.role === 'prop' || p.id.includes('chest')) || null;
  }
  return kit.pieces.find((p) => p.role === role) || kit.pieces.find((p) => p.id === role) || null;
}

function stamp(d, room, role, dx, dz, yaw, kitIds) {
  for (const kitId of kitIds) {
    const p = piece(kitId, role);
    if (!p) continue;
    const w = world(d, room.cx + dx, room.cy + dz);
    return {
      source: 'kit',
      kitId,
      mesh: p.mesh,
      role,
      roomId: room.id,
      x: w.x,
      y: 0,
      z: w.z,
      yaw: yaw || 0,
      h: p.h,
      block: !!p.block,
      hp: p.hp || null,
    };
  }
  return null;
}

/**
 * Place furniture away from room center (walk path) and doors.
 */
export const ROOM_DRESS = {
  entrance: ['barrel'],
  combat: ['table', 'pot'],
  elite: ['table', 'barrel'],
  treasure: ['chest'],
  shrine: ['chest'],
  boss: ['pillar', 'pillar'],
};

export function compileDressPlan(dungeon) {
  if (!dungeon?.rooms) return [];
  const theme = dungeon.params?.themeKey || 'ancient';
  const kits = kitForTheme(theme);
  const out = [];
  for (const r of dungeon.rooms) {
    if (r.type === 'entrance') {
      const s = stamp(dungeon, r, 'barrel', -1.2, 1.1, 0.4, kits);
      if (s) out.push(s);
      continue;
    }
    if (r.type === 'treasure' || r.type === 'shrine') {
      const chest = stamp(dungeon, r, 'prop', 0, 0.8, 0, kits)
        || stamp(dungeon, r, 'debris', 0.6, 0.8, 0.2, kits);
      if (chest) { chest.role = chest.role === 'prop' ? 'prop' : 'debris'; out.push(chest); }
      continue;
    }
    if (r.type === 'combat' || r.type === 'elite') {
      const table = stamp(dungeon, r, 'debris', -1.4, -0.9, 0.2, kits);
      if (table) out.push(table);
      const pot = stamp(dungeon, r, 'debris', 1.5, 1.0, 1.1, kits);
      if (pot) out.push({ ...pot, yaw: 1.1 });
      continue;
    }
    if (r.type === 'boss' || r.type === 'event') {
      const a = stamp(dungeon, r, 'pillar', -2.2, -1.6, 0, kits);
      const b = stamp(dungeon, r, 'debris', 1.4, 1.2, 0.6, kits);
      if (a) out.push(a);
      if (b) out.push(b);
    }
  }
  if (!out.length) {
    const r = dungeon.rooms[0];
    const s = stamp(dungeon, r, 'debris', 0.8, 0.8, 0.2, kits);
    if (s) out.push(s);
  }
  return out.filter(Boolean);
}

export function dressSummary(stamps = []) {
  const by = {};
  for (const s of stamps) by[s.role] = (by[s.role] || 0) + 1;
  return { count: stamps.length, by };
}
