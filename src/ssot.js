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
  clipDonor: CLIP_DONOR,
  telegraphWarning: `${COMBAT}/models/telegraph_warning.glb`,
  telegraphArrow: `${COMBAT}/models/telegraph_arrow.glb`,
};

/**
 * Worge = knight. Weapon two is caster kit:
 *   1h_tome      — 1H + tome (offhand)
 *   nature_staff — 2H nature staff
 *   arcane_staff — 2H arcane staff
 */
export const WORGE_WEAPONS = {
  '1h_tome':      { id: '1h_tome',      label: '1H + Tome',    weapon: 'sword', staff: false, tome: true,  staffTint: null,     staffVar: null },
  nature_staff:   { id: 'nature_staff', label: 'Nature Staff', weapon: 'staff', staff: true,  tome: false, staffTint: 0x6bbf4a, staffVar: 'B' },
  arcane_staff:   { id: 'arcane_staff', label: 'Arcane Staff', weapon: 'staff', staff: true,  tome: false, staffTint: 0xb070ff, staffVar: 'C' },
};

/** Combat Gladiators class kits (body/head letters, not wardrobe A-only). */
export const ROLE_KITS = {
  warrior: { body: 'A', arms: 'A', legs: 'A', head: 'A', shoulders: 'A', weapon: 'sword', shield: true },
  worge:   { body: 'B', arms: 'B', legs: 'B', head: 'B', shoulders: 'B', weapon: 'sword', tome: true },
  mage:    { body: 'D', arms: 'D', legs: 'A', head: 'D', shoulders: 'B', weapon: 'staff' },
  ranger:  { body: 'C', arms: 'C', legs: 'C', head: 'C', shoulders: 'A', weapon: 'bow', quiver: true },
};

import { CLASS_LOADOUTS as WEAPON_LOADOUTS, SKILLS, loadoutFor, skillById } from './play/weaponSkills.js';

/**
 * 6-slot bar — linear / zone / samurai / flame sword. No 2D sprites.
 * kind: slash | projectile | beam | nova | dash | teleport | fissure | zone
 */
export const SPELLS = SKILLS;
export const CLASS_LOADOUTS = WEAPON_LOADOUTS;
export { loadoutFor, skillById };

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
  groundY: 0,
  floorH: 0.28,
  gravity: -30,
  capsuleHalfH: 0.55,
};

/** Kit meshes used by forge dressing (KayKit on CDN). */
export const DRESSING = {
  torch: `${CDN}/game-assets/glb/kaykit/gltf/torch.glb`,
  chest: `${CDN}/game-assets/glb/kaykit/gltf/chest_rare.glb`,
  banner: `${CDN}/game-assets/glb/kaykit/gltf/banner.glb`,
};

export const PLAY = {
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
    iframeEnd: 0.56,
    maxDistance: 4.9,
    minDistance: 0.5,
    cd: 0.78,
    stam: 18,
  },
  parry: { key: 'KeyC', window: 0.30, cd: 1.35, stam: 12, invuln: 0.22 },
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
export { CLASSES, CLASS_IDS } from './content/era/warlords.js';
export { THEME_BIOME, POOL_RULES, biomeOf } from './content/biomes/index.js';
export { ENEMY_ATTACKS, ROLE_ATTACKS } from './combat/attacks.js';

export const DUNGEON_LAYOUT = {
  linearRooms: 7,
  graphRooms: 8,
  roomsMin: 6,
  roomsMax: 20,
  loopLinear: 0,
  loopGraph: 0.12,
};
