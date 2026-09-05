/**
 * Grudge dungeon play session — linear crawl along the critical path.
 * Entrance → combat/elite rooms → boss. 6-slot pre-match loadout. Linear casts.
 */
import * as THREE from 'three';
import { CLASS_IDS, CLASSES, PLAY, PLAY_DEFAULTS, RACES, loadoutFor, spellById, weaponsForClass, WEAPON_LABEL } from '../ssot.js';
import { incomingScale, outgoingScale, passiveFor } from './passives.js';
import { coverSpotNear, lineOpen, firstObstruction, damageBarrier } from '../grid/cells.js';
import { allyRaces, makeAlly, otherClasses, tickAlly } from './party.js';
import { prefabFor, playerPrefab } from './prefabs.js';
import { planEncounters } from './encounters.js';
import { worldOf, cellOf, walkableWorld } from '../gen/cells.js';
import {
  bindScript, tickScript, gateBlocks, completionPayload, warlordsReturnUrl,
} from './scriptRuntime.js';
import { buildNavMesh } from '../gen/navmesh.js';
import { dungeonToInstance } from '../gen/instance.js';
import { attachDungeonTerrain, rebuildDungeonNav } from '../terrain/navmesh.js';
import { groundRoot } from '../terrain/footPlant.js';
import { createDungeonPhysics, stepDungeonPhysics, setPhysicsFeet, disposeDungeonPhysics, dropBarrierCollider } from './physics.js';
import { createLosField } from './los.js';
import { warmYuka, attachYuka, steerEnemy } from './yukaSteer.js';
import { pull, hearBreak, tickMobMotion, losToPlayer, applyTaunt, addThreat, THREAT } from './aggro.js';
import { makeClassState, WARRIOR_TANK, WORGE_GRIMOIRE, addGrudgeStack, grudgeDefenseMul, craftWorgeForm } from './classItems.js';
import { createLockpickSession, tickLockpickHold, attemptLockpickTumble, setLockpickPinAngle, cancelLockpick, pinInSweetZone } from './lockpick.js';
import { spawnActor } from './characters.js';
import { VfxWorld } from './vfx.js';
import { TelegraphField } from './telegraph.js';
import { instanceCatalog, preloadDungeonAssets } from './assets.js';
import { loadInteriorKits, plantDressPlan } from '../props/kitPlant.js';
import { bindHud, mountHud, renderHud, setHudSkills, showEnd, toast } from './hud.js';
import { deriveSheet, fallbackSheet, loadInfoCombat, resolveHit } from './infoCombat.js';
import { LinearCastWorld } from './linearCast.js';
import { AimTarget } from './aimTarget.js';
import { TeamLobby } from './teamLobby.js';
import { attachPlayHelpers } from '../helpers/playHelpers.js';
import { mountShrineWisps, tickWisps } from './wisp.js';

const KEYS = new Set();

function elementShader(el) {
  if (el === 'fire') return 'fire';
  if (el === 'ice' || el === 'frost' || el === 'shadow' || el === 'nature' || el === 'arcane') return 'smoke';
  return 'bolt';
}

function elementTrailKind(el) {
  return el === 'fire' ? 'fire' : 'smoke';
}

export class PlaySession {
  constructor(ctx) {
    this.ctx = ctx;
    this.active = false;
    this.group = new THREE.Group();
    this.group.name = 'grudge-play';
    this.vfx = new VfxWorld(this.group);
    this.linear = new LinearCastWorld(this.group);
    this.aiming = null;
    this.loadout = loadoutFor('worge');
    this.look = new THREE.Vector3();
    this.tele = new TelegraphField(this.group);
    this.keys = KEYS;
    this.player = null;
    this.enemies = [];
    this.aim = new THREE.Vector3(0, 0, 1);
    this.vel = new THREE.Vector3();
    this.raceId = 'human';
    this.classId = 'worge';
    this.classState = makeClassState('worge');
    this.now = 0;
    this.lockpick = null;
    this.weaponId = '1h_tome';
    this.sheet = fallbackSheet('human', 'worge');
    this.stamina = this.sheet.staminaMax;
    this.allies = [];
    this.iframes = 0;
    this.parryT = 0;
    this.dodgeCd = 0;
    this.parryCd = 0;
    this._speedPuff = null;
    this.phase = 'idle';
    this.lobby = null;
    this.weaponSet = 0;
    this.allyPick = [];
    this.script = null;
    this.characterId = null;
    this._lastPos = null;
    this._completePosted = false;
    this.healFocus = 'player';
    this.useYuka = PLAY_DEFAULTS.yuka !== false;
    this.hud = mountHud();
    bindHud(this.hud, {
      onCast: (slot) => this.castSlot(slot),
      onExit: () => this.exit(),
      onHealFocus: (who) => this.setHealFocus(who),
    });
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (!this.active) return;
      if (this.lockpick?.status === 'active') {
        if (e.code === 'ArrowLeft') { this.lockpick = setLockpickPinAngle(this.lockpick, this.lockpick.pinAngle - 0.12); e.preventDefault(); return; }
        if (e.code === 'ArrowRight') { this.lockpick = setLockpickPinAngle(this.lockpick, this.lockpick.pinAngle + 0.12); e.preventDefault(); return; }
        if (e.code === 'Space') { this.lockpick = attemptLockpickTumble(this.lockpick); e.preventDefault(); return; }
        if (e.code === 'Escape') { this.lockpick = cancelLockpick(this.lockpick); toast('Lockpick cancelled'); e.preventDefault(); return; }
      }
      if (e.shiftKey && this.classId === 'worge') {
        const form = Object.entries(WORGE_GRIMOIRE.shiftKeys).find(([, code]) => code === e.code)?.[0];
        if (form) {
          e.preventDefault();
          craftWorgeForm(this.classState, form);
          toast(`Grimoire · ${form}`);
          return;
        }
      }
      if (e.code.startsWith('Digit')) {
        const n = Number(e.code.slice(5));
        if (n >= 1 && n <= 6) {
          e.preventDefault();
          this.castSlot(n);
        }
      }
      if (e.code === PLAY.dodge.key) { e.preventDefault(); this.tryDodge(); }
      if (e.code === PLAY.parry.key) { e.preventDefault(); this.tryParry(); }
      if (e.code === 'KeyQ') { e.preventDefault(); this.swapWeaponSet(); }
      if (e.code === 'KeyI') { e.preventDefault(); document.getElementById('equip-panel')?.classList.toggle('open'); }
      if (e.code === 'KeyE' && this.phase === 'lobby') { e.preventDefault(); this.beginCrawl(); }
      if (e.code === 'KeyE' && this.phase === 'crawl' && this.classId === 'ranger') { e.preventDefault(); this.tryLockpick(); }
      if (e.code === 'Escape') this.exit();
      if (e.code === 'Tab') {
        e.preventDefault();
        const armed = this.loadout?.[this.activeSlot - 1];
        if (armed?.heal && !(armed.damage > 0)) this.cycleHealFocus();
        else this.aiming?.cycleTarget(this.enemies);
      }
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('pointermove', (e) => {
      if (!this.active) return;
      const nx = (e.clientX / innerWidth) * 2 - 1;
      const ny = -(e.clientY / innerHeight) * 2 + 1;
      this.aiming?.setPointer(nx, ny);
    });
  }

  worldOf(d, x, y) {
    return worldOf(d, x, y);
  }

  cellOf(d, wx, wz) {
    return cellOf(d, wx, wz);
  }

  walkable(d, wx, wz, radius = 0.32) {
    return walkableWorld(d, wx, wz, radius);
  }

  applyPlayerFeet() {
    setPhysicsFeet(this.phys, this.pos.x, this.pos.z);
  }

  critPath(d) {
    const rooms = d.rooms;
    const boss = rooms[d.boss];
    const entrance = rooms[d.entrance];
    const byId = new Map(rooms.map((r) => [r.id, r]));
    // Reconstruct critical path from room depths + adjacency via edges
    const adj = new Map();
    for (const e of d.edges) {
      if (!adj.has(e.a)) adj.set(e.a, []);
      if (!adj.has(e.b)) adj.set(e.b, []);
      adj.get(e.a).push(e.b);
      adj.get(e.b).push(e.a);
    }
    const path = [];
    let cur = d.boss;
    const seen = new Set();
    while (cur != null && !seen.has(cur)) {
      seen.add(cur);
      path.push(rooms[cur]);
      if (cur === d.entrance) break;
      const nbrs = adj.get(cur) || [];
      let best = null, bestD = Infinity;
      for (const n of nbrs) {
        if (seen.has(n)) continue;
        const r = rooms[n];
        if (r.depth < rooms[cur].depth && r.depth < bestD) {
          bestD = r.depth;
          best = n;
        }
      }
      if (best == null) break;
      cur = best;
    }
    path.reverse();
    if (!path.length) path.push(entrance, boss);
    return path.filter(Boolean);
  }

  async enter({ dungeon, raceId = 'human', classId = 'worge', weaponId = '1h_tome', linear = true, allyClasses = null, characterId = null }) {
    if (!dungeon?.valid) {
      toast('Forge a connected dungeon first');
      return;
    }
    this.exit(true);
    this.active = true;
    this.d = dungeon;
    this.raceId = RACES[raceId] ? raceId : 'human';
    this.classId = CLASS_IDS.includes(classId) ? classId : 'worge';
    this.classState = makeClassState(this.classId);
    this.lockpick = null;
    this.now = 0;
    const sets = weaponsForClass(this.classId);
    this.weaponSet = Math.max(0, sets.indexOf(weaponId));
    if (this.weaponSet < 0) this.weaponSet = 0;
    this.weaponId = sets[this.weaponSet] || sets[0];
    this.loadout = loadoutFor(this.classId, this.weaponId);
    this.allyPick = (allyClasses && allyClasses.length === 3)
      ? allyClasses.map((id) => (CLASS_IDS.includes(id) ? id : 'warrior'))
      : otherClasses(this.classId);
    setHudSkills(this.hud, this.loadout);
    this.linearCrawl = linear;
    this.characterId = characterId || (typeof location !== 'undefined'
      ? new URLSearchParams(location.search).get('characterId')
      : null);
    this.ctx.scene.add(this.group);
    this.hud.hidden = false;
    document.body.classList.add('playing');
    document.getElementById('ph-end')?.setAttribute('hidden', '');
    try {
    await preloadDungeonAssets();

    const start = this.worldOf(dungeon, dungeon.rooms[dungeon.entrance].cx, dungeon.rooms[dungeon.entrance].cy);
    this.pos = new THREE.Vector3(start.x, 0, start.z);
    this.vel.set(0, 0, 0);
    try {
      this.sheet = deriveSheet(await loadInfoCombat(), this.raceId, this.classId, PLAY.level);
    } catch (err) {
      console.warn('[grudge-dungeon] info.* combat miss', err);
      this.sheet = fallbackSheet(this.raceId, this.classId);
    }
    this.hp = this.sheet.hpMax;
    this.mana = this.sheet.manaMax;
    this.stamina = this.sheet.staminaMax;
    this.cds = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    this.casting = 0;
    this.castMax = 0.35;
    this.activeSlot = 1;
    this.ended = null;
    this.hitstop = 0;
    this.timeScale = 1;
    this.path = this.critPath(dungeon);
    this.pathI = 0;
    this.nav = buildNavMesh(dungeon);
    attachDungeonTerrain(dungeon);
    this.sampler = dungeon.terrain?.sample || null;
    this.instance = dungeonToInstance(dungeon, { linear: this.linearCrawl, maxPlayers: 8, catalog: instanceCatalog(dungeon) });
    bindScript(this, dungeon, { linear: this.linearCrawl, playerRace: this.raceId });
    await loadInteriorKits();
    await plantDressPlan(this.instance.dress, this.group);
    this.aiming = new AimTarget(this.group, this.ctx.cam);
    this.phys = await createDungeonPhysics(dungeon);
    await warmYuka();
    this.los = createLosField(dungeon);
    const prevBreak = dungeon.onBarrierDamaged;
    dungeon.onBarrierDamaged = (i, gx, gz, stage, gone) => {
      prevBreak?.(i, gx, gz, stage, gone);
      if (!gone) return;
      dropBarrierCollider(this.phys, i);
      this.nav = buildNavMesh(this.d);
      rebuildDungeonNav(this.d);
      this.sampler = this.d.terrain?.sample || this.sampler;
      hearBreak(this, gx, gz);
    };

    this.player = await spawnActor({ prefab: playerPrefab(this.raceId, this.classId, this.weaponId), equipped: true });
    this.player.bindTerrain(this.sampler);
    this.player.root.position.copy(this.pos);
    groundRoot(this.player.root, this.sampler, this.pos.x, this.pos.z);
    this.group.add(this.player.root);
    attachPlayHelpers(this.player.root, { height: PLAY.playerHeight });

    const fill = this.allyPick.length ? this.allyPick : otherClasses(this.classId);
    const races = allyRaces(this.raceId);
    this.allies = await Promise.all(fill.map(async (cid, i) => {
      const w0 = weaponsForClass(cid)[0];
      const actor = await spawnActor({ prefab: playerPrefab(races[i % races.length], cid, w0), equipped: true });
      const ang = (-0.7 + i * 0.7);
      const pos = this.pos.clone().add(new THREE.Vector3(Math.sin(ang) * 1.8, 0, Math.cos(ang) * 1.8));
      const a = makeAlly(actor, { classId: cid, raceId: races[i % races.length], pos });
      actor.bindTerrain(this.sampler);
      actor.root.position.copy(a.pos);
      groundRoot(actor.root, this.sampler, a.pos.x, a.pos.z);
      this.group.add(actor.root);
      return a;
    }));

    this.lobby = new TeamLobby(this.group);
    await this.lobby.mount(this.pos);
    this._placePartyOnPads();
    this.phase = 'lobby';
    const pose = this.lobby.cameraPose();
    this.ctx.cam.zoom = 1.15;
    this.ctx.cam.updateProjectionMatrix();
    this._aimLobbyCam(pose);
    toast(`Lv ${this.sheet.level || PLAY.level} lobby · pick allies · E descend`);
    document.body.classList.add('lobbying');
    } catch (err) {
      console.warn('[grudge-dungeon] enter failed', err);
      this.exit(true);
      toast('Could not enter — reforge and try again');
    }
  }

  exit(silent = false) {
    this.active = false;
    document.body.classList.remove('playing');
    this.hud.hidden = true;
    this.vfx.clear();
    this.linear?.clear();
    this.aiming?.dispose();
    this.aiming = null;
    this.tele?.clear();
    this.los = null;
    document.body.classList.remove('lobbying');
    this.lobby?.dispose();
    this.lobby = null;
    this.phase = 'idle';
    this.script = null;
    this._completePosted = false;
    disposeDungeonPhysics(this.phys);
    this.phys = null;
    this.nav = null;
    this.instance = null;
    this.player?.dispose();
    for (const a of this.allies) a.actor.dispose();
    this.allies = [];
    for (const e of this.enemies) e.actor.dispose();
    this.enemies = [];
    this.player = null;
    this.ctx.scene.remove(this.group);
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.ctx.cam.zoom = 1;
    this.ctx.cam.updateProjectionMatrix();
    if (!silent) this.ctx.onExitPlay?.();
  }

  facing() {
    const { yaw } = this.ctx;
    // Camera-relative forward
    let fx = 0, fz = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) { fx += Math.sin(yaw); fz += Math.cos(yaw); }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) { fx -= Math.sin(yaw); fz -= Math.cos(yaw); }
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) { fx -= Math.cos(yaw); fz += Math.sin(yaw); }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) { fx += Math.cos(yaw); fz -= Math.sin(yaw); }
    const moving = fx * fx + fz * fz > 0.01;
    if (this.aiming && (this.aiming.hasPointer || this.aiming.target)) {
      this.aim.copy(this.aiming.dir);
    } else if (moving) {
      this.aim.set(fx, 0, fz).normalize();
    }
    return { fx, fz, moving };
  }

  tryMove(dt) {
    const { fx, fz, moving } = this.facing();
    const wantSprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const sprint = wantSprint && this.stamina > 2;
    if (sprint) this.stamina = Math.max(0, this.stamina - PLAY.sprintStamina * dt);
    const speed = sprint ? PLAY.runSpeed : PLAY.walkSpeed;
    const target = new THREE.Vector3(fx, 0, fz);
    if (moving) target.normalize().multiplyScalar(speed);
    this.vel.x += (target.x - this.vel.x) * Math.min(1, PLAY.accel * dt);
    this.vel.z += (target.z - this.vel.z) * Math.min(1, PLAY.accel * dt);
    this._air = false;
    if (!this._lastPos) this._lastPos = this.pos.clone();
    if (this.phys) {
      const jump = this.keys.has('Space');
      const stepped = stepDungeonPhysics(this.phys, this.vel.x, this.vel.z, dt, jump);
      if (stepped) {
        if (gateBlocks(this, stepped.x, stepped.z)) {
          this.pos.copy(this._lastPos);
          this.vel.set(0, 0, 0);
          setPhysicsFeet(this.phys, this.pos.x, this.pos.z);
        } else {
          this.pos.x = stepped.x;
          this.pos.z = stepped.z;
          if (this.d?.eventRoom) this.pos.y = stepped.y;
          this._air = this.d?.eventRoom && !stepped.grounded;
        }
      }
    } else {
      const nx = this.pos.x + this.vel.x * dt;
      const nz = this.pos.z + this.vel.z * dt;
      if (this.walkable(this.d, nx, this.pos.z) && !gateBlocks(this, nx, this.pos.z)) this.pos.x = nx;
      else this.vel.x = 0;
      if (this.walkable(this.d, this.pos.x, nz) && !gateBlocks(this, this.pos.x, nz)) this.pos.z = nz;
      else this.vel.z = 0;
    }
    this._lastPos.copy(this.pos);
    if (this.player) {
      this.player.root.position.copy(this.pos);
      if (!this._air) groundRoot(this.player.root, this.sampler, this.pos.x, this.pos.z);
      if (this.aim.lengthSq() > 0) {
        const yaw = Math.atan2(this.aim.x, this.aim.z);
        this.player.root.rotation.y = yaw;
      }
      this.player.setGait(moving, sprint);
      this.player.update(dt);
      if (sprint && moving) {
        if (!this._speedPuff || this._speedPuff.life <= 0) {
          this._speedPuff = this.vfx.speedTrail({
            mesh: this.player.root,
            color: 0xc5d0e0,
            life: 6,
            opacity: 0.28,
            kind: 'smoke',
          });
        } else {
          this._speedPuff.life = Math.max(this._speedPuff.life, 0.45);
        }
      } else if (this._speedPuff && !sprint) {
        this._speedPuff.life = Math.min(this._speedPuff.life, 0.18);
        this._speedPuff = null;
      }
    }
    this.tickAllies(dt);
  }

  tickAllies(dt) {
    if (!this.allies?.length) return;
    const host = {
      playerPos: this.pos,
      playerHp: this.hp,
      playerHpMax: this.sheet?.hpMax || PLAY.hp,
      walkable: (x, z) => this.walkable(this.d, x, z),
      lineOpen: (a, b) => lineOpen(this.d, a.x, a.z, b.x, b.z),
      coverSpot: (pos, origin) => coverSpotNear(this.d, pos.x, pos.z, origin.x, origin.z),
      incomingOrigin: () => {
        const tel = this.tele?.items?.[0];
        if (!tel) return null;
        if (tel.shape === 'aoe' || tel.shape === 'line') return tel.origin;
        return null;
      },
      nearestFoe: (pos, range) => {
        let best = null, d0 = range;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const d = pos.distanceTo(e.pos);
          if (d < d0) { d0 = d; best = e; }
        }
        return best;
      },
      castFrom: (a, spell, foe) => {
        if (spell.heal) {
          this.applyPartyHeal(spell.heal, a.pos, {
            range: spell.range,
            color: spell.color,
            name: spell.name,
            from: CLASSES[a.classId]?.label || a.classId,
          });
        }
        if (!(spell.damage > 0)) return;
        const dealt = Math.round(spell.damage * outgoingScale(a.role));
        if (spell.kind === 'slash') this.hitRadius(a.pos, spell.range + 0.5, dealt);
        else if (spell.kind === 'nova' || spell.kind === 'zone') this.hitRadius(a.pos, spell.range, dealt);
        else if (foe) this.hurt(foe, dealt);
        if (foe) this.vfx.impact({ origin: foe.pos.clone().setY(1.1), color: spell.color || 0xe8e0c8 });
      },
      taunt: (ally, range) => {
        toast(`${CLASSES[ally.classId]?.label || ally.classId} taunts · ${passiveFor(ally.role).label}`);
        const key = ally.threatKey || ally.classId;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (e.pos.distanceTo(ally.pos) <= range) applyTaunt(e, key, this.now || 0);
        }
      },
      utility: (ally) => toast(`${CLASSES[ally.classId]?.label || 'Worge'} utility`),
      takeSupport: (ally, ev) => {
        if (ev?.kind !== 'heal') return;
        const amt = ev.amount || 16;
        this.hp = Math.min(this.sheet?.hpMax || PLAY.hp, this.hp + amt);
        for (const b of this.allies) {
          if (!b.alive) continue;
          b.hp = Math.min(b.hpMax, b.hp + Math.round(amt * 0.7));
        }
        const mistAt = (ally.pos || this.pos).clone();
        mistAt.y = 0.85;
        this.vfx.mist({ origin: mistAt, color: 0xc8f0a8, radius: 2.1, life: 2.2 });
        toast(`${CLASSES[ally.classId]?.label || ally.classId} heals`);
      },
      partyHurtRatio: () => {
        const hp = this.hp + this.allies.reduce((s, a) => s + (a.alive ? a.hp : 0), 0);
        const max = (this.sheet?.hpMax || PLAY.hp) + this.allies.reduce((s, a) => s + a.hpMax, 0);
        return max ? hp / max : 1;
      },
    };
    for (const a of this.allies) tickAlly(a, dt, host);
  }

  tryDodge() {
    if (!this.active || this.ended || this.dodgeCd > 0 || this.phase === 'lobby') return;
    const spec = PLAY.dodge;
    const cost = spec.stam;
    if ((this.stamina || 0) < cost * 0.35) { toast('Winded'); return; }
    this.stamina = Math.max(0, (this.stamina || 0) - cost);
    this.dodgeCd = spec.cd;
    this.iframes = spec.iframeEnd;
    const dodgeDir = this.aim.lengthSq() ? this.aim.clone().normalize() : new THREE.Vector3(0, 0, 1);
    const from = this.pos.clone().setY(0.95);
    this.dashAlong(dodgeDir, spec.maxDistance * 0.7);
    this.vfx.speedTrail({
      from,
      to: this.pos.clone().setY(0.95),
      mesh: this.player?.root,
      color: 0xc5d0e0,
      life: 0.42,
      kind: 'smoke',
    });
    this.player?.requestOneShot?.('dodge', spec.duration);
    toast('Dodge');
  }

  tryParry() {
    if (!this.active || this.ended || this.parryCd > 0) return;
    const cost = PLAY.parry.stam;
    if ((this.stamina || 0) < cost * 0.35) return;
    this.stamina = Math.max(0, (this.stamina || 0) - cost);
    this.parryCd = PLAY.parry.cd;
    this.parryT = PLAY.parry.window;
    this.player?.requestOneShot?.('attack', 0.24);
    toast('Parry');
  }

  takeDamage(incoming, attacker, kind = 'hit') {
    if (this.iframes > 0) { toast('Dodged'); return 0; }
    const melee = kind === 'cone' || kind === 'slash' || kind === 'swipe';
    if (this.parryT > 0 && melee) {
      this.parryT = 0;
      addGrudgeStack(this.classState);
      toast('Parry');
      return 0;
    }
    const tank = this.classId === 'warrior' && this.classState;
    if (tank && WARRIOR_TANK.autoParry && melee && (this.classState.autoParryCd || 0) <= 0) {
      const form = WARRIOR_TANK.forms[this.classState.form] || WARRIOR_TANK.forms.form_bulwark;
      if (Math.random() < 0.28 + (form.blockChance || 0)) {
        this.classState.autoParryCd = 1.6;
        addGrudgeStack(this.classState);
        toast('Auto-parry');
        return 0;
      }
    }
    let dmg0 = resolveHit(incoming, attacker, this.sheet);
    if (tank && this.weaponId === 'sword_shield') {
      const from = attacker?.pos;
      const facing = from
        ? this.aim.clone().setY(0).normalize().dot(from.clone().sub(this.pos).setY(0).normalize())
        : 1;
      if (facing >= WARRIOR_TANK.block.facingDot && (this.stamina || 0) >= WARRIOR_TANK.block.stamina * 0.35) {
        this.stamina = Math.max(0, this.stamina - WARRIOR_TANK.block.stamina);
        dmg0 *= (1 - WARRIOR_TANK.block.factor);
        addGrudgeStack(this.classState);
        const hpMax = this.sheet?.hpMax || PLAY.hp;
        if (this.hp / hpMax < WARRIOR_TANK.lastStand.hpFrac) dmg0 *= (1 - WARRIOR_TANK.lastStand.blockBonus);
        toast('Block');
      }
    }
    dmg0 /= grudgeDefenseMul(this.classState);
    const moving = this.vel && this.vel.lengthSq() > 1;
    const dmg = Math.max(1, Math.round(dmg0 * incomingScale(CLASSES[this.classId]?.role, moving)));
    this.hp -= dmg;
    return dmg;
  }

  tryLockpick() {
    if (this.lockpick?.status === 'active') return;
    const room = this.d?.rooms?.[this.d.entrance];
    const treasure = (this.d?.rooms || []).find((r) => r.type === 'treasure' || r.type === 'secret');
    const here = treasure || room;
    this.lockpick = createLockpickSession({
      targetId: `dungeon_chest:${this.d?.seed || 0}:${here?.id ?? 0}`,
      kind: 'dungeon_chest',
      difficulty: 28,
      label: here?.type === 'treasure' ? 'Treasure latch' : 'Dungeon latch',
      seed: (this.d?.seed || 1) + (here?.id || 0),
    });
    toast("Ranger's Log · lockpick ← →  Space");
  }

  _aimLobbyCam(pose) {
    this.look.copy(pose.at);
    this.ctx.camTarget.copy(pose.at);
    const d = pose.from.clone().sub(pose.at);
    const yaw = Math.atan2(d.x, d.z);
    const pitch = Math.atan2(d.y, Math.max(0.01, Math.hypot(d.x, d.z)));
    this.ctx.setView?.(yaw, THREE.MathUtils.clamp(pitch, 0.18, 1.15));
    this.ctx.updateCam();
  }

  _placePartyOnPads() {
    if (!this.lobby) return;
    const p0 = this.lobby.worldPad(0);
    this.pos.copy(p0);
    if (this.player) {
      this.player.root.position.copy(p0);
      groundRoot(this.player.root, this.sampler, p0.x, p0.z);
    }
    setPhysicsFeet(this.phys, p0.x, p0.z);
    for (let i = 0; i < this.allies.length; i++) {
      const a = this.allies[i];
      const w = this.lobby.worldPad(i + 1);
      a.pos.copy(w);
      a.actor.root.position.copy(w);
      groundRoot(a.actor.root, this.sampler, w.x, w.z);
    }
  }

  async setAllyClass(index, classId) {
    if (!this.active || this.phase !== 'lobby') return;
    if (!CLASS_IDS.includes(classId)) return;
    const a = this.allies[index];
    if (!a) return;
    this.allyPick[index] = classId;
    const races = allyRaces(this.raceId);
    const raceId = races[index % races.length];
    const w0 = weaponsForClass(classId)[0];
    const pos = a.pos.clone();
    a.actor.dispose();
    this.group.remove(a.actor.root);
    const actor = await spawnActor({ prefab: playerPrefab(raceId, classId, w0), equipped: true });
    const next = makeAlly(actor, { classId, raceId, pos });
    actor.bindTerrain(this.sampler);
    actor.root.position.copy(pos);
    groundRoot(actor.root, this.sampler, pos.x, pos.z);
    this.group.add(actor.root);
    this.allies[index] = next;
    toast(`Ally ${index + 1} → ${CLASSES[classId].label}`);
  }

  swapWeaponSet() {
    if (!this.active) return;
    const sets = weaponsForClass(this.classId);
    if (sets.length < 2) return;
    this.weaponSet = (this.weaponSet + 1) % sets.length;
    this.weaponId = sets[this.weaponSet];
    this.loadout = loadoutFor(this.classId, this.weaponId);
    setHudSkills(this.hud, this.loadout);
    const named = this.loadout[0]?.weaponName;
    toast(`${named || WEAPON_LABEL[this.weaponId] || this.weaponId} · Q swap`);
  }

  async beginCrawl() {
    if (!this.active || this.phase !== 'lobby') return;
    this.phase = 'crawl';
    document.body.classList.remove('lobbying');
    const start = this.worldOf(this.d, this.d.rooms[this.d.entrance].cx, this.d.rooms[this.d.entrance].cy);
    this.pos.set(start.x, 0, start.z);
    if (this.player) {
      this.player.root.position.copy(this.pos);
      groundRoot(this.player.root, this.sampler, this.pos.x, this.pos.z);
    }
    setPhysicsFeet(this.phys, this.pos.x, this.pos.z);
    for (let i = 0; i < this.allies.length; i++) {
      const a = this.allies[i];
      const ang = (-0.7 + i * 0.7);
      a.pos.copy(this.pos).add(new THREE.Vector3(Math.sin(ang) * 1.8, 0, Math.cos(ang) * 1.8));
      a.actor.root.position.copy(a.pos);
      groundRoot(a.actor.root, this.sampler, a.pos.x, a.pos.z);
    }
    this.lobby?.dispose();
    this.lobby = null;
    await this._spawnFoes();
    mountShrineWisps(this);
    this.ctx.cam.zoom = 1.55;
    this.ctx.cam.updateProjectionMatrix();
    this.ctx.camTarget.copy(this.pos);
    this.ctx.updateCam();
    toast(`${this.sheet.className} Lv${this.sheet.level || PLAY.level} · ${this.d.params.themeKey} · 1–6 · Q weapons`);
  }

  async _spawnFoes() {
    const dungeon = this.d;
    const theme = dungeon.params.themeKey;
    const { plan } = planEncounters(dungeon, {
      linear: this.linearCrawl,
      kind: dungeon.params?.kind || 'biome',
      playerRace: this.raceId,
    });
    const jobs = [];
    const byRoom = new Map();
    for (const j of plan) {
      const r = j.room;
      const i = byRoom.get(r.id) || 0;
      byRoom.set(r.id, i + 1);
      const ox = (i - 0.5) * 1.6;
      let w = this.worldOf(dungeon, r.cx + ox / 2, r.cy);
      const plats = (dungeon.platforms || []).filter((p) => p.roomId === r.id && p.role === 'platform');
      if (r.type === 'event' && plats[i]) w = { x: plats[i].x, z: plats[i].z };
      const brain = j.brain === 'kite' ? 'ranger'
        : j.brain === 'pursue' ? 'melee'
        : j.kind === 'boss' ? 'warlord'
        : (j.brain || (j.role === 'mage' || j.kind === 'caster' ? 'mage' : 'melee'));
      const prefab = j.meshUrl
        ? {
          id: j.id,
          label: j.name,
          mesh: j.meshUrl,
          clips: j.clips,
          hide: j.hide,
          keep: j.keep,
          yaw: j.yaw,
          height: j.height,
          hp: j.hp,
          speed: j.speed,
          radius: j.radius,
          role: j.role,
          brain,
          raceId: j.raceId,
          equipped: false,
        }
        : (j.raceId
          ? {
            id: j.id,
            label: j.name,
            raceId: j.raceId,
            role: j.role || 'warrior',
            brain,
            height: j.height,
            hp: j.hp,
            speed: j.speed,
            radius: j.radius,
            equipped: true,
          }
          : prefabFor(theme, r.type === 'boss' ? 'boss' : r.type === 'elite' ? 'elite' : 'combat', r.id * 5 + i));
      jobs.push({ r, w, prefab: { ...prefab, brain, hp: j.hp || prefab.hp, label: j.name || prefab.label, yaw: j.yaw || prefab.yaw } });
    }
    const spawned = await Promise.all(jobs.map((j) => spawnActor({
      prefab: j.prefab,
      equipped: true,
    }).then((actor) => ({ actor, j }))));
    for (const { actor, j } of spawned) {
      const r = j.r;
      const p = j.prefab;
      const e = {
        actor,
        prefab: p,
        pos: new THREE.Vector3(j.w.x, 0, j.w.z),
        spawn: new THREE.Vector3(j.w.x, 0, j.w.z),
        hp: p.hp,
        hpMax: p.hp,
        radius: p.radius,
        speed: p.speed,
        alive: true,
        room: r,
        aggro: 0,
        hitCd: 0,
        cycleI: 0,
        windup: 0,
        wind: 0,
        windMax: 0,
        windKind: null,
        intent: null,
        boss: r.type === 'boss' || p.brain === 'warlord',
        kind: p.brain === 'mage' || p.role === 'mage' ? 'caster' : r.type === 'boss' ? 'boss' : 'grunt',
        asleep: r.type !== 'entrance' && r.id !== dungeon.entrance,
      };
      attachYuka(e);
      actor.bindTerrain(this.sampler);
      actor.root.position.copy(e.pos);
      groundRoot(actor.root, this.sampler, e.pos.x, e.pos.z);
      actor.root.userData.selectable = 'hostile';
      this.group.add(actor.root);
      this.enemies.push(e);
    }
  }

  dashAlong(dir, range) {
    const dest = this.pos.clone().addScaledVector(dir, range);
    if (this.walkable(this.d, dest.x, dest.z)) this.pos.copy(dest);
    else {
      for (let t = 0.85; t > 0.2; t -= 0.15) {
        const p = this.pos.clone().addScaledVector(dir, range * t);
        if (this.walkable(this.d, p.x, p.z)) { this.pos.copy(p); break; }
      }
    }
    setPhysicsFeet(this.phys, this.pos.x, this.pos.z);
  }

  castSlot(n) {
    if (!this.active || this.ended || this.casting > 0 || this.phase === 'lobby') return;
    const spell = (this.loadout || [])[n - 1];
    if (!spell) return;
    if ((this.cds[n] || 0) > 0) return;
    const stamCost = spell.stamina || 0;
    if (this.mana < (spell.mana || 0)) {
      toast('Not enough mana');
      return;
    }
    if (this.stamina < stamCost) {
      toast('Not enough stamina');
      return;
    }
    this.activeSlot = n;
    this.mana -= spell.mana || 0;
    this.stamina -= stamCost;
    this.cds[n] = spell.cd;
    const origin = this.pos.clone();
    origin.y = 1.15;
    const dir = this.aim.clone().normalize();
    this.aiming?.setRanges(1.1, spell.range, spell.kind === 'zone' || spell.kind === 'nova' ? 'zone' : 'line');
    this.player?.requestOneShot(spell.anim || (spell.kind === 'slash' || spell.kind === 'dash' ? 'attack' : 'cast'), 0.42);
    this.vfx.aura({ origin: this.pos.clone(), color: spell.color, life: 0.28 });
    const tel = spell.telegraphSec || 0.15;
    this.casting = Math.max(0.16, tel);
    this.castMax = this.casting;
    if (spell.kind === 'slash') {
      this.vfx.cone({ origin: this.pos, dir, color: spell.color, range: spell.range, half: 0.85, life: tel });
    } else if (spell.kind === 'nova' || spell.kind === 'zone') {
      this.linear.zone({ origin: this.pos, color: spell.color, radius: spell.range, life: tel });
    } else {
      this.vfx.linear({ origin: this.pos, dir, color: spell.color, range: Math.min(spell.range, 10), width: 0.55, life: tel });
    }

    const foeSheet = { defense: 18, block: 0.04, blockEffect: 0.25 };
    const roll = (base) => resolveHit(base, this.sheet, foeSheet);
    if (spell.taunt) {
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (e.pos.distanceTo(this.pos) <= (spell.range || 8)) applyTaunt(e, 'player', this.now || 0);
      }
      toast('Iron Fortress · aggro');
    }
    if (spell.parry) {
      this.parryT = Math.max(this.parryT || 0, PLAY.parry.window);
      addGrudgeStack(this.classState);
    }
    if (spell.heal) {
      this.applyPartyHeal(spell.heal, this.pos, {
        range: spell.range,
        color: spell.color,
        name: spell.name,
        from: this.sheet?.className || this.classId,
      });
    }
    const onHit = (e) => {
      this.hurt(e, roll(spell.damage));
      if (spell.poison || (this.classId === 'ranger' && this.classState?.poisonCoat && Math.random() < 0.18)) {
        e.poisonT = Math.max(e.poisonT || 0, 4);
        this.vfx.mist({ origin: e.pos.clone().setY(1.1), color: 0x53e93f, radius: 0.9, life: 0.8 });
      }
      const p = e.pos.clone().setY(1.1);
      if (spell.element === 'fire') this.vfx.fire({ origin: p, color: spell.color, duration: 'small' });
      else if (spell.element === 'holy' || spell.element === 'nature') this.vfx.mist({ origin: p, color: spell.color, radius: 1.15, life: 0.9 });
      else this.vfx.smoke({ origin: p, color: spell.color, life: 0.65 });
    };

    if (spell.kind === 'slash') {
      this.vfx.slash({ origin, dir, color: spell.color, range: spell.range });
      this.smashBarriersAlong(dir, spell.range);
      this.hitCone(dir, spell.range, 0.85, roll(spell.damage));
    } else if (spell.kind === 'projectile') {
      const bolt = this.linear.line({
        origin, dir, color: spell.color, range: spell.range,
        speed: spell.speed || 20, forks: !!spell.forks, onHit,
        meshPath: spell.meshPath || null,
        shader: elementShader(spell.element),
      });
      const travel = spell.range / (spell.speed || 20);
      this.vfx.speedTrail({
        mesh: bolt.root,
        color: spell.color,
        life: travel + 0.12,
        kind: elementTrailKind(spell.element),
      });
      this.smashBarriersAlong(dir, spell.range);
    } else if (spell.kind === 'beam') {
      const bolt = this.linear.line({
        origin, dir, color: spell.color, range: spell.range,
        speed: 38, width: 0.22, forks: spell.forks || spell.linear === 'thunder', onHit,
        meshPath: spell.meshPath || null,
        shader: elementShader(spell.element),
      });
      this.vfx.speedTrail({
        mesh: bolt.root,
        color: spell.color,
        life: spell.range / 38 + 0.1,
        kind: elementTrailKind(spell.element),
      });
      this.smashBarriersAlong(dir, spell.range);
      this.hitLine(dir, spell.range, 0.55, roll(spell.damage));
      this.punch(70, 0.35);
    } else if (spell.kind === 'fissure') {
      this.linear.fissure({ origin: this.pos, dir, color: spell.color, range: spell.range, onHit, meshPath: spell.meshPath || null });
      this.vfx.fire({ origin: this.pos.clone().setY(0.7), color: spell.color, duration: 'long', life: 1.4 });
      this.smashBarriersAlong(dir, spell.range);
      this.hitLine(dir, spell.range, 0.85, roll(spell.damage));
      this.punch(80, 0.45);
    } else if (spell.kind === 'nova' || spell.kind === 'zone') {
      this.linear.zone({ origin: this.pos, color: spell.color, radius: spell.range, life: 0.7 });
      const cloudAt = this.pos.clone().setY(0.75);
      if (spell.element === 'holy' || spell.element === 'nature') {
        this.vfx.mist({ origin: cloudAt, color: spell.color, radius: spell.range, life: 2.2 });
      } else {
        this.vfx.cloud({ origin: cloudAt, color: spell.color, radius: spell.range, life: 2.8 });
      }
      this.hitRadius(this.pos, spell.range, roll(spell.damage));
      this.punch(80, 0.4);
    } else if (spell.kind === 'dash' || spell.kind === 'teleport') {
      const from = this.pos.clone().setY(0.95);
      this.dashAlong(dir, spell.range);
      this.vfx.speedTrail({
        from,
        to: this.pos.clone().setY(0.95),
        mesh: this.player?.root,
        color: spell.color,
        life: 0.55,
        kind: elementTrailKind(spell.element),
      });
      this.vfx.impact({ origin: this.pos.clone().setY(1), color: spell.color });
      this.hitRadius(this.pos, spell.kind === 'teleport' ? 2.1 : 1.6, roll(spell.damage));
      this.vfx.shake.add(0.25);
    }
  }

  smashBarriersAlong(dir, range) {
    if (!this.d) return;
    const hit = firstObstruction(
      this.d,
      this.pos.x,
      this.pos.z,
      this.pos.x + dir.x * range,
      this.pos.z + dir.z * range
    );
    if (hit?.kind !== 'barrier') return;
    damageBarrier(this.d, hit.gx, hit.gz);
  }

  punch(ms, trauma) {
    this.hitstop = Math.max(this.hitstop, ms / 1000);
    this.timeScale = 0.05;
    this.vfx.shake.add(trauma);
  }

  setHealFocus(who) {
    this.healFocus = who || 'player';
    const lab = this.healFocus === 'player'
      ? (this.sheet?.className || 'you')
      : (CLASSES[this.allies[Number(this.healFocus)]?.classId]?.label || 'ally');
    toast(`Heal focus · ${lab}`);
  }

  cycleHealFocus() {
    const n = this.allies.length;
    if (this.healFocus === 'player') {
      const next = this.allies.findIndex((a) => a.alive);
      this.setHealFocus(next >= 0 ? String(next) : 'player');
      return;
    }
    let i = Number(this.healFocus) + 1;
    while (i < n && !this.allies[i]?.alive) i += 1;
    this.setHealFocus(i < n ? String(i) : 'player');
  }

  applyPartyHeal(amount, origin, { range = 4.2, color = 0xc8f0a8, name = 'Heal', from = '' } = {}) {
    if (!(amount > 0)) return;
    const reach = range || 4.2;
    const inRange = (pos) => !origin || pos.distanceTo(origin) <= reach + 1.2;
    const focusAlly = this.healFocus !== 'player' ? this.allies[Number(this.healFocus)] : null;
    const healOne = (unit, hp, hpMax, full) => {
      const amt = full ? amount : Math.round(amount * 0.7);
      return Math.min(hpMax, hp + amt);
    };
    if (inRange(this.pos)) {
      const full = this.healFocus === 'player' || !focusAlly?.alive;
      this.hp = healOne(this, this.hp, this.sheet?.hpMax || PLAY.hp, full);
    }
    for (let i = 0; i < this.allies.length; i++) {
      const b = this.allies[i];
      if (!b.alive || !inRange(b.pos)) continue;
      const full = focusAlly === b;
      b.hp = healOne(b, b.hp, b.hpMax, full || this.healFocus === 'player');
    }
    const mistAt = (origin || this.pos).clone();
    mistAt.y = 0.85;
    this.vfx.mist({ origin: mistAt, color: color || 0xc8f0a8, radius: Math.min(reach, 4.4), life: 2.2 });
    if (from) toast(`${from} · ${name}`);
  }

  hurt(e, dmg) {
    if (!e.alive) return;
    e.hp -= dmg;
    const tankMul = this.classId === 'warrior' ? THREAT.tankMul : 1;
    addThreat(e, 'player', dmg * THREAT.damageMul * tankMul);
    pull(this, e, 8);
    e.actor.requestOneShot('attack', 0.2);
    this.vfx.shake.add(0.22);
    if (e.hp <= 0) {
      e.alive = false;
      e.actor.alive = false;
      e.actor.play('death', 0.08, false);
      this.punch(e.boss ? 90 : 40, e.boss ? 0.7 : 0.3);
      toast(e.boss ? `${e.prefab?.label || 'The warlord'} falls` : `${e.prefab?.label || 'Foe'} down`);
    }
  }

  hitRadius(pos, r, dmg) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.pos.distanceTo(pos) <= r + e.radius) this.hurt(e, dmg);
    }
  }

  hitLine(dir, range, width, dmg) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const to = e.pos.clone().sub(this.pos);
      const along = to.dot(dir);
      if (along < 0 || along > range) continue;
      const closest = this.pos.clone().addScaledVector(dir, along);
      if (closest.distanceTo(e.pos) <= width + e.radius) this.hurt(e, dmg);
    }
  }

  hitCone(dir, range, half, dmg) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const to = e.pos.clone().sub(this.pos);
      const dist = to.length();
      if (dist > range + e.radius) continue;
      to.normalize();
      if (to.dot(dir) >= Math.cos(half)) this.hurt(e, dmg);
    }
  }

  tickEnemies(dt) {
    for (const e of this.enemies) {
      e.actor.update(dt);
      if (!e.alive) continue;
      if (e.asleep) {
        e.actor.setGait(false, false);
        continue;
      }
      const dist = e.pos.distanceTo(this.pos);
      const see = losToPlayer(this, e);
      e.hitCd = Math.max(0, e.hitCd - dt);
      const dir = this.pos.clone().sub(e.pos).setY(0);
      if (dir.lengthSq() > 1e-6) dir.normalize();

      if (e.wind > 0) {
        e.wind -= dt;
        e.actor.setGait(false, false);
        if (see) e.actor.root.rotation.y = Math.atan2(dir.x, dir.z);
        if (e.wind <= 0 && see) this.resolveEnemyCast(e, dir);
        continue;
      }

      let mode = 'idle';
      if (this.useYuka !== false && e.yuka && !(e.aggro > 0) && e.wind <= 0) {
        const ySee = steerEnemy(this, e, dt);
        if (ySee) pull(this, e, 6);
        mode = e.aiState === 'pursue' ? 'chase' : 'roam';
      } else {
        mode = tickMobMotion(this, e, dt);
      }
      e.actor.root.position.copy(e.pos);
      groundRoot(e.actor.root, this.sampler, e.pos.x, e.pos.z);
      if (see) e.actor.root.rotation.y = Math.atan2(dir.x, dir.z);
      e.actor.setGait(mode === 'chase' || mode === 'roam' || mode === 'leash', false);

      if ((e.aggro || 0) > 0) e.aggro -= dt;
      const hold = e.kind === 'caster' ? 5.2 : 1.35;
      if (mode === 'chase' && dist <= hold && e.hitCd <= 0 && see) this.beginEnemyCast(e, dir);
    }
    this.tele.update(dt);
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i];
        const b = this.enemies[j];
        if (!a.alive || !b.alive) continue;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const min = a.radius + b.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < 1e-6 || d2 >= min * min) continue;
        const d = Math.sqrt(d2);
        const push = (min - d) * 0.5;
        const nx = dx / d;
        const nz = dz / d;
        const ax = a.pos.x - nx * push;
        const az = a.pos.z - nz * push;
        const bx = b.pos.x + nx * push;
        const bz = b.pos.z + nz * push;
        if (this.walkable(this.d, ax, a.pos.z, 0.2)) a.pos.x = ax;
        if (this.walkable(this.d, a.pos.x, az, 0.2)) a.pos.z = az;
        if (this.walkable(this.d, bx, b.pos.z, 0.2)) b.pos.x = bx;
        if (this.walkable(this.d, b.pos.x, bz, 0.2)) b.pos.z = bz;
        a.actor.root.position.copy(a.pos);
        b.actor.root.position.copy(b.pos);
        groundRoot(a.actor.root, this.sampler, a.pos.x, a.pos.z);
        groundRoot(b.actor.root, this.sampler, b.pos.x, b.pos.z);
      }
    }
  }

  beginEnemyCast(e, dir) {
    const caster = e.kind === 'caster' || e.boss;
    e.hitCd = e.boss ? 2.4 : caster ? 2.0 : 1.15;
    e.windMax = e.boss ? 0.85 : caster ? 0.7 : 0.42;
    e.wind = e.windMax;
    e.windKind = e.boss ? 'zone' : caster ? 'linear' : 'cone';
    e.actor.requestOneShot(caster ? 'cast' : 'attack', e.windMax);
    const col = e.boss ? 0xd8433a : caster ? 0x9b6cf0 : 0xc9cedb;
    if (e.windKind === 'zone') {
      this.vfx.zone({ origin: this.pos.clone(), color: col, radius: 3.4, life: e.windMax, dps: 0 });
    } else if (e.windKind === 'linear') {
      this.vfx.linear({ origin: e.pos, dir, color: col, range: 9, width: 0.95, life: e.windMax });
    } else {
      this.vfx.cone({ origin: e.pos, dir, color: col, range: 3.2, half: 0.75, life: e.windMax });
    }
  }

  resolveEnemyCast(e, dir) {
    const col = e.boss ? 0xd8433a : 0xc9cedb;
    if (e.windKind === 'zone') {
      const mark = this.pos.clone();
      this.vfx.nova({ origin: mark, color: col, range: 3.4 });
      if (this.pos.distanceTo(mark) <= 3.4) this.takeDamage(e.boss ? 18 : 10, { damage: e.boss ? 40 : 16, crit: 0.06, critFactor: 1.5 }, 'aoe');
      this.vfx.gridFire({
        origin: mark,
        color: col,
        radius: 3.2,
        life: 4.8,
        scale: 2.15,
        dps: e.boss ? 6 : 3,
        onTick: (it) => {
          if (this.pos.distanceTo(mark) <= it.radius + 0.45) this.takeDamage(it.dps, { damage: 8 }, 'aoe');
        },
      });
    } else if (e.windKind === 'linear') {
      this.vfx.beam({ origin: e.pos.clone().setY(1.2), dir, color: 0x9b6cf0, range: 9 });
      this.hitLineFrom(e.pos, dir, 9, 0.7, e.boss ? 14 : 10);
    } else {
      this.vfx.slash({ origin: e.pos.clone().setY(1.1), dir, color: col, range: 2.2 });
      const to = this.pos.clone().sub(e.pos);
      if (to.length() <= 3.4 && to.normalize().dot(dir) > 0.45) this.takeDamage(e.boss ? 16 : 8, { damage: e.boss ? 36 : 14, crit: 0.05, critFactor: 1.5 }, 'cone');
    }
    this.vfx.shake.add(e.boss ? 0.4 : 0.22);
  }

  hitLineFrom(origin, dir, range, width, dmg) {
    const to = this.pos.clone().sub(origin);
    const along = to.dot(dir);
    if (along < 0 || along > range) return;
    const closest = origin.clone().addScaledVector(dir, along);
    if (closest.distanceTo(this.pos) <= width + 0.4) this.takeDamage(dmg, { damage: 14, crit: 0.05, critFactor: 1.5 }, 'line');
  }

  objective() {
    if (this.phase === 'lobby') return 'Team lobby · pick ally classes · E descend';
    if (this.script?.complete) return 'Dungeon cleared — warlord slain';
    const living = this.enemies.filter((e) => e.alive && !e.asleep);
    const boss = this.enemies.find((e) => e.boss && e.alive);
    if (boss && !boss.asleep) return `Slay ${boss.prefab?.label || 'the warlord'}`;
    if (living.length) return `Clear this hall · ${living.length} foe${living.length > 1 ? 's' : ''}`;
    const next = (this.script?.script?.path || []).find((p) => !this.script.cleared.has(p.id) && p.type !== 'entrance');
    if (next) return `Advance · ${next.type}`;
    return 'Find the warlord';
  }

  async reportCompletion(win) {
    if (this._completePosted) return;
    this._completePosted = true;
    const payload = completionPayload(this, { win });
    try {
      await fetch('/api/dungeon/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      /* node worker optional in forge-only preview */
    }
    const fromHome = payload.from === 'home' || payload.characterId;
    const returnUrl = fromHome ? warlordsReturnUrl(payload) : null;
    showEnd(win, win
      ? `${this.d?.name || 'Dungeon'} broken. Seed ${this.d?.seed} is yours.`
      : 'The halls keep your bones. Reforge and descend again.', {
      returnUrl,
      returnLabel: returnUrl ? 'RETURN TO WARLORDS' : 'RETURN TO FORGE',
    });
  }

  update(dt) {
    if (!this.active) return;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      if (this.hitstop <= 0) this.timeScale = 1;
    }
    const gdt = dt * this.timeScale;
    if (this.ended) {
      this.player?.update(dt);
      for (const e of this.enemies) e.actor.update(dt);
      this.vfx.update(gdt, this.enemies, this.ctx.cam);
      return;
    }
    this.now = (this.now || 0) + gdt;
    for (const k of Object.keys(this.cds)) this.cds[k] = Math.max(0, this.cds[k] - gdt);
    this.casting = Math.max(0, this.casting - gdt);
    this.iframes = Math.max(0, (this.iframes || 0) - gdt);
    this.parryT = Math.max(0, (this.parryT || 0) - gdt);
    this.dodgeCd = Math.max(0, (this.dodgeCd || 0) - gdt);
    this.parryCd = Math.max(0, (this.parryCd || 0) - gdt);
    if (this.classState) this.classState.autoParryCd = Math.max(0, (this.classState.autoParryCd || 0) - gdt);
    if (this.lockpick?.status === 'active') {
      this.lockpick = tickLockpickHold(this.lockpick, gdt, pinInSweetZone(this.lockpick));
      if (this.lockpick.status === 'success') toast("Ranger's Log · lock open");
      if (this.lockpick.status === 'failed') toast('Lock jammed');
    }
    for (const e of this.enemies) {
      if (!e.alive || !(e.poisonT > 0)) continue;
      e.poisonT -= gdt;
      e._poisonTick = (e._poisonTick || 0) - gdt;
      if (e._poisonTick <= 0) {
        e._poisonTick = 0.8;
        this.hurt(e, 4);
      }
    }
    const sheet = this.sheet || fallbackSheet(this.raceId, this.classId);
    this.mana = Math.min(sheet.manaMax, this.mana + sheet.manaRegen * gdt);
    this.hp = Math.min(sheet.hpMax, this.hp + sheet.hpRegen * gdt);
    if (!this.keys.has('ShiftLeft') && !this.keys.has('ShiftRight')) {
      this.stamina = Math.min(sheet.staminaMax, (this.stamina ?? sheet.staminaMax) + sheet.staminaRegen * gdt);
    }
    if (this.phase === 'lobby') {
      this.lobby?.update(this.vfx.clock || 0);
      this.player?.update(gdt);
      for (const a of this.allies) a.actor.update(gdt);
      const pose = this.lobby?.cameraPose();
      if (pose) this._aimLobbyCam(pose);
      renderHud({
        hp: this.hp, hpMax: sheet.hpMax, mana: this.mana, manaMax: sheet.manaMax,
        stamina: this.stamina, staminaMax: sheet.staminaMax,
        className: sheet.className, raceName: sheet.raceName, raceId: this.raceId, classId: this.classId,
        level: sheet.level, icon: sheet.icon, cds: this.cds,
        cdMax: Object.fromEntries((this.loadout || []).map((s) => [s.slot, s.cd])),
        activeSlot: this.activeSlot, casting: 0, castMax: 1,
        objective: 'Team lobby · pick ally classes · E descend the mountain',
        party: [
          { name: sheet.className || this.classId, hp: this.hp, hpMax: sheet.hpMax, you: true, raceId: this.raceId, classId: this.classId, id: 'player' },
          ...(this.allies || []).map((a, i) => ({
            name: CLASSES[a.classId]?.label || a.classId,
            hp: a.hp, hpMax: a.hpMax, you: false, raceId: a.raceId, classId: a.classId, id: String(i),
          })),
        ],
        healFocus: this.healFocus,
        target: null, iframes: 0, parryT: 0, phase: 'lobby',
        weaponId: this.weaponId,
      });
      window.__THREE_GAME_DIAGNOSTICS__ = { state: 'lobby', physics: this.phys ? 'rapier' : 'grid', instanceId: this.instance?.id };
      return;
    }
    this.tryMove(gdt);
    this.tickEnemies(gdt);
    tickWisps(this, gdt);
    this.vfx.update(gdt, this.enemies, this.ctx.cam);
    this.linear.update(gdt, this.enemies);
    const armed = this.loadout[this.activeSlot - 1];
    this.aiming?.setRanges(1.1, armed?.range || 10, armed?.kind === 'zone' || armed?.kind === 'nova' ? 'zone' : 'line');
    this.aiming?.update(this.pos, this.aim, this.enemies);
    this.aiming?.lookAhead(this.look, 2.6);
    this.ctx.camTarget.lerp(this.look, 1 - Math.pow(0.002, dt));
    const shake = this.vfx.shake.offset(dt);
    this.ctx.camTarget.x += shake.x;
    this.ctx.camTarget.z += shake.z;
    this.ctx.updateCam();
    window.__THREE_GAME_DIAGNOSTICS__ = {
      state: this.ended || 'play',
      hp: this.hp,
      mana: this.mana,
      enemies: this.enemies.filter((e) => e.alive).length,
      pos: { x: this.pos.x, z: this.pos.z },
      navWalkable: this.nav?.walkableCount ?? 0,
      nav: this.d?.terrain?.zoneOk ? 'three-pathfinding' : this.nav?.kind,
      cellM: this.nav?.cellM,
      physics: this.phys ? 'rapier' : 'grid',
      barriers: this.phys?.barriers?.size || 0,
      los: this.los ? 'wall+block+barrier' : 'grid',
      instanceId: this.instance?.id,
    };

    tickScript(this, {
      toastFn: (msg) => { if (msg) toast(msg); },
      onPhase: (boss, at) => {
        toast(`Warlord phase ${Math.round(at * 100)}%`);
        this.vfx.mist({
          origin: boss.pos.clone().setY(1.2),
          color: 0x9b6cf0,
          radius: 4.2,
          life: 2.4,
        });
      },
      onComplete: () => {
        if (this.ended) return;
        this.ended = 'win';
        void this.reportCompletion(true);
      },
    });

    if (this.hp <= 0) {
      this.hp = 0;
      this.ended = 'lose';
      if (this.player) {
        this.player.alive = false;
        this.player.play('death', 0.08, false);
      }
      void this.reportCompletion(false);
    }

    const awake = this.enemies.filter((e) => e.alive && !e.asleep);
    const lock = awake.sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos))[0];
    renderHud({
      hp: this.hp,
      hpMax: sheet.hpMax,
      mana: this.mana,
      manaMax: sheet.manaMax,
      stamina: this.stamina,
      staminaMax: sheet.staminaMax,
      className: sheet.className,
      raceName: sheet.raceName,
      level: sheet.level,
      raceId: this.raceId,
      classId: this.classId,
      icon: sheet.icon,
      cds: this.cds,
      cdMax: Object.fromEntries((this.loadout || []).map((s) => [s.slot, s.cd])),
      activeSlot: this.activeSlot,
      casting: this.casting,
      castMax: this.castMax,
      castName: (this.loadout?.[this.activeSlot - 1]?.name) || '',
      castHeal: !!(this.loadout?.[this.activeSlot - 1]?.heal && this.casting > 0),
      healFocus: this.healFocus,
      objective: this.objective(),
      party: [
        { name: sheet.className || this.classId, hp: this.hp, hpMax: sheet.hpMax, you: true, raceId: this.raceId, classId: this.classId, id: 'player' },
        ...(this.allies || []).map((a, i) => ({
          name: CLASSES[a.classId]?.label || a.classId,
          hp: a.hp, hpMax: a.hpMax, you: false, raceId: a.raceId, classId: a.classId, id: String(i),
        })),
      ],
      target: lock ? { name: lock.prefab?.label || lock.name || 'Foe', hp: lock.hp, hpMax: lock.hpMax } : null,
      iframes: this.iframes,
      parryT: this.parryT,
      lockpick: this.lockpick,
      classState: this.classState,
    });
  }
}

export { spellById };
