/**
 * combat.spells — 6-slot linear bar. Loadout is pre-crawl.
 */
import { WORGE_WEAPONS } from '../content/items/index.js';

export const SPELLS = [
  { id: 'cleave',     slot: 1, name: 'Cleave',     kind: 'slash',      element: 'physical',  color: 0xe8e0c8, mana: 0,  cd: 0.45, range: 2.8,  damage: 18, vfx: 'sword_slash', telegraphSec: 0.12 },
  { id: 'fireball',   slot: 2, name: 'Fireball',   kind: 'projectile', element: 'fire',      color: 0xff6a22, mana: 12, cd: 0.70, range: 16,   damage: 28, vfx: 'flame_ball',   speed: 18, telegraphSec: 0.22 },
  { id: 'frostlance', slot: 3, name: 'Frost Lance',kind: 'projectile', element: 'frost',     color: 0x8fd4ff, mana: 14, cd: 0.85, range: 18,   damage: 24, vfx: 'ice_ball',     speed: 22, pierce: true, telegraphSec: 0.2 },
  { id: 'thunder',    slot: 4, name: 'Thunder',    kind: 'beam',       element: 'lightning', color: 0xc8e6ff, mana: 18, cd: 1.10, range: 14,   damage: 32, vfx: 'chain_lightning', telegraphSec: 0.35 },
  { id: 'holy_nova',  slot: 5, name: 'Holy Nova',  kind: 'nova',       element: 'holy',      color: 0xffe08a, mana: 22, cd: 4.00, range: 4.5,  damage: 20, vfx: 'holy_aura', telegraphSec: 0.4 },
  { id: 'void_dash',  slot: 6, name: 'Void Step',  kind: 'dash',       element: 'shadow',    color: 0x9b6cf0, mana: 16, cd: 3.20, range: 6.5,  damage: 10, vfx: 'void_rift', telegraphSec: 0.15 },
];

export const CLASS_LOADOUTS = {
  warrior: ['cleave', 'void_dash', 'holy_nova', 'thunder', 'fireball', 'frostlance'],
  mage:    ['thunder', 'fireball', 'frostlance', 'holy_nova', 'void_dash', 'cleave'],
  ranger:  ['frostlance', 'cleave', 'void_dash', 'fireball', 'thunder', 'holy_nova'],
  worge:   WORGE_WEAPONS.tome.slots,
};

export function spellById(id) {
  return SPELLS.find((s) => s.id === id) || SPELLS[0];
}

export function loadoutFor(classId, worgeWeapon = 'tome') {
  if (classId === 'worge') {
    return (WORGE_WEAPONS[worgeWeapon] || WORGE_WEAPONS.tome).slots.map(spellById);
  }
  const ids = CLASS_LOADOUTS[classId] || CLASS_LOADOUTS.warrior;
  return ids.map(spellById);
}

export { WORGE_WEAPONS };
