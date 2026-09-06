/** Isolated MagicRock_N on CDN — never the fused pack, never SPA /models/props/. */
export const MAGIC_ROCK_DIAMETER_M = 0.85;

export const MAGIC_ROCKS = [
  { id: 'magic-rock-1', glb: 'models/vfx/rocks/magic-rock-1.glb', biomes: ['molten', 'ancient'], h: 0.9 },
  { id: 'magic-rock-2', glb: 'models/vfx/rocks/magic-rock-2.glb', biomes: ['frost', 'ancient'], h: 0.9 },
  { id: 'magic-rock-3', glb: 'models/vfx/rocks/magic-rock-3.glb', biomes: ['ancient', 'molten', 'frost', 'verdant', 'grim'], h: 0.9 },
  { id: 'magic-rock-5', glb: 'models/vfx/rocks/magic-rock-5.glb', biomes: ['ancient', 'grim'], h: 0.9 },
  { id: 'magic-rock-6', glb: 'models/vfx/rocks/magic-rock-6.glb', biomes: ['molten', 'grim'], h: 0.9 },
];

const ELEMENT_ROCK = {
  fire: 'magic-rock-1', ice: 'magic-rock-2', frost: 'magic-rock-2',
  nature: 'magic-rock-3', holy: 'magic-rock-5', arcane: 'magic-rock-6', shadow: 'magic-rock-6',
};

export function magicRockForElement(el) {
  const id = ELEMENT_ROCK[el] || 'magic-rock-3';
  return MAGIC_ROCKS.find((r) => r.id === id) || MAGIC_ROCKS[0];
}

export function magicRockMeshPath(el) {
  return magicRockForElement(el).glb;
}
