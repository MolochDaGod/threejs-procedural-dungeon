/**
 * Dungeon crawl ruleset — one document the mechanic worker + play both read.
 * Extends existing ssot (layout, AGGRO, SPELLS, ENEMY_ATTACKS). Do not fork combat.
 */
import { AGGRO, DUNGEON_LAYOUT, DUNGEON_SI, ENEMY_ATTACKS, PLAY, POOL_RULES, THEME_BIOME } from './ssot.js';

export const RULESET_VERSION = '2026-08-19.2-dungeon-mechanics';
export const RULESET_SCHEMA = 'grudge.dungeon.ruleset/v1';

/** Room types the generator already stamps. */
export const ROOM_RULES = {
  entrance: { gated: false, spawn: false, shrine: false, hazard: false, barriers: false },
  combat:   { gated: true,  spawn: true,  shrine: false, hazard: false, barriers: true },
  elite:    { gated: true,  spawn: true,  shrine: false, hazard: false, miniboss: true, barriers: true },
  treasure: { gated: false, spawn: false, shrine: false, hazard: false, loot: true, barriers: false },
  shrine:   { gated: false, spawn: false, shrine: true,  hazard: false, once: true, barriers: false },
  event:    { gated: true,  spawn: true,  shrine: false, hazard: true,  platforms: true, barriers: true },
  boss:     { gated: true,  spawn: true,  shrine: false, hazard: false, arena: true, phases: [0.66, 0.33], barriers: true },
};

export { POOL_RULES };

export const DUNGEON_RULESET = {
  schema: RULESET_SCHEMA,
  version: RULESET_VERSION,
  crawl: {
    linearRooms: DUNGEON_LAYOUT.linearRooms,
    graphRooms: DUNGEON_LAYOUT.graphRooms,
    roomsMin: DUNGEON_LAYOUT.roomsMin,
    roomsMax: DUNGEON_LAYOUT.roomsMax,
    path: ['entrance', 'combat', 'event', 'elite', 'shrine', 'boss'],
    loopsLinear: DUNGEON_LAYOUT.loopLinear,
  },
  si: { ...DUNGEON_SI, humanM: PLAY.playerHeight, capsuleR: PLAY.capsuleR },
  rooms: ROOM_RULES,
  pools: POOL_RULES,
  aggro: { ...AGGRO, note: 'Dungeon override of open-world AGGRO_CONFIG — rooms are tight.' },
  telegraph: {
    banInstant: true,
    meleeMinSec: 0.35,
    spellDefaultSec: 1.6,
    variants: ['aoe', 'cone', 'incoming', 'linear', 'column', 'charge', 'circle'],
    catalog: Object.keys(ENEMY_ATTACKS),
  },
  party: { size: PLAY.party, classes: ['warrior', 'priest', 'ranger', 'thief'] },
  shrine: { key: 'KeyE', once: true, restoreHp: true, restoreMana: true },
  dodge: PLAY.dodge,
  parry: PLAY.parry,
  biomes: THEME_BIOME,
  grid: {
    cellM: DUNGEON_SI.cell,
    flags: ['BREAKABLE', 'HIDDEN', 'SUBFLOOR', 'DAIS', 'SAFE', 'BLOCK', 'BARRIER'],
    barrierLayer: 'after Kenney carve — stampCover only if roomRule.barriers; Rapier cuboid + LOS; smash 3-stage',
    roles: ['lava', 'void', 'pong', 'vendor', 'treasure', 'platform', 'entrance', 'exit'],
    bossArena: 'dais + lava-subfloor ring + hidden traps; door path SAFE',
    eventBox: 'random-boxes platforms in a room box; pit lava/void; entrance+exit pads SAFE',
    smash: 'Boss/elite earth_spike and column only — player never breaks cells',
  },
  mechanics: [
    { id: 'clear_gate',    when: 'leave_gated_room', unless: 'room_cleared', effect: 'block_deeper' },
    { id: 'awaken_on_enter', when: 'enter_room', effect: 'awaken_room_mobs' },
    { id: 'shrine_once',   when: 'KeyE', unless: 'spent', effect: 'restore_party' },
    { id: 'pool_hazard',   when: 'overlap_water', effect: 'dps_slow' },
    { id: 'boss_phases',   when: 'boss_hp', at: [0.66, 0.33], effect: 'unlock_mist' },
    { id: 'telegraph_all', when: 'enemy_cast', effect: 'paint_then_hit' },
    { id: 'barrier_layer', when: 'roomRule.barriers', effect: 'stampCover + collider + LOS + smash' },
  ],
  complete: {
    on: 'boss-slain',
    pass: 'dungeon-complete',
    wipe: 'wipe',
    not: 'all-enemies-dead',
    report: '/api/dungeon/complete',
    returnHost: 'https://grudgewarlords.com/home',
  },
};

export function roomRule(type) {
  return ROOM_RULES[type] || ROOM_RULES.combat;
}

export function poolRule(themeKey) {
  return POOL_RULES[themeKey] || POOL_RULES.ancient;
}

export function isGatedRoom(room) {
  if (!room) return false;
  return !!roomRule(room.type).gated;
}
