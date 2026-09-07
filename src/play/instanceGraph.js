/**
 * Named Three.js node graph for a dungeon instance.
 * Terrain / Cover / Dress / Actors / Vfx / Pinata — one mixer stays on actors.
 */
import * as THREE from 'three';

export const INSTANCE_LAYERS = ['Terrain', 'Cover', 'Dress', 'Actors', 'Vfx', 'Pinata'];

export function makeInstanceGraph(parent) {
  const root = parent || new THREE.Group();
  root.name = root.name || 'DungeonInstance';
  const layers = {};
  for (const name of INSTANCE_LAYERS) {
    let g = root.getObjectByName(name);
    if (!g) {
      g = new THREE.Group();
      g.name = name;
      g.userData.layer = name.toLowerCase();
      root.add(g);
    }
    layers[name] = g;
  }
  return { root, layers, layer: (n) => layers[n] || root };
}

export function layerOf(root, name) {
  return root?.getObjectByName(name) || root;
}

const LOD_FAR = { Dress: 28, Cover: 24, Pinata: 18 };
const _lodAt = new THREE.Vector3();

/** Distance hide on static layers. Skinned Actors stay on (one mixer each). */
export function tickInstanceLod(layers, cam, origin) {
  if (!layers || !cam) return;
  const ox = origin?.x ?? cam.position.x;
  const oz = origin?.z ?? cam.position.z;
  for (const name of ['Dress', 'Cover', 'Pinata']) {
    const g = layers[name];
    if (!g) continue;
    const far = LOD_FAR[name];
    const lim = far * far;
    for (const ch of g.children) {
      ch.getWorldPosition(_lodAt);
      const dx = _lodAt.x - ox;
      const dz = _lodAt.z - oz;
      ch.visible = (dx * dx + dz * dz) < lim;
    }
  }
}

/** Stamp a node list onto the instance payload for Node/Colyseus hosts. */
export function instanceNodeManifest(dungeon, extras = {}) {
  const cover = extras.coverCount ?? 0;
  const dress = extras.dressCount ?? (dungeon?.dress?.length || 0);
  return [
    { name: 'Terrain', kind: 'static', collider: 'cuboid-grid' },
    { name: 'Cover', kind: 'instanced', count: cover, pinata: true },
    { name: 'Dress', kind: 'kit-isolate', count: dress },
    { name: 'Actors', kind: 'skinned', mixer: 'one-per-actor' },
    { name: 'Vfx', kind: 'transient' },
    { name: 'Pinata', kind: 'dynamic-chunks' },
  ];
}
