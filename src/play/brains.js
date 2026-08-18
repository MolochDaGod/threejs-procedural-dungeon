/**
 * Enemy brains — close / kiting / caster / warlord cycle.
 * Every attack winds up with a ground telegraph + telling clip, then resolves.
 */
import { findPath } from '../gen/navmesh.js';
import { CELL_M } from '../gen/cells.js';
import { pointInAoe, pointInCone, pointInLine } from './telegraph.js';

export const BRAINS = {
  melee: {
    prefer: 1.8,
    aggro: 14,
    windup: 0.42,
    recover: 0.90,
    shape: 'cone',
    range: 2.3,
    half: 0.72,
    damage: 11,
    color: 0xe8c48a,
    clip: 'attack',
    knock: 1.1,
  },
  ranger: {
    prefer: 8.5,
    flee: 4.2,
    aggro: 16,
    windup: 0.55,
    recover: 1.25,
    shape: 'line',
    range: 13,
    width: 0.55,
    damage: 13,
    color: 0x8fd4ff,
    clip: 'cast',
    knock: 0.6,
  },
  mage: {
    prefer: 6.5,
    aggro: 15,
    windup: 0.72,
    recover: 1.55,
    shape: 'aoe',
    range: 3.6,
    damage: 16,
    color: 0x9b6cf0,
    clip: 'cast',
    knock: 1.4,
  },
  warlord: {
    prefer: 5.5,
    aggro: 20,
    windup: 0.62,
    recover: 1.15,
    cycle: ['cone', 'line', 'aoe'],
    shapes: {
      cone: { range: 3.1, half: 0.7, damage: 18, color: 0xd8433a, clip: 'attack', knock: 1.6 },
      line: { range: 14, width: 0.65, damage: 20, color: 0xff6a22, clip: 'cast', knock: 0.8 },
      aoe: { range: 4.4, damage: 22, color: 0xffe08a, clip: 'cast', knock: 1.8 },
    },
  },
};

function specFor(e) {
  const base = BRAINS[e.prefab?.brain] || BRAINS.melee;
  if (base.cycle) {
    const shape = base.cycle[e.cycleI % base.cycle.length];
    return { ...base, shape, ...base.shapes[shape] };
  }
  return base;
}

function faceToward(e, tx, tz) {
  const dx = tx - e.pos.x;
  const dz = tz - e.pos.z;
  if (dx * dx + dz * dz < 1e-6) return;
  e.actor.root.rotation.y = Math.atan2(dx, dz);
}

function moveAlongPath(session, e, tx, tz, dt, speed) {
  e._pathT = (e._pathT || 0) - dt;
  if (e._pathT <= 0 || !e._path?.length) {
    e._path = session.nav ? findPath(session.nav, e.pos.x, e.pos.z, tx, tz) : [];
    e._pathT = 0.28;
  }
  const step = e._path?.length ? e._path[0] : { x: tx, z: tz };
  if (e._path?.length && Math.hypot(step.x - e.pos.x, step.z - e.pos.z) < CELL_M * 0.28) e._path.shift();
  const dx = step.x - e.pos.x;
  const dz = step.z - e.pos.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = e.pos.x + (dx / len) * speed * dt;
  const nz = e.pos.z + (dz / len) * speed * dt;
  if (session.walkable(session.d, nx, e.pos.z, e.radius * 0.45)) e.pos.x = nx;
  if (session.walkable(session.d, e.pos.x, nz, e.radius * 0.45)) e.pos.z = nz;
  e.actor.root.position.copy(e.pos);
  faceToward(e, step.x, step.z);
  e.actor.setGait(true, false);
}

function beginWindup(session, e, spec) {
  const dir = session.pos.clone().sub(e.pos).setY(0);
  if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
  dir.normalize();
  e.windup = spec.windup;
  e.windupMax = spec.windup;
  e.intent = {
    shape: spec.shape,
    dir,
    origin: e.pos.clone(),
    range: spec.range,
    half: spec.half,
    width: spec.width,
    damage: spec.damage,
    color: spec.color,
    knock: spec.knock,
  };
  if (spec.shape === 'aoe') e.intent.origin = session.pos.clone();
  e.actor.requestOneShot(spec.clip || 'attack', spec.windup + 0.05);
  faceToward(e, session.pos.x, session.pos.z);
  const t = session.tele;
  if (spec.shape === 'cone') t.cone({ origin: e.intent.origin, dir, range: spec.range, half: spec.half, color: spec.color, life: spec.windup });
  else if (spec.shape === 'line') t.line({ origin: e.intent.origin, dir, range: spec.range, width: spec.width, color: spec.color, life: spec.windup });
  else t.aoe({ origin: e.intent.origin, range: spec.range, color: spec.color, life: spec.windup });
}

function resolveIntent(session, e) {
  const it = e.intent;
  if (!it) return;
  const px = session.pos.x;
  const pz = session.pos.z;
  let hit = false;
  if (it.shape === 'cone') hit = pointInCone(px, pz, it.origin, it.dir, it.range, it.half);
  else if (it.shape === 'line') hit = pointInLine(px, pz, it.origin, it.dir, it.range, it.width);
  else hit = pointInAoe(px, pz, it.origin, it.range);

  if (it.shape === 'cone') session.vfx.slash({ origin: it.origin.clone().setY(1.1), dir: it.dir, color: it.color, range: it.range });
  else if (it.shape === 'line') session.vfx.beam({ origin: it.origin.clone().setY(1.15), dir: it.dir, color: it.color, range: it.range });
  else session.vfx.nova({ origin: it.origin.clone(), color: it.color, range: it.range });

  if (hit) {
    session.hp -= it.damage;
    session.vfx.shake.add(e.boss ? 0.48 : 0.3);
    session.vfx.impact({ origin: session.pos.clone().setY(1.1), color: it.color });
    const k = it.knock || 0;
    if (k > 0) {
      const nx = session.pos.x + it.dir.x * k;
      const nz = session.pos.z + it.dir.z * k;
      if (session.walkable(session.d, nx, session.pos.z, 0.3)) session.pos.x = nx;
      if (session.walkable(session.d, session.pos.x, nz, 0.3)) session.pos.z = nz;
      session.applyPlayerFeet?.();
    }
  }
  e.intent = null;
  e.cycleI = (e.cycleI || 0) + 1;
}

export function tickBrain(session, e, dt) {
  e.actor.update(dt);
  if (!e.alive) return;
  const spec = specFor(e);
  const dist = e.pos.distanceTo(session.pos);
  if (dist < spec.aggro) e.aggro = Math.max(e.aggro, 5);
  e.hitCd = Math.max(0, e.hitCd - dt);

  if (e.windup > 0) {
    e.windup -= dt;
    e.actor.setGait(false, false);
    faceToward(e, session.pos.x, session.pos.z);
    if (e.windup <= 0) {
      resolveIntent(session, e);
      e.hitCd = spec.recover;
    }
    return;
  }

  if (e.aggro <= 0) {
    e.actor.setGait(false, false);
    return;
  }
  e.aggro -= dt;

  const prefer = spec.prefer;
  const flee = spec.flee || 0;
  if (flee && dist < flee) {
    const awayX = e.pos.x - session.pos.x;
    const awayZ = e.pos.z - session.pos.z;
    moveAlongPath(session, e, e.pos.x + awayX, e.pos.z + awayZ, dt, e.speed);
    return;
  }

  const ready = e.hitCd <= 0 && dist <= spec.range * 1.05;
  if (ready && (spec.shape !== 'cone' || dist <= prefer + 0.6)) {
    beginWindup(session, e, spec);
    return;
  }

  const tx = spec.shape === 'ranger' || spec.prefer > 4
    ? session.pos.x + (e.pos.x - session.pos.x) * 0.15
    : session.pos.x;
  const tz = spec.shape === 'ranger' || spec.prefer > 4
    ? session.pos.z + (e.pos.z - session.pos.z) * 0.15
    : session.pos.z;
  if (Math.abs(dist - prefer) > 0.55) {
    const aimX = dist > prefer ? session.pos.x : e.pos.x * 2 - session.pos.x;
    const aimZ = dist > prefer ? session.pos.z : e.pos.z * 2 - session.pos.z;
    moveAlongPath(session, e, aimX, aimZ, dt, e.speed);
  } else {
    e.actor.setGait(false, false);
    faceToward(e, session.pos.x, session.pos.z);
  }
}
