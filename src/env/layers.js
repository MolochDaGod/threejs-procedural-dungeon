/**
 * Environment layers for Dungeon Forge.
 *
 * Visual chips already exist (props / torches / particles / liquids / lights).
 * Physics layers copy fleet production-world (worldMeshDeploy WORLD_PHYSICS_LAYERS).
 * Do not invent a second layer enum.
 */

export const PHYSICS_LAYERS = [
  'Default',
  'Terrain',
  'Player',
  'NPC',
  'Item',
  'Projectile',
  'Trigger',
  'Water',
  'IgnoreRaycast',
  'UI3D',
];

/** Visual environment groups the forge panel already toggles. */
export const ENV_LAYERS = {
  structure: {
    id: 'structure',
    label: 'STRUCTURE',
    physics: 'Terrain',
    alwaysOn: true,
    meshes: ['floor', 'wall', 'wallCap'],
  },
  props: {
    id: 'props',
    label: 'PROPS',
    physics: 'Default',
    meshes: [
      'pillar', 'arch', 'archL', 'debrisA', 'debrisB', 'debrisC', 'chest', 'chestTrim', 'chestGlow',
      'grave', 'sarco', 'candle', 'bone', 'icicle', 'shardIce', 'roots', 'moss', 'crackD', 'skirt',
      'bannerRod', 'bannerCloth', 'emblem', 'spawn1', 'spawn2', 'spawn3', 'band2', 'band3',
      'crystal', 'ring', 'plinth', 'platform', 'basin', 'bossGlow', 'bossRock',
    ],
  },
  torches: {
    id: 'torches',
    label: 'TORCHES',
    physics: 'Default',
    meshes: ['torchArm', 'flame', 'flameCore', 'brazier', 'coals'],
  },
  particles: {
    id: 'particles',
    label: 'PARTICLES',
    physics: 'IgnoreRaycast',
    fx: ['parts', 'shafts'],
  },
  liquids: {
    id: 'liquids',
    label: 'LIQUIDS',
    physics: 'Water',
    fx: ['liquids'],
  },
  lights: {
    id: 'lights',
    label: 'LIGHTS',
    physics: 'IgnoreRaycast',
    lights: true,
  },
  colliders: {
    id: 'colliders',
    label: 'COLLIDERS',
    physics: 'IgnoreRaycast',
    debug: true,
  },
};

export const ENV_LAYER_IDS = Object.keys(ENV_LAYERS);

export const OBJ_MESHES = Object.fromEntries(
  Object.values(ENV_LAYERS)
    .filter((l) => l.meshes && !l.alwaysOn)
    .map((l) => [l.id, l.meshes]),
);

export function defaultLayerState() {
  const s = {};
  for (const id of ENV_LAYER_IDS) s[id] = id !== 'colliders';
  return s;
}

/**
 * Apply visual layer flags to a live forge scene.
 * @param {{ meshes: object, fx: object, lights: object[], colliderDebug?: object }} sceneBits
 * @param {Record<string, boolean>} vis
 */
export function applyEnvLayers(sceneBits, vis) {
  const { meshes = {}, fx = {}, lights = [] } = sceneBits;
  for (const layer of Object.values(ENV_LAYERS)) {
    const on = layer.alwaysOn ? true : vis[layer.id] !== false;
    if (layer.meshes) {
      for (const k of layer.meshes) {
        if (meshes[k]) meshes[k].visible = on;
      }
    }
    if (layer.fx) {
      for (const k of layer.fx) {
        const item = fx[k];
        if (!item) continue;
        if (Array.isArray(item)) item.forEach((m) => { if (m) m.visible = on; });
        else item.visible = on;
      }
    }
    if (layer.lights) {
      for (const L of lights) L.visible = on;
    }
  }
  if (sceneBits.colliderDebug) {
    sceneBits.colliderDebug.visible = !!vis.colliders;
  }
  if (fx.spinners) {
    const on = vis.props !== false;
    for (const sp of fx.spinners) if (sp.m) sp.m.visible = on;
  }
}

export const LAYER_DEBUG_COLOR = {
  Terrain: 0x4aa3ff,
  Water: 0x2ec4b6,
  Trigger: 0xf4d35e,
  Player: 0x7dce82,
  NPC: 0xe85d4c,
  Default: 0xb8b8b8,
  IgnoreRaycast: 0x888888,
};
