/**
 * How a dungeon is filled for live play. One generator (Dungeon Forge).
 * kind only changes roster + spawn plan — not a second layout engine.
 *
 *   biome  — theme creatures + Toon fillers
 *   faction — enemy-faction Warlords heroes at 1.5× with boss-like telegraphs
 *   boss   — entrance crawl, combat rooms empty, warlord in the arena
 */
import { RACES } from './era/warlords.js';

export const DUNGEON_KINDS = {
  biome: {
    id: 'biome',
    label: 'BIOME',
    blurb: 'Theme roster + authored creatures. Cone / projectile / AoE telegraphs.',
  },
  faction: {
    id: 'faction',
    label: 'FACTION',
    blurb: 'Enemy-faction Toon units 1.5× with boss-like attacks.',
    heroScale: 1.5,
  },
  boss: {
    id: 'boss',
    label: 'BOSS ONLY',
    blurb: 'Halls stay empty. One warlord arena.',
  },
};

export const DUNGEON_KIND_IDS = Object.keys(DUNGEON_KINDS);

export function enemyFactionRaces(playerRace) {
  const fac = RACES[playerRace]?.faction || 'Crusade';
  if (fac === 'Legion') return ['human', 'barbarian', 'elf', 'dwarf'];
  return ['orc', 'undead'];
}
