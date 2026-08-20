/**
 * 4-man party brains. Player occupies one class; AI fills the other three.
 * Allies cast the same 6-slot catalog on cooldown, like a player would.
 */
import * as THREE from 'three';
import { CLASSES, CLASS_IDS, PLAY, RACE_IDS, loadoutFor } from '../ssot.js';

const _dir = new THREE.Vector3();

export function otherClasses(playerClass) {
  return CLASS_IDS.filter((id) => id !== playerClass);
}

export function allyRaces(playerRace) {
  return RACE_IDS.filter((id) => id !== playerRace);
}

export function makeAlly(actor, { classId, raceId, pos }) {
  const cls = CLASSES[classId] || CLASSES.warrior;
  const loadout = loadoutFor(classId);
  const cds = {};
  for (const s of loadout) cds[s.id] = 0;
  return {
    actor,
    classId: cls.id,
    brain: cls.brain,
    role: cls.role,
    raceId,
    pos: pos.clone(),
    vel: new THREE.Vector3(),
    aim: new THREE.Vector3(0, 0, 1),
    hp: PLAY.allyHp,
    hpMax: PLAY.allyHp,
    mana: PLAY.mana,
    alive: true,
    loadout,
    cds,
    casting: 0,
    hold: cls.role === 'tank' ? 2.0 : cls.role === 'cast' ? 7.2 : cls.role === 'kite' ? 8.5 : 4.2,
    speed: cls.role === 'tank' ? 5.0 : 5.4,
    threat: 0,
  };
}

/**
 * Tick one ally. Host implements walkable / castFrom / nearestEnemy / takeSupport.
 */
export function tickAlly(a, dt, host) {
  a.actor.update(dt);
  if (!a.alive) return;
  a.casting = Math.max(0, a.casting - dt);
  a.mana = Math.min(PLAY.mana, a.mana + PLAY.manaRegen * dt);
  a.hp = Math.min(a.hpMax, a.hp + PLAY.hpRegen * 0.6 * dt);
  for (const k of Object.keys(a.cds)) a.cds[k] = Math.max(0, a.cds[k] - dt);

  const player = host.playerPos;
  const foe = host.nearestFoe(a.pos, a.role === 'tank' ? 16 : 13);
  const focus = foe ? foe.pos : player;
  _dir.copy(focus).sub(a.pos).setY(0);
  const dist = _dir.length();
  if (dist > 0.001) {
    _dir.normalize();
    a.aim.copy(_dir);
    a.actor.root.rotation.y = Math.atan2(_dir.x, _dir.z);
  }

  a.parryT = Math.max(0, (a.parryT || 0) - dt);
  if (a.role === 'tank' && foe && dist < 3.2) {
    a.parryCd = (a.parryCd || 0) - dt;
    if ((a.parryCd || 0) <= 0) {
      a.parryCd = 2.4;
      a.parryT = PLAY.parry.window;
    }
  }

  const desired = a.role === 'tank'
    ? (foe ? a.hold : 2.4)
    : a.role === 'cast'
      ? 5.4
      : a.role === 'kite'
        ? a.hold
        : 4.0;
  const toPlayer = a.pos.distanceTo(player);
  let moving = false;

  if (toPlayer > 14) {
    _dir.copy(player).sub(a.pos).setY(0).normalize();
    stepToward(a, _dir, a.speed * 1.15, dt, host);
    moving = true;
  } else if (foe && dist > desired) {
    stepToward(a, _dir, a.speed, dt, host);
    moving = true;
  } else if (foe && dist < desired * 0.55 && a.role !== 'tank') {
    stepToward(a, _dir.clone().multiplyScalar(-1), a.speed * 0.85, dt, host);
    moving = true;
  } else if (!foe && toPlayer > 3.2) {
    _dir.copy(player).sub(a.pos).setY(0).normalize();
    stepToward(a, _dir, a.speed * 0.9, dt, host);
    moving = true;
  }

  a.actor.root.position.copy(a.pos);
  a.actor.setGait(moving, toPlayer > 10);

  if (a.role === 'tank' && foe) {
    a.tauntCd = (a.tauntCd || 0) - dt;
    if (a.tauntCd <= 0 && a.pos.distanceTo(foe.pos) < 9) {
      a.tauntCd = 8;
      a.threat += 48;
      host.taunt?.(a, 9);
    }
  }

  if (a.role === 'flex' && foe) {
    a.utilCd = (a.utilCd || 0) - dt;
    if (a.utilCd <= 0 && dist < 5) {
      a.utilCd = 7;
      host.utility?.(a, foe);
    }
  }

  if (a.casting > 0 || !foe) return;
  const spell = pickReadySpell(a, foe, host);
  if (!spell) return;
  a.cds[spell.id] = spell.cd;
  a.mana -= spell.mana;
  a.casting = Math.max(0.16, spell.telegraphSec || 0.18);
  a.actor.requestOneShot(spell.kind === 'slash' ? 'attack' : 'cast', a.casting + 0.12);
  if (a.role === 'tank') a.threat += 18;
  host.castFrom(a, spell, foe);
}

function stepToward(a, dir, speed, dt, host) {
  let nx = a.pos.x + dir.x * speed * dt;
  let nz = a.pos.z + dir.z * speed * dt;
  if (host.clampNav) {
    const c = host.clampNav(a.pos, { x: nx, z: nz });
    if (c && c.x != null) { nx = c.x; nz = c.z; }
  }
  if (host.walkable(nx, a.pos.z)) a.pos.x = nx;
  if (host.walkable(a.pos.x, nz)) a.pos.z = nz;
}

function pickReadySpell(a, foe, host) {
  const dist = a.pos.distanceTo(foe.pos);
  const ready = a.loadout.filter((s) => (a.cds[s.id] || 0) <= 0 && a.mana >= s.mana);
  if (!ready.length) return null;
  const partyHurt = host.partyHurtRatio ? host.partyHurtRatio() : host.playerHp / host.playerHpMax;
  if (a.role === 'tank') {
    return ready.find((s) => s.kind === 'slash' && dist <= s.range + 0.6)
      || ready.find((s) => s.kind === 'dash' && dist > 4)
      || ready.find((s) => s.kind === 'nova' && dist <= 5)
      || null;
  }
  if (a.role === 'cast') {
    if (partyHurt < 0.62) {
      const heal = ready.find((s) => s.kind === 'nova');
      if (heal) return heal;
    }
    return ready.find((s) => s.kind === 'projectile' && dist <= s.range)
      || ready.find((s) => s.kind === 'beam' && dist <= s.range)
      || ready.find((s) => s.kind === 'nova' && dist <= s.range + 1)
      || null;
  }
  if (a.role === 'kite') {
    const los = host.lineOpen ? host.lineOpen(a.pos, foe.pos) : true;
    if (!los) return ready.find((s) => s.kind === 'dash') || null;
    return ready.find((s) => s.kind === 'projectile' && dist <= s.range)
      || ready.find((s) => s.kind === 'beam' && dist <= s.range)
      || ready.find((s) => s.kind === 'slash' && dist <= 3.2)
      || ready.find((s) => s.kind === 'dash' && dist < 3)
      || null;
  }
  if (a.role === 'flex') {
    if (partyHurt < 0.7) {
      const util = ready.find((s) => s.kind === 'nova') || ready.find((s) => s.kind === 'dash');
      if (util) return util;
    }
    return ready.find((s) => s.kind === 'beam' && dist <= s.range)
      || ready.find((s) => s.kind === 'projectile' && dist <= s.range)
      || ready[0];
  }
  if (partyHurt < 0.5) {
    const heal = ready.find((s) => s.kind === 'nova');
    if (heal && a.pos.distanceTo(host.playerPos) <= heal.range + 1.2) return heal;
  }
  return ready.find((s) => (s.kind === 'slash' && dist <= s.range + 0.4) || (s.kind !== 'slash' && dist <= s.range))
    || ready[0];
}
