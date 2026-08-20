/**
 * Warlords Era identity — CDN kits, races, classes.
 * Play mesh is Toon RTS `{race}.glb`. Clips: shared Toon + combat.grudge-studio.com donor.
 */
export const ERA = {
  id: 'warlords',
  label: 'Warlords Era',
  product: 'warlords',
};

export const CDN = 'https://assets.grudge-studio.com';
export const COMBAT_HOST = 'https://combat.grudge-studio.com';
export const TOON_RTS = `${CDN}/asset-packs/toon-rts-characters`;
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

export const ANIM_URLS = {
  idle:   `${TOON_RTS}/glb/anim_idle.glb`,
  walk:   `${TOON_RTS}/glb/anim_walk.glb`,
  attack: `${TOON_RTS}/glb/anim_attack.glb`,
  death:  `${TOON_RTS}/glb/anim_death.glb`,
};

/** Extra clip donor from the combat lab (kit characters.anims.donor). */
export const COMBAT_CLIP_URLS = [
  `${COMBAT_HOST}/models/toon-clips/wk-knight.glb`,
];

export const CLASSES = {
  worge:   { id: 'worge',   label: 'Worge',   brain: 'warlord', role: 'flex',  keep: /sword|blade|staff|tome|book|wand/i },
  warrior: { id: 'warrior', label: 'Warrior', brain: 'melee',   role: 'tank',  keep: /sword|blade|axe|hammer|shield/i },
  mage:    { id: 'mage',    label: 'Mage',    brain: 'mage',    role: 'cast',  keep: /staff|wand|tome|book/i },
  ranger:  { id: 'ranger',  label: 'Ranger',  brain: 'ranger',  role: 'kite',  keep: /bow|spear|arrow|quiver/i },
};

export const CLASS_IDS = Object.keys(CLASSES);
