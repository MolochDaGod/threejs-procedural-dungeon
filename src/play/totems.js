/** One totem per caster. SI 1 m tall. New deploy kills the old. */
import * as THREE from 'three';

export function makeTotemMesh(kind, hp) {
  const g = new THREE.Group();
  const col = kind === 'blessed' ? 0xffe08a : 0xb070ff;
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 1, 8),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 }),
  );
  pole.position.y = 0.5;
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 8),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55 }),
  );
  cap.position.y = 1.05;
  g.add(pole, cap);
  g.userData.totemHp = hp;
  return g;
}

export const TOTEM_LIFE = 120;
export const TOTEM_PULSE = 5;
export const TOTEM_SHIELD_MAX = 100;
export const TOTEM_SHIELD_TICK = 3;
export const TOTEM_RANGE_BONUS = 2;
export const TOTEM_STR = 0.5;
