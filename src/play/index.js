/**
 * Grudge dungeon play session — linear crawl along the critical path.
 * Entrance → combat/elite rooms → boss. 6-slot pre-match loadout. Linear casts.
 */
import * as THREE from 'three';
import { PLAY, RACES, SPELLS, spellById } from '../ssot.js';
import { prefabFor, playerPrefab } from './prefabs.js';
import { worldOf, cellOf, walkableWorld } from '../gen/cells.js';
import { buildNavMesh } from '../gen/navmesh.js';
import { dungeonToInstance } from '../gen/instance.js';
import { createDungeonPhysics, stepDungeonPhysics, setPhysicsFeet, disposeDungeonPhysics } from './physics.js';
import { spawnActor } from './characters.js';
import { VfxWorld } from './vfx.js';
import { TelegraphField } from './telegraph.js';
import { instanceCatalog, preloadDungeonAssets } from './assets.js';
import { bindHud, mountHud, renderHud, showEnd, toast } from './hud.js';
import { deriveSheet, fallbackSheet, loadInfoCombat, resolveHit } from './infoCombat.js';

const KEYS = new Set();

export class PlaySession {
  constructor(ctx) {
    this.ctx = ctx;
    this.active = false;
    this.group = new THREE.Group();
    this.group.name = 'grudge-play';
    this.vfx = new VfxWorld(this.group);
    this.tele = new TelegraphField(this.group);
    this.keys = KEYS;
    this.player = null;
    this.enemies = [];
    this.aim = new THREE.Vector3(0, 0, 1);
    this.vel = new THREE.Vector3();
    this.raceId = 'human';
    this.classId = 'worge';
    this.sheet = fallbackSheet('human', 'worge');
    this.stamina = this.sheet.staminaMax;
    this.hud = mountHud();
    bindHud(this.hud, {
      onCast: (slot) => this.castSlot(slot),
      onExit: () => this.exit(),
    });
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (!this.active) return;
      if (e.code.startsWith('Digit')) {
        const n = Number(e.code.slice(5));
        if (n >= 1 && n <= 6) {
          e.preventDefault();
          this.castSlot(n);
        }
      }
      if (e.code === 'Escape') this.exit();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
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

  async enter({ dungeon, raceId = 'human', classId = 'worge', linear = true }) {
    if (!dungeon?.valid) {
      toast('Forge a connected dungeon first');
      return;
    }
    this.exit(true);
    this.active = true;
    this.d = dungeon;
    this.raceId = RACES[raceId] ? raceId : 'human';
    this.classId = classId === 'warrior' || classId === 'mage' || classId === 'ranger' ? classId : 'worge';
    this.linear = linear;
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
      this.sheet = deriveSheet(await loadInfoCombat(), this.raceId, this.classId);
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
    this.instance = dungeonToInstance(dungeon, { linear, maxPlayers: 8, catalog: instanceCatalog(dungeon) });
    this.phys = await createDungeonPhysics(dungeon);

    this.player = await spawnActor({ prefab: playerPrefab(this.raceId, this.classId), equipped: true });
    this.player.root.position.copy(this.pos);
    this.group.add(this.player.root);

    const theme = dungeon.params.themeKey;
    const rooms = linear ? this.path : dungeon.rooms;
    const jobs = [];
    for (const r of rooms) {
      if (r.type === 'entrance' || r.type === 'treasure' || r.type === 'shrine') continue;
      const kind = r.type === 'boss' ? 'boss' : r.type === 'elite' ? 'elite' : 'combat';
      const n = r.type === 'boss' ? 3 : r.type === 'elite' ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const ox = (i - (n - 1) / 2) * 1.8;
        const w = this.worldOf(dungeon, r.cx + ox / 2, r.cy);
        jobs.push({ r, w, prefab: prefabFor(theme, kind, r.id * 5 + i) });
      }
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
        boss: r.type === 'boss' && (p.brain === 'warlord' || p.role === 'mage'),
        kind: p.brain === 'mage' || p.role === 'mage' ? 'caster' : r.type === 'boss' ? 'boss' : 'grunt',
      };
      actor.root.position.copy(e.pos);
      this.group.add(actor.root);
      this.enemies.push(e);
    }

    this.ctx.cam.zoom = 1.55;
    this.ctx.cam.updateProjectionMatrix();
    this.ctx.camTarget.copy(this.pos);
    this.ctx.updateCam();
    toast(`${this.sheet.className} ${RACES[this.raceId].label} · ${theme} · 1–6`);
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
    this.tele?.clear();
    disposeDungeonPhysics(this.phys);
    this.phys = null;
    this.nav = null;
    this.instance = null;
    this.player?.dispose();
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
    if (moving) this.aim.set(fx, 0, fz).normalize();
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
    if (this.phys) {
      const stepped = stepDungeonPhysics(this.phys, this.vel.x, this.vel.z, dt);
      if (stepped) {
        this.pos.x = stepped.x;
        this.pos.z = stepped.z;
      }
    } else {
      const nx = this.pos.x + this.vel.x * dt;
      const nz = this.pos.z + this.vel.z * dt;
      if (this.walkable(this.d, nx, this.pos.z)) this.pos.x = nx;
      else this.vel.x = 0;
      if (this.walkable(this.d, this.pos.x, nz)) this.pos.z = nz;
      else this.vel.z = 0;
    }
    if (this.player) {
      this.player.root.position.copy(this.pos);
      if (this.aim.lengthSq() > 0) {
        const yaw = Math.atan2(this.aim.x, this.aim.z);
        this.player.root.rotation.y = yaw;
      }
      this.player.setGait(moving, sprint);
      this.player.update(dt);
    }
  }

  castSlot(n) {
    if (!this.active || this.ended || this.casting > 0) return;
    const spell = SPELLS[n - 1];
    if (!spell) return;
    if ((this.cds[n] || 0) > 0) return;
    const stamCost = spell.kind === 'slash' || spell.kind === 'dash' ? (spell.stamina || 12) : 0;
    if (this.mana < spell.mana) {
      toast('Not enough mana');
      return;
    }
    if (this.stamina < stamCost) {
      toast('Not enough stamina');
      return;
    }
    this.activeSlot = n;
    this.mana -= spell.mana;
    this.stamina -= stamCost;
    this.cds[n] = spell.cd;
    this.casting = 0.18;
    this.castMax = 0.18;
    const origin = this.pos.clone();
    origin.y = 1.15;
    const dir = this.aim.clone().normalize();
    this.player?.requestOneShot(spell.kind === 'slash' ? 'attack' : 'cast', 0.42);
    this.vfx.aura({ origin: this.pos.clone(), color: spell.color, life: 0.28 });
    const tel = spell.telegraphSec || 0.15;
    this.casting = Math.max(this.casting, tel);
    this.castMax = Math.max(this.castMax, tel);
    if (spell.kind === 'slash') {
      this.vfx.cone({ origin: this.pos, dir, color: spell.color, range: spell.range, half: 0.85, life: tel });
    } else if (spell.kind === 'beam' || spell.kind === 'dash') {
      this.vfx.linear({ origin: this.pos, dir, color: spell.color, range: spell.range, width: 0.85, life: tel });
    } else if (spell.kind === 'nova') {
      this.vfx.zone({ origin: this.pos, color: spell.color, radius: spell.range, life: tel, dps: 0 });
    } else {
      this.vfx.linear({ origin: this.pos, dir, color: spell.color, range: Math.min(8, spell.range), width: 0.45, life: tel });
    }

    const foeSheet = { defense: 18, block: 0.04, blockEffect: 0.25 };
    const roll = (base) => resolveHit(base, this.sheet, foeSheet);
    if (spell.kind === 'slash') {
      this.vfx.slash({ origin, dir, color: spell.color, range: spell.range });
      this.hitCone(dir, spell.range, 0.85, roll(spell.damage));
    } else if (spell.kind === 'projectile') {
      this.vfx.projectile({
        origin,
        dir,
        color: spell.color,
        speed: spell.speed || 18,
        range: spell.range,
        pierce: !!spell.pierce,
        onHit: (e) => this.hurt(e, roll(spell.damage)),
      });
    } else if (spell.kind === 'beam') {
      this.vfx.beam({ origin, dir, color: spell.color, range: spell.range });
      this.hitLine(dir, spell.range, 0.55, roll(spell.damage));
      this.punch(70, 0.35);
    } else if (spell.kind === 'nova') {
      this.vfx.nova({ origin: this.pos.clone(), color: spell.color, range: spell.range });
      this.hitRadius(this.pos, spell.range, roll(spell.damage));
      this.punch(80, 0.4);
    } else if (spell.kind === 'dash') {
      const dest = this.pos.clone().addScaledVector(dir, spell.range);
      if (this.walkable(this.d, dest.x, dest.z)) this.pos.copy(dest);
      else {
        for (let t = 0.85; t > 0.2; t -= 0.15) {
          const p = this.pos.clone().addScaledVector(dir, spell.range * t);
          if (this.walkable(this.d, p.x, p.z)) { this.pos.copy(p); break; }
        }
      }
      setPhysicsFeet(this.phys, this.pos.x, this.pos.z);
      this.vfx.impact({ origin: this.pos.clone().setY(1), color: spell.color });
      this.hitRadius(this.pos, 1.6, roll(spell.damage));
      this.vfx.shake.add(0.25);
    }
  }

  punch(ms, trauma) {
    this.hitstop = Math.max(this.hitstop, ms / 1000);
    this.timeScale = 0.05;
    this.vfx.shake.add(trauma);
  }

  hurt(e, dmg) {
    if (!e.alive) return;
    e.hp -= dmg;
    e.aggro = 6;
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
      const dist = e.pos.distanceTo(this.pos);
      if (dist < 14) e.aggro = Math.max(e.aggro, 5);
      e.hitCd = Math.max(0, e.hitCd - dt);
      if (e.aggro <= 0) {
        e.actor.setGait(false, false);
        continue;
      }
      e.aggro -= dt;
      const dir = this.pos.clone().sub(e.pos).setY(0);
      if (dir.lengthSq() > 1e-6) dir.normalize();
      e.actor.root.rotation.y = Math.atan2(dir.x, dir.z);

      if (e.wind > 0) {
        e.wind -= dt;
        e.actor.setGait(false, false);
        if (e.wind <= 0) this.resolveEnemyCast(e, dir);
        continue;
      }

      const hold = e.kind === 'caster' ? 5.2 : 1.35;
      if (dist > hold) {
        const nx = e.pos.x + dir.x * e.speed * dt;
        const nz = e.pos.z + dir.z * e.speed * dt;
        if (this.walkable(this.d, nx, e.pos.z)) e.pos.x = nx;
        if (this.walkable(this.d, e.pos.x, nz)) e.pos.z = nz;
        e.actor.root.position.copy(e.pos);
        e.actor.setGait(true, false);
      } else {
        e.actor.setGait(false, false);
        if (e.hitCd <= 0) this.beginEnemyCast(e, dir);
      }
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
      if (this.pos.distanceTo(mark) <= 3.4) this.hp -= resolveHit(e.boss ? 18 : 10, { damage: e.boss ? 40 : 16, crit: 0.06, critFactor: 1.5 }, this.sheet);
      this.vfx.zone({
        origin: mark,
        color: col,
        radius: 3.2,
        life: 4.8,
        dps: e.boss ? 6 : 3,
        onTick: (it) => {
          if (this.pos.distanceTo(mark) <= it.radius + 0.45) this.hp -= resolveHit(it.dps, { damage: 8 }, this.sheet);
        },
      });
    } else if (e.windKind === 'linear') {
      this.vfx.beam({ origin: e.pos.clone().setY(1.2), dir, color: 0x9b6cf0, range: 9 });
      this.hitLineFrom(e.pos, dir, 9, 0.7, e.boss ? 14 : 10);
    } else {
      this.vfx.slash({ origin: e.pos.clone().setY(1.1), dir, color: col, range: 2.2 });
      const to = this.pos.clone().sub(e.pos);
      if (to.length() <= 3.4 && to.normalize().dot(dir) > 0.45) this.hp -= resolveHit(e.boss ? 16 : 8, { damage: e.boss ? 36 : 14, crit: 0.05, critFactor: 1.5 }, this.sheet);
    }
    this.vfx.shake.add(e.boss ? 0.4 : 0.22);
  }

  hitLineFrom(origin, dir, range, width, dmg) {
    const to = this.pos.clone().sub(origin);
    const along = to.dot(dir);
    if (along < 0 || along > range) return;
    const closest = origin.clone().addScaledVector(dir, along);
    if (closest.distanceTo(this.pos) <= width + 0.4) this.hp -= resolveHit(dmg, { damage: 14, crit: 0.05, critFactor: 1.5 }, this.sheet);
  }

  objective() {
    const living = this.enemies.filter((e) => e.alive);
    const boss = living.find((e) => e.boss);
    if (boss) return `Slay ${boss.prefab?.label || 'the warlord'}`;
    if (living.length) return `${living.length} foe${living.length > 1 ? 's' : ''} remain on the critical path`;
    return 'Dungeon cleared — the vault is yours';
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
      this.vfx.update(gdt, this.enemies);
      return;
    }
    for (const k of Object.keys(this.cds)) this.cds[k] = Math.max(0, this.cds[k] - gdt);
    this.casting = Math.max(0, this.casting - gdt);
    const sheet = this.sheet || fallbackSheet(this.raceId, this.classId);
    this.mana = Math.min(sheet.manaMax, this.mana + sheet.manaRegen * gdt);
    this.hp = Math.min(sheet.hpMax, this.hp + sheet.hpRegen * gdt);
    if (!this.keys.has('ShiftLeft') && !this.keys.has('ShiftRight')) {
      this.stamina = Math.min(sheet.staminaMax, (this.stamina ?? sheet.staminaMax) + sheet.staminaRegen * gdt);
    }
    this.tryMove(gdt);
    this.tickEnemies(gdt);
    this.vfx.update(gdt, this.enemies);

    this.ctx.camTarget.lerp(this.pos, 1 - Math.pow(0.001, dt));
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
      nav: this.nav?.kind,
      cellM: this.nav?.cellM,
      physics: this.phys ? 'rapier' : 'grid',
      instanceId: this.instance?.id,
    };

    if (this.hp <= 0) {
      this.hp = 0;
      this.ended = 'lose';
      if (this.player) {
        this.player.alive = false;
        this.player.play('death', 0.08, false);
      }
      showEnd(false, 'The halls keep your bones. Reforge and descend again.');
    } else if (this.enemies.length && this.enemies.every((e) => !e.alive)) {
      this.ended = 'win';
      showEnd(true, `${this.d.name} is broken. Seed ${this.d.seed} is yours.`);
    }

    renderHud({
      hp: this.hp,
      hpMax: sheet.hpMax,
      mana: this.mana,
      manaMax: sheet.manaMax,
      stamina: this.stamina,
      staminaMax: sheet.staminaMax,
      className: sheet.className,
      raceName: sheet.raceName,
      icon: sheet.icon,
      cds: this.cds,
      cdMax: Object.fromEntries(SPELLS.map((s) => [s.slot, s.cd])),
      activeSlot: this.activeSlot,
      casting: this.casting,
      castMax: this.castMax,
      objective: this.objective(),
    });
  }
}

export { spellById };
