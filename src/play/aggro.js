/**
 * Indoor aggro + roam + boss path. Numbers from ssot AGGRO.
 * Group pull on sight or barrier smash.
 * Motion: three-pathfinding zone (maze path_to) then grid A* — never clip walls.
 */
import { AGGRO } from '../ssot.js';
import { findPath } from '../gen/navmesh.js';
import { findAiPath } from '../terrain/navmesh.js';
import { worldOf } from '../gen/cells.js';
import { lineOpen, cellIndex } from '../grid/cells.js';

/** uMMORPG threat table — grudge-ai-brains THREAT_CONFIG. Not nearest-player forever. */
export const THREAT = {
  damageMul: 1,
  healMul: 0.5,
  tankMul: 1.5,
  decayPerSec: 4,
  taunt: 10000,
  lockSec: 3,
};

export function addThreat(e, whoKey, amount) {
  if (!e?.alive || !whoKey) return;
  if (!e.threatTable) e.threatTable = new Map();
  e.threatTable.set(whoKey, (e.threatTable.get(whoKey) || 0) + amount);
}

export function applyTaunt(e, whoKey, now = 0) {
  addThreat(e, whoKey, THREAT.taunt);
  e.tauntLock = { who: whoKey, until: now + THREAT.lockSec };
  e.aggro = Math.max(e.aggro || 0, 8);
}

export function decayThreat(e, dt) {
  if (!e.threatTable) return;
  for (const [k, v] of e.threatTable) {
    const n = v - THREAT.decayPerSec * dt;
    if (n <= 0) e.threatTable.delete(k);
    else e.threatTable.set(k, n);
  }
}

export function topThreatKey(e, now = 0) {
  if (e.tauntLock && now < e.tauntLock.until) return e.tauntLock.who;
  let best = null;
  let bestV = 0;
  if (e.threatTable) {
    for (const [k, v] of e.threatTable) {
      if (v > bestV) { bestV = v; best = k; }
    }
  }
  return best;
}

export function chasePos(session, e) {
  const key = topThreatKey(e, session.now || 0);
  if (!key || key === 'player') return session.pos;
  const ally = (session.allies || []).find((a) => a.alive && (a.threatKey === key || a.classId === key));
  return ally?.pos || session.pos;
}

export function losToPlayer(session, e) {
  return lineOpen(session.d, e.pos.x, e.pos.z, session.pos.x, session.pos.z);
}

export function pull(session, e, seconds = 8) {
  if (!e?.alive) return;
  e.aggro = Math.max(e.aggro || 0, seconds);
  addThreat(e, 'player', 12);
  const roomId = e.room?.id;
  for (const o of session.enemies) {
    if (o === e || !o.alive) continue;
    const d = e.pos.distanceTo(o.pos);
    if (d > AGGRO.assist) continue;
    const sameRoom = roomId == null || o.room?.id === roomId;
    if (!sameRoom && d > AGGRO.assist * 0.7) continue;
    const hear = d < AGGRO.assist * 0.55;
    const see = lineOpen(session.d, o.pos.x, o.pos.z, session.pos.x, session.pos.z);
    if (hear || see) o.aggro = Math.max(o.aggro || 0, seconds * 0.85);
  }
}

export function hearBreak(session, gx, gz) {
  const i = cellIndex(session.d, gx, gz);
  if (i < 0) return;
  const w = worldOf(session.d, gx, gz);
  for (const e of session.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.pos.x - w.x, e.pos.z - w.z);
    if (d <= AGGRO.assist) pull(session, e, 6);
  }
}

function followPath(session, e, dt, speed) {
  const step = e._path?.[0];
  if (!step) return false;
  if (Math.hypot(step.x - e.pos.x, step.z - e.pos.z) < 0.45) {
    e._path.shift();
    return true;
  }
  const dx = step.x - e.pos.x;
  const dz = step.z - e.pos.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = e.pos.x + (dx / len) * speed * dt;
  const nz = e.pos.z + (dz / len) * speed * dt;
  if (session.walkable(session.d, nx, e.pos.z, e.radius * 0.4)) e.pos.x = nx;
  if (session.walkable(session.d, e.pos.x, nz, e.radius * 0.4)) e.pos.z = nz;
  return true;
}

function setPath(session, e, tx, tz) {
  e._pathT = e.boss ? 0.22 : 0.32;
  const tp = findAiPath(session.d, e.pos, { x: tx, z: tz });
  if (tp && tp.length) {
    e._path = tp;
    e._pathVia = 'three-pathfinding';
    return;
  }
  e._path = session.nav ? findPath(session.nav, e.pos.x, e.pos.z, tx, tz) : [];
  e._pathVia = 'grid-8';
}

function roamTarget(session, e) {
  const nav = session.nav;
  if (!nav?.walkable?.length) return e.spawn;
  const roomId = e.room?.id;
  const cand = [];
  for (const n of nav.walkable) {
    if (roomId != null && session.d.roomId && session.d.roomId[n.i] !== roomId) continue;
    cand.push(n);
  }
  const pool = cand.length ? cand : nav.walkable;
  const pick = pool[(e._roamI = ((e._roamI || 0) + 7) % pool.length)];
  return { x: pick.wx, z: pick.wz };
}

/**
 * @returns {'idle'|'roam'|'leash'|'chase'}
 */
export function tickMobMotion(session, e, dt) {
  const dist = e.pos.distanceTo(session.pos);
  const see = dist <= AGGRO.detection && losToPlayer(session, e);
  if (see && dist <= AGGRO.aggro) pull(session, e, 8);
  else if (see) e.alert = true;
  else e.alert = false;

  const fromSpawn = e.spawn ? e.pos.distanceTo(e.spawn) : 0;
  if ((e.aggro || 0) > 0 && fromSpawn > AGGRO.leash) {
    e.aggro = 0;
    setPath(session, e, e.spawn.x, e.spawn.z);
    return 'leash';
  }

  e._pathT = (e._pathT || 0) - dt;
  const boss = !!e.boss;
  const speed = (e.speed || 3) * (boss ? 1.05 : 1);

  if ((e.aggro || 0) > 0) {
    decayThreat(e, dt);
    const focus = chasePos(session, e);
    if (e._pathT <= 0 || !e._path?.length) setPath(session, e, focus.x, focus.z);
    followPath(session, e, dt, speed);
    return 'chase';
  }

  e._roamWait = (e._roamWait || 2) - dt;
  if (e._roamWait <= 0 || !e._path?.length) {
    const t = roamTarget(session, e);
    setPath(session, e, t.x, t.z);
    e._roamWait = boss ? 4.5 : 2.8 + (e.room?.id || 1) * 0.15;
  }
  followPath(session, e, dt, speed * 0.62);
  return 'roam';
}
