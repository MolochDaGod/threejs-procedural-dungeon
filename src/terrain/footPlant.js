/**
 * Plant actor feet on the dungeon terrain after mixer update.
 * Same height field as body ground — never pelvis-as-feet, never under the slab.
 */
import * as THREE from 'three';
import { DUNGEON_SI } from '../ssot.js';

const _w = new THREE.Vector3();
const _t = new THREE.Vector3();
const _inv = new THREE.Matrix4();
const FOOT_RE = /foot|toe|ankle/i;
const MAX_LIFT = 0.14;

export function groundRoot(root, sampler, wx, wz) {
  const gy = sampler ? sampler(wx, wz) : DUNGEON_SI.groundY;
  root.position.y = gy == null ? DUNGEON_SI.groundY : gy;
}

/**
 * mixer.update first, then this. Lifts foot bones that sank under the slab.
 */
/**
 * Sit a prop (chest, barrier, turret) on the same sampler as feet.
 * Uses world AABB min.y — works under a scaled forge group.
 */
export function plantObjectOnTerrain(obj, sampler) {
  if (!obj) return;
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (!Number.isFinite(box.min.y)) return;
  const wx = (box.min.x + box.max.x) * 0.5;
  const wz = (box.min.z + box.max.z) * 0.5;
  const g = sampler ? sampler(wx, wz) : DUNGEON_SI.groundY;
  const gy = g == null ? DUNGEON_SI.groundY : g;
  let scaleY = 1;
  if (obj.parent) {
    obj.parent.updateWorldMatrix(true, false);
    scaleY = obj.parent.getWorldScale(_t).y || 1;
  }
  obj.position.y += (gy - box.min.y) / scaleY;
}

export function plantFeet(root, sampler) {
  if (!root || !sampler) return;
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isBone || !FOOT_RE.test(o.name || '')) return;
    o.getWorldPosition(_w);
    const g = sampler(_w.x, _w.z);
    if (g == null) return;
    const want = g + 0.018;
    if (_w.y >= want) return;
    const lift = Math.min(MAX_LIFT, want - _w.y);
    const parent = o.parent;
    if (!parent) {
      o.position.y += lift;
      return;
    }
    parent.updateWorldMatrix(true, false);
    _inv.copy(parent.matrixWorld).invert();
    _t.copy(_w);
    _t.y += lift;
    _t.applyMatrix4(_inv);
    o.position.copy(_t);
  });
}
