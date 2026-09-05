/**
 * Flare Boss Arena kits for dungeon play — live converted GLB, SI-fit at spawn.
 * Host: flare-boss-arena-src.vercel.app (same files as /boss).
 * Do not vendor Meshy zips or FBX minions. Do not fork ArenaScene.
 */
export const FLARE_HOST = 'https://flare-boss-arena-src.vercel.app';

const H = FLARE_HOST;

function unit(partial) {
  return {
    clips: 'native',
    role: 'warrior',
    brain: 'pursue',
    radius: 0.48,
    speed: 2.6,
    attacks: ['slash', 'circle'],
    telegraph: 'cone',
    ...partial,
  };
}

/** Indoor cap — Flare outdoor dragons are 6–7 m; halls are 3.85 m. */
export const FLARE_INDOOR_BOSS_H = 2.55;

export const FLARE_BOSSES = {
  flare_fireworm: unit({
    id: 'flare_fireworm', label: 'Cinder Wyrmling',
    mesh: `${H}/models/bosses/fireworm.glb`,
    height: FLARE_INDOOR_BOSS_H, hp: 420, kind: 'boss', brain: 'warlord',
    clip: 'F_idle', yaw: Math.PI / 2, radius: 0.82, speed: 2.2,
    attacks: ['fire_fan', 'circle', 'column', 'slash'], telegraph: 'aoe',
    biome: 'molten', biomes: ['molten'],
  }),
  flare_framis: unit({
    id: 'flare_framis', label: 'Framis',
    mesh: `${H}/models/bosses/framis_necro.glb`,
    height: 2.35, hp: 440, kind: 'boss', brain: 'warlord',
    clip: 'fight_idle', radius: 0.7, speed: 2.15,
    attacks: ['linear', 'mist', 'circle', 'slash'], telegraph: 'aoe',
    biome: 'ancient', biomes: ['ancient', 'grim'],
  }),
  flare_sora: unit({
    id: 'flare_sora', label: 'Sora',
    mesh: `${H}/models/bosses/sora_cloud.glb`,
    height: 2.4, hp: 430, kind: 'boss', brain: 'warlord',
    clip: 'shifting_cloud_in_game_fight_idle', radius: 0.72, speed: 2.3,
    attacks: ['linear', 'circle', 'mist', 'fire_fan'], telegraph: 'incoming',
    biome: 'frost', biomes: ['frost'],
  }),
  flare_monkey: unit({
    id: 'flare_monkey', label: 'Sun Monkey King',
    mesh: `${H}/models/bosses/sun_monkey_king.glb`,
    height: 2.4, hp: 460, kind: 'boss', brain: 'warlord',
    clip: 'fight_idle', radius: 0.75, speed: 2.4,
    attacks: ['slash', 'column', 'circle', 'earth_spike'], telegraph: 'cone',
    biome: 'verdant', biomes: ['verdant', 'molten'],
  }),
};

export const FLARE_ENEMIES = {
  flare_skel_warrior: unit({
    id: 'flare_skel_warrior', label: 'Skeleton Warrior',
    mesh: `${H}/models/kaykit/enemies/Skeleton_Warrior.glb`,
    height: 1.72, hp: 48, kind: 'grunt',
    biome: 'ancient', biomes: ['ancient', 'grim'],
  }),
  flare_skel_mage: unit({
    id: 'flare_skel_mage', label: 'Skeleton Mage',
    mesh: `${H}/models/kaykit/enemies/Skeleton_Mage.glb`,
    height: 1.7, hp: 40, kind: 'caster', role: 'mage', brain: 'kite',
    attacks: ['linear', 'circle'], telegraph: 'incoming',
    biome: 'ancient', biomes: ['ancient', 'frost'],
  }),
  flare_skel_rogue: unit({
    id: 'flare_skel_rogue', label: 'Skeleton Rogue',
    mesh: `${H}/models/kaykit/enemies/Skeleton_Rogue.glb`,
    height: 1.68, hp: 42, kind: 'grunt', speed: 3.3,
    biome: 'grim', biomes: ['grim', 'frost'],
  }),
  flare_skel_minion: unit({
    id: 'flare_skel_minion', label: 'Skeleton Minion',
    mesh: `${H}/models/kaykit/enemies/Skeleton_Minion.glb`,
    height: 1.55, hp: 34, kind: 'grunt', radius: 0.4,
    biome: 'grim', biomes: ['grim', 'ancient'],
  }),
  flare_pincher: unit({
    id: 'flare_pincher', label: 'Pincher',
    mesh: `${H}/models/monsters/pincher.glb`,
    height: 1.85, hp: 70, kind: 'elite', radius: 0.58, speed: 2.5,
    attacks: ['slash', 'circle'], telegraph: 'cone',
    biome: 'molten', biomes: ['molten', 'verdant'],
  }),
  flare_cultist: unit({
    id: 'flare_cultist', label: 'Armed Cultist',
    mesh: `${H}/models/monsters/cultist_armed.glb`,
    height: 1.8, hp: 64, kind: 'caster', role: 'mage', brain: 'kite',
    attacks: ['linear', 'circle'], telegraph: 'incoming',
    biome: 'grim', biomes: ['grim', 'ancient'],
  }),
  flare_dante: unit({
    id: 'flare_dante', label: 'Dante Beast',
    mesh: `${H}/models/monsters/dante_beast.glb`,
    height: 2.15, hp: 150, kind: 'elite', radius: 0.7, speed: 2.3,
    attacks: ['slash', 'column', 'circle'], telegraph: 'aoe',
    biome: 'grim', biomes: ['grim', 'molten'],
  }),
  flare_medusa: unit({
    id: 'flare_medusa', label: 'Medusa',
    mesh: `${H}/models/monsters/medusa.glb`,
    height: 2.05, hp: 140, kind: 'elite', role: 'mage', brain: 'kite',
    attacks: ['linear', 'circle', 'mist'], telegraph: 'incoming',
    biome: 'verdant', biomes: ['verdant', 'ancient'],
  }),
};

export const FLARE_UNITS = { ...FLARE_ENEMIES, ...FLARE_BOSSES };

export const FLARE_WISP = {
  palettes: {
    ancient: { id: 'void', color: 0xaa44ff, name: 'Void Wisp' },
    molten: { id: 'ember', color: 0xff5522, name: 'Ember Wisp' },
    frost: { id: 'frost', color: 0x66ccff, name: 'Frost Wisp' },
    grim: { id: 'void', color: 0xaa44ff, name: 'Void Wisp' },
    verdant: { id: 'nature', color: 0x44dd66, name: 'Grove Wisp' },
  },
  hp: 36,
  aggro: 8.5,
  beamH: 6.2,
};

export function flareOf(id) {
  return FLARE_UNITS[id] || null;
}

export function flareBossForTheme(themeKey) {
  return ({
    ancient: FLARE_BOSSES.flare_framis,
    molten: FLARE_BOSSES.flare_fireworm,
    frost: FLARE_BOSSES.flare_sora,
    grim: FLARE_BOSSES.flare_framis,
    verdant: FLARE_BOSSES.flare_monkey,
  })[themeKey] || FLARE_BOSSES.flare_framis;
}
