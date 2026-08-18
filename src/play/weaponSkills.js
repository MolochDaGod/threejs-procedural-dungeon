/**
 * Weapon skill catalog — linear / zone / samurai / flame sword.
 * Lessons from LinearAbilityCastingThreeJS + CastingAbilities bending:
 *   fire→meteor line · ice→ice line · storm→thunder line · holy→beam
 *   arcane→snare zone · nature→glacier zone · fire ground→forked fissure
 * No 2D sprites. Delivery is 3D mesh + GLSL.
 */
export const SKILLS = [
  { id: 'cleave',              slot: 1, name: 'Cleave',         kind: 'slash',     linear: null,      element: 'physical', color: 0xe8e0c8, mana: 0,  stamina: 8,  cd: 0.45, range: 2.8,  damage: 18, telegraphSec: 0.12 },
  { id: 'gs_samurai_combo',    slot: 1, name: 'Twin Slash',     kind: 'slash',     linear: null,      element: 'physical', color: 0xe8e0c8, mana: 0,  stamina: 8,  cd: 0.50, range: 3.1,  damage: 22, telegraphSec: 0.10, anim: 'attack' },
  { id: 'gs_samurai_teleport', slot: 2, name: 'Shadow Step',    kind: 'teleport',  linear: null,      element: 'shadow',   color: 0x9b6cf0, mana: 8,  stamina: 16, cd: 6.00, range: 8.5,  damage: 26, telegraphSec: 0.18, anim: 'attack' },
  { id: 'gs_samurai_dash',     slot: 3, name: 'Slashing Dash',  kind: 'dash',      linear: 'meteor',  element: 'physical', color: 0xffc878, mana: 0,  stamina: 12, cd: 4.00, range: 6.2,  damage: 24, telegraphSec: 0.14, anim: 'attack' },
  { id: 'flame_sword',         slot: 4, name: 'Flame Sword',    kind: 'fissure',   linear: 'meteor',  element: 'fire',     color: 0xff6a22, mana: 18, stamina: 10, cd: 8.00, range: 12,   damage: 32, telegraphSec: 0.35, forks: true, anim: 'cast' },
  { id: 'fireball',            slot: 2, name: 'Cinder Fall',    kind: 'projectile',linear: 'meteor',  element: 'fire',     color: 0xff6a22, mana: 12, stamina: 0,  cd: 0.70, range: 16,   damage: 28, speed: 18, telegraphSec: 0.22 },
  { id: 'frostlance',          slot: 3, name: 'Frost Lance',    kind: 'projectile',linear: 'ice',     element: 'ice',      color: 0x8fd4ff, mana: 14, stamina: 0,  cd: 0.85, range: 18,   damage: 24, speed: 22, pierce: true, telegraphSec: 0.2 },
  { id: 'thunder',             slot: 4, name: 'Storm Lance',    kind: 'beam',      linear: 'thunder', element: 'storm',    color: 0xc8e6ff, mana: 18, stamina: 0,  cd: 1.10, range: 14,   damage: 32, telegraphSec: 0.35, forks: true },
  { id: 'holy_beam',           slot: 5, name: 'Nova Beam',      kind: 'beam',      linear: 'beam',    element: 'holy',     color: 0xffe08a, mana: 20, stamina: 0,  cd: 2.40, range: 15,   damage: 30, telegraphSec: 0.32 },
  { id: 'holy_nova',           slot: 5, name: 'Holy Nova',      kind: 'nova',      linear: 'beam',    element: 'holy',     color: 0xffe08a, mana: 22, stamina: 0,  cd: 4.00, range: 4.5,  damage: 20, telegraphSec: 0.4 },
  { id: 'glacier',             slot: 5, name: 'Glacier Wall',   kind: 'zone',      linear: 'glacier', element: 'nature',   color: 0x7fd4c8, mana: 20, stamina: 0,  cd: 5.00, range: 3.6,  damage: 18, telegraphSec: 0.4 },
  { id: 'snare',               slot: 6, name: 'Voltaic Snare',  kind: 'zone',      linear: 'snare',   element: 'arcane',   color: 0xb070ff, mana: 16, stamina: 0,  cd: 4.20, range: 3.2,  damage: 16, telegraphSec: 0.38 },
  { id: 'void_dash',           slot: 6, name: 'Void Step',      kind: 'dash',      linear: null,      element: 'shadow',   color: 0x9b6cf0, mana: 16, stamina: 12, cd: 3.20, range: 6.5,  damage: 10, telegraphSec: 0.15 },
  { id: 'shield_bash',         slot: 2, name: 'Shield Bash',    kind: 'slash',     linear: null,      element: 'physical', color: 0xc9cedb, mana: 0,  stamina: 14, cd: 2.20, range: 2.4,  damage: 16, telegraphSec: 0.16 },
];

/** info.* class → 6-slot bar. Worge (knight) swaps bar with weapon two. */
export const CLASS_LOADOUTS = {
  worge:   ['gs_samurai_combo', 'thunder', 'glacier', 'holy_beam', 'snare', 'void_dash'],
  warrior: ['cleave', 'shield_bash', 'gs_samurai_dash', 'flame_sword', 'thunder', 'holy_nova'],
  mage:    ['fireball', 'frostlance', 'thunder', 'holy_beam', 'glacier', 'snare'],
  ranger:  ['frostlance', 'fireball', 'void_dash', 'thunder', 'holy_nova', 'cleave'],
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

export function loadoutFor(classId = 'worge', weaponId = '1h_tome') {
  const ids = classId === 'worge'
    ? (WORGE_LOADOUTS[weaponId] || WORGE_LOADOUTS['1h_tome'])
    : (CLASS_LOADOUTS[classId] || CLASS_LOADOUTS.worge);
  return ids.map((id, i) => {
    const s = { ...skillById(id) };
    s.slot = i + 1;
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
