/**
 * Dungeon warlord bosses — one per biome, out of the crawl via arena room.
 * Prefab ids match warlords-dungeon-kit characters.prefabs.bosses.
 */
export const BOSSES = {
  lich_warlord:    { id: 'lich_warlord',    biome: 'ancient', race: 'undead', phases: [0.66, 0.33], hp: 420 },
  slag_warlord:    { id: 'slag_warlord',    biome: 'molten',  race: 'orc',    phases: [0.66, 0.33], hp: 420 },
  glacier_warlord: { id: 'glacier_warlord', biome: 'frost',   race: 'dwarf',  phases: [0.66, 0.33], hp: 420 },
  death_warlord:   { id: 'death_warlord',   biome: 'grim',    race: 'undead', phases: [0.66, 0.33], hp: 420 },
  bloom_warlord:   { id: 'bloom_warlord',   biome: 'verdant', race: 'orc',    phases: [0.66, 0.33], hp: 420 },
};

export function bossOf(id) {
  return BOSSES[id] || null;
}
