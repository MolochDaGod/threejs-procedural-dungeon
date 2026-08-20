/**
 * Live play load map — what deploys, from where, in what order.
 * Forge builds layout; ENTER hydrates characters + roster + physics.
 */
export const DUNGEON_PLAY_CONTRACT = {
  schema: 'grudge.dungeon.play/v1',
  host: 'grudge-dungeons',
  live: 'https://grudge-dungeons.vercel.app/',
  steps: [
    'Forge generateDungeon(seed, theme) → grid + rooms (one generator)',
    'compileMechanics → cuboids, gates, shrine, pool',
    'attachDungeonTerrain → sampler + BVH + navmesh at groundY=0',
    'ENTER → Rapier WASM lazy + character entry (Toon or creature GLB)',
    'planEncounters(kind) → biome | faction 1.5× | boss-only',
    'PlaySession: WASD, 1–6, X dodge, C parry, START/COMPLETE objective, telegraphs cone/linear/aoe',
  ],
  loads: {
    player: 'CDN Toon {race}.glb + anim_idle/walk/attack/death + combat donor',
    allies: 'other three classes, any remaining races — tank taunt/parry, priest heal, ranger DPS, worge utility',
    biomeMobs: 'Toon biome.race OR public/models/creatures/*.glb native clips; units may appear in multiple biomes',
    factionMobs: 'hostile faction Toon kits × 1.5, ROLE_ATTACKS.boss',
    boss: 'biome warlord (Toon, taller) or authored troll/rock as elite',
    entrance: 'KayKit door/gate on the wall — not 2cave.glb outdoor scene',
    cover: 'stampCover pillars/interior walls/debris + halloween staged BARRIER; isolate-by-name kits',
    physics: 'Rapier CCT on cuboids + BLOCK cover; BVH sampler for feet',
  },
  kinds: ['biome', 'faction', 'boss'],
  hud: {
    portraits: 'HERO_24 lore faces + Racalvin / John Wayne / Scoujge Faithbear',
    objective: 'START at entrance · COMPLETE on warlord slain',
  },
};
