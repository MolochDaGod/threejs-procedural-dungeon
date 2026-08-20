/**
 * Dungeon monsters (grunts + elites). Roster is biome-owned.
 * Prefab ids match warlords-dungeon-kit characters.prefabs.
 */
export const MONSTERS = {
  wight_blade:     { id: 'wight_blade',     biome: 'ancient', kind: 'grunt',  role: 'warrior', race: 'undead' },
  wight_bow:       { id: 'wight_bow',       biome: 'ancient', kind: 'caster', role: 'mage',    race: 'undead' },
  barrow_mage:     { id: 'barrow_mage',     biome: 'ancient', kind: 'elite',  role: 'mage',    race: 'undead' },
  barrow_brute:    { id: 'barrow_brute',    biome: 'ancient', kind: 'elite',  role: 'warrior', race: 'undead' },
  ash_reaver:      { id: 'ash_reaver',      biome: 'molten',  kind: 'grunt',  role: 'warrior', race: 'orc' },
  cinder_hunter:   { id: 'cinder_hunter',   biome: 'molten',  kind: 'caster', role: 'mage',    race: 'orc' },
  cinder_shaman:   { id: 'cinder_shaman',   biome: 'molten',  kind: 'elite',  role: 'mage',    race: 'orc' },
  slag_brute:      { id: 'slag_brute',      biome: 'molten',  kind: 'elite',  role: 'warrior', race: 'orc' },
  rime_thane:      { id: 'rime_thane',      biome: 'frost',   kind: 'grunt',  role: 'warrior', race: 'dwarf' },
  rime_bolt:       { id: 'rime_bolt',       biome: 'frost',   kind: 'caster', role: 'mage',    race: 'dwarf' },
  hoar_runecaster: { id: 'hoar_runecaster', biome: 'frost',   kind: 'elite',  role: 'mage',    race: 'dwarf' },
  ice_warden:      { id: 'ice_warden',      biome: 'frost',   kind: 'elite',  role: 'warrior', race: 'dwarf' },
  grave_stalker:   { id: 'grave_stalker',   biome: 'grim',    kind: 'grunt',  role: 'warrior', race: 'undead' },
  grave_blade:     { id: 'grave_blade',     biome: 'grim',    kind: 'grunt',  role: 'warrior', race: 'undead' },
  ossuary_blade:   { id: 'ossuary_blade',   biome: 'grim',    kind: 'elite',  role: 'warrior', race: 'undead' },
  plague_chanter:  { id: 'plague_chanter',  biome: 'grim',    kind: 'elite',  role: 'mage',    race: 'undead' },
  thorn_raider:    { id: 'thorn_raider',    biome: 'verdant', kind: 'grunt',  role: 'warrior', race: 'orc' },
  briar_cleaver:   { id: 'briar_cleaver',   biome: 'verdant', kind: 'grunt',  role: 'warrior', race: 'orc' },
  root_brute:      { id: 'root_brute',      biome: 'verdant', kind: 'elite',  role: 'warrior', race: 'orc' },
  spore_mage:      { id: 'spore_mage',      biome: 'verdant', kind: 'elite',  role: 'mage',    race: 'orc' },
};

export function monsterOf(id) {
  return MONSTERS[id] || null;
}
