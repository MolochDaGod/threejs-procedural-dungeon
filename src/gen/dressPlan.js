/**
 * Intelligent interior dress stamps — barrels, crates, fallen ruins.
 * Architecture walls stay Kenney TILE.WALL. Furniture is KayKit CDN + kit-isolate.
 * Place along room walls / corners; never mid-walk or doorways.
 */
import { CELL_M, FLOOR, WALL } from './cells.js';
import { PROP_KITS } from '../content/props/kits.js';
import { DRESSING } from '../ssot.js';

const BLOCK_BITS = 32 | 64;

function world(d, gx, gz) {
  return {
    x: (gx - d.W / 2 + 0.5) * CELL_M,
    z: (gz - d.H / 2 + 0.5) * CELL_M,
  };
}

const KAY = {
  barrel: { url: DRESSING.barrel, role: 'barrel', h: 0.85, footM: 0.7, hp: 36, block: true },
  crate: { url: DRESSING.crate, role: 'crate', h: 0.72, footM: 0.7, hp: 28, block: true },
  chest: { url: DRESSING.chest, role: 'chest', h: 0.62, footM: 0.8, hp: null, block: false },
  ruin: { url: DRESSING.ruin, role: 'ruin', h: 1.35, footM: 1.1, hp: 70, block: true },
  carpet: { url: DRESSING.carpet, role: 'carpet', h: 0.04, footM: 1.8, hp: null, block: false, y: 0.02 },
};

function kitForTheme(theme) {
  if (theme === 'grim' || theme === 'verdant') return ['halloween', 'modular', 'dungeon'];
  if (theme === 'molten') return ['brick', 'dungeon'];
  if (theme === 'frost') return ['brick', 'modular'];
  return ['modular', 'dungeon', 'brick'];
}

function piece(kitId, role) {
  const kit = PROP_KITS[kitId];
  if (!kit) return null;
  if (role === 'barrel' || role === 'table' || role === 'pot' || role === 'chair' || role === 'crate') {
    return kit.pieces.find((p) => p.id === role && !p.architecture)
      || kit.pieces.find((p) => p.role === 'debris' && !p.architecture)
      || null;
  }
  if (role === 'chest') {
    return kit.pieces.find((p) => (p.role === 'prop' || p.id.includes('chest')) && !p.architecture) || null;
  }
  if (role === 'ruin') {
    return kit.pieces.find((p) => p.role === 'ruin' && !p.architecture) || null;
  }
  return kit.pieces.find((p) => p.role === role && !p.architecture)
    || kit.pieces.find((p) => p.id === role && !p.architecture)
    || null;
}

function perimeterCells(d, room) {
  const idx = (x, y) => y * d.W + x;
  const x0 = Math.max(1, Math.floor(room.cx - room.w / 2));
  const x1 = Math.min(d.W - 2, Math.ceil(room.cx + room.w / 2));
  const y0 = Math.max(1, Math.floor(room.cy - room.h / 2));
  const y1 = Math.min(d.H - 2, Math.ceil(room.cy + room.h / 2));
  const out = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = idx(x, y);
      if (d.grid[i] !== FLOOR || d.doorway?.[i]) continue;
      if (d.flags?.[i] & BLOCK_BITS) continue;
      if (Math.abs(x - room.cx) < 1.2 && Math.abs(y - room.cy) < 1.2) continue;
      let walls = 0;
      let yaw = 0;
      let door = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = idx(x + dx, y + dy);
        if (ni < 0 || ni >= d.grid.length) continue;
        if (d.doorway?.[ni]) { door = true; break; }
        if (d.grid[ni] === WALL) {
          walls++;
          yaw = Math.atan2(-dx, -dy);
        }
      }
      if (door || walls < 1) continue;
      out.push({ x, y, walls, yaw });
    }
  }
  out.sort((a, b) => b.walls - a.walls || (a.x + a.y * 13) - (b.x + b.y * 13));
  return out;
}

function kayStamp(d, room, cell, spec) {
  if (!cell || !spec?.url) return null;
  const w = world(d, cell.x, cell.y);
  return {
    source: 'cdn',
    url: spec.url,
    role: spec.role,
    roomId: room.id,
    x: w.x,
    y: spec.y || 0,
    z: w.z,
    yaw: cell.yaw || 0,
    h: spec.h,
    footM: spec.footM,
    block: !!spec.block,
    hp: spec.hp || null,
  };
}

function kitStamp(d, room, cell, role, kitIds) {
  if (!cell) return null;
  for (const kitId of kitIds) {
    const p = piece(kitId, role);
    if (!p) continue;
    const w = world(d, cell.x, cell.y);
    return {
      source: 'kit',
      kitId,
      mesh: p.mesh,
      role,
      roomId: room.id,
      x: w.x,
      y: 0,
      z: w.z,
      yaw: cell.yaw || 0,
      h: p.h,
      footM: p.footM || 0.9,
      block: !!p.block,
      hp: p.hp || null,
    };
  }
  return null;
}

function takeCells(peri, used, n, minSpace = 2) {
  const picked = [];
  for (const c of peri) {
    if (picked.length >= n) break;
    if (used.has(`${c.x},${c.y}`)) continue;
    if (picked.some((p) => Math.max(Math.abs(p.x - c.x), Math.abs(p.y - c.y)) < minSpace)) continue;
    used.add(`${c.x},${c.y}`);
    picked.push(c);
  }
  return picked;
}

/**
 * Place furniture away from room center (walk path) and doors.
 */
export const ROOM_DRESS = {
  entrance: ['barrel'],
  combat: ['crate', 'barrel'],
  elite: ['ruin', 'barrel', 'crate'],
  treasure: ['chest'],
  shrine: ['chest'],
  boss: ['ruin', 'ruin', 'barrel'],
};

export function compileDressPlan(dungeon) {
  if (!dungeon?.rooms) return [];
  const theme = dungeon.params?.themeKey || 'ancient';
  const kits = kitForTheme(theme);
  const out = [];
  for (const r of dungeon.rooms) {
    const peri = perimeterCells(dungeon, r);
    const used = new Set();
    const push = (s) => { if (s) out.push(s); };
    const recipe = ROOM_DRESS[r.type] || [];
    const want = { barrel: 0, crate: 0, chest: 0, ruin: 0, table: 0, pot: 0, pillar: 0 };
    for (const id of recipe) want[id] = (want[id] || 0) + 1;

    if (r.type === 'combat' || r.type === 'elite' || r.type === 'boss') {
      const mid = world(dungeon, r.cx, r.cy);
      push({
        ...KAY.carpet,
        source: 'cdn',
        roomId: r.id,
        x: mid.x,
        z: mid.z,
        yaw: 0,
      });
    }

    for (const cell of takeCells(peri, used, want.ruin || 0, 2)) {
      push(kayStamp(dungeon, r, cell, KAY.ruin) || kitStamp(dungeon, r, cell, 'ruin', kits));
    }
    for (const cell of takeCells(peri, used, want.barrel || 0, 2)) {
      push(kayStamp(dungeon, r, cell, KAY.barrel) || kitStamp(dungeon, r, cell, 'barrel', kits));
    }
    for (const cell of takeCells(peri, used, want.crate || 0, 2)) {
      push(kayStamp(dungeon, r, cell, KAY.crate) || kitStamp(dungeon, r, cell, 'crate', kits));
    }
    for (const cell of takeCells(peri, used, want.chest || 0, 2)) {
      push(kayStamp(dungeon, r, cell, KAY.chest) || kitStamp(dungeon, r, cell, 'chest', kits));
    }
    for (const cell of takeCells(peri, used, (want.table || 0) + (want.pot || 0), 2)) {
      push(kitStamp(dungeon, r, cell, 'table', kits) || kitStamp(dungeon, r, cell, 'pot', kits));
    }
    for (const cell of takeCells(peri.filter((c) => c.walls >= 2), used, want.pillar || 0, 2)) {
      push(kitStamp(dungeon, r, cell, 'pillar', kits));
    }
  }
  if (!out.length && dungeon.rooms[0]) {
    const r = dungeon.rooms[0];
    const peri = perimeterCells(dungeon, r);
    const s = kayStamp(dungeon, r, peri[0], KAY.barrel)
      || kitStamp(dungeon, r, peri[0] || { x: Math.round(r.cx) + 1, y: Math.round(r.cy) + 1, yaw: 0.2 }, 'debris', kits);
    if (s) out.push(s);
  }
  return out.filter(Boolean);
}

export function dressSummary(stamps = []) {
  const by = {};
  for (const s of stamps) by[s.role] = (by[s.role] || 0) + 1;
  return { count: stamps.length, by };
}
