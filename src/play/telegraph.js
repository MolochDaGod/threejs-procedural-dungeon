/**
 * Ground telegraphs — cone, linear, AOE. Fill 0→1 during windup, then resolve.
 */
import * as THREE from 'three';

function warnMat(color, opacity) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

export class TelegraphField {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }

  cone({ origin, dir, range, half, color, life }) {
    const geo = new THREE.CircleGeometry(range, 28, -half, half * 2);
    const mesh = new THREE.Mesh(geo, warnMat(color, 0.22));
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.atan2(dir.x, dir.z);
    mesh.position.set(origin.x, 0.06, origin.z);
    this.scene.add(mesh);
    this.items.push({ mesh, life, max: life, shape: 'cone', origin, dir, range, half, color });
    return this.items[this.items.length - 1];
  }

  line({ origin, dir, range, width, color, life }) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 2, range),
      warnMat(color, 0.24),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.atan2(dir.x, dir.z);
    const n = dir.clone().setY(0).normalize();
    mesh.position.set(origin.x + n.x * range * 0.5, 0.06, origin.z + n.z * range * 0.5);
    this.scene.add(mesh);
    this.items.push({ mesh, life, max: life, shape: 'line', origin, dir: n, range, width, color });
    return this.items[this.items.length - 1];
  }

  aoe({ origin, range, color, life }) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(range, 36), warnMat(color, 0.2));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(origin.x, 0.06, origin.z);
    this.scene.add(mesh);
    this.items.push({ mesh, life, max: life, shape: 'aoe', origin, range, color });
    return this.items[this.items.length - 1];
  }

  update(dt) {
    const done = [];
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      const k = 1 - Math.max(0, it.life) / it.max;
      it.mesh.material.opacity = 0.12 + 0.38 * k;
      it.mesh.scale.setScalar(0.86 + 0.18 * k);
      if (it.life <= 0) {
        done.push(it);
        this.scene.remove(it.mesh);
        it.mesh.geometry.dispose();
        it.mesh.material.dispose();
        this.items.splice(i, 1);
      }
    }
    return done;
  }

  clear() {
    for (const it of this.items) {
      this.scene.remove(it.mesh);
      it.mesh.geometry.dispose();
      it.mesh.material.dispose();
    }
    this.items.length = 0;
  }
}

export function pointInCone(px, pz, origin, dir, range, half) {
  const dx = px - origin.x;
  const dz = pz - origin.z;
  const dist = Math.hypot(dx, dz);
  if (dist > range) return false;
  if (dist < 1e-4) return true;
  return (dx * dir.x + dz * dir.z) / dist >= Math.cos(half);
}

export function pointInLine(px, pz, origin, dir, range, width) {
  const dx = px - origin.x;
  const dz = pz - origin.z;
  const along = dx * dir.x + dz * dir.z;
  if (along < 0 || along > range) return false;
  const cx = origin.x + dir.x * along;
  const cz = origin.z + dir.z * along;
  return Math.hypot(px - cx, pz - cz) <= width;
}

export function pointInAoe(px, pz, origin, range) {
  return Math.hypot(px - origin.x, pz - origin.z) <= range;
}
