/**
 * Physical dungeon motion: gravity onto the shared terrain sampler,
 * XZ against cuboid/BVH walls, navmesh clampStep when a zone exists.
 */
import * as THREE from 'three';
import { DUNGEON_SI, PLAY } from '../ssot.js';

const _start = new THREE.Vector3();
const _end = new THREE.Vector3();
const _clamped = new THREE.Vector3();

export function snapToTerrain(pos, sampler) {
  const g = sampler ? sampler(pos.x, pos.z) : DUNGEON_SI.groundY;
  if (g == null) return false;
  pos.y = g;
  return true;
}

export function applyGravity(pos, vel, sampler, dt, onGround) {
  const g = sampler ? sampler(pos.x, pos.z) : DUNGEON_SI.groundY;
  if (g == null) {
    vel.y += DUNGEON_SI.gravity * dt;
    pos.y += vel.y * dt;
    if (pos.y < DUNGEON_SI.groundY - 6) {
      pos.y = DUNGEON_SI.groundY;
      vel.y = 0;
      return true;
    }
    return false;
  }
  const floor = g;
  if (onGround) vel.y = Math.min(vel.y, 0);
  else vel.y += DUNGEON_SI.gravity * dt;
  pos.y += vel.y * dt;
  if (pos.y <= floor + 0.001) {
    pos.y = floor;
    vel.y = 0;
    return true;
  }
  return false;
}

export function clampOnNav(terrain, from, to) {
  const nav = terrain?.nav;
  if (!nav || !terrain.zoneOk) return to;
  _start.set(from.x, terrain.groundY, from.z);
  _end.set(to.x, terrain.groundY, to.z);
  let group;
  try {
    group = nav.getGroup(terrain.zone, _start);
  } catch {
    return to;
  }
  if (group == null) return to;
  try {
    const node = nav.getClosestNode(_start, terrain.zone, group, true);
    const next = nav.clampStep(_start, _end, node, terrain.zone, group, _clamped);
    if (!next) return to;
    return { x: _clamped.x, z: _clamped.z, node: next };
  } catch {
    return to;
  }
}

export const CAPSULE = {
  radius: PLAY.capsuleR,
  height: PLAY.playerHeight,
};
