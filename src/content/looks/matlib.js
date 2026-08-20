/**
 * Material-library showcase (free) — extracted atlases for dungeon looks + AI gen.
 * Five PBR slots, 15×1024 maps. Not a second texture system: bind onto existing
 * matStone / floor / wall. Agents use `aiPrompt` when generating matching tiles.
 */
export const MATLIB_DIR = 'textures/matlib';

export const MATLIB_LOOKS = {
  grim: {
    id: 'grim',
    label: 'Dark brick / ash stone',
    albedo: `${MATLIB_DIR}/img_00_1024.png`,
    normal: `${MATLIB_DIR}/img_01_1024.png`,
    extra: `${MATLIB_DIR}/img_02_1024.png`,
    tint: 0x4a4a52,
    aiPrompt: 'Stylized dungeon atlas, dark grey ashlar and burnt brick, cartoon PBR, black void between islands, no photoreal, 1024 trimsheet, Warlords grim crypt.',
  },
  ancient: {
    id: 'ancient',
    label: 'Sandstone / terracotta',
    albedo: `${MATLIB_DIR}/img_00_1024.png`,
    normal: `${MATLIB_DIR}/img_03_1024.png`,
    extra: `${MATLIB_DIR}/img_05_1024.png`,
    tint: 0xc4a574,
    aiPrompt: 'Stylized sandstone and terracotta brick trimsheet, warm ochre, cartoon dungeon, black packing, 1024, ancient crypt / Sahara tomb.',
  },
  molten: {
    id: 'molten',
    label: 'Fired brick / slag',
    albedo: `${MATLIB_DIR}/img_00_1024.png`,
    normal: `${MATLIB_DIR}/img_06_1024.png`,
    extra: `${MATLIB_DIR}/img_12_1024.png`,
    tint: 0xa85a32,
    aiPrompt: 'Stylized lava-brick and slag stone atlas, red-orange cartoon PBR, emissive cracks optional, 1024 trimsheet, molten dungeon.',
  },
  frost: {
    id: 'frost',
    label: 'Pale stone / ice brick',
    albedo: `${MATLIB_DIR}/img_00_1024.png`,
    normal: `${MATLIB_DIR}/img_06_1024.png`,
    extra: `${MATLIB_DIR}/img_09_1024.png`,
    tint: 0x9bb4c8,
    aiPrompt: 'Stylized pale granite and ice-brick trimsheet, cool grey-blue, cartoon, 1024, frost dungeon walls.',
  },
  verdant: {
    id: 'verdant',
    label: 'Moss stone / bark',
    albedo: `${MATLIB_DIR}/img_00_1024.png`,
    normal: `${MATLIB_DIR}/img_03_1024.png`,
    extra: `${MATLIB_DIR}/img_04_1024.png`,
    tint: 0x6b8f5a,
    aiPrompt: 'Stylized mossy stone and bark trimsheet, green-grey cartoon PBR, 1024 packing on black, verdant dungeon.',
  },
};

export function lookOf(biome) {
  return MATLIB_LOOKS[biome] || MATLIB_LOOKS.ancient;
}
