/**
 * Linear spell VFX — travel, beam, slash, nova, impact.
 * Procedural, GPU-light, tinted from the Grudge spell catalog.
 */
import * as THREE from 'three';

const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function glowMat(color, opacity = 0.9) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/** Trauma² shake from threejs-gameplay-systems/references/game-feel.md */
export class ShakeRig {
  constructor() {
    this.trauma = 0;
    this.time = 0;
  }
  add(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }
  offset(dt) {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - 1.4 * dt);
    if (this.trauma <= 0) return { x: 0, z: 0 };
    const s = this.trauma * this.trauma;
    const n = (t, seed) => {
      const x = Math.sin(t * 12.9898 + seed * 78.233) * 43758.5453;
      return (x - Math.floor(x)) * 2 - 1;
    };
    const freq = this.time * 32;
    return { x: 0.45 * s * n(freq, 1), z: 0.45 * s * n(freq, 2) };
  }
}

export class VfxWorld {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.shake = new ShakeRig();
  }

  spawn(kind, opts) {
    const fn = this[kind];
    if (typeof fn === 'function') fn.call(this, opts);
  }

  projectile({ origin, dir, color, speed = 18, range = 16, radius = 0.16, pierce = false, onHit }) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), glowMat(color));
    const trail = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.25, radius * 0.7, 0.9, 6),
      glowMat(color, 0.45),
    );
    trail.rotation.x = Math.PI / 2;
    const root = new THREE.Group();
    root.add(mesh);
    root.add(trail);
    root.position.copy(origin);
    this.scene.add(root);
    _fwd.copy(dir).setY(0).normalize();
    this.items.push({
      type: 'proj',
      root,
      vel: _fwd.clone().multiplyScalar(speed),
      life: range / speed,
      pierce,
      radius,
      onHit,
      hit: new Set(),
    });
  }

  beam({ origin, dir, color, range = 14, life = 0.18 }) {
    const len = range;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.02, len, 8),
      glowMat(color, 0.85),
    );
    mesh.quaternion.setFromUnitVectors(_up, dir.clone().setY(0).normalize());
    mesh.position.copy(origin).addScaledVector(dir.clone().setY(0).normalize(), len * 0.5);
    mesh.position.y = origin.y;
    this.scene.add(mesh);
    this.items.push({ type: 'fade', root: mesh, life, max: life });
    this.shake.add(0.35);
  }

  slash({ origin, dir, color, range = 2.4 }) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(range * 0.55, 0.05, 6, 18, Math.PI * 0.9),
      glowMat(color, 0.95),
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.rotation.z = Math.atan2(dir.x, dir.z);
    mesh.position.copy(origin);
    mesh.position.y = 1.05;
    this.scene.add(mesh);
    this.items.push({ type: 'fade', root: mesh, life: 0.16, max: 0.16, spin: 8 });
    this.shake.add(0.18);
  }

  nova({ origin, color, range = 4.5 }) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 8, 32), glowMat(color, 0.9));
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(origin);
    ring.position.y = 0.12;
    this.scene.add(ring);
    this.items.push({ type: 'nova', root: ring, life: 0.45, max: 0.45, range });
    this.shake.add(0.4);
  }

  impact({ origin, color }) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), glowMat(color, 1));
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.items.push({ type: 'fade', root: mesh, life: 0.14, max: 0.14, grow: 3.2 });
  }

  aura({ origin, color, life = 0.4 }) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 20), glowMat(color, 0.7));
    mesh.rotation.x = Math.PI / 2;
    mesh.position.copy(origin);
    mesh.position.y = 0.15;
    this.scene.add(mesh);
    this.items.push({ type: 'fade', root: mesh, life, max: life });
  }

  update(dt, enemies) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      if (it.type === 'proj') {
        it.root.position.addScaledVector(it.vel, dt);
        it.root.lookAt(it.root.position.x + it.vel.x, it.root.position.y, it.root.position.z + it.vel.z);
        if (enemies) {
          for (const e of enemies) {
            if (!e.alive || it.hit.has(e)) continue;
            const dx = e.pos.x - it.root.position.x;
            const dz = e.pos.z - it.root.position.z;
            if (dx * dx + dz * dz < (e.radius + it.radius) ** 2) {
              it.hit.add(e);
              it.onHit?.(e, it.root.position);
              this.impact({ origin: it.root.position.clone(), color: 0xfff2c8 });
              if (!it.pierce) it.life = 0;
            }
          }
        }
      } else if (it.type === 'nova') {
        const k = 1 - it.life / it.max;
        const s = 0.4 + k * it.range;
        it.root.scale.set(s, s, s);
        it.root.material.opacity = 0.85 * (1 - k);
      } else if (it.type === 'fade') {
        const k = it.life / it.max;
        it.root.material.opacity = Math.max(0, k);
        if (it.grow) it.root.scale.setScalar(1 + (1 - k) * it.grow);
        if (it.spin) it.root.rotation.z += it.spin * dt;
      }
      if (it.life <= 0) {
        this.scene.remove(it.root);
        it.root.traverse((o) => {
          o.geometry?.dispose?.();
          o.material?.dispose?.();
        });
        this.items.splice(i, 1);
      }
    }
  }

  clear() {
    for (const it of this.items) {
      this.scene.remove(it.root);
      it.root.traverse((o) => {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      });
    }
    this.items.length = 0;
  }
}
