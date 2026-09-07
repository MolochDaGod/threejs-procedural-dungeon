/**
 * Yuka steering on dungeon enemies — Vehicle + Wander + Seek.
 * Rapier / grid still own collisions. One mixer stays on the Toon kit.
 * threejs-games 70-ai distances: sight 25, pursue when seen.
 */
import { lineOpen } from '../grid/cells.js';
import { AGGRO } from '../ssot.js';

const SIGHT = AGGRO.detection;

let yukaMod = null;
let yukaTried = false;

async function loadYuka() {
  if (yukaMod || yukaTried) return yukaMod;
  yukaTried = true;
  try {
    yukaMod = await import('yuka');
  } catch (err) {
    console.warn('[dungeon-ai] yuka miss', err?.message || err);
    yukaMod = null;
  }
  return yukaMod;
}

export function warmYuka() {
  return loadYuka();
}

export function attachYuka(e) {
  const Y = yukaMod;
  if (!Y || e.yuka) return e;
  const v = new Y.Vehicle();
  v.maxSpeed = e.speed || 3.2;
  v.maxForce = 18;
  v.position.set(e.pos.x, 0, e.pos.z);
  const wander = new Y.WanderBehavior();
  wander.weight = 0.85;
  v.steering.add(wander);
  const seek = new Y.SeekBehavior(new Y.Vector3());
  seek.active = false;
  seek.weight = 0;
  v.steering.add(seek);
  e.yuka = { v, wander, seek };
  e.aiState = 'wander';
  return e;
}

export function steerEnemy(session, e, dt) {
  const see =
    e.pos.distanceTo(session.pos) < SIGHT &&
    lineOpen(session.d, e.pos.x, e.pos.z, session.pos.x, session.pos.z);
  if (see) e.aggro = Math.max(e.aggro, 6);

  const yk = e.yuka;
  if (!yk) return see;
  const { v, wander, seek } = yk;
  v.position.set(e.pos.x, 0, e.pos.z);
  if (see) {
    if (!seek.target) seek.target = v.position.clone();
    seek.target.set(session.pos.x, 0, session.pos.z);
    seek.active = true;
    seek.weight = 1.35;
    wander.weight = 0.08;
    e.aiState = 'pursue';
  } else {
    seek.active = false;
    seek.weight = 0;
    wander.weight = 1;
    e.aiState = e.aggro > 0 ? 'search' : 'wander';
  }
  v.update(dt);
  const nx = v.position.x;
  const nz = v.position.z;
  if (session.walkable(session.d, nx, e.pos.z, e.radius * 0.4)) e.pos.x = nx;
  if (session.walkable(session.d, e.pos.x, nz, e.radius * 0.4)) e.pos.z = nz;
  v.position.set(e.pos.x, 0, e.pos.z);
  if (see) {
    e.actor.root.rotation.y = Math.atan2(session.pos.x - e.pos.x, session.pos.z - e.pos.z);
  } else {
    const vel = v.velocity;
    if (vel && (vel.x * vel.x + vel.z * vel.z) > 0.02) {
      e.actor.root.rotation.y = Math.atan2(vel.x, vel.z);
    }
  }
  return see;
}
