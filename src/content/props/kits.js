/**
 * Interior kit pieces — isolate by mesh name. SI: brick tiles ~2 m, dungeon pillar ~3 m.
 */
export const PROP_KITS = {
  dungeon: {
    glb: 'models/props/lp-dungeon.glb',
    biomes: ['ancient', 'grim'],
    pieces: [
      { id: 'pillar', mesh: 'Pillar_Bricks001_0', role: 'pillar', h: 3.2, block: true },
      { id: 'wall', mesh: 'Full Wall_Bricks001_0', role: 'wall', h: 3.2, block: true },
      { id: 'chest', mesh: 'Chest_Wood_0', role: 'prop', h: 0.9, block: false },
      { id: 'table', mesh: 'Table_Wood_0', role: 'debris', h: 0.9, block: true },
      { id: 'pot', mesh: 'Pot_ceramic_0', role: 'debris', h: 0.45, block: false },
      { id: 'trap', mesh: 'FlorTrap_Metal_0', role: 'trap', h: 0.12, block: false },
    ],
  },
  brick: {
    glb: 'models/props/lp-brick.glb',
    biomes: ['ancient', 'molten', 'grim'],
    pieces: [
      { id: 'wall', mesh: 'Brick_Wall__0', role: 'wall', h: 2.55, block: true },
      { id: 'mid', mesh: 'Brick_Mid_Wall__0', role: 'wall', h: 1.4, block: true },
      { id: 'pillar1', mesh: 'Brick_Pillar_1__0', role: 'pillar', h: 2.55, block: true },
      { id: 'pillar2', mesh: 'Brick_Pillar_2__0', role: 'pillar', h: 2.55, block: true },
      { id: 'fence', mesh: 'Brick_Fence__0', role: 'barrier', h: 0.9, block: true, stages: 2 },
      { id: 'door', mesh: 'Brick_Door__0', role: 'door', h: 2.2, block: false },
    ],
  },
  halloween: {
    glb: 'models/props/halloween.glb',
    biomes: ['grim', 'verdant'],
    pieces: [
      { id: 'fence0', mesh: 'Fence_WoodPlanksOld_0', role: 'barrier', h: 1.4, block: true, stage: 0 },
      { id: 'fence1', mesh: 'Fence_01_WoodPlanksOld_0', role: 'barrier', h: 1.4, block: true, stage: 1 },
      { id: 'fence2', mesh: 'Fence_03_WoodPlanksOld_0', role: 'barrier', h: 1.2, block: true, stage: 2 },
      { id: 'fence3', mesh: 'Fence_04_WoodPlanksOld_0', role: 'barrier', h: 1.0, block: false, stage: 3 },
      { id: 'stone', mesh: 'Stone_06_Stone_06_0', role: 'debris', h: 1.3, block: true },
      { id: 'coffin', mesh: 'Coffin_Coffin_0', role: 'debris', h: 0.7, block: true },
      { id: 'wall', mesh: 'Wall_02_BrickSmallBrown_0', role: 'wall', h: 2.4, block: true },
      { id: 'web', mesh: 'Spiderweb_Spiderweb_0', role: 'prop', h: 1.6, block: false },
    ],
  },
  /** Isolated prototypes from Documents/modular_dungeon.glb — vertex-color walls/objects. */
  modular: {
    glb: 'models/props/modular-dungeon-kit.glb',
    biomes: ['ancient', 'grim'],
    pieces: [
      { id: 'wall', mesh: 'Wall_Piece_02 - Default_0', role: 'wall', h: 2.8, block: true },
      { id: 'wallStone', mesh: 'Wall_Stones_A_03 - Default_0', role: 'wall', h: 2.4, block: true },
      { id: 'pillar', mesh: 'Pillar_03 - Default_0', role: 'pillar', h: 3.2, block: true },
      { id: 'brick', mesh: 'Brick_A_03 - Default_0', role: 'debris', h: 0.45, block: true },
      { id: 'barrel', mesh: 'Barrel_09 - Default_0', role: 'debris', h: 0.9, block: true },
      { id: 'table', mesh: 'Table_Small_08 - Default_0', role: 'debris', h: 0.85, block: true },
      { id: 'chest', mesh: 'Chest_A__08 - Default_0', role: 'prop', h: 0.7, block: false },
      { id: 'sconce', mesh: 'Sconce_02 - Default_0', role: 'torch', h: 0.5, block: false },
      { id: 'coffin', mesh: 'Coffin_A_02 - Default_0', role: 'debris', h: 0.7, block: true },
      { id: 'door', mesh: 'Door_08 - Default_0', role: 'door', h: 2.2, block: false },
    ],
  },
  torch: {
    glb: 'models/props/gothic-wall-torch.glb',
    biomes: ['ancient', 'grim', 'molten', 'frost', 'verdant'],
    cloneScene: true,
    pieces: [{ id: 'gothic', mesh: 'Object_0', role: 'torch', h: 0.85, block: false }],
  },
  temple: {
    glb: 'models/props/rainforest-temple.glb',
    biomes: ['verdant'],
    cloneScene: true,
    sceneH: 5.2,
    rooms: ['shrine', 'entrance'],
    pieces: [{ id: 'temple', mesh: 'Object_2', role: 'scene', h: 5.2, block: false }],
  },
  smelter: {
    glb: 'models/props/smelter-kit.glb',
    biomes: ['molten'],
    rooms: ['elite', 'boss', 'shrine'],
    pieces: [
      { id: 's0', mesh: 'smelter_0', role: 'scene', h: 2.6, block: true },
      { id: 's1', mesh: 'smelter_1', role: 'scene', h: 2.6, block: true },
      { id: 's2', mesh: 'smelter_2', role: 'scene', h: 2.6, block: true },
      { id: 's3', mesh: 'smelter_3', role: 'scene', h: 2.6, block: true },
      { id: 's4', mesh: 'smelter_4', role: 'scene', h: 2.6, block: true },
    ],
  },
};
