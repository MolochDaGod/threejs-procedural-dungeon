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

/** Combat Gladiators class kits (body/head letters, not wardrobe A-only). */
export const ROLE_KITS = {
  warrior: { body: 'A', arms: 'A', legs: 'A', head: 'A', shoulders: 'A', weapon: 'sword', shield: true },
  worge:   { body: 'B', arms: 'B', legs: 'B', head: 'B', shoulders: 'B', weapon: 'axe' },
  mage:    { body: 'D', arms: 'D', legs: 'A', head: 'D', shoulders: 'B', weapon: 'staff' },
  ranger:  { body: 'C', arms: 'C', legs: 'C', head: 'C', shoulders: 'A', weapon: 'bow', quiver: true },
};

/**
 * Danger Room 6-slot bar — picked BEFORE the crawl, not mid-match.
 * kind: slash | projectile | beam | nova | dash
 * Linear spells travel in a straight line from the caster facing.
 */
export const SPELLS = [
  { id: 'cleave',     slot: 1, name: 'Cleave',     kind: 'slash',      element: 'physical',  color: 0xe8e0c8, mana: 0,  cd: 0.45, range: 2.8,  damage: 18, vfx: 'sword_slash', telegraphSec: 0.12 },
  { id: 'fireball',   slot: 2, name: 'Fireball',   kind: 'projectile', element: 'fire',      color: 0xff6a22, mana: 12, cd: 0.70, range: 16,   damage: 28, vfx: 'flame_ball',   speed: 18, telegraphSec: 0.22 },
  { id: 'frostlance', slot: 3, name: 'Frost Lance',kind: 'projectile', element: 'frost',     color: 0x8fd4ff, mana: 14, cd: 0.85, range: 18,   damage: 24, vfx: 'ice_ball',     speed: 22, pierce: true, telegraphSec: 0.2 },
  { id: 'thunder',    slot: 4, name: 'Thunder',    kind: 'beam',       element: 'lightning', color: 0xc8e6ff, mana: 18, cd: 1.10, range: 14,   damage: 32, vfx: 'chain_lightning', telegraphSec: 0.35 },
  { id: 'holy_nova',  slot: 5, name: 'Holy Nova',  kind: 'nova',       element: 'holy',      color: 0xffe08a, mana: 22, cd: 4.00, range: 4.5,  damage: 20, vfx: 'holy_aura', telegraphSec: 0.4 },
  { id: 'void_dash',  slot: 6, name: 'Void Step',  kind: 'dash',       element: 'shadow',    color: 0x9b6cf0, mana: 16, cd: 3.20, range: 6.5,  damage: 10, vfx: 'void_rift', telegraphSec: 0.15 },
];

export const CLASS_LOADOUTS = {
  warrior: ['cleave', 'fireball', 'frostlance', 'thunder', 'holy_nova', 'void_dash'],
  worge:   ['cleave', 'void_dash', 'thunder', 'fireball', 'holy_nova', 'frostlance'],
  mage:    ['thunder', 'fireball', 'frostlance', 'holy_nova', 'void_dash', 'cleave'],
  ranger:  ['cleave', 'frostlance', 'fireball', 'void_dash', 'thunder', 'holy_nova'],
};

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
  return SPELLS.find((s) => s.id === id) || SPELLS[0];
}
