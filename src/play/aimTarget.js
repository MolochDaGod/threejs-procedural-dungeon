/**
 * MOBA line/zone aim + soft-lock targeting.
 * From LinearAbilityCasting AimController + CombatFocus.
 * Indicators are 3D meshes, not sprites.
 */
import * as THREE from 'three';

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _ndc = new THREE.Vector2();
const _hit = new THREE.Vector3();

function glow(color, opacity) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
}

export class AimTarget {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.ray = new THREE.Raycaster();
    this.origin = new THREE.Vector3();
    this.dir = new THREE.Vector3(0, 0, 1);
    this.distance = 8;
    this.minRange = 1.2;
    this.maxRange = 16;
    this.valid = true;
    this.target = null;
    this.cycle = -1;
    this.pointer = new THREE.Vector2(0, 0);
    this.hasPointer = false;

    this.root = new THREE.Group();
    this.root.name = 'aim-3d';
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 1), glow(0xe8973f, 0.55));
    shaft.position.z = 0.5;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.48, 6), glow(0xffc878, 0.85));
    head.rotation.x = Math.PI / 2;
    head.position.z = 1.15;
    this.shaft = shaft;
    this.head = head;
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 8, 24), glow(0x9b6cf0, 0.0));
    this.ring.rotation.x = Math.PI / 2;
    this.lock = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 8, 20), glow(0xd8433a, 0.0));
    this.lock.rotation.x = Math.PI / 2;
    this.root.add(shaft, head, this.ring, this.lock);
    this.scene.add(this.root);
    this.shape = 'line';
  }

  setPointer(nx, ny) {
    this.pointer.set(nx, ny);
    this.hasPointer = true;
  }

  setRanges(minR, maxR, shape = 'line') {
    this.minRange = minR;
    this.maxRange = maxR;
    this.shape = shape;
  }

  cycleTarget(enemies) {
    const living = (enemies || []).filter((e) => e.alive);
    if (!living.length) {
      this.target = null;
      return null;
    }
    this.cycle = (this.cycle + 1) % living.length;
    this.target = living[this.cycle];
    return this.target;
  }

  pickNearest(origin, enemies, maxD = 18) {
    let best = null;
    let bestD = maxD;
    for (const e of enemies || []) {
      if (!e.alive) continue;
      const d = origin.distanceTo(e.pos);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    this.target = best;
    return best;
  }

  update(origin, fallbackDir, enemies) {
    this.origin.copy(origin);
    if (this.target && !this.target.alive) this.target = null;

    if (this.target) {
      this.dir.copy(this.target.pos).sub(origin).setY(0);
      if (this.dir.lengthSq() < 1e-6) this.dir.copy(fallbackDir);
      else this.dir.normalize();
      this.distance = Math.min(this.maxRange, origin.distanceTo(this.target.pos));
    } else if (this.hasPointer) {
      this.ray.setFromCamera(this.pointer, this.camera);
      const hit = this.ray.ray.intersectPlane(GROUND, _hit);
      if (hit) {
        this.dir.copy(hit).sub(origin).setY(0);
        if (this.dir.lengthSq() < 1e-6) this.dir.copy(fallbackDir);
        else this.dir.normalize();
        this.distance = Math.min(this.maxRange, origin.distanceTo(hit));
      }
    } else {
      this.dir.copy(fallbackDir).setY(0);
      if (this.dir.lengthSq() < 1e-6) this.dir.set(0, 0, 1);
      else this.dir.normalize();
      this.distance = this.maxRange;
    }

    this.valid = this.distance >= this.minRange;
    const show = this.hasPointer || !!this.target;
    this.root.visible = show;
    if (!show) return;

    this.root.position.copy(origin);
    this.root.position.y = 0.08;
    this.root.rotation.y = Math.atan2(this.dir.x, this.dir.z);
    const len = Math.max(1.2, this.distance);
    this.shaft.scale.set(1, 1, len);
    this.shaft.position.z = len * 0.5;
    this.head.position.z = len + 0.2;
    const zone = this.shape === 'zone';
    this.ring.material.opacity = zone ? 0.7 : 0;
    this.ring.position.z = zone ? len : 0;
    this.ring.scale.setScalar(zone ? Math.max(1.4, this.maxRange * 0.28) : 1);
    if (this.target) {
      this.lock.material.opacity = 0.85;
      this.lock.position.copy(this.target.pos).sub(origin);
      this.lock.position.y = 1.15;
    } else {
      this.lock.material.opacity = 0;
    }
    const col = this.valid ? 0xe8973f : 0xd8433a;
    this.shaft.material.color.setHex(col);
    this.head.material.color.setHex(col);
  }

  lookAhead(out, amount = 2.4) {
    out.copy(this.origin).addScaledVector(this.dir, amount);
    out.y = 0;
    return out;
  }

  dispose() {
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      o.geometry?.dispose?.();
      o.material?.dispose?.();
    });
  }
}
