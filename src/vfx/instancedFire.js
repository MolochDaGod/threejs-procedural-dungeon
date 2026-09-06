import * as THREE from 'three';

export function gridFireCells(origin, span, step = 1, y = 1) {
  const out = [];
  const n = Math.max(1, Math.round(span));
  for (let i = -n; i <= n; i += step) {
    for (let j = -n; j <= n; j += step) {
      if (i * i + j * j > n * n) continue;
      out.push({ x: origin.x + i * 0.55, y: origin.y + y * 0.2, z: origin.z + j * 0.55, scale: 1, seed: i * 17 + j * 31 });
    }
  }
  return out;
}

export class InstancedFire {
  constructor({ scene, maxCount = 64, color = 0xff6a22, intensity = 1 } = {}) {
    this.maxCount = maxCount;
    this.list = [];
    this.uniforms = { intensity: { value: intensity } };
    const geo = new THREE.ConeGeometry(0.12, 0.42, 6);
    geo.translate(0, 0.21, 0);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 * intensity, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, maxCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    scene?.add(this.mesh);
    this._m = new THREE.Matrix4();
  }

  setInstances(list) {
    this.list = (list || []).slice(0, this.maxCount).map((p, i) => ({
      x: p.x, y: p.y || 0, z: p.z,
      scale: p.scale || 1,
      seed: p.seed != null ? p.seed : i * 13.17,
    }));
    this.mesh.count = this.list.length;
    this._write(0);
  }

  /** Tick: flicker scale + opacity. Signature matches instanced-fire SSOT `update(camera, elapsed)`. */
  update(_camera, elapsed = 0) {
    const n = this.list.length;
    if (!n || !this.mesh) return;
    this._write(elapsed);
    const inten = this.uniforms.intensity.value;
    const flick = 0.72 + 0.28 * Math.sin(elapsed * 11.3);
    this.mesh.material.opacity = Math.max(0.12, 0.85 * inten * flick);
  }

  _write(elapsed) {
    const n = this.list.length;
    for (let i = 0; i < n; i++) {
      const p = this.list[i];
      const pulse = 0.82 + 0.22 * Math.sin(elapsed * 9.1 + p.seed);
      const s = (p.scale || 1) * pulse;
      const sy = s * (1.05 + 0.18 * Math.sin(elapsed * 13 + p.seed * 0.7));
      this._m.makeScale(s, sy, s);
      this._m.setPosition(p.x, p.y, p.z);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.list = [];
  }
}
