/**
 * Wireframe collider overlay for forge / play. Gated by the COLLIDERS env layer
 * and ?physicsDebug=1 — not on by default.
 */
import * as THREE from 'three';
import { LAYER_DEBUG_COLOR } from '../env/layers.js';

export function makeColliderDebugGroup(colliders) {
  const g = new THREE.Group();
  g.name = 'collider-debug';
  g.visible = false;
  if (!colliders) return g;
  const box = new THREE.BoxGeometry(1, 1, 1);
  for (const n of colliders) {
    if (n.collider?.kind !== 'box') continue;
    const [hx, hy, hz] = n.collider.params;
    const color = LAYER_DEBUG_COLOR[n.physicsLayer] || 0xb8b8b8;
    const mat = new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: n.sensor ? 0.35 : 0.7,
      depthWrite: false,
    });
    const m = new THREE.Mesh(box, mat);
    m.scale.set(hx * 2, hy * 2, hz * 2);
    m.position.set(n.position[0], n.position[1], n.position[2]);
    m.userData.colliderId = n.id;
    g.add(m);
  }
  return g;
}

export function physicsDebugOn() {
  try {
    return new URLSearchParams(location.search).get('physicsDebug') === '1';
  } catch {
    return false;
  }
}
