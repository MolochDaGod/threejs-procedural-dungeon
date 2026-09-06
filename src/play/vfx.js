/**
 * Linear spell VFX — travel, beam, slash, nova, impact.
 * Procedural, GPU-light, tinted from the Grudge spell catalog.
 */
import * as THREE from 'three';
import { InstancedFire, gridFireCells } from '../vfx/instancedFire.js';
import { PuffField, puffPreset } from '../vfx/particles.js';
import { DUNGEON_SI } from '../ssot.js';

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
    this.camera = null;
    this.clock = 0;
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

  /**
   * Fire puff — threejs-games Fire. `duration: 'small' | 'long'`.
   * Color-editable. Optional mesh follow.
   */
  fire({ origin, color, duration = 'small', life, mesh = null } = {}) {
    const name = duration === 'long' ? 'fireLong' : 'fireSmall';
    return this._spawnPuff(name, { origin, color, life, mesh });
  }

  /** Aesthetic smoke column (looping or short). */
  smoke({ origin, color, life, mesh = null, opacity } = {}) {
    return this._spawnPuff('smokeAesthetic', { origin, color, life, mesh, opacity });
  }

  /** AOE cloud — colorable smoke disc (poison / frost / fire / shadow). */
  cloud({ origin, color, radius = 2.4, life, opacity } = {}) {
    return this._spawnPuff('aoeCloud', {
      origin, color, life, opacity, radius,
      size: Math.max(22, radius * 12),
    });
  }

  /** Opaque heal / holy mist. Higher alpha, Normal blending. */
  mist({ origin, color, radius = 2.2, life, opacity } = {}) {
    return this._spawnPuff('healMist', {
      origin,
      color: color ?? 0xc8f0a8,
      life,
      size: Math.max(24, radius * 11),
      opacity: opacity ?? 0.84,
    });
  }

  /**
   * Mesh-aware speed trail. Follows an Object3D, or streaks `from` → `to` (dash).
   */
  speedTrail({ mesh = null, from = null, to = null, color, life, opacity, kind = 'smoke' } = {}) {
    const streak = !!(from && to);
    const follow = streak ? null : mesh;
    const name = kind === 'fire' ? 'projectileFire' : (follow ? 'projectileSmoke' : 'speedTrail');
    const item = this._spawnPuff(name, { origin: from || mesh?.position, color, life, mesh: follow, opacity });
    if (item?.field && streak) item.field.along(from, to);
    return item;
  }

  _spawnPuff(presetName, { origin, color, life, mesh, opacity, size, radius } = {}) {
    const overrides = {};
    if (color != null) overrides.color = color;
    if (size != null) overrides.size = size;
    if (opacity != null) overrides.opacity = opacity;
    const spec = puffPreset(presetName, overrides);
    if (life != null) spec.life = life;
    const field = new PuffField(spec);
    if (color != null) field.setColor(color);
    if (mesh) field.attachTo(mesh);
    else if (origin) {
      const o = origin;
      let y = o.y != null ? o.y : 0.9;
      if (y < 0.25) y = 0.65;
      field.mesh.position.set(o.x, y, o.z);
    }
    this.scene.add(field.mesh);
    const max = spec.life ?? 1;
    const item = {
      type: 'puff',
      field,
      root: field.mesh,
      life: max,
      max,
      radius: radius || 0,
    };
    this.items.push(item);
    return item;
  }

  /** Grid-cell volumetric fire AoE (boss puddle / molten floor). */
  gridFire({ origin, color, radius = 3.4, life = 4.8, cell = DUNGEON_SI.cell, scale = 2.2, dps = 0, onTick }) {
    const pts = gridFireCells(origin, radius, cell, scale);
    const field = new InstancedFire({
      scene: this.scene,
      maxCount: Math.max(16, pts.length),
      color: color || 0xff5a0d,
      intensity: 1.2,
    });
    field.setInstances(pts);
    this.items.push({
      type: 'gridFire',
      field,
      root: field.mesh,
      life,
      max: life,
      radius,
      dps,
      onTick,
      tickAcc: 0,
      origin: origin.clone ? origin.clone() : origin,
    });
    this.smoke({ origin, color, life, opacity: 0.38 });
    this.shake.add(0.28);
  }

  /** Persistent danger disc (boss puddle / linger AOE). */
  zone({ origin, color, radius = 2.4, life = 4.2, dps = 0, onTick }) {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 28),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.copy(origin);
    disc.position.y = 0.04;
    disc.scale.setScalar(radius);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 28), glowMat(color, 0.75));
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(disc.position);
    ring.scale.setScalar(radius);
    const root = new THREE.Group();
    root.add(disc);
    root.add(ring);
    this.scene.add(root);
    this.items.push({
      type: 'zone',
      root,
      disc,
      ring,
      life,
      max: life,
      radius,
      dps,
      onTick,
      tickAcc: 0,
    });
  }

  /** 3D wedge telegraph (cleave) — volume, not a floor sprite. */
  cone({ origin, dir, color, range = 4, half = 0.7, life = 0.55 }) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, range * Math.tan(half), range, 10, 1, false, -half, half * 2),
      glowMat(color, 0.32),
    );
    const n = dir.clone().setY(0).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    mesh.position.copy(origin).addScaledVector(n, range * 0.5);
    mesh.position.y = 0.35;
    this.scene.add(mesh);
    this.items.push({ type: 'fade', root: mesh, life, max: life });
  }

  /** 3D corridor telegraph — box volume, not a plane sprite. */
  linear({ origin, dir, color, range = 10, width = 0.7, life = 0.45 }) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, range), glowMat(color, 0.38));
    const n = dir.clone().setY(0).normalize();
    mesh.position.copy(origin).addScaledVector(n, range * 0.5);
    mesh.position.y = 0.14;
    mesh.rotation.y = Math.atan2(n.x, n.z);
    this.scene.add(mesh);
    this.items.push({ type: 'fade', root: mesh, life, max: life });
  }

  update(dt, enemies, camera) {
    this.clock = (this.clock || 0) + dt;
    if (camera) this.camera = camera;
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
      } else if (it.type === 'zone') {
        const k = it.life / it.max;
        const pulse = 0.28 + 0.12 * Math.sin(it.life * 6);
        if (it.disc?.material) it.disc.material.opacity = pulse * Math.min(1, k * 2);
        if (it.ring?.material) it.ring.material.opacity = 0.55 + 0.25 * Math.sin(it.life * 8);
        it.tickAcc = (it.tickAcc || 0) + dt;
        if (it.dps && it.tickAcc >= 0.35) {
          it.tickAcc = 0;
          it.onTick?.(it);
        }
      } else if (it.type === 'gridFire') {
        const k = it.life / it.max;
        if (it.field?.uniforms?.intensity) {
          it.field.uniforms.intensity.value = 0.55 + 0.7 * Math.min(1, k * 2);
        }
        if (typeof it.field?.update === 'function' && this.camera) {
          it.field.update(this.camera, this.clock);
        }
        it.tickAcc = (it.tickAcc || 0) + dt;
        if (it.dps && it.tickAcc >= 0.35) {
          it.tickAcc = 0;
          it.onTick?.(it);
        }
      } else if (it.type === 'puff') {
        const k = Math.max(0, it.life / it.max);
        it.field.update(dt, { life01: k });
      } else if (it.type === 'fade') {
        const k = it.life / it.max;
        const mats = it.root.material
          ? [it.root.material]
          : [];
        it.root.traverse((o) => {
          if (o.material && o.material.opacity != null) o.material.opacity = Math.max(0, k * 0.85);
        });
        for (const m of mats) m.opacity = Math.max(0, k);
        if (it.grow) it.root.scale.setScalar(1 + (1 - k) * it.grow);
        if (it.spin) it.root.rotation.z += it.spin * dt;
      }
      if (it.life <= 0) {
        if (it.type === 'puff' && it.field) {
          this.scene.remove(it.field.mesh);
          it.field.dispose();
        } else if (it.field) it.field.dispose();
        else {
          this.scene.remove(it.root);
          it.root.traverse((o) => {
            o.geometry?.dispose?.();
            o.material?.dispose?.();
          });
        }
        this.items.splice(i, 1);
      }
    }
  }

  clear() {
    for (const it of this.items) {
      if (it.type === 'puff' && it.field) {
        this.scene.remove(it.field.mesh);
        it.field.dispose();
      } else if (it.field) it.field.dispose();
      else {
        this.scene.remove(it.root);
        it.root.traverse((o) => {
          o.geometry?.dispose?.();
          o.material?.dispose?.();
        });
      }
    }
    this.items.length = 0;
  }
}
