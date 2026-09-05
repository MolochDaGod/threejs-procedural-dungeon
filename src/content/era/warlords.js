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

export const FAMILIES = {
  mage:    { id: 'mage',    label: 'Mage',    specs: ['mage', 'priest'] },
  warrior: { id: 'warrior', label: 'Warrior', specs: ['warrior', 'raider'] },
  ranger:  { id: 'ranger',  label: 'Ranger',  specs: ['ranger', 'thief'] },
  worge:   { id: 'worge',   label: 'Worge',   specs: ['worge', 'verduror'] },
};

export const CLASSES = {
  mage:     { id: 'mage',     family: 'mage',    label: 'Mage',     brain: 'mage',    role: 'cast',  keep: /staff|wand|tome|book/i },
  priest:   { id: 'priest',   family: 'mage',    label: 'Priest',   brain: 'mage',    role: 'heal',  keep: /staff|wand|tome|book|holy/i },
  warrior:  { id: 'warrior',  family: 'warrior', label: 'Warrior',  brain: 'melee',   role: 'tank',  keep: /sword|blade|axe|hammer|shield|tome|book/i },
  raider:   { id: 'raider',   family: 'warrior', label: 'Raider',   brain: 'melee',   role: 'tank',  keep: /sword|blade|axe|hammer|great/i },
  ranger:   { id: 'ranger',   family: 'ranger',  label: 'Ranger',   brain: 'ranger',  role: 'kite',  keep: /bow|spear|arrow|quiver/i },
  thief:    { id: 'thief',    family: 'ranger',  label: 'Thief',    brain: 'ranger',  role: 'peel',  keep: /dagger|pistol|blade|sword/i },
  worge:    { id: 'worge',    family: 'worge',   label: 'Worge',    brain: 'warlord', role: 'flex',  keep: /sword|blade|staff|tome|book|wand/i },
  verduror: { id: 'verduror', family: 'worge',   label: 'Verduror', brain: 'warlord', role: 'heal',  keep: /staff|wand|tome|book|nature/i },
};

export const CLASS_IDS = Object.keys(CLASSES);

export const FAMILY_OF = Object.fromEntries(
  Object.values(CLASSES).map((c) => [c.id, c.family]),
);

export function familyOf(classId) {
  return FAMILY_OF[classId] || 'warrior';
}

/** 3 allies so a 4-man stays tank / healer / dps / peel. */
export const DUNGEON_FILL = {
  warrior:  ['priest', 'ranger', 'thief'],
  raider:   ['verduror', 'mage', 'thief'],
  priest:   ['warrior', 'ranger', 'thief'],
  verduror: ['raider', 'mage', 'ranger'],
  mage:     ['warrior', 'priest', 'ranger'],
  ranger:   ['warrior', 'priest', 'thief'],
  thief:    ['warrior', 'priest', 'mage'],
  worge:    ['priest', 'ranger', 'warrior'],
};

export const TEAM_COMPS = {
  dungeonCrypt: { id: 'dungeonCrypt', label: 'Crypt crawl', mode: 'dungeon', classes: ['warrior', 'priest', 'ranger', 'thief'] },
  dungeonBoss:  { id: 'dungeonBoss',  label: 'Boss chamber', mode: 'dungeon', classes: ['raider', 'verduror', 'mage', 'worge'] },
  pvp2:         { id: 'pvp2',         label: 'Arena 2v2', mode: 'pvp', classes: ['raider', 'priest'] },
  pvp3:         { id: 'pvp3',         label: 'Arena 3v3', mode: 'pvp', classes: ['raider', 'priest', 'thief'] },
  pvp4:         { id: 'pvp4',         label: 'Skirmish 4v4', mode: 'pvp', classes: ['warrior', 'verduror', 'mage', 'ranger'] },
};

export function dungeonFill(playerClass) {
  return (DUNGEON_FILL[playerClass] || DUNGEON_FILL.warrior).slice();
}
