/**
 * Production source of truth for Grudge Warlords Era dungeon play.
 *
 * Characters, shared loco/cast clips, and spell VFX IDs live on the
 * Grudge CDN. This repo does not vendor Unity FBX or ship API keys.
 *
 *   CDN:     https://assets.grudge-studio.com
 *   Pack:    asset-packs/toon-rts-characters  (uMMORPG / Toon RTS / Warlords Era)
 *   Races:   human | barbarian | elf | dwarf | orc | undead
 *   Spells:  aligned with warlord-genesis/data/vfx/vfx-skill-types.json
 */
export const CDN = 'https://assets.grudge-studio.com';
/** Live Gladiators host — game-ready clip donors, telegraphs, arena deployables. */
export const COMBAT = 'https://combat.grudge-studio.com';
/** ObjectStore combat math + class/race SSOT. */
export const INFO = 'https://info.grudge-studio.com';
/** Canonical character info (ObjectStore 2D main panel). Do not fork a dungeon paperdoll. */
export const MAIN_PANEL = `${INFO}/main-panel.html`;
/** Canonical craft suite — Railway account bag + character XP. Pop-out only (no iframe). */
export const CRAFT_SUITE = 'https://grudgewarlords.com/craft/';
export const TOON_RTS = `${CDN}/asset-packs/toon-rts-characters`;
/** Fleet catalog — same file DungeonInstanceSystem loads. */
export const DUNGEON_KIT_URL = `${CDN}/models/dungeons/warlords-dungeon-kit.json`;

export const RACES = {
  human:     { id: 'human',     label: 'Human',     pack: 'western_kingdoms', prefix: 'WK',  faction: 'Crusade' },
  barbarian: { id: 'barbarian', label: 'Barbarian', pack: 'barbarians',       prefix: 'BRB', faction: 'Crusade' },
  elf:       { id: 'elf',       label: 'Elf',       pack: 'elves',            prefix: 'ELF', faction: 'Fabled'  },
  dwarf:     { id: 'dwarf',     label: 'Dwarf',     pack: 'dwarves',          prefix: 'DWF', faction: 'Fabled'  },
  orc:       { id: 'orc',       label: 'Orc',       pack: 'orcs',             prefix: 'ORC', faction: 'Legion'  },
  undead:    { id: 'undead',    label: 'Undead',    pack: 'undead',           prefix: 'UD',  faction: 'Legion'  },
};

export const RACE_IDS = Object.keys(RACES);

export function raceCharacterUrl(raceId) {
  const id = RACES[raceId] ? raceId : 'human';
  return `${TOON_RTS}/glb/characters/${id}.glb`;
}

/**
 * Combat clip donor — 55 named Bip001 clips (idle/walk/run/attack/cast…).
 * Same file Gladiators binds with rotation-only retarget. Do not use
 * anim_*.glb translation tracks; those crush the race rest pose.
 */
export const CLIP_DONOR = `${COMBAT}/models/toon-clips/wk-knight.glb`;

/** Fallback single-clip GLBs if the combat donor is unreachable. */
export const ANIM_URLS = {
  idle:   `${TOON_RTS}/glb/anim_idle.glb`,
  walk:   `${TOON_RTS}/glb/anim_walk.glb`,
  attack: `${TOON_RTS}/glb/anim_attack.glb`,
  death:  `${TOON_RTS}/glb/anim_death.glb`,
};

export const COMBAT_DEPLOY = {
  host: COMBAT,
  clipDonor: CLIP_DONOR,
  telegraphWarning: `${COMBAT}/models/telegraph_warning.glb`,
  telegraphArrow: `${COMBAT}/models/telegraph_arrow.glb`,
  totemFire: `${CDN}/models/creatures/totem/fire_totem.glb`,
  /** Faction / Toon foes — race kit on CDN, clips from combat donor. */
  enemyFrom: 'toon-rts + combat clip donor',
  ban: 'FBX minions under combat /models/minions',
};

/**
 * Worge = knight. Weapon two is caster kit.
 * Spec sets live in CLASS_WEAPON_SETS (Q swap).
 */
export const WORGE_WEAPONS = {
  '1h_tome':      { id: '1h_tome',      label: '1H + Tome',    weapon: 'sword', staff: false, tome: true,  staffTint: null,     staffVar: null },
  nature_staff:   { id: 'nature_staff', label: 'Nature Staff', weapon: 'staff', staff: true,  tome: false, staffTint: 0x6bbf4a, staffVar: 'B' },
  arcane_staff:   { id: 'arcane_staff', label: 'Arcane Staff', weapon: 'staff', staff: true,  tome: false, staffTint: 0xb070ff, staffVar: 'C' },
  dagger_ice_tome:{ id: 'dagger_ice_tome', label: 'Dagger + Ice Tome', weapon: 'dagger', staff: false, tome: true, staffTint: 0x8fd4ff, staffVar: null },
};

/** Combat Gladiators class kits (body/head letters, not wardrobe A-only). */
export const ROLE_KITS = {
  warrior:  { body: 'A', arms: 'A', legs: 'A', head: 'A', shoulders: 'A', weapon: 'sword', shield: true },
  raider:   { body: 'A', arms: 'A', legs: 'A', head: 'A', shoulders: 'A', weapon: 'sword', twoHand: true },
  worge:    { body: 'B', arms: 'B', legs: 'B', head: 'B', shoulders: 'B', weapon: 'sword', tome: true },
  verduror: { body: 'B', arms: 'B', legs: 'B', head: 'B', shoulders: 'B', weapon: 'staff', staffTint: 0x6bbf4a },
  mage:     { body: 'D', arms: 'D', legs: 'A', head: 'D', shoulders: 'B', weapon: 'staff' },
  priest:   { body: 'D', arms: 'D', legs: 'A', head: 'D', shoulders: 'B', weapon: 'staff', tome: true },
  ranger:   { body: 'C', arms: 'C', legs: 'C', head: 'C', shoulders: 'A', weapon: 'bow', quiver: true },
  thief:    { body: 'C', arms: 'C', legs: 'C', head: 'C', shoulders: 'A', weapon: 'sword', dual: true },
};

import {
  CLASS_LOADOUTS as WEAPON_LOADOUTS,
  SKILLS,
  loadoutFor,
  skillById,
  CLASS_WEAPON_SETS,
  WEAPON_KITS,
  WEAPON_LABEL,
  weaponsForClass,
} from './play/weaponSkills.js';

/**
 * 6-slot bar — linear / zone / samurai / flame sword. No 2D sprites.
 * kind: slash | projectile | beam | nova | dash | teleport | fissure | zone
 */
export const SPELLS = SKILLS;
export const CLASS_LOADOUTS = WEAPON_LOADOUTS;
export { loadoutFor, skillById, CLASS_WEAPON_SETS, WEAPON_KITS, WEAPON_LABEL, weaponsForClass };

/** Theme → enemy race (Warlords era, not mixed eras). */
export const THEME_ENEMY = {
  ancient: 'undead',
  molten:  'orc',
  frost:   'dwarf',
  grim:    'undead',
  verdant: 'orc',
};

/**
 * SI dungeon measure — 4-man party can walk halls two-by-two.
 * Kenney modular dungeon: ~4 m halls, ~3.8 m clear height.
 */
export const DUNGEON_SI = {
  cell: 2.15,
  wallH: 3.85,
  wallThick: 0.55,
  doorH: 2.4,
  groundY: 0,
  floorH: 0.28,
  gravity: -30,
  capsuleHalfH: 0.55,
};

/** Kit meshes used by forge dressing (KayKit). Opt copies = Meshopt + KTX2/WebP. */
export const DRESSING = {
  torch: '/models/opt/kaykit/torch.glb',
  chest: '/models/opt/kaykit/chest_rare.glb',
  banner: '/models/opt/kaykit/banner.glb',
  carpet: '/models/opt/kaykit/floorDecoration_wood.glb',
  crate: '/models/opt/kaykit/crate.glb',
  barrel: '/models/opt/kaykit/barrel.glb',
  pillar: '/models/opt/kaykit/pillar.glb',
  ruin: '/models/opt/kaykit/pillar_broken.glb',
  gate: '/models/props/the-gate.glb',
};

/** Catalog weapon overlay clips — Bip001 JSON on assets CDN (Casting prod/anims). */
export const WEAPON_CLIP_URLS = {
  magic: {
    cast: `${CDN}/prod/anims/magic/standing-1h-cast-spell-01.json`,
  },
  longbow: {
    shoot: `${CDN}/prod/anims/longbow/standing-draw-arrow.json`,
    attack2: `${CDN}/prod/anims/longbow/standing-aim-recoil.json`,
  },
  sword_shield: {
    attack: `${CDN}/prod/anims/sword_shield/sword-and-shield-slash.json`,
    attack2: `${CDN}/prod/anims/sword_shield/sword-and-shield-attack.json`,
  },
};

export function weaponClipPack(weaponId) {
  const w = String(weaponId || '');
  if (/bow|longbow|xbow/.test(w)) return WEAPON_CLIP_URLS.longbow;
  if (/staff|wand|tome|magic/.test(w)) return WEAPON_CLIP_URLS.magic;
  if (/unarmed|claw/.test(w)) return null;
  return WEAPON_CLIP_URLS.sword_shield;
}

export const PLAY = {
  level: 20,
  tickHz: 60,
  maxDt: 0.05,
  playerHeight: 1.82,
  enemyHeight: 1.72,
  bossHeight: 2.35,
  walkSpeed: 5.4,
  runSpeed: 8.2,
  accel: 28,
  friction: 18,
  hp: 140,
  mana: 100,
  stamina: 100,
  manaRegen: 8,
  hpRegen: 1.4,
  staminaRegen: 14,
  sprintStamina: 18,
  party: 4,
  allyHp: 110,
  dodge: {
    key: 'KeyX',
    duration: 0.72,
    iframeStart: 0.06,
    iframeEnd: 0.34,
    maxDistance: 4.9,
    minDistance: 0.5,
    cd: 0.78,
    stam: 18,
    doubleTapSec: 0.28,
  },
  parry: { key: 'KeyC', window: 0.30, cd: 1.35, stam: 12, invuln: 0.22, shiftRmb: true, stun: 1.4 },
  block: { key: 'KeyE', factor: 0.55, stam: 6, drain: 14, facingDot: 0.15 },
  gate: { key: 'KeyE', forceSec: 5, reach: 2.2, heightM: 3.25, thickM: 0.55 },
  slide: { key: 'ControlLeft', distance: 3.4, duration: 0.55, cd: 0.95, stam: 22, hitRadius: 1.15, damage: 16 },
  /** Indoor shoulder TPS — Casting contract, hall-scale boom (not map 20 / outdoor 8.4). */
  tps: {
    fov: 62,
    sprintFov: 68,
    distance: 4.6,
    sprintDistance: 5.2,
    minDistance: 1.45,
    maxDistance: 7.0,
    targetHeight: 1.42,
    shoulderOffset: 0.36,
    boomLift: 0.26,
    lookAhead: 0.18,
    followLambda: 11,
    minPitch: -0.48,
    maxPitch: 0.92,
    defaultPitch: 0.18,
    lookSens: 0.0022,
    zoomSpeed: 0.5,
    fog: 0.022,
  },
};

/** Indoor override of open-world AGGRO_CONFIG (rooms are tight). */
export const AGGRO = {
  detection: 14,
  aggro: 11,
  assist: 16,
  leash: 22,
};

/** Physics + nav for generated instances (matches Rapier fleet SSOT). */
export const INSTANCE = {
  cellM: 2.15,
  nav: 'grid-8',
  physics: 'rapier3d-compat',
  physicsPackage: '@dimforge/rapier3d-compat',
  physicsVersion: '^0.19.3',
  fixedDt: 1 / 60,
  tickHz: 60,
  maxPlayers: 8,
  host: 'three+rapier+node',
};

export function spellById(id) {
  return skillById(id);
}

export { CREATURES, creatureOf, creaturesForBiome } from './content/creatures/index.js';
export { PROP_KITS } from './content/props/kits.js';
export { DUNGEON_KINDS, DUNGEON_KIND_IDS, enemyFactionRaces } from './content/kinds.js';
export { HERO_24, PIRATE_FACES, portraitUrl, heroOf, portraitFallback } from './content/era/heroes24.js';
export { CLASSES, CLASS_IDS, FAMILIES, FAMILY_OF, TEAM_COMPS, dungeonFill, familyOf } from './content/era/warlords.js';
export { THEME_BIOME, POOL_RULES, biomeOf } from './content/biomes/index.js';
export { ENEMY_ATTACKS, ROLE_ATTACKS } from './combat/attacks.js';

export const DUNGEON_LAYOUT = {
  linearRooms: 7,
  graphRooms: 42,
  roomsMin: 7,
  roomsMax: 80,
  loopLinear: 0,
  loopGraph: 0.15,
};

/**
 * Starting play defaults — query + forge panel override these.
 * Enemies: Toon kits + combat.grudge-studio.com clip donor / telegraphs.
 * Combat FBX minions are not play bodies.
 */
export const PLAY_DEFAULTS = {
  linear: true,
  rooms: 7,
  loops: 0,
  theme: 'auto',
  kind: 'biome',
  race: 'human',
  classId: 'worge',
  yuka: true,
  seed: 1337,
  era: 'warlords',
};
