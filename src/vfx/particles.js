import * as THREE from 'three';

export const PUFF = {
  healMist: { id: 'healMist', kind: 'heal', color: 0xc8f0a8, opacity: 0.85, life: 0.7 },
  fireSmall: { id: 'fireSmall', kind: 'fire', color: 0xff6a22, opacity: 0.9, life: 0.45, loop: false },
  fireLong: { id: 'fireLong', kind: 'fire', color: 0xff6a22, opacity: 0.8, life: 1.6, loop: true },
  smoke: { id: 'smoke', kind: 'smoke', color: 0x9aa3b2, opacity: 0.6, life: 0.8 },
  holy: { id: 'holy', kind: 'holy', color: 0xffe08a, opacity: 0.8, life: 0.7 },
  frost: { id: 'frost', kind: 'frost', color: 0x86d9ff, opacity: 0.75, life: 0.7 },
  dust: { id: 'dust', kind: 'dust', color: 0x8a7a62, opacity: 0.5, life: 0.45 },
};

export function puffPreset(id, extra = {}) {
  return { ...(PUFF[id] || PUFF.dust), ...extra };
}

export class PuffField {
  constructor(spec = {}) {
    this.spec = { life: 0.6, opacity: 0.8, size: 0.35, ...spec };
    const geo = new THREE.SphereGeometry(this.spec.size || 0.35, 8, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: this.spec.color || 0xffffff,
      transparent: true,
      opacity: this.spec.opacity ?? 0.8,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this._follow = null;
  }

  setColor(c) {
    if (this.mesh.material) this.mesh.material.color.set(c);
  }

  attachTo(obj) {
    this._follow = obj;
  }

  along(from, to) {
    if (!from || !to) return;
    this.mesh.position.set(
      (from.x + to.x) * 0.5,
      (from.y + to.y) * 0.5,
      (from.z + to.z) * 0.5,
    );
  }

  update() {
    if (this._follow?.position) this.mesh.position.copy(this._follow.position);
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry?.dispose?.();
    this.mesh.material?.dispose?.();
    this._follow = null;
  }
}
