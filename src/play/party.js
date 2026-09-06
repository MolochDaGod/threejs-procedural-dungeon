/**
 * 4-man party brains. Player occupies one class; AI fills the other three.
 * Allies cast the same 6-slot catalog on cooldown, like a player would.
 */
import * as THREE from 'three';
import { CLASSES, PLAY, RACE_IDS, RACES, dungeonFill, loadoutFor } from '../ssot.js';
import { groundRoot } from '../terrain/footPlant.js';
import { passiveFor } from './passives.js';
import { animForSpell, hitWindowSec } from './clipRoles.js';

const _dir = new THREE.Vector3();

export function otherClasses(playerClass) {
  return dungeonFill(playerClass);
}

/** Same Warlords faction as the player (Crusade / Fabled / Legion). Repeat if the faction has two races. */
export function allyRaces(playerRace) {
  const fac = RACES[playerRace]?.faction;
  const same = RACE_IDS.filter((id) => RACES[id]?.faction === fac);
  const pool = same.length ? same : RACE_IDS;
  const others = pool.filter((id) => id !== playerRace);
  const src = others.length ? others : pool;
  return [0, 1, 2].map((i) => src[i % src.length]);
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
    hold: cls.role === 'tank' ? 2.0 : cls.role === 'cast' ? 7.2 : cls.role === 'kite' ? 8.5 : cls.role === 'heal' ? 4.6 : cls.role === 'peel' ? 3.4 : 4.2,
    speed: cls.role === 'tank' ? 5.0 : 5.4,
    threat: 0,
    threatKey: `ally:${cls.id}`,
  };
}

/**
 * Tick one ally. Host implements walkable / castFrom / nearestEnemy / takeSupport.
 */
export function tickAlly(a, dt, host) {
  a.actor.update(dt);
  if (!a.alive) return;
  if (a.status) {
    a.status.flinch = Math.max(0, (a.status.flinch || 0) - dt);
    a.status.stun = Math.max(0, (a.status.stun || 0) - dt);
    if ((a.status.stun || 0) > 0 || (a.status.freeze || 0) > 0) {
      a.actor.setGait(false, false);
      return;
    }
  }
  if (a.downed) {
    a.actor.setGait(true, false, { downed: true });
    if (host.playerDowned && host.playerPos) {
      _dir.copy(host.playerPos).sub(a.pos).setY(0);
      if (_dir.length() > 0.4) {
        _dir.normalize();
        stepToward(a, _dir, 0.9, dt, host);
      }
    }
    return;
  }
  if (host.playerDowned) {
    _dir.copy(host.playerPos).sub(a.pos).setY(0);
    const d = _dir.length();
    if (d > 0.5) {
      _dir.normalize();
      stepToward(a, _dir, a.speed, dt, host);
      a.actor.setGait(true, false);
    }
    a.actor.root.position.copy(a.pos);
    return;
  }
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
  a.dodgeCd = Math.max(0, (a.dodgeCd || 0) - dt);
  if (a.role === 'tank' && foe && dist < 3.2) {
    a.parryCd = (a.parryCd || 0) - dt;
    if ((a.parryCd || 0) <= 0) {
      a.parryCd = 2.4;
      a.parryT = PLAY.parry.window;
      a.actor.requestOneShot('parry', PLAY.parry.window);
    }
  }

  const desired = a.role === 'tank'
    ? (foe ? a.hold : 2.4)
    : a.role === 'cast'
      ? 5.4
      : a.role === 'kite'
        ? a.hold
        : a.role === 'heal'
          ? 4.6
          : a.role === 'peel'
            ? 3.4
            : 4.0;
  const toPlayer = a.pos.distanceTo(player);
  let moving = false;
  const pas = passiveFor(a.role);
  const danger = host.incomingOrigin?.();
  if (pas.cover && danger && a.role !== 'tank') {
    const spot = host.coverSpot?.(a.pos, danger);
    if (spot) {
      _dir.set(spot.x - a.pos.x, 0, spot.z - a.pos.z);
      if (_dir.lengthSq() > 0.04) {
        _dir.normalize();
        stepToward(a, _dir, a.speed * 1.25, dt, host);
        moving = true;
        a.actor.root.position.copy(a.pos);
        groundRoot(a.actor.root, a.actor.groundSampler, a.pos.x, a.pos.z);
        a.actor.setGait(true, true);
        return;
      }
    }
    const dx = a.pos.x - (danger.x || 0);
    const dz = a.pos.z - (danger.z || 0);
    if ((a.dodgeCd || 0) <= 0 && dx * dx + dz * dz < 3.4 * 3.4) {
      a.dodgeCd = 1.6;
      a.actor.requestOneShot('dodge', 0.4);
      _dir.set(dx, 0, dz);
      if (_dir.lengthSq() > 0.01) {
        _dir.normalize();
        stepToward(a, _dir, a.speed * 1.4, dt, host);
      }
    }
  }

  if (a.role === 'peel' && foe) {
    const mx = player.x * 0.62 + foe.pos.x * 0.38;
    const mz = player.z * 0.62 + foe.pos.z * 0.38;
    _dir.set(mx - a.pos.x, 0, mz - a.pos.z);
    if (_dir.lengthSq() > 0.16) {
      _dir.normalize();
      stepToward(a, _dir, a.speed, dt, host);
      moving = true;
    }
  } else if (toPlayer > 14) {
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
  groundRoot(a.actor.root, a.actor.groundSampler, a.pos.x, a.pos.z);
  a.actor.setGait(moving, toPlayer > 10, { sneak: a.classId === 'thief' && a.hidden });

  if (a.role === 'tank' && foe) {
    a.tauntCd = (a.tauntCd || 0) - dt;
    if (a.tauntCd <= 0 && a.pos.distanceTo(foe.pos) < 9) {
      a.tauntCd = 8;
      a.threat += 48;
      host.taunt?.(a, 9);
    }
  }

  if ((a.role === 'flex' || a.role === 'peel') && foe) {
    a.utilCd = (a.utilCd || 0) - dt;
    if (a.utilCd <= 0 && dist < 5) {
      a.utilCd = a.role === 'peel' ? 5 : 7;
      host.utility?.(a, foe);
    }
  }
  if (a.casting > 0) return;
  if ((a.actor.busy || 0) > 0.12) return;
  const spell = pickReadySpell(a, foe, host);
  if (!spell) return;
  a.cds[spell.id] = spell.cd;
  a.mana -= spell.mana;
  a._combo = ((a._combo || 0) + 1) % 3;
  const anim = animForSpell(a.actor.clips, spell, { comboStage: a._combo });
  const shotDur = a.actor.clips?.[anim]?.duration || 0.42;
  a.casting = Math.max(hitWindowSec(shotDur, 0.55), spell.telegraphSec || 0.18);
  a.actor.requestOneShot(anim, a.casting + 0.12);
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

function pickHeal(ready) {
  return ready.find((s) => s.heal > 0) || ready.find((s) => s.kind === 'nova' && s.element === 'holy') || null;
}

function pickReadySpell(a, foe, host) {
  const ready = a.loadout.filter((s) => (a.cds[s.id] || 0) <= 0 && a.mana >= (s.mana || 0));
  if (!ready.length) return null;
  const partyHurt = host.partyHurtRatio ? host.partyHurtRatio() : host.playerHp / host.playerHpMax;
  if (!foe) {
    if (partyHurt < 0.92) return pickHeal(ready);
    return null;
  }
  const dist = a.pos.distanceTo(foe.pos);
  if (a.role === 'tank') {
    return ready.find((s) => s.kind === 'slash' && dist <= s.range + 0.6)
      || ready.find((s) => s.kind === 'dash' && dist > 4)
      || ready.find((s) => s.kind === 'nova' && dist <= 5)
      || null;
  }
  if (a.role === 'cast') {
    if (partyHurt < 0.62) {
      const heal = pickHeal(ready);
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
      const util = pickHeal(ready) || ready.find((s) => s.kind === 'dash');
      if (util) return util;
    }
    return ready.find((s) => s.kind === 'beam' && dist <= s.range)
      || ready.find((s) => s.kind === 'projectile' && dist <= s.range)
      || ready[0];
  }
  if (a.role === 'heal') {
    if (partyHurt < 0.92) {
      return pickHeal(ready)
        || ready.find((s) => s.kind === 'nova')
        || ready.find((s) => s.kind === 'beam')
        || ready.find((s) => s.kind === 'zone')
        || ready[0];
    }
    return ready.find((s) => s.kind === 'beam' && dist <= s.range)
      || ready.find((s) => s.kind === 'projectile' && dist <= s.range)
      || null;
  }
  if (a.role === 'peel') {
    return ready.find((s) => s.kind === 'dash' && dist > 3)
      || ready.find((s) => s.kind === 'teleport')
      || ready.find((s) => s.kind === 'slash' && dist <= 3.2)
      || ready.find((s) => s.kind === 'zone')
      || ready[0];
  }
  if (partyHurt < 0.5) {
    const heal = pickHeal(ready);
    if (heal && a.pos.distanceTo(host.playerPos) <= (heal.range || 4) + 1.2) return heal;
  }
  return ready.find((s) => (s.kind === 'slash' && dist <= s.range + 0.4) || (s.kind !== 'slash' && dist <= s.range))
    || ready[0];
}
