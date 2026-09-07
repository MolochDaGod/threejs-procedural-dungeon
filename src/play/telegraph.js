/**
 * Ground telegraphs — combat.* / Flare design.
 * Shader-masked cone / line / AoE plus combat.grudge-studio.com warning/arrow GLBs.
 * Hit tests stay CPU (pointIn*). Do not invent a second tell system.
 */
import * as THREE from 'three';
import { COMBAT_DEPLOY } from '../ssot.js';
import { loadGltf } from './assets.js';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uSize;
uniform vec2  uDir;
uniform int   uKind;
uniform float uRadius;
uniform float uHalfAngle;
uniform float uLength;
uniform float uHalfWidth;
uniform vec3  uColor;
uniform float uProgress;
uniform float uAlpha;
uniform float uRing;
uniform float uPulse;
void main() {
  vec2 c = (vUv - 0.5) * uSize;
  vec2 o = vec2(c.x, -c.y);
  float fwd  = dot(o, uDir);
  float side = o.x * uDir.y - o.y * uDir.x;
  float dist = length(o);
  float inside = 0.0;
  float edge = 0.0;
  float ringW = max(0.18, uRadius * 0.08);

  if (uKind == 0 || uKind == 1) {
    float outer = step(dist, uRadius + 0.04);
    float innerHole = uRing > 0.5 ? step(uRadius - ringW * 1.6, dist) : 1.0;
    inside = outer * innerHole;
    edge = smoothstep(uRadius - ringW, uRadius, dist)
         * smoothstep(uRadius + 0.08, uRadius - 0.02, dist);
    float tick = max(
      step(abs(o.x), 0.08) * step(abs(o.y), uRadius) * step(uRadius * 0.72, abs(o.y)),
      step(abs(o.y), 0.08) * step(abs(o.x), uRadius) * step(uRadius * 0.72, abs(o.x))
    );
    edge = max(edge, tick * outer);
  } else if (uKind == 2) {
    float ang = acos(clamp(fwd / max(dist, 1e-4), -1.0, 1.0));
    float inAng = step(ang, uHalfAngle);
    inside = inAng * step(dist, uRadius) * step(0.0, fwd);
    edge = inside * (smoothstep(uRadius - 0.25, uRadius, dist)
                   + smoothstep(uHalfAngle - 0.07, uHalfAngle, ang));
  } else {
    float inLen = step(0.0, fwd) * step(fwd, uLength);
    float inW = step(abs(side), uHalfWidth);
    inside = inLen * inW;
    edge = inside * (smoothstep(uHalfWidth - 0.14, uHalfWidth, abs(side))
                   + smoothstep(uLength - 0.25, uLength, fwd));
    float chev = step(abs(side), uHalfWidth * (1.0 - fwd / max(uLength, 0.01)) * 0.55 + 0.08);
    edge = max(edge, inside * chev * step(fwd, uProgress * uLength + 0.35) * step(uProgress * uLength - 0.55, fwd));
  }

  float sweep = (uKind == 3)
    ? step(fwd, uProgress * uLength)
    : step(dist, uProgress * uRadius);
  float fill = inside * (0.12 + 0.28 * sweep + 0.1 * uPulse);
  float a = max(fill, clamp(edge, 0.0, 1.0) * (0.85 + 0.4 * uPulse)) * uAlpha;
  if (a < 0.01) discard;
  vec3 col = mix(uColor, vec3(1.0, 0.95, 0.7), edge * uProgress * 0.55);
  gl_FragColor = vec4(col, a);
}
`;

function kindInt(shape) {
  if (shape === 'cone') return 2;
  if (shape === 'line') return 3;
  return 0;
}

export class TelegraphField {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.combatItems = [];
    this._combat = { warning: null, arrow: null };
    this.geo = new THREE.PlaneGeometry(1, 1);
    void this._loadCombat();
  }

  async _loadCombat() {
    const files = [
      ['warning', COMBAT_DEPLOY.telegraphWarning],
      ['arrow', COMBAT_DEPLOY.telegraphArrow],
    ];
    await Promise.all(files.map(async ([kind, url]) => {
      try {
        const gltf = await loadGltf(url);
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const sz = box.getSize(new THREE.Vector3());
        this._combat[kind] = {
          scene: gltf.scene,
          clip: gltf.animations?.[0] || null,
          extent: Math.max(sz.x, sz.z, 0.001),
        };
      } catch (err) {
        console.warn('[telegraph] combat mesh miss', kind, err?.message || err);
      }
    }));
  }

  /** Combat-lab warning/arrow GLB (Saber TelegraphSystem). Garnish — shader field stays SSOT. */
  combat({ kind = 'warning', origin, size = 3.2, yaw = 0, ttl = 0.55 } = {}) {
    const proto = this._combat[kind] || this._combat.warning;
    if (!proto || this.combatItems.length >= 8 || !origin) return null;
    const root = proto.scene.clone(true);
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false;
      o.receiveShadow = false;
      o.renderOrder = 5;
      if (o.material) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.depthWrite = false;
      }
    });
    const s = size / proto.extent;
    root.scale.setScalar(s);
    root.position.set(origin.x, (origin.y || 0) + 0.06, origin.z);
    root.rotation.y = yaw || 0;
    this.scene.add(root);
    let mixer = null;
    if (proto.clip) {
      mixer = new THREE.AnimationMixer(root);
      mixer.clipAction(proto.clip).play();
    }
    const it = { root, mixer, life: ttl, max: ttl };
    this.combatItems.push(it);
    return it;
  }

  _spawn(shape, origin, dir, range, extra, color, life) {
    const n = (dir && dir.clone) ? dir.clone().setY(0) : new THREE.Vector3(0, 0, 1);
    if (n.lengthSq() < 1e-6) n.set(0, 0, 1);
    n.normalize();
    const width = extra.width ?? 0.7;
    const half = extra.half ?? 0.7;
    const ring = extra.ring ? 1 : 0;
    const size = 2 * (range + 0.9);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uSize: { value: size },
        uDir: { value: new THREE.Vector2(n.x, n.z) },
        uKind: { value: kindInt(shape) },
        uRadius: { value: range },
        uHalfAngle: { value: half },
        uLength: { value: range },
        uHalfWidth: { value: width },
        uColor: { value: new THREE.Color(color) },
        uProgress: { value: 0 },
        uAlpha: { value: 0 },
        uRing: { value: ring },
        uPulse: { value: 0 },
      },
    });
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(origin.x, extra.y ?? 0.07, origin.z);
    mesh.scale.set(size, size, 1);
    mesh.renderOrder = 4;
    this.scene.add(mesh);
    const it = { mesh, mat, life, max: life, shape, origin, dir: n, range, half, width, color };
    this.items.push(it);
    return it;
  }

  cone({ origin, dir, range, half, color, life }) {
    return this._spawn('cone', origin, dir, range, { half }, color, life);
  }

  line({ origin, dir, range, width, color, life }) {
    return this._spawn('line', origin, dir, range, { width }, color, life);
  }

  aoe({ origin, range, color, life, ring = false }) {
    return this._spawn('aoe', origin, new THREE.Vector3(1, 0, 0), range, { ring }, color, life);
  }

  /** Incoming / planted tell — hollow ring on the landing cell (Casting dummy + Flare). */
  incoming({ origin, range, color, life }) {
    return this.aoe({ origin, range, color, life, ring: true });
  }

  update(dt) {
    const done = [];
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      const p = 1 - Math.max(0, it.life) / it.max;
      const age = (1 - Math.max(0, it.life)) * it.max;
      it.mat.uniforms.uProgress.value = p;
      it.mat.uniforms.uPulse.value = p * p * (0.55 + 0.45 * Math.sin(age * 18));
      it.mat.uniforms.uAlpha.value =
        p < 0.12 ? Math.min(1, p / 0.12) : p < 0.85 ? 1 : Math.max(0, 1 - (p - 0.85) / 0.15);
      if (it.life <= 0) {
        done.push(it);
        this.scene.remove(it.mesh);
        it.mat.dispose();
        this.items.splice(i, 1);
      }
    }
    for (let i = this.combatItems.length - 1; i >= 0; i--) {
      const it = this.combatItems[i];
      it.mixer?.update(dt);
      it.life -= dt;
      const fade = it.life < it.max * 0.2 ? Math.max(0, it.life / (it.max * 0.2)) : 1;
      it.root.traverse((o) => {
        if (o.isMesh && o.material?.opacity != null) o.material.opacity = 0.85 * fade;
      });
      if (it.life <= 0) {
        this.scene.remove(it.root);
        it.mixer?.stopAllAction();
        this.combatItems.splice(i, 1);
      }
    }
    return done;
  }

  clear() {
    for (const it of this.items) {
      this.scene.remove(it.mesh);
      it.mat.dispose();
    }
    this.items.length = 0;
    for (const it of this.combatItems) {
      this.scene.remove(it.root);
      it.mixer?.stopAllAction();
    }
    this.combatItems.length = 0;
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
