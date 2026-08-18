/**
 * Grudge dungeon play session — linear crawl along the critical path.
 * Entrance → combat/elite rooms → boss. 6-slot pre-match loadout. Linear casts.
 */
import * as THREE from 'three';
import { PLAY, RACES, SPELLS, THEME_ENEMY, spellById } from '../ssot.js';
import { spawnActor } from './characters.js';
import { VfxWorld } from './vfx.js';
import { bindHud, mountHud, renderHud, showEnd, toast } from './hud.js';

const VOID = 0, FLOOR = 1, WALL = 2, POOL = 3;
const KEYS = new Set();

export class PlaySession {
  constructor(ctx) {
    this.ctx = ctx;
    this.active = false;
    this.group = new THREE.Group();
    this.group.name = 'grudge-play';
    this.vfx = new VfxWorld(this.group);
    this.keys = KEYS;
    this.player = null;
    this.enemies = [];
    this.aim = new THREE.Vector3(0, 0, 1);
    this.vel = new THREE.Vector3();
    this.raceId = 'human';
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
    return { x: x - d.W / 2 + 0.5, z: y - d.H / 2 + 0.5 };
  }

  cellOf(d, wx, wz) {
    return { x: Math.round(wx + d.W / 2 - 0.5), y: Math.round(wz + d.H / 2 - 0.5) };
  }

  walkable(d, wx, wz) {
    const { x, y } = this.cellOf(d, wx, wz);
    if (x < 0 || y < 0 || x >= d.W || y >= d.H) return false;
    const t = d.grid[y * d.W + x];
    return t === FLOOR;
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

  async enter({ dungeon, raceId = 'human', linear = true }) {
    if (!dungeon?.valid) {
      toast('Forge a connected dungeon first');
      return;
    }
    this.exit(true);
    this.active = true;
    this.d = dungeon;
    this.raceId = RACES[raceId] ? raceId : 'human';
    this.linear = linear;
    this.ctx.scene.add(this.group);
    this.hud.hidden = false;
    document.body.classList.add('playing');
    document.getElementById('ph-end')?.setAttribute('hidden', '');

    const start = this.worldOf(dungeon, dungeon.rooms[dungeon.entrance].cx, dungeon.rooms[dungeon.entrance].cy);
    this.pos = new THREE.Vector3(start.x, 0, start.z);
    this.vel.set(0, 0, 0);
    this.hp = PLAY.hp;
    this.mana = PLAY.mana;
    this.cds = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    this.casting = 0;
    this.castMax = 0.35;
    this.activeSlot = 1;
    this.ended = null;
    this.path = this.critPath(dungeon);
    this.pathI = 0;

    this.player = await spawnActor({ raceId: this.raceId, height: PLAY.playerHeight, role: 'warrior' });
    this.player.root.position.copy(this.pos);
    this.group.add(this.player.root);

    const theme = dungeon.params.themeKey;
    const foeRace = THEME_ENEMY[theme] || 'orc';
    const rooms = linear ? this.path : dungeon.rooms;
    const jobs = [];
    for (const r of rooms) {
      if (r.type === 'entrance' || r.type === 'treasure' || r.type === 'shrine') continue;
      const n = r.type === 'boss' ? 1 : r.type === 'elite' ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const ox = (i - (n - 1) / 2) * 1.6;
        const w = this.worldOf(dungeon, r.cx + ox, r.cy);
        jobs.push({
          r, w,
          height: r.type === 'boss' ? PLAY.bossHeight : PLAY.enemyHeight,
          role: r.type === 'boss' ? 'mage' : 'warrior',
        });
      }
    }
    const spawned = await Promise.all(jobs.map((j) => spawnActor({
      raceId: foeRace,
      height: j.height,
      role: j.role,
    }).then((actor) => ({ actor, j }))));
    for (const { actor, j } of spawned) {
      const r = j.r;
      const e = {
        actor,
        pos: new THREE.Vector3(j.w.x, 0, j.w.z),
        hp: r.type === 'boss' ? 220 : r.type === 'elite' ? 70 : 42,
        hpMax: r.type === 'boss' ? 220 : r.type === 'elite' ? 70 : 42,
        radius: r.type === 'boss' ? 0.7 : 0.42,
        speed: r.type === 'boss' ? 2.4 : 3.1,
        alive: true,
        room: r,
        aggro: 0,
        hitCd: 0,
        boss: r.type === 'boss',
      };
      actor.root.position.copy(e.pos);
      this.group.add(actor.root);
      this.enemies.push(e);
    }

    this.ctx.cam.zoom = 2.35;
    this.ctx.cam.updateProjectionMatrix();
    this.ctx.camTarget.copy(this.pos);
    this.ctx.updateCam();
    toast(`${RACES[this.raceId].label} · linear crawl · 1–6 to cast`);
  }

  exit(silent = false) {
    this.active = false;
    document.body.classList.remove('playing');
    this.hud.hidden = true;
    this.vfx.clear();
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
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = sprint ? PLAY.runSpeed : PLAY.walkSpeed;
    const target = new THREE.Vector3(fx, 0, fz);
    if (moving) target.normalize().multiplyScalar(speed);
    this.vel.x += (target.x - this.vel.x) * Math.min(1, PLAY.accel * dt);
    this.vel.z += (target.z - this.vel.z) * Math.min(1, PLAY.accel * dt);
    const nx = this.pos.x + this.vel.x * dt;
    const nz = this.pos.z + this.vel.z * dt;
    if (this.walkable(this.d, nx, this.pos.z)) this.pos.x = nx;
    else this.vel.x = 0;
    if (this.walkable(this.d, this.pos.x, nz)) this.pos.z = nz;
    else this.vel.z = 0;
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
    if (this.mana < spell.mana) {
      toast('Not enough mana');
      return;
    }
    this.activeSlot = n;
    this.mana -= spell.mana;
    this.cds[n] = spell.cd;
    this.casting = 0.18;
    this.castMax = 0.18;
    const origin = this.pos.clone();
    origin.y = 1.15;
    const dir = this.aim.clone().normalize();
    this.player?.requestOneShot(spell.kind === 'slash' ? 'attack' : 'cast', 0.42);
    this.vfx.aura({ origin: this.pos.clone(), color: spell.color, life: 0.28 });

    if (spell.kind === 'slash') {
      this.vfx.slash({ origin, dir, color: spell.color, range: spell.range });
      this.hitCone(dir, spell.range, 0.85, spell.damage);
    } else if (spell.kind === 'projectile') {
      this.vfx.projectile({
        origin,
        dir,
        color: spell.color,
        speed: spell.speed || 18,
        range: spell.range,
        pierce: !!spell.pierce,
        onHit: (e) => this.hurt(e, spell.damage),
      });
    } else if (spell.kind === 'beam') {
      this.vfx.beam({ origin, dir, color: spell.color, range: spell.range });
      this.hitLine(dir, spell.range, 0.55, spell.damage);
    } else if (spell.kind === 'nova') {
      this.vfx.nova({ origin: this.pos.clone(), color: spell.color, range: spell.range });
      this.hitRadius(this.pos, spell.range, spell.damage);
    } else if (spell.kind === 'dash') {
      const dest = this.pos.clone().addScaledVector(dir, spell.range);
      if (this.walkable(this.d, dest.x, dest.z)) this.pos.copy(dest);
      else {
        for (let t = 0.85; t > 0.2; t -= 0.15) {
          const p = this.pos.clone().addScaledVector(dir, spell.range * t);
          if (this.walkable(this.d, p.x, p.z)) { this.pos.copy(p); break; }
        }
      }
      this.vfx.impact({ origin: this.pos.clone().setY(1), color: spell.color });
      this.hitRadius(this.pos, 1.6, spell.damage);
    }
  }

  hurt(e, dmg) {
    if (!e.alive) return;
    e.hp -= dmg;
    e.aggro = 6;
    e.actor.requestOneShot('attack', 0.2);
    if (e.hp <= 0) {
      e.alive = false;
      e.actor.alive = false;
      e.actor.play('death', 0.08, false);
      toast(e.boss ? 'The warlord falls' : 'Foe down');
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
      if (dist < 11) e.aggro = Math.max(e.aggro, 4);
      e.hitCd = Math.max(0, e.hitCd - dt);
      if (e.aggro <= 0) {
        e.actor.setGait(false, false);
        continue;
      }
      e.aggro -= dt;
      if (dist > 1.15) {
        const dir = this.pos.clone().sub(e.pos).setY(0).normalize();
        const nx = e.pos.x + dir.x * e.speed * dt;
        const nz = e.pos.z + dir.z * e.speed * dt;
        if (this.walkable(this.d, nx, e.pos.z)) e.pos.x = nx;
        if (this.walkable(this.d, e.pos.x, nz)) e.pos.z = nz;
        e.actor.root.position.copy(e.pos);
        e.actor.root.rotation.y = Math.atan2(dir.x, dir.z);
        e.actor.setGait(true, false);
      } else {
        e.actor.setGait(false, false);
        if (e.hitCd <= 0) {
          e.hitCd = e.boss ? 1.15 : 0.85;
          e.actor.requestOneShot('attack', 0.4);
          this.hp -= e.boss ? 16 : 8;
          this.vfx.slash({
            origin: e.pos.clone().setY(1.1),
            dir: this.pos.clone().sub(e.pos),
            color: e.boss ? 0xd8433a : 0xc9cedb,
            range: 1.6,
          });
        }
      }
    }
  }

  objective() {
    const living = this.enemies.filter((e) => e.alive);
    const boss = living.find((e) => e.boss);
    if (boss) return `Slay the ${this.d.name.split(' of ')[0].replace('The ', '')} warlord`;
    if (living.length) return `${living.length} foe${living.length > 1 ? 's' : ''} remain on the critical path`;
    return 'Dungeon cleared — the vault is yours';
  }

  update(dt) {
    if (!this.active) return;
    if (this.ended) {
      this.player?.update(dt);
      for (const e of this.enemies) e.actor.update(dt);
      this.vfx.update(dt, this.enemies);
      return;
    }
    for (const k of Object.keys(this.cds)) this.cds[k] = Math.max(0, this.cds[k] - dt);
    this.casting = Math.max(0, this.casting - dt);
    this.mana = Math.min(PLAY.mana, this.mana + PLAY.manaRegen * dt);
    this.hp = Math.min(PLAY.hp, this.hp + PLAY.hpRegen * dt);
    this.tryMove(dt);
    this.tickEnemies(dt);
    this.vfx.update(dt, this.enemies);

    const shake = this.vfx.shake;
    this.ctx.camTarget.lerp(this.pos, 1 - Math.pow(0.001, dt));
    if (shake > 0) {
      this.ctx.camTarget.x += (Math.random() - 0.5) * shake;
      this.ctx.camTarget.z += (Math.random() - 0.5) * shake;
    }
    this.ctx.updateCam();

    if (this.hp <= 0) {
      this.hp = 0;
      this.ended = 'lose';
      this.player.alive = false;
      this.player.play('death', 0.08, false);
      showEnd(false, 'The halls keep your bones. Reforge and descend again.');
    } else if (this.enemies.length && this.enemies.every((e) => !e.alive)) {
      this.ended = 'win';
      showEnd(true, `${this.d.name} is broken. Seed ${this.d.seed} is yours.`);
    }

    renderHud({
      hp: this.hp,
      hpMax: PLAY.hp,
      mana: this.mana,
      manaMax: PLAY.mana,
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
