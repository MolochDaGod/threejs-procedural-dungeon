/**
 * Weapon skill catalog — T8 hero trees + T0 starter play data.
 * Authority: master-weapon-prefabs · master-weaponSkills. No invented ids.
 */
import { CATALOG_SKILL_PLAY, T8_CLASS_SETS, setByKitId } from './t0ClassSets.js';
import { SKILL_ICON_CDN } from './skillIconCdn.js';

const LEGACY_SKILLS = [
  { id: 'cleave',              slot: 1, name: 'Cleave',         kind: 'slash',     linear: null,      element: 'physical', color: 0xe8e0c8, mana: 0,  stamina: 8,  cd: 0.45, range: 2.8,  damage: 18, telegraphSec: 0.12 },
  { id: 'gs_samurai_combo',    slot: 1, name: 'Twin Slash',     kind: 'slash',     linear: null,      element: 'physical', color: 0xe8e0c8, mana: 0,  stamina: 8,  cd: 0.50, range: 3.1,  damage: 22, telegraphSec: 0.10, anim: 'attack' },
  { id: 'gs_samurai_teleport', slot: 2, name: 'Shadow Step',    kind: 'teleport',  linear: null,      element: 'shadow',   color: 0x9b6cf0, mana: 8,  stamina: 16, cd: 6.00, range: 8.5,  damage: 26, telegraphSec: 0.18, anim: 'attack' },
  { id: 'gs_samurai_dash',     slot: 3, name: 'Slashing Dash',  kind: 'dash',      linear: 'meteor',  element: 'physical', color: 0xffc878, mana: 0,  stamina: 12, cd: 4.00, range: 6.2,  damage: 24, telegraphSec: 0.14, anim: 'attack' },
  { id: 'flame_sword',         slot: 4, name: 'Flame Sword',    kind: 'fissure',   linear: 'meteor',  element: 'fire',     color: 0xff6a22, mana: 18, stamina: 10, cd: 8.00, range: 12,   damage: 32, telegraphSec: 0.35, forks: true, anim: 'cast', meshPath: 'models/vfx/rocks/magic-rock-1.glb' },
  { id: 'fireball',            slot: 2, name: 'Cinder Fall',    kind: 'projectile',linear: 'meteor',  element: 'fire',     color: 0xff6a22, mana: 12, stamina: 0,  cd: 0.70, range: 16,   damage: 28, speed: 18, telegraphSec: 0.22 },
  { id: 'frostlance',          slot: 3, name: 'Frost Lance',    kind: 'projectile',linear: 'ice',     element: 'ice',      color: 0x8fd4ff, mana: 14, stamina: 0,  cd: 0.85, range: 18,   damage: 24, speed: 22, pierce: true, telegraphSec: 0.2, meshPath: 'models/vfx/rocks/magic-rock-2.glb' },
  { id: 'thunder',             slot: 4, name: 'Storm Lance',    kind: 'beam',      linear: 'thunder', element: 'storm',    color: 0xc8e6ff, mana: 18, stamina: 0,  cd: 1.10, range: 14,   damage: 32, telegraphSec: 0.35, forks: true },
  { id: 'holy_beam',           slot: 5, name: 'Nova Beam',      kind: 'beam',      linear: 'beam',    element: 'holy',     color: 0xffe08a, mana: 20, stamina: 0,  cd: 2.40, range: 15,   damage: 30, telegraphSec: 0.32, meshPath: 'models/vfx/rocks/magic-rock-5.glb' },
  { id: 'holy_nova',           slot: 5, name: 'Holy Nova',      kind: 'nova',      linear: 'beam',    element: 'holy',     color: 0xffe08a, mana: 22, stamina: 0,  cd: 4.00, range: 4.5,  damage: 20, telegraphSec: 0.4 },
  { id: 'glacier',             slot: 5, name: 'Glacier Wall',   kind: 'zone',      linear: 'glacier', element: 'nature',   color: 0x7fd4c8, mana: 20, stamina: 0,  cd: 5.00, range: 3.6,  damage: 18, telegraphSec: 0.4, meshPath: 'models/vfx/rocks/magic-rock-3.glb' },
  { id: 'snare',               slot: 6, name: 'Voltaic Snare',  kind: 'zone',      linear: 'snare',   element: 'arcane',   color: 0xb070ff, mana: 16, stamina: 0,  cd: 4.20, range: 3.2,  damage: 16, telegraphSec: 0.38, meshPath: 'models/vfx/rocks/magic-rock-6.glb' },
  { id: 'void_dash',           slot: 6, name: 'Void Step',      kind: 'dash',      linear: null,      element: 'shadow',   color: 0x9b6cf0, mana: 16, stamina: 12, cd: 3.20, range: 6.5,  damage: 10, telegraphSec: 0.15 },
  { id: 'shield_bash',         slot: 2, name: 'Shield Bash',    kind: 'slash',     linear: null,      element: 'physical', color: 0xc9cedb, mana: 0,  stamina: 14, cd: 2.20, range: 2.4,  damage: 16, telegraphSec: 0.16 },
];

function playKind(meta) {
  if (meta.kind === 'projectile') return 'meteor';
  if (meta.kind === 'beam') return 'thunder';
  if (meta.kind === 'nova' || meta.kind === 'zone') return 'beam';
  if (meta.kind === 'fissure') return 'meteor';
  return null;
}

export const SKILLS = [
  ...LEGACY_SKILLS,
  ...Object.entries(CATALOG_SKILL_PLAY).map(([id, m]) => ({
    id,
    slot: 1,
    name: m.name,
    kind: m.kind,
    linear: playKind(m),
    element: m.element,
    color: m.color,
    mana: m.mana ?? 0,
    stamina: m.stamina ?? 0,
    cd: m.cd,
    range: m.range,
    damage: m.damage,
    speed: m.speed,
    heal: m.heal || 0,
    poison: !!m.poison,
    telegraphSec: m.kind === 'slash' ? 0.12 : 0.22,
  })),
];

/** info.* class → 6-slot bar. Worge (knight) swaps bar with weapon two. */
export const CLASS_LOADOUTS = {
  worge:    ['gs_samurai_combo', 'thunder', 'glacier', 'holy_beam', 'snare', 'void_dash'],
  verduror: ['holy_nova', 'glacier', 'holy_beam', 'frostlance', 'snare', 'void_dash'],
  warrior:  ['cleave', 'shield_bash', 'gs_samurai_dash', 'flame_sword', 'thunder', 'holy_nova'],
  raider:   ['gs_samurai_combo', 'gs_samurai_dash', 'flame_sword', 'cleave', 'void_dash', 'holy_nova'],
  mage:     ['fireball', 'frostlance', 'thunder', 'holy_beam', 'glacier', 'snare'],
  priest:   ['holy_beam', 'holy_nova', 'snare', 'glacier', 'void_dash', 'thunder'],
  ranger:   ['frostlance', 'fireball', 'void_dash', 'thunder', 'holy_nova', 'cleave'],
  thief:    ['gs_samurai_combo', 'gs_samurai_teleport', 'void_dash', 'cleave', 'snare', 'holy_nova'],
};

export const WORGE_LOADOUTS = {
  '1h_tome':      ['cleave', 'thunder', 'glacier', 'holy_beam', 'snare', 'void_dash'],
  nature_staff:   ['frostlance', 'glacier', 'thunder', 'holy_beam', 'holy_nova', 'snare'],
  arcane_staff:   ['fireball', 'thunder', 'holy_beam', 'snare', 'glacier', 'void_dash'],
};

const byId = new Map(SKILLS.map((s) => [s.id, s]));

export function skillById(id) {
  return byId.get(id) || SKILLS[0];
}

/**
 * Two Warlords-era weapon sets per spec (class-equipment-rules default + alt).
 * Q swaps set 0 ↔ 1. Skills stay in this catalog — no invented ids.
 */
export const CLASS_WEAPON_SETS = Object.fromEntries(
  Object.entries(T8_CLASS_SETS).map(([cls, sets]) => [cls, sets.map((s) => s.id)]),
);

export const WEAPON_LABEL = {
  sword_shield: 'SWORD+SHIELD',
  two_hand: 'GREATSWORD',
  greataxe: 'GREATAXE',
  mace_sword: 'MACE+SWORD',
  '1h_tome': '1H+TOME',
  nature_staff: 'NATURE STAFF',
  arcane_staff: 'ARCANE STAFF',
  fire_staff: 'FIRE STAFF',
  ice_staff: 'ICE STAFF',
  holy_staff: 'HOLY STAFF',
  hammer_holy_tome: 'HAMMER+HOLY TOME',
  dagger_ice_tome: 'DAGGER+ICE TOME',
  mace_nature_tome: 'MACE+NATURE TOME',
  unarmed: 'BEAR CLAWS',
  bow: 'LONGBOW',
  spear: 'SPEAR',
  dual: 'DUAL BLADES',
  pistol: 'PISTOL',
};

/** Mesh overlay on ROLE_KITS when a weapon set is equipped. */
export const WEAPON_KITS = {
  sword_shield: { weapon: 'sword', shield: true, tome: false, twoHand: false, dual: false, quiver: false },
  two_hand:     { weapon: 'sword', shield: false, twoHand: true, tome: false },
  greataxe:     { weapon: 'axe', shield: false, twoHand: true, tome: false },
  mace_sword:   { weapon: 'sword', offHand: 'hammer', dual: true, shield: false, tome: false },
  '1h_tome':    { weapon: 'sword', tome: true, shield: false, staff: false },
  nature_staff: { weapon: 'staff', staffTint: 0x6bbf4a, staffVar: 'B', tome: false, shield: false },
  arcane_staff: { weapon: 'staff', staffTint: 0xb070ff, staffVar: 'C', tome: false, shield: false },
  fire_staff:   { weapon: 'staff', staffTint: 0xff6a22, staffVar: 'A', tome: false, shield: false },
  ice_staff:    { weapon: 'staff', staffTint: 0x8fd4ff, staffVar: 'C', tome: false, shield: false },
  holy_staff:   { weapon: 'staff', staffTint: 0xffe08a, staffVar: 'A', tome: false, shield: false },
  hammer_holy_tome: { weapon: 'hammer', tome: true, tomeTint: 0xffe08a, shield: false },
  dagger_ice_tome: { weapon: 'dagger', tome: true, tomeTint: 0x8fd4ff, shield: false },
  mace_nature_tome: { weapon: 'hammer', tome: true, tomeTint: 0x6bbf4a, shield: false },
  unarmed:      { weapon: null, unarmed: true, shield: false, tome: false },
  bow:          { weapon: 'bow', quiver: true, shield: false, tome: false },
  spear:        { weapon: 'spear', shield: false, twoHand: true, tome: false },
  dual:         { weapon: 'dagger', dual: true, shield: false, tome: false },
  pistol:       { weapon: 'dagger', shield: false, tome: false },
};

const LOADOUT_BY_WEAPON = Object.fromEntries(
  Object.values(T8_CLASS_SETS).flat().map((s) => [s.id, s.skills]),
);

export function weaponsForClass(classId = 'worge') {
  return (CLASS_WEAPON_SETS[classId] || CLASS_WEAPON_SETS.worge).slice();
}

export function loadoutFor(classId = 'worge', weaponId = '1h_tome') {
  const allowed = weaponsForClass(classId);
  const wid = allowed.includes(weaponId) ? weaponId : allowed[0];
  const pack = setByKitId(classId, wid);
  const ids = pack.skills || LOADOUT_BY_WEAPON[wid] || CLASS_LOADOUTS[classId] || CLASS_LOADOUTS.worge;
  return ids.map((id, i) => {
    const s = { ...skillById(id) };
    s.slot = i + 1;
    s.weaponId = wid;
    s.t8 = pack.t8 || null;
    s.t0 = pack.t0 || null;
    s.off = pack.off || null;
    s.weaponName = pack.name || null;
    s.iconUrl = SKILL_ICON_CDN[id] || s.iconUrl || null;
    s.heal = s.heal || 0;
    s.friendly = s.heal > 0 && !(s.damage > 0);
    return s;
  });
}

/** Product element → linear skillshot id (LinearAbilityCasting map). */
export const PRODUCT_TO_LINEAR = {
  ice: 'ice',
  frost: 'ice',
  storm: 'thunder',
  lightning: 'thunder',
  fire: 'meteor',
  holy: 'beam',
  arcane: 'snare',
  nature: 'glacier',
};
