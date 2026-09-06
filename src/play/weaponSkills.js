/**
 * Weapon skill catalog — T8 hero trees + T0 starter play data.
 * Authority: master-weapon-prefabs · master-weaponSkills. No invented ids.
 */
import { CATALOG_SKILL_PLAY, T8_CLASS_SETS, setByKitId } from './t0ClassSets.js';
import { resolveSkillIcon } from './skillIcons.js';

/** Lab nicknames → catalog ids. Never play as a different skill. */
const LEGACY_ALIAS = {
  cleave: 'sword_vengeful_slash',
  shield_bash: 'tower_fortress',
  gs_samurai_combo: 'gs_cleave',
  gs_samurai_dash: 'gs_judgement',
  gs_samurai_teleport: 'dagger_phantom_dash',
  flame_sword: 'staff_flame_wave',
  fireball: 'staff_fire_bolt',
  frostlance: 'staff_frost_bolt',
  thunder: 'staff_fire_bolt',
  holy_beam: 'staff_holy_light',
  holy_nova: 'staff_radiant_heal',
  glacier: 'staff_blizzard',
  snare: 'bow_bear_trap',
  void_dash: 'dagger_phantom_dash',
};

const CDN = 'https://assets.grudge-studio.com';
const ORB = {
  fire: `${CDN}/models/vfx/orbs/orb-fire.glb`,
  ice: `${CDN}/models/vfx/orbs/orb-ice.glb`,
  frost: `${CDN}/models/vfx/orbs/orb-ice.glb`,
  nature: `${CDN}/models/vfx/orbs/orb-nature.glb`,
  storm: `${CDN}/models/vfx/orbs/orb-storm.glb`,
  holy: `${CDN}/models/vfx/orbs/orb-holy.glb`,
  arcane: `${CDN}/models/vfx/orbs/orb-arcane.glb`,
  shadow: `${CDN}/models/vfx/orbs/orb-arcane.glb`,
};
const ROCK = {
  fire: 'models/vfx/rocks/magic-rock-1.glb',
  ice: 'models/vfx/rocks/magic-rock-2.glb',
  frost: 'models/vfx/rocks/magic-rock-2.glb',
  nature: 'models/vfx/rocks/magic-rock-3.glb',
  holy: 'models/vfx/rocks/magic-rock-5.glb',
  arcane: 'models/vfx/rocks/magic-rock-6.glb',
  shadow: 'models/vfx/rocks/magic-rock-6.glb',
};

function meshFor(kind, element) {
  if (kind === 'fissure') return ROCK[element] || ROCK.nature;
  if ((kind === 'projectile' || kind === 'beam') && ORB[element]) return ORB[element];
  return null;
}

function playKind(meta) {
  if (meta.kind === 'projectile') return 'meteor';
  if (meta.kind === 'beam') return 'thunder';
  if (meta.kind === 'nova' || meta.kind === 'zone') return 'beam';
  if (meta.kind === 'fissure') return 'meteor';
  return null;
}

function decorate(id, m) {
  const kind = m.kind;
  const meshPath = m.meshPath || meshFor(kind, m.element);
  return {
    id,
    slot: 1,
    name: m.name,
    kind,
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
    taunt: !!m.taunt,
    parry: !!m.parry,
    block: !!m.block,
    telegraphSec: m.telegraphSec ?? (kind === 'slash' ? 0.12 : kind === 'nova' || kind === 'zone' ? 0.4 : 0.22),
    meshPath,
    anim: kind === 'slash' || kind === 'dash' ? 'attack' : 'cast',
    iconUrl: resolveSkillIcon({ id, iconUrl: m.iconUrl }),
  };
}

export const SKILLS = Object.entries(CATALOG_SKILL_PLAY).map(([id, m]) => decorate(id, m));

/** Canonical 6-slot bars = T8 set 0. No lab nicknames. */
export const CLASS_LOADOUTS = Object.fromEntries(
  Object.entries(T8_CLASS_SETS).map(([cls, sets]) => [cls, (sets[0]?.skills || []).slice(0, 6)]),
);

export const WORGE_LOADOUTS = Object.fromEntries(
  (T8_CLASS_SETS.worge || []).map((s) => [s.id, s.skills]),
);

const byId = new Map(SKILLS.map((s) => [s.id, s]));

export function skillById(id) {
  if (byId.has(id)) return byId.get(id);
  const alias = LEGACY_ALIAS[id];
  if (alias && byId.has(alias)) return { ...byId.get(alias), id: alias };
  const kind = /heal|ward|beacon|radiant|holy_light/i.test(id) ? 'nova'
    : /bolt|shot|arrow|javelin|lance/i.test(id) ? 'projectile'
    : /dash|charge|pounce|sprint|teleport/i.test(id) ? 'dash'
    : /nova|storm|whirl|slam|stomp/i.test(id) ? 'nova'
    : /wave|fissure|meteor/i.test(id) ? 'fissure'
    : 'slash';
  const row = decorate(id, { name: id.replace(/_/g, ' '), kind, element: 'physical', color: 0xe8e0c8, cd: 1, range: 3, damage: 20 });
  byId.set(id, row);
  SKILLS.push(row);
  return row;
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
    const resolved = skillById(id);
    const s = { ...resolved, id: resolved.id };
    s.slot = i + 1;
    s.weaponId = wid;
    s.t8 = pack.t8 || null;
    s.t0 = pack.t0 || null;
    s.off = pack.off || null;
    s.weaponName = pack.name || null;
    s.iconUrl = resolveSkillIcon({ ...s, id });
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
