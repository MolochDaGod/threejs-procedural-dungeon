/**
 * 3D linear / bending skillshots.
 * From LinearAbilityCastingThreeJS: constant m/s line travel, forked fissures,
 * zone drop. Procedural meshes + ShaderMaterial — never PNG sprites.
 */
import * as THREE from 'three';

const _n = new THREE.Vector3();
const _side = new THREE.Vector3();

function glow(color, opacity = 0.88) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function boltMat(color) {
  return new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float shaft = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float pulse = 0.65 + 0.35 * sin(vUv.y * 18.0 - uTime * 14.0);
        float a = pow(max(shaft, 0.0), 1.4) * pulse;
        gl_FragColor = vec4(uColor * (0.55 + a), a);
      }
    `,
  });
}

export class LinearCastWorld {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.clock = 0;
  }

  /** Line front that advances at constant m/s, optional lightning/fire forks. */
  line({ origin, dir, color, range = 12, speed = 22, width = 0.28, forks = false, onHit, height = 0.7 }) {
    _n.copy(dir).setY(0).normalize();
    const root = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.55), boltMat(color));
    body.position.y = height * 0.55;
    root.add(body);
    root.position.copy(origin);
    root.position.y = 0.04;
    root.rotation.y = Math.atan2(_n.x, _n.z);
    this.scene.add(root);
    this.items.push({
      type: 'line',
      root,
      body,
      dir: _n.clone(),
      vel: speed,
      life: range / speed,
      traveled: 0,
      range,
      width,
      forks,
      color,
      onHit,
      hit: new Set(),
      forkCd: 0,
    });
  }

  /** Flaming fissure — rising 3D shards along the aim line, then forks. */
  fissure({ origin, dir, color, range = 12, onHit }) {
    _n.copy(dir).setY(0).normalize();
    const root = new THREE.Group();
    const count = 10;
    for (let i = 0; i < count; i++) {
      const h = 0.35 + (i / count) * 1.15;
      const shard = new THREE.Mesh(
        new THREE.ConeGeometry(0.16 + i * 0.012, h, 5),
        glow(color, 0.8),
      );
      shard.position.set(0, h * 0.5, (i + 0.6) * (range / count));
      shard.rotation.x = Math.PI;
      root.add(shard);
    }
    root.position.copy(origin);
    root.rotation.y = Math.atan2(_n.x, _n.z);
    this.scene.add(root);
    this._spawnForks(origin, _n, color, range * 0.55, 3);
    this.items.push({
      type: 'fissure',
      root,
      dir: _n.clone(),
      origin: origin.clone(),
      range,
      life: 0.85,
      max: 0.85,
      color,
      onHit,
      hit: new Set(),
    });
  }

  _spawnForks(origin, dir, color, length, n = 2) {
    _side.set(-dir.z, 0, dir.x);
    for (let i = 0; i < n; i++) {
      const sign = i % 2 === 0 ? 1 : -1;
      const ang = (0.55 + i * 0.18) * sign;
      const fd = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
      const start = origin.clone().addScaledVector(dir, length * (0.35 + i * 0.12));
      const fork = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.22, length * 0.45),
        glow(color, 0.7),
      );
      fork.position.copy(start).addScaledVector(fd, length * 0.22);
      fork.position.y = 0.16;
      fork.rotation.y = Math.atan2(fd.x, fd.z);
      this.scene.add(fork);
      this.items.push({ type: 'fade', root: fork, life: 0.45, max: 0.45 });
    }
  }

  zone({ origin, color, radius = 3.2, life = 0.7, height = 0.55 }) {
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 24, 1, true),
      glow(color, 0.42),
    );
    cyl.position.copy(origin);
    cyl.position.y = height * 0.5;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.07, 8, 28), glow(color, 0.9));
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(origin);
    ring.position.y = 0.08;
    const root = new THREE.Group();
    root.add(cyl, ring);
    this.scene.add(root);
    this.items.push({ type: 'nova', root, life, max: life, range: radius });
  }

  update(dt, enemies) {
    this.clock += dt;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      it.root.traverse((o) => {
        if (o.material?.uniforms?.uTime) o.material.uniforms.uTime.value = this.clock;
      });
      if (it.type === 'line') {
        const step = it.vel * dt;
        it.traveled += step;
        it.root.position.addScaledVector(it.dir, step);
        this._strike(it, enemies, it.root.position, it.width + 0.35);
        it.forkCd -= dt;
        if (it.forks && it.forkCd <= 0 && it.traveled < it.range * 0.8) {
          it.forkCd = 0.08;
          this._spawnForks(it.root.position, it.dir, it.color, 1.8, 1);
        }
      } else if (it.type === 'fissure') {
        const k = 1 - it.life / it.max;
        it.root.scale.y = 0.4 + k * 1.2;
        this._strike(it, enemies, it.origin.clone().addScaledVector(it.dir, it.range * 0.5), it.range * 0.35);
      } else if (it.type === 'nova') {
        const k = 1 - it.life / it.max;
        it.root.scale.setScalar(0.7 + k * 0.5);
      } else if (it.type === 'fade') {
        const k = Math.max(0, it.life / it.max);
        it.root.traverse((o) => {
          if (o.material?.opacity != null) o.material.opacity = k * 0.75;
        });
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

  _strike(it, enemies, at, radius) {
    if (!enemies || !it.onHit) return;
    for (const e of enemies) {
      if (!e.alive || it.hit.has(e)) continue;
      const dx = e.pos.x - at.x;
      const dz = e.pos.z - at.z;
      if (dx * dx + dz * dz < (radius + e.radius) ** 2) {
        it.hit.add(e);
        it.onHit(e, at);
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
