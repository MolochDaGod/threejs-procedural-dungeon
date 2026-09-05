/**
 * Dev helpers — Axes / box / collider wires. Never on by default.
 * Gate: ?physicsDebug=1 (same as Rapier cuboid overlay).
 */
import * as THREE from 'three';
import { physicsDebugOn } from '../physics/colliderDebug.js';

export function attachPlayHelpers(root, { height = 1.82 } = {}) {
  if (!physicsDebugOn() || !root) return null;
  const g = new THREE.Group();
  g.name = 'play-helpers';
  g.add(new THREE.AxesHelper(Math.max(0.6, height * 0.55)));
  root.add(g);
  return g;
}

export { physicsDebugOn };
