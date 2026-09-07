/** One totem per caster. Combat-lab GLB (fire_totem) tinted per kind. SI ~1.15 m. */
import * as THREE from 'three';
import { COMBAT_DEPLOY } from '../ssot.js';
import { loadGltf } from './assets.js';

function primitiveTotem(kind, hp) {
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
  g.name = 'totem';
  return g;
}

export async function makeTotemMesh(kind, hp) {
  try {
    const gltf = await loadGltf(COMBAT_DEPLOY.totemFire);
    const root = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const h = box.getSize(new THREE.Vector3()).y || 1;
    root.scale.setScalar(1.15 / Math.max(h, 0.01));
    root.updateMatrixWorld(true);
    const planted = new THREE.Box3().setFromObject(root);
    root.position.y -= planted.min.y;
    const col = kind === 'blessed' ? 0xffe08a : 0xb070ff;
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      o.material = o.material.clone();
      if (o.material.emissive) o.material.emissive.setHex(col);
      o.material.emissiveIntensity = 0.5;
      o.castShadow = false;
    });
    root.userData.totemHp = hp;
    root.name = 'totem';
    return root;
  } catch {
    return primitiveTotem(kind, hp);
  }
}

export const TOTEM_LIFE = 120;
export const TOTEM_PULSE = 5;
export const TOTEM_SHIELD_MAX = 100;
export const TOTEM_SHIELD_TICK = 3;
export const TOTEM_RANGE_BONUS = 2;
export const TOTEM_STR = 0.5;
