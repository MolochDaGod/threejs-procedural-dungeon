/**
 * Grudge dungeon play session — linear crawl along the critical path.
 * Entrance → combat/elite rooms → boss. 6-slot pre-match loadout. Linear casts.
 */
import * as THREE from 'three';
import { AGGRO, CLASS_IDS, CLASSES, PLAY, PLAY_DEFAULTS, RACES, loadoutFor, spellById, weaponsForClass, WEAPON_LABEL } from '../ssot.js';
import { skillById } from './weaponSkills.js';
import { incomingScale, outgoingScale, passiveFor } from './passives.js';
import { coverSpotNear, lineOpen, firstObstruction, damageBarrier } from '../grid/cells.js';
import { allyRaces, makeAlly, otherClasses, tickAlly } from './party.js';
import { prefabFor, playerPrefab } from './prefabs.js';
import { planEncounters } from './encounters.js';
import { nerfSheet, tickFactionUnit } from './factionPacks.js';
import { playSfx } from './audio.js';
import { hydrateSkillApi, stampSpell, telegraphForSkill } from './skillApi.js';
import { worldOf, cellOf, walkableWorld } from '../gen/cells.js';
import {
  bindScript, tickScript, gateBlocks, livingInRoom, completionPayload, warlordsReturnUrl,
} from './scriptRuntime.js';
import { buildNavMesh } from '../gen/navmesh.js';
import { dungeonToInstance } from '../gen/instance.js';
import { instanceNodeManifest, makeInstanceGraph, tickInstanceLod } from './instanceGraph.js';
import { attachDungeonTerrain, rebuildDungeonNav } from '../terrain/navmesh.js';
import { groundRoot } from '../terrain/footPlant.js';
import { createDungeonPhysics, stepDungeonPhysics, setPhysicsFeet, disposeDungeonPhysics, dropBarrierCollider } from './physics.js';
import { createLosField } from './los.js';
import { warmYuka, attachYuka, steerEnemy } from './yukaSteer.js';
import { pull, hearBreak, tickMobMotion, losToPlayer, applyTaunt, addThreat, THREAT } from './aggro.js';
import { makeClassState, WARRIOR_TANK, WORGE_GRIMOIRE, RAIDER_TWO_HAND, MAGE_WAND, PRIEST_WAND, classItemFor, addGrudgeStack, grudgeDefenseMul, craftWorgeForm } from './classItems.js';
import { createLockpickSession, tickLockpickHold, attemptLockpickTumble, setLockpickPinAngle, cancelLockpick, pinInSweetZone } from './lockpick.js';
import { animForSpell, hitWindowSec, reequipActor, spawnActor } from './characters.js';
import { playCharacterId } from './ids.js';
import { VfxWorld } from './vfx.js';
import { TelegraphField } from './telegraph.js';
import { instanceCatalog, preloadDungeonAssets, loadGltf } from './assets.js';
import { loadInteriorKits, plantDressPlan } from '../props/kitPlant.js';
import { DungeonGates, GATE_FORCE_SEC } from '../props/gates.js';
import { DungeonPinata, clearPinataCell } from './pinata.js';
import { addLoot, BAG_DEFS, corpseYield, loadBag, spendLoot } from './bag.js';
import { CLASS_CRAFTS, canRefillTonic, craftsForClass } from './classCrafts.js';
import { bindHud, fillEquipPanel, mountHud, paintClassRadial, paintItemRadial, paintMappedBars, paintMountMenu, renderHud, setHudClassSkills, setHudSkills, showEnd, toast } from './hud.js';
import { classSkill0 } from './classSkill0.js';
import { classifyFormClip, defaultFormFor, fitFormToSi, FORMS, formUrl } from './forms.js';
import { overlayForSkill } from './stylizedProjectiles.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

import { makeTotemMesh, TOTEM_LIFE, TOTEM_PULSE, TOTEM_RANGE_BONUS, TOTEM_SHIELD_MAX, TOTEM_SHIELD_TICK, TOTEM_STR } from './totems.js';

import { COMBAT_ITEMS, DEFAULT_ITEM_SLOTS, starterItemCounts } from './combatItems.js';
import { MOUNTS, mountById } from './mounts.js';
import { applyHitReact, canAct, canMove, inferCc, makeStatus, paintStatus, tickStatus } from './status.js';
import { gapCloseSkill, isMeleeKit, nextComboSkill } from './meleeCombo.js';
import { loadHudLayout, resolveBarSlots } from './hudLayout.js';
import { classLoadoutFor, loadClassTrees } from './classSkills.js';
import { PlayTpsCamera } from './tpsCamera.js';
import { deriveSheet, fallbackSheet, loadInfoCombat, resolveHit } from './infoCombat.js';
import { LinearCastWorld } from './linearCast.js';
import { AimTarget } from './aimTarget.js';
import { TeamLobby } from './teamLobby.js';
import { attachPlayHelpers } from '../helpers/playHelpers.js';
import { mountShrineWisps, tickWisps } from './wisp.js';

const KEYS = new Set();

function corpseKind(e) {
  if (e?.boss || e?.kind === 'boss' || e?.room?.type === 'boss') return 'boss';
  if (e?.kind === 'elite' || e?.room?.type === 'elite') return 'elite';
  return 'trash';
}

function elementShader(el) {
  if (el === 'fire') return 'fire';
  if (el === 'ice' || el === 'frost') return 'ice';
  if (el === 'shadow' || el === 'nature' || el === 'arcane') return 'smoke';
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
    this.pinata = null;
    this.bag = loadBag();
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
    this.classSkills = [];
    this.classCds = {};
    this.classActive = null;
    this.tps = new PlayTpsCamera(ctx.renderer?.domElement || document.body);
    this.tps.onParry = () => this.tryParry();
    this.tps.onFocusToggle = () => this.toggleFocus();
    this.status = makeStatus();
    this.comboStage = 0;
    this.comboT = 0;
    this.slideCd = 0;
    this.radial = false;
    this._eHold = 0;
    this.focusEnabled = false;
    this.itemCounts = starterItemCounts();
    this.vial = null;
    this.itemSlots = DEFAULT_ITEM_SLOTS.slice();
    this.itemCds = { 0: 0, 1: 0 };
    this.mountId = 'none';
    this.mountMenu = false;
    this.summons = [];
    this.dodgeT = 0;
    this.blocking = false;
    this._tap = null;
    this.useYuka = PLAY_DEFAULTS.yuka !== false;
    this.hud = mountHud();
    bindHud(this.hud, {
      onCast: (slot) => this.castMapped('weapon', slot),
      onUseItem: (i) => this.useCombatItem(i),
      onMount: (id) => this.setMount(id),
      onMountMenu: () => this.toggleMountMenu(),
      onItemRadial: (i) => this.pickClassItem(i),
      onClassCast: (slot) => {
        this.castMapped('class', slot);
        if (slot > 0) this.closeRadial();
      },
      onExit: () => this.exit(),
      onHealFocus: (who) => this.setHealFocus(who),
      onEnterCrawl: () => this.beginCrawl(),
      onPickClass: (id) => { void this.setPlayerClass(id); },
      onPickWeapon: (id) => { void this.setPlayerWeapon(id); },
      onPickAlly: (i, id) => { void this.setAllyClass(i, id); },
      onHudLayout: () => this.refreshHudBars(),
      getSkillPool: () => [...(this.loadout || []), ...(this.classSkills || [])],
      onLootBody: () => this.tryLootCorpse(),
    });
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (!this.active) return;
      if (document.body.classList.contains('hud-edit') && !(e.ctrlKey && e.shiftKey && e.code === 'KeyH')) {
        return;
      }
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
      const binds = loadHudLayout().binds;
      if (e.shiftKey && e.code.startsWith('Digit')) {
        const n = Number(e.code.slice(5));
        if (n >= 1 && n <= 5) {
          e.preventDefault();
          this.castClassSlot(n);
          this.closeRadial();
          return;
        }
      }
      if ((e.code === 'ControlLeft' || e.code === PLAY.slide.key) && !e.shiftKey) {
        e.preventDefault();
        this.trySlide();
      }
      if (this.radial && e.code.startsWith('Digit')) {
        const n = Number(e.code.slice(5));
        if (n >= 1 && n <= 5) {
          e.preventDefault();
          this.castClassSlot(n);
          this.closeRadial();
          return;
        }
      }
      for (let i = 1; i <= 5; i++) {
        if (binds[`w${i}`] && e.code === binds[`w${i}`]) {
          e.preventDefault();
          this.castMapped('weapon', i);
        }
      }
      if (binds.i6 && e.code === binds.i6) { e.preventDefault(); this.useCombatItem(0); }
      if (binds.i7 && e.code === binds.i7) { e.preventDefault(); this.useCombatItem(1); }
      if (binds.m8 && e.code === binds.m8) { e.preventDefault(); this.toggleMountMenu(); }
      for (let i = 0; i < 4; i++) {
        if (binds[`c${i}`] && e.code === binds[`c${i}`]) {
          e.preventDefault();
          if (i === 0 && this.pinata?.nearest?.(this.pos, 2.8)) this.smashNearestProp();
          else this.castMapped('class', i);
        }
      }
      if (e.code === (binds.dodge || PLAY.dodge.key)) { e.preventDefault(); this.tryDodge('back'); }
      if (e.code === (binds.parry || PLAY.parry.key)) { e.preventDefault(); this.tryParry(); }
      if (e.code === (binds.swap || 'KeyQ')) { e.preventDefault(); this.swapWeaponSet(); }
      if ((e.code === 'KeyA' || e.code === 'KeyD') && this.phase === 'crawl') {
        const now = performance.now();
        if (this._tap && this._tap.code === e.code && (now - this._tap.t) < PLAY.dodge.doubleTapSec * 1000) {
          e.preventDefault();
          this._tap = null;
          this.tryDodge(e.code === 'KeyA' ? 'left' : 'right');
        } else {
          this._tap = { code: e.code, t: now };
        }
      }
      if (e.code === 'KeyR') { e.preventDefault(); }
      if (e.code === 'KeyI') {
        e.preventDefault();
        const panel = document.getElementById('equip-panel');
        if (panel) {
          fillEquipPanel({
            raceId: this.raceId, classId: this.classId, weaponId: this.weaponId,
            level: this.sheet?.level, sheet: this.sheet, bag: this.bag,
            classState: this.classState, trees: this._trees, vial: this.vial,
          });
          panel.hidden = !panel.hidden;
          panel.classList.toggle('open', !panel.hidden);
        }
      }
      /* class slot 0 / smash handled via binds.c0 */
      if (e.code === 'KeyE' && this.phase === 'lobby') { e.preventDefault(); this.beginCrawl(); }
      if (e.code === 'KeyE' && this.phase === 'crawl' && this.tryLootCorpse()) { e.preventDefault(); return; }
      if (e.code === 'KeyE' && this.phase === 'crawl' && this.tryOpenGate(true)) { e.preventDefault(); return; }

      if (e.code === 'Escape') this.exit();
      if (e.code === 'Tab') {
        e.preventDefault();
        const armed = this.loadout?.[this.activeSlot - 1];
        if (armed?.heal && !(armed.damage > 0)) this.cycleHealFocus();
        else this.aiming?.cycleTarget(this.enemies);
      }
    });
    addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'KeyE') { this._lootE = false; this._gateE = false; }
    });
    addEventListener('pointermove', (e) => {
      if (!this.active || this.tps?.enabled) return;
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
    if (this.gates?.blocks(wx, wz)) return false;
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
    this.cds = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    this.classCds = this.classCds || {};
    this.active = true;
    this.phase = 'loading';
    this.ended = null;
    this.downed = false;
    this.timer0 = 0;
    this.d = dungeon;
    this.raceId = RACES[raceId] ? raceId : 'human';
    this.classId = CLASS_IDS.includes(classId) ? classId : 'worge';
    this.classState = makeClassState(this.classId);
    this.bootVial();
    this.lockpick = null;
    this.now = 0;
    const sets = weaponsForClass(this.classId);
    this.weaponSet = Math.max(0, sets.indexOf(weaponId));
    if (this.weaponSet < 0) this.weaponSet = 0;
    this.weaponId = sets[this.weaponSet] || sets[0];
    this.loadout = loadoutFor(this.classId, this.weaponId).map(stampSpell);
    this.allyPick = (allyClasses && allyClasses.length === 3)
      ? allyClasses.map((id) => (CLASS_IDS.includes(id) ? id : 'warrior'))
      : otherClasses(this.classId);
    this.refreshHudBars();
    this.linearCrawl = linear;
    this.characterId = playCharacterId(characterId)
      || (typeof location !== 'undefined'
        ? playCharacterId(new URLSearchParams(location.search).get('characterId'))
        : null);
    this.ctx.scene.add(this.group);
    this.hud.hidden = false;
    document.body.classList.add('playing');
    document.getElementById('ph-end')?.setAttribute('hidden', '');
    try {
    this.hud.querySelector('#ph-end')?.setAttribute('hidden', '');
    this.hud.querySelector('#ph-load') && (this.hud.querySelector('#ph-load').hidden = false);
    await Promise.all([preloadDungeonAssets(), hydrateSkillApi()]);
    this.loadout = loadoutFor(this.classId, this.weaponId).map(stampSpell);
    this.refreshHudBars();

    const start = this.worldOf(dungeon, dungeon.rooms[dungeon.entrance].cx, dungeon.rooms[dungeon.entrance].cy);
    this.pos = new THREE.Vector3(start.x, 0, start.z);
    this.entrancePos = this.pos.clone();
    this.spellPages = [];
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
    await this.bindClassKit();
    this.cds = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    this.casting = 0;
    this.castMax = 0.35;
    this.activeSlot = 1;
    this.ended = null;
    this.hitstop = 0;
    this.hitQ = [];
    this.timeScale = 1;
    this.path = this.critPath(dungeon);
    this.pathI = 0;
    this.nav = buildNavMesh(dungeon);
    attachDungeonTerrain(dungeon);
    this.sampler = dungeon.terrain?.sample || null;
    const graph = makeInstanceGraph(this.group);
    this.layers = graph.layers;
    this.instance = dungeonToInstance(dungeon, {
      linear: this.linearCrawl,
      maxPlayers: 8,
      catalog: instanceCatalog(dungeon),
      kind: dungeon.params?.kind,
      skills: (this.loadout || []).map((s) => s.id),
      nodes: instanceNodeManifest(dungeon),
    });
    bindScript(this, dungeon, { linear: this.linearCrawl, playerRace: this.raceId });
    await loadInteriorKits();
    await plantDressPlan(this.instance.dress, this.layers.Dress || this.group);
    this.gates?.dispose();
    this.gates = new DungeonGates();
    await this.gates.plant(dungeon, this.group);
    this.pinata = new DungeonPinata(this.layers.Pinata || this.group, {
      flash: (m) => toast(m),
      onBreak: (node) => {
        clearPinataCell(this.d, node);
        if (node.i != null) dropBarrierCollider(this.phys, node.i);
        this.nav = buildNavMesh(this.d);
        rebuildDungeonNav(this.d);
        this.sampler = this.d.terrain?.sample || this.sampler;
        hearBreak(this, node.gx, node.gz);
        if (node.drop) {
          this.bag = addLoot(this.bag, node.drop, 1);
          toast(`Loot · ${node.drop}`);
        }
      },
    });
    this.pinata.registerDungeon(this.d);
    this.group.traverse((o) => {
      if (o.userData?.dress && o.userData.block) this.pinata.registerWrap(o);
    });
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
    const bootForm = defaultFormFor(this.classId);
    if (bootForm) await this.enterForm(bootForm);
    this.player.bindTerrain(this.sampler);
    this.player.root.position.copy(this.pos);
    groundRoot(this.player.root, this.sampler, this.pos.x, this.pos.z);
    (this.layers?.Actors || this.group).add(this.player.root);
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
      (this.layers?.Actors || this.group).add(actor.root);
      return a;
    }));

    this.lobby = new TeamLobby(this.group);
    await this.lobby.mount(this.pos);
    this._placePartyOnPads();
    this.phase = 'lobby';
    const loadEl = this.hud.querySelector('#ph-load');
    if (loadEl) loadEl.hidden = true;
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
    this.pinata?.clear();
    this.pinata = null;
    this.gates?.dispose();
    this.gates = null;
    this.gateCast = null;
    this._reward = null;
    this.timer0 = 0;
    this.reviveT = 0;
    this.player?.dispose();
    for (const a of this.allies) a.actor.dispose();
    this.allies = [];
    for (const s of this.summons || []) s.actor?.dispose();
    this.summons = [];
    this.clearTotem();
    this._formMixer?.stopAllAction();
    this._formMixer = null;
    this._formVis = null;
    if (this._handGlow) { this._handGlow.parent?.remove(this._handGlow); this._handGlow = null; }
    for (const e of this.enemies) e.actor.dispose();
    this.enemies = [];
    this.player = null;
    this.ctx.scene.remove(this.group);
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.tps?.disable();
    if (this._fogWas != null && this.ctx.scene?.fog) this.ctx.scene.fog.density = this._fogWas;
    this._fogWas = null;
    this.ctx.cam.zoom = 1;
    this.ctx.cam.updateProjectionMatrix();
    if (!silent) this.ctx.onExitPlay?.();
  }

  playCamera() {
    return this.active && this.tps?.enabled ? this.tps.camera : null;
  }

  inCombat() {
    return (this.enemies || []).some((e) => e.alive && e.pos.distanceTo(this.pos) < 11);
  }

  toggleFocus() {
    this.focusEnabled = !this.focusEnabled;
    this.hud?.querySelector('#ph-crosshair')?.classList.toggle('focus', this.focusEnabled);
    toast(this.focusEnabled ? 'Focus ON' : 'Focus OFF');
  }

  openRadial() {
    if (this.radial || this.phase !== 'crawl' || this.inCombat()) return;
    this.radial = true;
    paintClassRadial(this.hud, this.classSkills, true);
  }

  closeRadial() {
    if (!this.radial) return;
    this.radial = false;
    paintClassRadial(this.hud, this.classSkills, false);
  }

  trySlide() {
    if (!this.active || this.ended || this.downed || this.slideCd > 0 || this.phase !== 'crawl') return;
    if (!canAct(this.status) || !canMove(this.status)) return;
    const spec = PLAY.slide;
    if ((this.stamina || 0) < spec.stam * 0.35) { toast('Winded'); return; }
    this.stamina -= spec.stam;
    this.slideCd = spec.cd;
    const yaw = this.tps?.enabled ? this.tps.yaw : this.ctx.yaw;
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    this.dashAlong(fwd, spec.distance);
    this.hitRadius(this.pos, spec.hitRadius, spec.damage);
    this.player?.requestOneShot?.('slide', spec.duration);
    toast('Slide');
  }

  facing() {
    const yaw = this.tps?.enabled ? this.tps.yaw : this.ctx.yaw;
    // Camera-relative forward
    let fx = 0, fz = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) { fx += Math.sin(yaw); fz += Math.cos(yaw); }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) { fx -= Math.sin(yaw); fz -= Math.cos(yaw); }
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) { fx -= Math.cos(yaw); fz += Math.sin(yaw); }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) { fx += Math.cos(yaw); fz -= Math.sin(yaw); }
    const moving = fx * fx + fz * fz > 0.01;
    const looking = !!(this.focusEnabled || (this.tps?.enabled && (this.tps._rmb || this.tps._locked?.())));
    if (this.tps?.enabled && this.phase === 'crawl') {
      this.tps.getLookDirection(this.aim);
      this.aim.y = 0;
      if (this.aim.lengthSq() > 1e-6) this.aim.normalize();
    } else if (this.aiming?.target) {
      this.aim.copy(this.aiming.dir);
    } else if (looking || this.casting > 0 || this.blocking) {
      this.aim.set(Math.sin(yaw), 0, Math.cos(yaw));
    } else if (moving) {
      this.aim.set(fx, 0, fz).normalize();
    }
    return { fx, fz, moving, looking };
  }

  tryMove(dt) {
    tickStatus(this.status, dt);
    this.slideCd = Math.max(0, (this.slideCd || 0) - dt);
    this.itemCds[0] = Math.max(0, (this.itemCds[0] || 0) - dt);
    this.itemCds[1] = Math.max(0, (this.itemCds[1] || 0) - dt);
    this.comboT = Math.max(0, (this.comboT || 0) - dt);
    if (this.comboT <= 0) this.comboStage = 0;
    paintStatus(this.player, this.status);
    if (this.dodgeT > 0) {
      this.dodgeT = Math.max(0, this.dodgeT - dt);
      const elapsed = PLAY.dodge.duration - this.dodgeT;
      this.iframes = (elapsed >= PLAY.dodge.iframeStart && elapsed < PLAY.dodge.iframeEnd) ? 0.08 : 0;
    }
    const nearDown = (this.allies || []).some((a) => a.downed && a.pos.distanceTo(this.pos) < 1.7);
    const nearLoot = !!this.nearCorpse();
    const nearGate = !!this.gates?.near(this.pos.x, this.pos.z);
    const blockKey = loadHudLayout().binds.block || PLAY.block.key;
    const eHeld = this.keys.has(blockKey) && !this._lootE && !this._gateE;
    if (eHeld && this.phase === 'crawl' && !nearDown && !nearLoot && !nearGate && !this.inCombat()) {
      this._eHold = (this._eHold || 0) + dt;
      if (this._eHold >= 0.28) this.openRadial();
    } else {
      this._eHold = 0;
      if (!eHeld) this.closeRadial();
    }
    this.blocking = !this.downed && this.phase === 'crawl' && eHeld && this.inCombat() && !nearDown && !nearLoot && !nearGate && !this.radial;
    this.player?.setHold?.('block', this.blocking);
    if (this.keys.has('KeyR') && this.phase === 'crawl' && !this.downed) {
      this._rHold = (this._rHold || 0) + dt;
      if (this._rHold >= 0.28) this.openItemRadial();
    } else if (this._rHold > 0) {
      if (this._rHold < 0.28) this.tapClassItem();
      this._rHold = 0;
      this.closeItemRadial();
    }
    this.tickTotem(dt);
    this.tickRanger(dt);
    this.tickThief(dt);
    this.tickTonic(dt);
    this.tickPagePortal(dt);
    this.tickHandGlow();
    if ((this.classState?.tauntDefT || 0) > 0) this.classState.tauntDefT -= dt;
    if ((this.classState?.overpowerT || 0) > 0) this.classState.overpowerT -= dt;
    if (!canMove(this.status)) {
      this.vel.set(0, 0, 0);
      this.player?.setHold?.('block', false);
      this.player?.setGait(false, false);
      return;
    }
    if (this.blocking) {
      this.stamina = Math.max(0, (this.stamina || 0) - PLAY.block.drain * dt);
      if (this.stamina <= 0) this.blocking = false;
    }
    const { fx, fz, moving } = this.facing();
    const wantSprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const sprint = wantSprint && this.stamina > 2 && !this.blocking && this.dodgeT <= 0;
    if (sprint) this.stamina = Math.max(0, this.stamina - PLAY.sprintStamina * dt);
    const mountMul = mountById(this.mountId).speed || 1;
    let speed = (this.downed ? 0.95 : this.blocking ? PLAY.walkSpeed * 0.45 : (sprint ? PLAY.runSpeed : PLAY.walkSpeed)) * (this.downed ? 1 : mountMul);
    if (this.classId === 'thief' && this.classState?.hidden) speed *= classSkill0('thief')?.speedMul || 0.7;
    if (this.classState?.markStacks > 0) speed *= 1 + this.classState.markStacks * 0.02;
    if ((this.classState?.meleeSlowT || 0) > 0) speed *= 0.5;
    const target = new THREE.Vector3(fx, 0, fz);
    if (moving && this.dodgeT <= 0) target.normalize().multiplyScalar(speed);
    else if (this.dodgeT > 0) { /* dodge owns vel */ }
    else target.set(0, 0, 0);
    this.vel.x += (target.x - this.vel.x) * Math.min(1, PLAY.accel * dt);
    this.vel.z += (target.z - this.vel.z) * Math.min(1, PLAY.accel * dt);
    this._air = false;
    if (!this._lastPos) this._lastPos = this.pos.clone();
    if (this.gateCast) {
      this.vel.x = 0;
      this.vel.z = 0;
    }
    if (this.phys) {
      if (this.classId === 'thief' && this.classState?.hidden && this.keys.has('Space')) {
        this.endThiefInvis();
        toast('Exposed');
      }
      const jump = !this.downed && this.dodgeT <= 0 && this.keys.has('Space') && !(this.classId === 'thief' && this.classState?.hidden);
      const stepped = stepDungeonPhysics(this.phys, this.vel.x, this.vel.z, dt, jump);
      if (stepped) {
        if (gateBlocks(this, stepped.x, stepped.z)) {
          this.pos.copy(this._lastPos);
          this.vel.set(0, 0, 0);
          setPhysicsFeet(this.phys, this.pos.x, this.pos.z);
        } else {
          this.pos.x = stepped.x;
          this.pos.z = stepped.z;
          this.pos.y = stepped.y;
          this._air = !stepped.grounded;
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
      this.player.airborne = this._air;
      this.player.root.position.copy(this.pos);
      if (!this._air) groundRoot(this.player.root, this.sampler, this.pos.x, this.pos.z);
      if (this.aim.lengthSq() > 0) {
        const want = Math.atan2(this.aim.x, this.aim.z);
        let cur = this.player.root.rotation.y;
        let d = want - cur;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.player.root.rotation.y = cur + d * (1 - Math.exp(-14 * dt));
      }
      if (this.dodgeT <= 0) {
        let strafe = null;
        if (moving && !this.downed && this.aim.lengthSq() > 0) {
          const rightX = this.aim.z;
          const rightZ = -this.aim.x;
          const lat = fx * rightX + fz * rightZ;
          const fwd = fx * this.aim.x + fz * this.aim.z;
          if (Math.abs(lat) > 0.65 && Math.abs(fwd) < 0.55) strafe = lat < 0 ? 'left' : 'right';
        }
        this.player.setGait(moving, this.downed ? false : sprint, {
          downed: this.downed,
          sneak: !!(this.classId === 'thief' && this.classState?.hidden),
          strafe,
        });
        this._syncFormGait(moving, this.downed ? false : sprint);
      }
      if (this._air && !this._wasAir) this.player.requestOneShot?.('jump');
      this._wasAir = this._air;
      if (this._formMixer) {
        this._formMixer.update(dt);
        if (!this._formBusy()) this._syncFormGait(moving, this.downed ? false : sprint);
      }
      if (this.classState?.form === 'iguana' && !this.downed) {
        this._iguanaHotT = (this._iguanaHotT || 0) - dt;
        if (this._iguanaHotT <= 0) {
          this._iguanaHotT = 2.4;
          this.applyPartyHeal(8, this.pos, { range: 4.2, color: 0x6bbf4a, name: 'Iguana bloom' });
        }
      }
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
      playerDowned: this.downed,
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
        const fire = () => {
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
          else if (spell.kind === 'projectile' || spell.kind === 'beam') {
            const dir = foe ? foe.pos.clone().sub(a.pos).setY(0) : a.aim.clone();
            if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
            else dir.normalize();
            const origin = a.pos.clone();
            origin.y = 1.15;
            this.linear.line({
              origin, dir, color: spell.color, range: spell.range || 12,
              speed: spell.speed || 18, onHit: (e) => this.hurt(e, dealt),
              meshPath: spell.meshPath || null, shader: elementShader(spell.element),
              overlay: spell.overlay || null,
            });
          } else if (foe) this.hurt(foe, dealt);
          if (foe) this.vfx.impact({ origin: foe.pos.clone().setY(1.1), color: spell.color || 0xe8e0c8 });
        };
        const delay = spell.heal ? 0.08 : hitWindowSec(a.actor?.clips?.attack?.duration || 0.42, spell.kind === 'slash' ? 0.32 : 0.22);
        this.hitQ.push({ t: delay, fn: fire });
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

  tryDodge(side = 'back') {
    if (!this.active || this.ended || this.dodgeCd > 0 || this.phase === 'lobby' || this.phase === 'loading' || this.downed) return;
    const spec = PLAY.dodge;
    const cost = spec.stam;
    if ((this.stamina || 0) < cost * 0.35) { toast('Winded'); return; }
    this.stamina = Math.max(0, (this.stamina || 0) - cost);
    this.dodgeCd = spec.cd;
    this.dodgeT = spec.duration;
    this.iframes = 0;
    const yaw = this.tps?.enabled ? this.tps.yaw : this.ctx.yaw;
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    let dodgeDir;
    if (side === 'left') dodgeDir = right.clone().multiplyScalar(-1);
    else if (side === 'right') dodgeDir = right.clone();
    else dodgeDir = fwd.clone().multiplyScalar(-1);
    const from = this.pos.clone().setY(0.95);
    if (this.classId === 'thief' && this.classState?.hidden) { this.endThiefInvis(); toast('Exposed'); return; }
    const extra = (this.classId === 'ranger' && side === 'back') ? (classSkill0('ranger')?.dodgeBackBonusM || 1) : 0;
    this.dashAlong(dodgeDir, spec.maxDistance * 0.7 + extra);
    this.vfx.speedTrail({
      from,
      to: this.pos.clone().setY(0.95),
      mesh: this.player?.root,
      color: 0xc5d0e0,
      life: 0.42,
      kind: 'smoke',
    });
    this.player?.requestOneShot?.('dodge', spec.duration);
    this.vel.set(0, 0, 0);
    toast(side === 'left' || side === 'right' ? 'Roll' : 'Dodge');
  }

  tryParry() {
    if (!this.active || this.ended || this.parryCd > 0) return;
    const cost = PLAY.parry.stam;
    if ((this.stamina || 0) < cost * 0.35) return;
    this.stamina = Math.max(0, (this.stamina || 0) - cost);
    this.parryCd = PLAY.parry.cd;
    this.parryT = PLAY.parry.window;
    this.player?.requestOneShot?.('parry', 0.24);
    toast('Parry');
  }

  takeDamage(incoming, attacker, kind = 'hit') {
    if (this.iframes > 0) { toast('Dodged'); return 0; }
    if (this.classState?.hidden) this.endRangerInvis(false);
    const melee = kind === 'cone' || kind === 'slash' || kind === 'swipe';
    if (typeof incoming !== 'number') incoming = Number(incoming?.damage) || 8;
    applyHitReact(this.status);
    this.player?.requestOneShot?.('hit', 0.16);
    if ((this.shieldHp || 0) > 0) {
      const soak = Math.min(this.shieldHp, incoming);
      this.shieldHp -= soak;
      incoming -= soak;
      if (incoming <= 0) { toast('Shield'); return 0; }
    }
    if ((this.classState?.tauntDefT || 0) > 0) incoming *= (1 - (classSkill0('warrior')?.defBonus || 0.4));
    if (this.blocking) {
      playSfx('combat_block', { volume: 0.35 });
      const from = attacker?.pos;
      const facing = from
        ? this.aim.clone().setY(0).normalize().dot(from.clone().sub(this.pos).setY(0).normalize())
        : 1;
      let factor = PLAY.block.factor;
      if (this.classId === 'warrior') factor = Math.max(factor, WARRIOR_TANK.block.factor);
      const sheetBlock = this.sheet?.block || 0;
      factor = Math.min(0.85, factor + sheetBlock * 0.35);
      if (facing < (PLAY.block.facingDot || 0.15)) factor *= 0.45;
      const stam = this.classId === 'warrior' ? WARRIOR_TANK.block.stamina : PLAY.block.stam;
      if ((this.stamina || 0) >= stam * 0.2) {
        this.stamina = Math.max(0, this.stamina - stam);
        incoming *= (1 - factor);
        addGrudgeStack(this.classState);
        toast('Block');
      } else this.blocking = false;
    }
    if (this.parryT > 0 && melee) {
      this.parryT = 0;
      addGrudgeStack(this.classState);
      const foe = (this.enemies || [])
        .filter((e) => e.alive && e.pos.distanceTo(this.pos) < 3.8)
        .sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos))[0];
      if (foe) {
        if (!foe.status) foe.status = makeStatus();
        applyHitReact(foe.status, { stun: PLAY.parry.stun || 1.4 });
        paintStatus(foe.actor, foe.status);
        foe.actor?.requestOneShot?.('stun', 0.35);
        toast('Parry · stagger');
      } else toast('Parry');
      return 0;
    }
    const tank = this.classId === 'warrior' && this.classState;
    const raider = this.classId === 'raider' && this.classState;
    if (this.blocking && raider && RAIDER_TWO_HAND.autoParry && melee && (this.classState.autoParryCd || 0) <= 0) {
      if (Math.random() < RAIDER_TWO_HAND.autoParryChance) {
        this.classState.autoParryCd = 1.4;
        this.parryT = PLAY.parry.window;
        toast('Overpower parry');
        return 0;
      }
    }
    if (tank && WARRIOR_TANK.autoParry && melee && (this.classState.autoParryCd || 0) <= 0) {
      const form = WARRIOR_TANK.forms[this.classState.form] || WARRIOR_TANK.forms.form_bulwark;
      if (Math.random() < (WARRIOR_TANK.autoParryChance || 0.28) + (form.blockChance || 0)) {
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
    if (this.downed) return 0;
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.hp = 0;
      this.knockDown(null);
    }
    return dmg;
  }

  hurtAlly(a, amount) {
    if (!a || a.downed || !a.alive) return;
    if (!a.status) a.status = makeStatus();
    applyHitReact(a.status);
    paintStatus(a.actor, a.status);
    a.actor?.requestOneShot?.('hit', 0.16);
    a.hp -= Math.max(1, Math.round(amount));
    if (a.hp <= 0) this.knockDown(a);
  }

  splashParty(origin, radius, incoming, attacker, kind) {
    if (!origin) return;
    if (this.pos.distanceTo(origin) <= radius) this.takeDamage(incoming, attacker, kind);
    const amt = typeof incoming === 'number' ? incoming : (incoming?.damage || 8);
    for (const a of this.allies || []) {
      if (a.downed) continue;
      if (a.pos.distanceTo(origin) <= radius + 0.35) this.hurtAlly(a, amt * 0.65);
    }
  }

  knockDown(ally) {
    if (ally) {
      ally.downed = true;
      ally.hp = 0;
      ally.actor.play?.('death', 0.12, false);
      toast(`${CLASSES[ally.classId]?.label || 'Ally'} down · hold E`);
      return;
    }
    if (this.downed) return;
    this.downed = true;
    this.hp = 0;
    this.player?.play?.('death', 0.12, false);
    toast('Downed · crawl · allies can lift you (hold E)');
  }

  revive(who) {
    if (who) {
      who.downed = false;
      who.hp = Math.max(1, Math.round(who.hpMax * 0.35));
      who.actor.play?.('idle', 0.2, true);
      toast(`${CLASSES[who.classId]?.label || 'Ally'} lifted`);
      return;
    }
    this.downed = false;
    this.hp = Math.max(1, Math.round((this.sheet?.hpMax || PLAY.hp) * 0.35));
    this.player?.play?.('idle', 0.2, true);
    toast('Lifted');
  }

  tickRevive(dt) {
    this.reviveT = this.reviveT || 0;
    const holding = this.keys.has('KeyE');
    const near = (this.allies || []).find((a) => a.downed && a.pos.distanceTo(this.pos) < 1.7);
    if (this.downed) {
      const helper = (this.allies || []).find((a) => !a.downed && a.pos.distanceTo(this.pos) < 1.7);
      if (helper) {
        this.reviveT += dt;
        if (this.reviveT >= 2) { this.reviveT = 0; this.revive(null); }
      } else this.reviveT = 0;
      return;
    }
    if (holding && near && !this.downed) {
      this.reviveT += dt;
      if (this.reviveT >= 2) { this.reviveT = 0; this.revive(near); }
    } else if (!holding) this.reviveT = 0;
  }

  spawnBossReward(origin) {
    if (this._reward) return;
    const y = 0.2;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.08, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.85 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(origin.x, y + 0.4, origin.z);
    ring.name = 'boss-portal';
    (this.layers?.Vfx || this.group).add(ring);
    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.45, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.45, metalness: 0.35 }),
    );
    chest.position.set(origin.x, y + 0.22, origin.z + 1.2);
    chest.name = 'boss-chest';
    (this.layers?.Dress || this.group).add(chest);
    this._reward = { ring, chest };
    this.bag = addLoot(this.bag, 'iron_bit', 3);
    this.bag = addLoot(this.bag, 'stone_chip', 5);
    toast('Portal opens · reward chest');
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
    const who = this.classId === 'thief' ? 'Satchel' : this.classId === 'ranger' ? "Ranger's Log" : 'Lockpick';
    this.player?.requestOneShot?.('interact', 0.6);
    toast(`${who} · lockpick ← →  Space`);
  }

  canClassLockpick() {
    return this.classId === 'ranger' || this.classId === 'thief';
  }

  tryHarvestF() {
    if (this.phase !== 'crawl' || this.downed) return false;
    const chestNear = this.pinata?.nearest?.(this.pos, 2.4) || (this._reward?.chest && this.pos.distanceTo(this._reward.chest.position) < 2.6);
    if (chestNear) {
      if (this.canClassLockpick()) { this.tryLockpick(); return true; }
      if ((this.itemCounts?.lockpick || 0) > 0 || (this.bag?.lockpick_set || 0) > 0 || (this.itemCounts?.lockpick_set || 0) > 0) {
        if ((this.itemCounts?.lockpick || 0) > 0) this.itemCounts.lockpick -= 1;
        else if ((this.itemCounts?.lockpick_set || 0) > 0) this.itemCounts.lockpick_set -= 1;
        else this.bag = spendLoot(this.bag, { lockpick_set: 1 }) || this.bag;
        this.tryLockpick();
        this.refreshHudBars();
        return true;
      }
      toast('Need a lockpick');
      return true;
    }
    if (this.canClassLockpick() && !this.inCombat()) {
      const npc = (this.enemies || []).filter((e) => e.alive && e.pos.distanceTo(this.pos) < 2.2)
        .sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos))[0];
      if (npc) {
        this.bag = addLoot(this.bag, 'cloth_scrap', 1);
        toast(this.classId === 'thief' ? 'Satchel · steal' : 'Log · lift');
        return true;
      }
    }
    return false;
  }

  bootVial() {
    if (!canRefillTonic(this.classId)) return;
    if (!this.vial) this.vial = { id: 'tonic_blood', charge: 0, max: CLASS_CRAFTS.tonic_blood.maxCharge };
  }

  tickTonic(dt) {
    if (!this.vial || !canRefillTonic(this.classId) || !this.inCombat()) return;
    const spec = CLASS_CRAFTS[this.vial.id] || CLASS_CRAFTS.tonic_blood;
    this.vial.charge = Math.min(spec.maxCharge, (this.vial.charge || 0) + spec.fillPerSec * dt);
  }

  craftUnique(craftId) {
    const spec = CLASS_CRAFTS[craftId];
    if (!spec || !spec.makers.includes(this.classId)) { toast('Not your craft'); return; }
    if (spec.kind === 'tonic') {
      this.vial = { id: spec.id, charge: 0, max: spec.maxCharge };
      toast(`${spec.name} slotted · fills in combat`);
      return;
    }
    const next = spendLoot(this.bag, spec.cost);
    if (!next) { toast('Need mats'); return; }
    this.bag = addLoot(next, spec.id, 1);
    this.itemCounts[spec.id] = (this.itemCounts[spec.id] || 0) + 1;
    if (spec.id === 'spell_page') {
      const earned = this.classState?.earned || [];
      const sid = earned[this.classState?.wandPick || 0] || earned[0];
      this.spellPages = this.spellPages || [];
      if (sid) this.spellPages.push(sid);
      toast(`Spell page · ${sid || 'blank'} (single use)`);
    } else {
      toast(`Crafted ${spec.name} · in bag (offer/trade)`);
    }
    this.refreshHudBars();
  }

  offerCraft(craftId) {
    const spec = CLASS_CRAFTS[craftId];
    if (!spec) return;
    if (spec.kind === 'tonic') {
      if (!this.vial || (this.vial.charge || 0) < (spec.minUse || 25)) { toast('Vial not charged'); return; }
      this.bag = addLoot(this.bag, spec.id, 1);
      this.vial.charge = 0;
      toast(`${spec.name} bottled · bag (others can drink, only you refill)`);
      return;
    }
    toast(`${spec.name} already in bag`);
  }

  useTonic(id) {
    const spec = CLASS_CRAFTS[id] || CLASS_CRAFTS.tonic_blood;
    const slotted = this.vial && this.vial.id === id;
    let charge = 0;
    if (slotted && canRefillTonic(this.classId)) charge = this.vial.charge || 0;
    else if ((this.itemCounts[id] || 0) > 0 || (this.bag[id] || 0) > 0) charge = spec.maxCharge;
    if (charge < (spec.minUse || 25)) { toast('Tonic empty'); return; }
    const frac = charge / spec.maxCharge;
    const hpMax = this.sheet?.hpMax || PLAY.hp;
    this.hp = Math.min(hpMax, this.hp + Math.round(hpMax * spec.healFrac * frac));
    this.mana = Math.min(this.sheet?.manaMax || 100, (this.mana || 0) + Math.round(spec.mana * frac));
    this.stamina = Math.min(this.sheet?.staminaMax || 100, (this.stamina || 0) + Math.round(spec.stamina * frac));
    if (slotted && canRefillTonic(this.classId)) this.vial.charge = 0;
    else {
      if ((this.itemCounts[id] || 0) > 0) this.itemCounts[id] -= 1;
      else this.bag = spendLoot(this.bag, { [id]: 1 }) || this.bag;
    }
    toast(`${spec.name} · heal + regen`);
    this.refreshHudBars();
  }

  useFormPage() {
    const form = this.classId === 'verduror' ? 'iguana' : 'bear';
    if ((this.itemCounts.form_page || 0) < 1 && (this.bag.form_page || 0) < 1) { toast('No form page'); return; }
    if ((this.itemCounts.form_page || 0) > 0) this.itemCounts.form_page -= 1;
    else this.bag = spendLoot(this.bag, { form_page: 1 }) || this.bag;
    this.classState.unlocked = this.classState.unlocked || [];
    if (!this.classState.unlocked.includes(form)) this.classState.unlocked.push(form);
    void this.enterForm(form);
    toast('Form page · claws');
    this.refreshHudBars();
  }

  useSpellPage() {
    if ((this.itemCounts.spell_page || 0) < 1 && (this.bag.spell_page || 0) < 1) { toast('No spell page'); return; }
    if ((this.itemCounts.spell_page || 0) > 0) this.itemCounts.spell_page -= 1;
    else this.bag = spendLoot(this.bag, { spell_page: 1 }) || this.bag;
    const sid = (this.spellPages || []).shift();
    const spell = sid ? skillById(sid) : null;
    if (spell) this.fireSpell({ ...spell, classSkill: true, mana: 0, stamina: 0 });
    toast(`Spell page · ${spell?.name || sid || 'spent'}`);
    this.refreshHudBars();
  }

  usePortalPage() {
    if ((this.itemCounts.spell_page_portal || 0) < 1 && (this.bag.spell_page_portal || 0) < 1) { toast('No portal page'); return; }
    if ((this.itemCounts.spell_page_portal || 0) > 0) this.itemCounts.spell_page_portal -= 1;
    else this.bag = spendLoot(this.bag, { spell_page_portal: 1 }) || this.bag;
    const start = this.d?.entrance != null ? this.d.rooms[this.d.entrance] : null;
    const dest = start ? { x: (start.cx || 0), z: (start.cz || 0) } : this.pos;
    const wx = typeof dest.x === 'number' && start ? this.pos.x : this.pos.x;
    void wx;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.08, 10, 28),
      new THREE.MeshBasicMaterial({ color: 0xb070ff, transparent: true, opacity: 0.75 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(this.pos);
    ring.position.y = 1.1;
    this.group.add(ring);
    this._pagePortal = { mesh: ring, life: 12 };
    toast('Portal page · 12s · walk in to return to entrance');
    this.refreshHudBars();
  }

  tickPagePortal(dt) {
    const p = this._pagePortal;
    if (!p) return;
    p.life -= dt;
    p.mesh.rotation.z += dt * 1.2;
    if (p.life <= 0) {
      p.mesh.parent?.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      this._pagePortal = null;
      return;
    }
    if (this.pos.distanceTo(p.mesh.position) < 1.15 && this.entrancePos) {
      this.pos.copy(this.entrancePos);
      setPhysicsFeet(this.phys, this.pos.x, this.pos.z);
      this.player.root.position.copy(this.pos);
      toast('Portal · entrance');
      p.life = 0;
    }
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
    (this.layers?.Actors || this.group).add(actor.root);
    this.allies[index] = next;
    toast(`Ally ${index + 1} → ${CLASSES[classId].label}`);
  }

  async setPlayerClass(classId) {
    if (!this.active || this.phase !== 'lobby') return;
    if (!CLASS_IDS.includes(classId) || classId === this.classId) return;
    this.classId = classId;
    this.classState = makeClassState(classId);
    this.bootVial();
    const sets = weaponsForClass(classId);
    this.weaponSet = 0;
    this.weaponId = sets[0];
    this.loadout = loadoutFor(classId, this.weaponId).map(stampSpell);
    this.refreshHudBars();
    try {
      this.sheet = deriveSheet(await loadInfoCombat(), this.raceId, classId, PLAY.level);
    } catch {
      this.sheet = fallbackSheet(this.raceId, classId);
    }
    this.hp = this.sheet.hpMax;
    this.mana = this.sheet.manaMax;
    this.stamina = this.sheet.staminaMax;
    const pos = this.pos.clone();
    this.player?.dispose();
    this.player = await spawnActor({ prefab: playerPrefab(this.raceId, classId, this.weaponId), equipped: true });
    const bootForm = defaultFormFor(this.classId);
    if (bootForm) await this.enterForm(bootForm);
    this.player.bindTerrain(this.sampler);
    this.player.root.position.copy(pos);
    groundRoot(this.player.root, this.sampler, pos.x, pos.z);
    (this.layers?.Actors || this.group).add(this.player.root);
    attachPlayHelpers(this.player.root, { height: PLAY.playerHeight });
    await this.bindClassKit();
    toast(`You · ${CLASSES[classId].label} · ${WEAPON_LABEL[this.weaponId] || this.weaponId}`);
  }

  async setPlayerWeapon(weaponId) {
    if (!this.active || (this.phase !== 'lobby' && this.phase !== 'crawl')) return;
    const sets = weaponsForClass(this.classId);
    if (!sets.includes(weaponId)) return;
    this.weaponSet = sets.indexOf(weaponId);
    this.weaponId = weaponId;
    this.loadout = loadoutFor(this.classId, weaponId).map(stampSpell);
    this.refreshHudBars();
    reequipActor(this.player, this.classId, weaponId);
    toast(`${WEAPON_LABEL[weaponId] || weaponId} armed`);
  }

  swapWeaponSet() {
    if (!this.active) return;
    const sets = weaponsForClass(this.classId);
    if (sets.length < 2) return;
    this.weaponSet = (this.weaponSet + 1) % sets.length;
    this.weaponId = sets[this.weaponSet];
    this.loadout = loadoutFor(this.classId, this.weaponId).map(stampSpell);
    this.refreshHudBars();
    reequipActor(this.player, this.classId, this.weaponId);
    const named = this.loadout[0]?.weaponName;
    toast(`${named || WEAPON_LABEL[this.weaponId] || this.weaponId} · Q swap`);
  }

  async beginCrawl() {
    if (!this.active || this.phase !== 'lobby') return;
    this.phase = 'loading';
    document.body.classList.remove('lobbying');
    const loadEl = this.hud.querySelector('#ph-load');
    if (loadEl) {
      loadEl.hidden = false;
      const msg = loadEl.querySelector('b');
      if (msg) msg.textContent = 'Loading halls · scripts · kits · VFX';
    }
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
    this._enableTps();
    if (loadEl) loadEl.hidden = true;
    this.timer0 = performance.now();
    this.phase = 'crawl';
    this.downed = false;
    toast(`${this.sheet.className} Lv${this.sheet.level || PLAY.level} · RMB look · WASD · 1–6 weapon · F class`);
  }

  _enableTps() {
    const fog = this.ctx.scene?.fog;
    if (fog && this._fogWas == null) this._fogWas = fog.density;
    if (fog) fog.density = PLAY.tps.fog;
    this.tps.setDungeon(this.d);
    const occ = [this.layers?.Terrain, this.layers?.Cover, this.layers?.Dress].filter(Boolean);
    this.tps.setOccluders(occ);
    const yaw = this.aim.lengthSq() > 0 ? Math.atan2(this.aim.x, this.aim.z) : 0;
    this.tps.snap(this.pos.x, this.pos.y, this.pos.z, yaw);
    this.tps.enable();
    this.tps.resize();
    if (this.aiming) {
      this.aiming.camera = this.tps.camera;
      this.aiming.setPointer(0, 0);
    }
  }

  async _spawnFoes() {
    const dungeon = this.d;
    const theme = dungeon.params.themeKey;
    await hydrateSkillApi();
    const { plan } = planEncounters(dungeon, {
      linear: this.linearCrawl,
      kind: dungeon.params?.kind || 'biome',
      playerRace: this.raceId,
      level: this.sheet?.level || PLAY.level,
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
            role: j.classId || j.role || 'warrior',
            classId: j.classId,
            weaponId: j.weaponId,
            brain,
            height: j.height,
            hp: j.hp,
            speed: j.speed,
            radius: j.radius,
            equipped: true,
            scale: j.scale,
          }
          : prefabFor(theme, r.type === 'boss' ? 'boss' : r.type === 'elite' ? 'elite' : 'combat', r.id * 5 + i));
      jobs.push({
        r, w, j,
        prefab: {
          ...prefab,
          brain,
          hp: j.hp || prefab.hp,
          label: j.name || prefab.label,
          yaw: j.yaw || prefab.yaw,
          classId: j.classId || prefab.classId,
          weaponId: j.weaponId,
          loadout: j.loadout,
          packId: j.packId,
          packRole: j.packRole,
          aiPlayer: !!j.aiPlayer,
          nerf: j.nerf,
          scale: j.scale || prefab.scale,
        },
      });
    }
    const spawned = await Promise.all(jobs.map((j) => spawnActor({
      prefab: j.prefab,
      equipped: true,
    }).then((actor) => ({ actor, j }))));
    for (const { actor, j } of spawned) {
      const r = j.r;
      const p = j.prefab;
      const lv = this.sheet?.level || PLAY.level;
      let sheet = p.aiPlayer
        ? nerfSheet(fallbackSheet(p.raceId || 'orc', p.classId || 'warrior'), p.nerf || 0.62)
        : null;
      try {
        if (p.aiPlayer) {
          sheet = nerfSheet(deriveSheet(await loadInfoCombat(), p.raceId || 'orc', p.classId || 'warrior', lv), p.nerf || 0.62);
        }
      } catch { /* fallback sheet */ }
      const hp = sheet ? sheet.hpMax : (p.hp || 52);
      const e = {
        actor,
        prefab: p,
        pos: new THREE.Vector3(j.w.x, 0, j.w.z),
        spawn: new THREE.Vector3(j.w.x, 0, j.w.z),
        hp,
        hpMax: hp,
        radius: p.radius || 0.42,
        speed: p.speed || 3,
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
        boss: r.type === 'boss' || p.brain === 'warlord' || p.scale >= 1.7,
        kind: p.aiPlayer ? (p.packRole === 'cast' || p.packRole === 'heal' ? 'caster' : 'grunt') : (p.brain === 'mage' || p.role === 'mage' ? 'caster' : r.type === 'boss' ? 'boss' : 'grunt'),
        asleep: r.type !== 'entrance' && r.id !== dungeon.entrance,
        aiPlayer: !!p.aiPlayer,
        classId: p.classId,
        weaponId: p.weaponId,
        loadout: p.loadout || (p.classId ? loadoutFor(p.classId, p.weaponId) : null),
        sheet,
        packId: p.packId,
        packRole: p.packRole,
        animal: !!p.animal,
      };
      if (p.scale && p.scale !== 1 && actor.root) actor.root.scale.multiplyScalar(p.scale);
      actor.root.userData.mmoCombat = {
        aggro: { detectionRadius: AGGRO.detection, aggroRadius: AGGRO.aggro, assistRadius: AGGRO.assist, leashRadius: AGGRO.leash },
        behavior: p.brain || 'pursue',
        packId: e.packId,
        packRole: e.packRole,
        telegraph: { variant: e.kind === 'caster' ? 'incoming' : 'cone' },
      };
      attachYuka(e);
      actor.bindTerrain(this.sampler);
      actor.root.position.copy(e.pos);
      groundRoot(actor.root, this.sampler, e.pos.x, e.pos.z);
      actor.root.userData.selectable = 'hostile';
      (this.layers?.Actors || this.group).add(actor.root);
      e.status = makeStatus();
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
    if (!this.active || this.ended || this.casting > 0 || this.phase === 'lobby' || this.phase === 'loading' || this.downed) return;
    let spell = (this.loadout || [])[n - 1];
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
    this.classActive = null;
    this.mana -= spell.mana || 0;
    this.stamina -= stamCost;
    this.cds[n] = spell.cd;
    if (n === 1 && isMeleeKit(this.weaponId) && spell.kind === 'slash') {
      const combo = nextComboSkill(this.loadout, this.weaponId, this.comboStage);
      if (combo) spell = combo;
      this.comboStage += 1;
      this.comboT = 1.2;
      const lock = this.aiming?.target || this.enemies.filter((e) => e.alive).sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos))[0];
      if (lock) {
        const dist = lock.pos.distanceTo(this.pos);
        const need = (spell.range || 3) + 0.45;
        if (dist > need) {
          const dir = lock.pos.clone().sub(this.pos).setY(0);
          if (dir.lengthSq() > 1e-6) dir.normalize();
          this.dashAlong(dir, Math.min(4.2, dist - need + 0.35));
        }
      }
    }
    this.fireSpell(spell);
  }

  async bindClassKit() {
    try {
      const trees = await loadClassTrees();
      this._trees = trees;
      this.classSkills = classLoadoutFor(this.classId, trees, this.sheet?.level || PLAY.level);
    } catch (err) {
      console.warn('[grudge-dungeon] class trees miss', err?.message || err);
      this.classSkills = [];
    }
    this.classCds = {};
    for (const s of this.classSkills) this.classCds[s.slot] = 0;
    this.refreshHudBars();
  }

  refreshHudBars() {
    if (!this.hud) return;
    let classSkills = this.classSkills;
    if (this.classId === 'ranger' && this.classState?.invisT > 0) {
      const ss = classSkill0('ranger').shadowStrike;
      classSkills = [{ ...classSkill0('ranger'), ...ss, slot: 0, classSkill: true }, ...(this.classSkills || []).slice(1)];
    }
    if (this.classId === 'thief' && this.classState?.invisT > 0) {
      const mk = classSkill0('thief').mark;
      classSkills = [{ ...classSkill0('thief'), ...mk, slot: 0, classSkill: true }, ...(this.classSkills || []).slice(1)];
    }
    const items = (this.itemSlots || DEFAULT_ITEM_SLOTS).map((id) => ({
      ...(COMBAT_ITEMS[id] || { id, name: id }),
      n: (this.itemCounts || {})[id] || 0,
    }));
    paintMappedBars(this.hud, this.loadout, classSkills, {
      items,
      mount: mountById(this.mountId),
    });
  }

  toggleMountMenu() {
    this.mountMenu = !this.mountMenu;
    paintMountMenu(this.hud, MOUNTS, this.mountId, this.mountMenu);
  }

  setMount(id) {
    if (!id) {
      this.toggleMountMenu();
      return;
    }
    this.mountId = id;
    this.mountMenu = false;
    paintMountMenu(this.hud, MOUNTS, id, false);
    const m = mountById(id);
    toast(m.id === 'none' ? 'Dismounted' : `Mount · ${m.name}`);
    this.refreshHudBars();
  }

  useCombatItem(index) {
    if (!this.active || this.ended || this.phase !== 'crawl' || this.downed) return;
    const id = (this.itemSlots || DEFAULT_ITEM_SLOTS)[index];
    const def = COMBAT_ITEMS[id];
    if (!def) return;
    if ((this.itemCds[index] || 0) > 0) return;
    const n = this.itemCounts[id] || 0;
    if (n <= 0) { toast(`${def.name} empty`); return; }
    this.itemCounts[id] = n - 1;
    this.itemCds[index] = def.cd || 4;
    if (def.kind === 'tool') { this.tryLockpick(); return; }
    if (def.kind === 'tonic') { this.useTonic(def.id); return; }
    if (def.kind === 'page') { this.useFormPage(); return; }
    if (def.kind === 'spell_page') { this.useSpellPage(); return; }
    if (def.kind === 'portal') { this.usePortalPage(); return; }
    if (def.kind === 'heal') this.applyPartyHeal(def.heal, this.pos, { name: def.name, from: def.name });
    else if (def.kind === 'projectile') {
      const dir = this.aim.clone().setY(0);
      if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
      else dir.normalize();
      const origin = this.pos.clone();
      origin.y = 1.15;
      this.linear.line({
        origin, dir, color: def.color, range: def.range, speed: def.speed,
        onHit: (e) => this.hurt(e, def.damage, def),
        overlay: def.overlay || null,
      });
    } else if (def.kind === 'nova') {
      this.linear.zone({ origin: this.pos, color: def.color, radius: def.range, life: 0.7 });
      this.vfx.fire({ origin: this.pos.clone().setY(0.8), color: def.color, duration: 'small' });
      this.hitRadius(this.pos, def.range, def.damage);
    }
    toast(def.name);
    this.refreshHudBars();
  }

  castMapped(bar, index) {
    const bars = resolveBarSlots(loadHudLayout(), this.loadout, this.classSkills);
    const spell = bar === 'weapon'
      ? bars.weapon.find((s) => s.slot === index)
      : bars.class.find((s) => s.slot === index);
    if (!spell) return;
    if (spell.classSkill) {
      const i = (this.classSkills || []).findIndex((s) => s.id === spell.id);
      this.castClassSlot(i >= 0 ? i : index);
    } else {
      const n = (this.loadout || []).findIndex((s) => s.id === spell.id) + 1;
      this.castSlot(n || index);
    }
  }

  castClassSlot(i) {
    if (!this.active || this.ended || this.casting > 0 || this.phase === 'lobby' || this.phase === 'loading' || this.downed) return;
    if (i === 0 && this.classId === 'thief' && this.classState?.hidden) {
      this.fireClass0();
      return;
    }
    if (i === 0 && this.tryHarvestF()) return;
    if (i === 0 && classSkill0(this.classId)) {
      this.fireClass0();
      return;
    }
    const spell = (this.classSkills || [])[i];
    if (!spell) return;
    if ((this.classCds[i] || 0) > 0) return;
    const stamCost = spell.stamina || 0;
    if (this.mana < (spell.mana || 0)) { toast('Not enough mana'); return; }
    if (this.stamina < stamCost) { toast('Not enough stamina'); return; }
    this.mana -= spell.mana || 0;
    this.stamina -= stamCost;
    this.classCds[i] = spell.cd;
    this.classActive = i;
    this.fireSpell(spell);
    toast(spell.name);
  }

  fireClass0() {
    const spell = classSkill0(this.classId) || (this.classSkills || [])[0];
    if (!spell) return;
    if ((this.classCds[0] || 0) > 0 && !(this.classId === 'ranger' && this.classState?.invisT > 0)) return;
    if (this.mana < (spell.mana || 0) || this.stamina < (spell.stamina || 0)) {
      toast('Not enough resource');
      return;
    }
    this.mana -= spell.mana || 0;
    this.stamina -= spell.stamina || 0;
    if (spell.id !== 'r_invis') this.classCds[0] = spell.cd;
    this.classActive = 0;
    const selfAnim = spell.id === 'w_taunt' || spell.form || spell.totem
      || spell.id === 't_invis' || spell.id === 't_marking_marks'
      || spell.id === 'r_invis' || spell.id === 'r_shadow_strike';
    if (selfAnim) {
      this.player?.requestOneShot(animForSpell(this.player?.clips, spell) || 'cast', 0.45);
    }
    if (spell.id === 'w_taunt') {
      this.vfx.nova({ origin: this.pos.clone().setY(0.4), color: 0xd8433a, range: spell.range });
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.4, spell.range, 28),
        new THREE.MeshBasicMaterial({ color: 0xd8433a, transparent: true, opacity: 0.28, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(this.pos);
      ring.position.y = 0.08;
      this.group.add(ring);
      setTimeout(() => { this.group.remove(ring); ring.geometry.dispose(); ring.material.dispose(); }, 700);
      for (const e of this.enemies) {
        if (!e.alive || e.pos.distanceTo(this.pos) > spell.range) continue;
        applyTaunt(e, 'player', this.now || performance.now() / 1000);
        pull(this, e, 12);
      }
      this.classState.tauntDefT = spell.defBonusSec || 8;
      toast('Taunt · battlecry');
    } else if (spell.id === 'rd_overpower') {
      this.fireSpell(spell);
      this.classState.overpowerT = RAIDER_TWO_HAND.overpowerSec;
      toast('Overpower');
    } else if (spell.form) {
      if (this.classState.form === spell.form) {
        this.leaveForm();
        toast(`${spell.name} · off`);
      } else {
        void this.enterForm(spell.form);
        if (spell.heal) this.applyPartyHeal(spell.heal, this.pos, { range: Math.max(spell.range || 4, 4.2), color: spell.color, name: spell.name });
        toast(spell.name);
      }
    } else if (spell.id === 't_invis' || spell.id === 't_marking_marks') {
      this.fireThief0(spell);
    } else if (spell.id === 'r_invis' || spell.id === 'r_shadow_strike') {
      this.fireRanger0(spell);
    } else if (spell.totem) {
      this.deployTotem(spell.totem);
      toast(spell.name);
    } else {
      this.fireSpell(spell);
      toast(spell.name);
    }
  }

  fireRanger0(spell) {
    if ((this.classState.invisT || 0) > 0) {
      const ss = classSkill0('ranger').shadowStrike;
      const foe = this.aiming?.target || this.enemies.filter((e) => e.alive).sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos))[0];
      if (foe) {
        const to = foe.pos.clone().sub(this.pos).setY(0);
        if (to.lengthSq() < 1e-6) to.set(0, 0, 1);
        else to.normalize();
        const dest = foe.pos.clone().addScaledVector(to, 1.15);
        this.pos.copy(dest);
        setPhysicsFeet(this.phys, this.pos.x, this.pos.z);
        this.player.root.position.copy(this.pos);
        const dir = foe.pos.clone().sub(this.pos).setY(0);
        if (dir.lengthSq() > 1e-6) dir.normalize();
        this.aim.copy(dir);
        this.vfx.slash({ origin: this.pos.clone().setY(1.1), dir, color: 0x9b6cf0, range: 2.8 });
        this.hurt(foe, ss.damage, { ...ss, id: ss.id });
        if (!foe.status) foe.status = makeStatus();
        applyHitReact(foe.status, { stun: ss.stun });
        paintStatus(foe.actor, foe.status);
      }
      this.endRangerInvis(true);
      toast('Shadow Strike');
      return;
    }
    if ((this.classState.invisCd || 0) > 0) { toast('Invis cooling'); return; }
    this.classState.invisT = spell.invisSec || 8;
    this.classState.hidden = true;
    this.status.stun = 0;
    this.status.root = 0;
    this.status.freeze = 0;
    this.setPlayerOpacity(0.22);
    toast('Invis');
    this.refreshHudBars();
  }

  fireThief0(spell) {
    if ((this.classState.invisT || 0) > 0) {
      const mark = classSkill0('thief').mark;
      const foe = this.aiming?.target || this.enemies.filter((e) => e.alive && e.pos.distanceTo(this.pos) <= (spell.range || 14))
        .sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos))[0];
      if (!foe) { toast('No mark target'); return; }
      foe.markStacks = Math.min(mark.maxStacks, (foe.markStacks || 0) + 1);
      foe.markT = mark.duration;
      this.classState.markStacks = foe.markStacks;
      this.classState.markT = mark.duration;
      const origin = this.pos.clone(); origin.y = 1.2;
      const dir = foe.pos.clone().sub(this.pos).setY(0);
      if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1); else dir.normalize();
      this.linear.line({ origin, dir, color: 0x9b6cf0, range: 14, speed: 22, onHit: () => {}, overlay: spell.overlay || null });
      toast(`Marking Marks · ${foe.markStacks}`);
      return;
    }
    if ((this.classState.invisCd || 0) > 0) { toast('Invis cooling'); return; }
    this.classState.invisT = spell.invisSec || 8;
    this.classState.hidden = true;
    this.classState.nextRanged = true;
    this.classState.nextMelee = true;
    this.status.stun = 0;
    this.status.root = 0;
    this.status.freeze = 0;
    this.setPlayerOpacity(0.22);
    toast('Invis · 70% move');
    this.refreshHudBars();
  }

  endThiefInvis() {
    this.classState.invisT = 0;
    this.classState.hidden = false;
    this.classCds[0] = classSkill0('thief').cd;
    this.classState.invisCd = classSkill0('thief').cd;
    this.setPlayerOpacity(1);
    this.refreshHudBars();
  }

  endRangerInvis(fromStrike) {
    this.classState.invisT = 0;
    this.classState.hidden = false;
    this.classCds[0] = classSkill0('ranger').cd;
    this.classState.invisCd = classSkill0('ranger').cd;
    this.classState.afterStrikeT = classSkill0('ranger').afterBuffSec || 5;
    this.setPlayerOpacity(1);
    this.refreshHudBars();
  }

  setPlayerOpacity(a) {
    this.player?.visual?.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        m.transparent = a < 0.99;
        m.opacity = a;
        m.depthWrite = a > 0.8;
      }
    });
  }

  tickThief(dt) {
    if (this.classId !== 'thief' || !this.classState) return;
    if ((this.classState.invisT || 0) > 0) {
      this.classState.invisT -= dt;
      if (this.classState.invisT <= 0) this.endThiefInvis();
    } else if ((this.classState.invisCd || 0) > 0) {
      this.classState.invisCd -= dt;
    }
    if ((this.classState.markT || 0) > 0) {
      this.classState.markT -= dt;
      if (this.classState.markT <= 0) {
        this.classState.markStacks = 0;
        for (const e of this.enemies) { e.markStacks = 0; e.markT = 0; }
      }
    }
    if ((this.classState.meleeSlowT || 0) > 0) this.classState.meleeSlowT -= dt;
  }

  tickRanger(dt) {
    if (this.classId !== 'ranger' || !this.classState) return;
    if ((this.classState.invisT || 0) > 0) {
      this.classState.invisT -= dt;
      if (this.classState.invisT <= 0) this.endRangerInvis(false);
    } else if ((this.classState.invisCd || 0) > 0) {
      this.classState.invisCd -= dt;
    }
    if ((this.classState.afterStrikeT || 0) > 0) this.classState.afterStrikeT -= dt;
  }

  deployTotem(kind) {
    this.clearTotem();
    const hp = Math.max(12, Math.round((this.sheet?.hpMax || PLAY.hp) * 0.25));
    const mesh = makeTotemMesh(kind, hp);
    const p = this.pos.clone();
    p.y = 0;
    mesh.position.copy(p);
    (this.layers?.Actors || this.group).add(mesh);
    this.totem = { kind, mesh, hp, hpMax: hp, life: TOTEM_LIFE, pulse: TOTEM_PULSE };
    this.shieldHp = Math.min(TOTEM_SHIELD_MAX, (this.shieldHp || 0) + 8);
    for (const a of this.allies) a.shieldHp = Math.min(TOTEM_SHIELD_MAX, (a.shieldHp || 0) + 8);
  }

  clearTotem() {
    if (!this.totem) return;
    this.totem.mesh.parent?.remove(this.totem.mesh);
    this.totem.mesh.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    this.totem = null;
  }

  tickTotem(dt) {
    const t = this.totem;
    if (!t) return;
    t.life -= dt;
    t.pulse -= dt;
    if (t.life <= 0 || t.hp <= 0) { this.clearTotem(); toast('Totem faded'); return; }
    if (t.pulse > 0) return;
    t.pulse = TOTEM_PULSE;
    if (t.kind === 'spell') {
      this.shieldHp = Math.min(TOTEM_SHIELD_MAX, (this.shieldHp || 0) + TOTEM_SHIELD_TICK);
      for (const a of this.allies) {
        if (!a.alive) continue;
        a.shieldHp = Math.min(TOTEM_SHIELD_MAX, (a.shieldHp || 0) + TOTEM_SHIELD_TICK);
      }
    } else if (t.kind === 'blessed') {
      const hurt = [this, ...this.allies].filter((x) => x.alive !== false && !x.downed && (x.hp || 0) < (x.hpMax || x.sheet?.hpMax || PLAY.hp));
      const pick = hurt[Math.floor(Math.random() * Math.max(1, hurt.length))];
      if (pick && pick !== this) pick.hp = Math.min(pick.hpMax, pick.hp + Math.max(1, Math.round(pick.hpMax * 0.01)));
      else if (pick === this) this.hp = Math.min(this.sheet?.hpMax || PLAY.hp, this.hp + Math.max(1, Math.round((this.sheet?.hpMax || PLAY.hp) * 0.01)));
    }
  }

  echoTotem(spell) {
    const t = this.totem;
    if (!t || !spell) return;
    const origin = t.mesh.position.clone();
    origin.y = 1.0;
    const range = (spell.range || 8) + TOTEM_RANGE_BONUS;
    const dmg = Math.round((spell.damage || 0) * TOTEM_STR);
    const heal = Math.round((spell.heal || 0) * TOTEM_STR);
    if (t.kind === 'spell' && (spell.kind === 'projectile' || spell.kind === 'beam' || spell.kind === 'nova' || spell.kind === 'fissure')) {
      const foe = this.enemies.filter((e) => e.alive).sort((a, b) => a.pos.distanceTo(origin) - b.pos.distanceTo(origin))[0];
      if (!foe || foe.pos.distanceTo(origin) > range) return;
      const dir = foe.pos.clone().sub(origin).setY(0).normalize();
      if (spell.kind === 'projectile' || spell.kind === 'beam') {
        this.linear.line({ origin, dir, color: spell.color, range, speed: spell.speed || 16, onHit: (e) => this.hurt(e, dmg, spell), overlay: spell.overlay || null });
      } else this.hitRadius(origin, Math.min(range, 4), dmg);
    }
    if (t.kind === 'blessed' && (spell.heal > 0 || spell.kind === 'nova' && spell.element === 'holy')) {
      this.applyPartyHeal(heal || Math.round((spell.damage || 12) * TOTEM_STR * 0.3), origin, { range, name: 'Blessed echo' });
    }
  }

  tapClassItem() {
    const id = this.classId;
    if (id === 'warrior') {
      const keys = Object.keys(WARRIOR_TANK.forms);
      const i = Math.max(0, keys.indexOf(this.classState.form));
      this.classState.form = keys[(i + 1) % keys.length];
      toast(`Battle Form · ${WARRIOR_TANK.forms[this.classState.form].name}`);
    } else if (id === 'raider') {
      this.classState.overpowerT = RAIDER_TWO_HAND.overpowerSec;
      toast('Two-Hand · Overpower window');
    } else if (id === 'ranger') {
      toast('Ranger Log · I for poisons / traps / stealth');
    } else if (id === 'thief') {
      toast('Satchel of Tools · I for lockpick / stealth / theft');
    } else if (id === 'worge' || id === 'verduror') {
      const forms = classItemFor(id)?.grimoire?.forms || [];
      const i = Math.max(0, forms.indexOf(this.classState.form));
      const next = forms[(i + 1) % Math.max(1, forms.length)];
      if (next) { this.classState.form = next; void this.enterForm(next); toast(`Form · ${next}`); }
    } else if (id === 'mage' || id === 'priest') {
      const earned = this.classState.earned || [];
      const pick = earned[this.classState.wandPick || 0];
      if (pick) this.castWandSpell(pick);
    }
  }

  openItemRadial() {
    if (this.itemRadial) return;
    this.itemRadial = true;
    const id = this.classId;
    let opts = [];
    if (id === 'warrior') opts = [
      ...Object.values(WARRIOR_TANK.forms).map((f) => ({ id: f.id, name: f.name })),
      { id: 'craft:tonic_blood', name: 'Slot Tonic of Blood' },
      { id: 'craft:tonic_power', name: 'Slot Tonic of Power' },
      { id: 'offer:tonic', name: 'Bottle tonic to bag' },
    ];
    else if (id === 'raider') opts = [
      { id: 'overpower', name: 'Overpower window' },
      { id: 'craft:tonic_blood', name: 'Slot Tonic of Blood' },
      { id: 'craft:tonic_power', name: 'Slot Tonic of Power' },
      { id: 'offer:tonic', name: 'Bottle tonic to bag' },
    ];
    else if (id === 'ranger') opts = [
      { id: 'poison', name: 'Poisons' },
      { id: 'traps', name: 'Tools / traps' },
      { id: 'stealth', name: 'Stealth' },
      { id: 'craft:lockpick_set', name: 'Craft lockpicking set' },
    ];
    else if (id === 'thief') opts = [
      { id: 'lockpick', name: 'Lockpick / sets' },
      { id: 'stealth', name: 'Stealth' },
      { id: 'theft', name: 'Combat theft' },
      { id: 'craft:lockpick_set', name: 'Craft lockpicking set' },
    ];
    else if (id === 'worge' || id === 'verduror') {
      opts = [
        ...(classItemFor(id)?.grimoire?.forms || []).map((f) => ({ id: f, name: f })),
        { id: 'craft:form_page', name: 'Craft form page' },
      ];
    }
    else if (id === 'mage' || id === 'priest') {
      const book = id === 'mage' ? MAGE_WAND : PRIEST_WAND;
      opts = [
        ...(this.classState.earned || book.earnedDefault).map((sid) => skillById(sid) || { id: sid, name: sid }),
        { id: 'craft:spell_page', name: 'Craft spell page (selected)' },
        { id: 'craft:spell_page_portal', name: 'Craft portal page' },
      ];
    }
    this._itemRadialOpts = opts;
    paintItemRadial(this.hud, opts, true);
  }

  closeItemRadial() {
    if (!this.itemRadial) return;
    this.itemRadial = false;
    paintItemRadial(this.hud, [], false);
  }

  pickClassItem(i) {
    const id = this.classId;
    const picked = this._itemRadialOpts?.[i];
    if (picked?.id?.startsWith('craft:')) { this.craftUnique(picked.id.slice(6)); this.closeItemRadial(); return; }
    if (picked?.id === 'offer:tonic') { this.offerCraft(this.vial?.id || 'tonic_blood'); this.closeItemRadial(); return; }
    if (id === 'warrior') {
      const keys = Object.keys(WARRIOR_TANK.forms);
      if (keys[i]) {
        this.classState.form = keys[i];
        toast(`Battle Form · ${WARRIOR_TANK.forms[keys[i]].name}`);
      }
    } else if (id === 'raider') {
      this.classState.overpowerT = RAIDER_TWO_HAND.overpowerSec;
      toast('Overpower window');
    } else if (id === 'ranger') {
      toast(i === 0 ? 'Log · poisons' : i === 1 ? 'Log · traps' : 'Log · stealth');
    } else if (id === 'thief') {
      toast(i === 0 ? 'Satchel · lockpick' : i === 1 ? 'Satchel · stealth' : 'Satchel · theft');
    } else if (id === 'worge' || id === 'verduror') {
      const forms = classItemFor(id)?.grimoire?.forms || [];
      if (forms[i]) { this.classState.form = forms[i]; void this.enterForm(forms[i]); toast(`Form · ${forms[i]}`); }
    } else if (id === 'mage' || id === 'priest') {
      this.classState.wandPick = i;
      const earned = this.classState.earned || [];
      if (earned[i]) this.castWandSpell(earned[i]);
    }
    this.closeItemRadial();
  }

  castWandSpell(skillId) {
    const spell = skillById(skillId);
    if (!spell) return;
    this.fireSpell({ ...spell, classSkill: true });
    toast(`${classItemFor(this.classId)?.name || 'Wand'} · ${spell.name}`);
  }

  tickHandGlow() {
    const col = this.classId === 'warrior' ? WARRIOR_TANK.handGlow
      : this.classId === 'raider' ? RAIDER_TWO_HAND.handGlow : null;
    if (!col || !this.player?.visual) {
      if (this._handGlow) { this._handGlow.parent?.remove(this._handGlow); this._handGlow = null; }
      return;
    }
    if (!this._handGlow) {
      const g = new THREE.Group();
      const mk = () => {
        const l = new THREE.PointLight(col, 0.7, 1.4);
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55 }));
        const h = new THREE.Group();
        h.add(l, s);
        return h;
      };
      g.add(mk(), mk());
      this.player.visual.add(g);
      this._handGlow = g;
    }
    const hands = [];
    this.player.visual.traverse((o) => {
      if (/r.?hand|l.?hand|hand_r|hand_l|weapon_r|weapon_l/i.test(o.name || '')) hands.push(o);
    });
    if (hands[0]) this._handGlow.children[0].position.copy(this.player.visual.worldToLocal(hands[0].getWorldPosition(new THREE.Vector3())));
    else this._handGlow.children[0].position.set(0.22, 1.1, 0.15);
    if (hands[1] && this._handGlow.children[1]) this._handGlow.children[1].position.copy(this.player.visual.worldToLocal(hands[1].getWorldPosition(new THREE.Vector3())));
    else if (this._handGlow.children[1]) this._handGlow.children[1].position.set(-0.22, 1.1, 0.15);
  }

  leaveForm() {
    if (this._formMixer) {
      this._formMixer.stopAllAction();
      this._formMixer = null;
    }
    this._formActions = null;
    this._formGait = null;
    if (this._formVis) {
      this.player?.root.remove(this._formVis);
      this._formVis = null;
    }
    if (this.player?.visual) this.player.visual.visible = true;
    if (this.classState) this.classState.form = null;
  }

  _formBusy() {
    const acts = this._formActions;
    if (!acts) return false;
    for (const k of ['attack', 'attack2', 'skill', 'skillReturn', 'hit', 'stun']) {
      const a = acts[k];
      if (a?.isRunning?.() && a.loop === THREE.LoopOnce) return true;
    }
    return false;
  }

  _syncFormGait(moving, sprint) {
    const acts = this._formActions;
    if (!acts?.idle) return;
    if (this._formBusy()) return;
    const next = !moving ? 'idle' : (sprint && acts.run ? 'run' : (acts.walk ? 'walk' : (acts.run ? 'run' : 'idle')));
    if (this._formGait === next) return;
    const prev = acts[this._formGait];
    const cur = acts[next];
    if (prev && prev !== cur) prev.fadeOut(0.14);
    if (cur) {
      cur.reset();
      cur.setLoop(THREE.LoopRepeat, Infinity);
      cur.fadeIn(0.12).play();
    }
    this._formGait = next;
  }

  _formOneShot(role) {
    const act = this._formActions?.[role] || this._formActions?.attack;
    if (!act || !this._formMixer) return;
    const gait = this._formActions[this._formGait];
    if (gait && gait !== act) gait.fadeOut(0.08);
    act.reset();
    act.setLoop(THREE.LoopOnce, 1);
    act.clampWhenFinished = true;
    act.fadeIn(0.08).play();
    this._formGait = null;
  }

  async enterForm(formId) {
    const url = formUrl(formId, this.raceId);
    if (!url || !this.player) return;
    try {
      const gltf = await loadGltf(url);
      const src = gltf.scene || gltf;
      const vis = cloneSkinned(src);
      vis.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      vis.position.set(0, 0, 0);
      vis.scale.set(1, 1, 1);
      const spec = FORMS[formId];
      if (spec?.albedo) {
        const albedo = typeof spec.albedo === 'function' ? spec.albedo(this.raceId) : spec.albedo;
        const tint = spec.tint?.(this.raceId) ?? 0xffffff;
        await new Promise((resolve, reject) => {
          new THREE.TextureLoader().load(albedo, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.flipY = false;
            vis.traverse((o) => {
              if (!o.isMesh || !o.material) return;
              const mats = Array.isArray(o.material) ? o.material : [o.material];
              for (const m of mats) {
                m.map = tex;
                if ('color' in m) m.color.setHex(tint);
                m.needsUpdate = true;
              }
            });
            resolve();
          }, undefined, reject);
        });
        this.classState.formSkin = { form: formId, raceId: this.raceId, albedo, tint };
        try {
          localStorage.setItem('grudge-dungeon-form-skin', JSON.stringify(this.classState.formSkin));
        } catch { /* guest */ }
      }
      if (this._formMixer) { this._formMixer.stopAllAction(); this._formMixer = null; }
      if (this._formVis) this.player.root.remove(this._formVis);
      if (this.player.visual) this.player.visual.visible = false;
      this.player.root.add(vis);
      this._formVis = vis;
      const clips = gltf.animations || [];
      this._formActions = {};
      this._formGait = null;
      if (clips.length) {
        this._formMixer = new THREE.AnimationMixer(vis);
        this._formMixer.addEventListener('finished', () => { this._formGait = null; });
        for (const raw of clips) {
          const clip = raw.clone();
          clip.tracks = clip.tracks.filter((t) => !/\.position$/i.test(t.name) || !/^(Armature|Warbear|Bip001|_rootJoint)/i.test(t.name.split('.')[0]));
          const act = this._formMixer.clipAction(clip);
          const role = classifyFormClip(clip.name);
          if (role && !this._formActions[role]) this._formActions[role] = act;
        }
        if (!this._formActions.run && this._formActions.walk) this._formActions.run = this._formActions.walk;
        if (!this._formActions.walk && this._formActions.run) this._formActions.walk = this._formActions.run;
        if (!this._formActions.attack2 && this._formActions.attack) this._formActions.attack2 = this._formActions.attack;
        if (!this._formActions.skill && this._formActions.attack) this._formActions.skill = this._formActions.attack;
        const idle = this._formActions.idle;
        if (idle) {
          idle.setLoop(THREE.LoopRepeat, Infinity);
          idle.play();
          this._formGait = 'idle';
          this._formMixer.update(0);
        }
      }
      fitFormToSi(vis, spec?.heightM || 2);
      this.classState.form = formId;
      if (formId === 'iguana') this._iguanaHotT = 0.4;
      toast(`Form · ${FORMS[formId]?.name || formId}`);
    } catch (err) {
      console.warn('[grudge-dungeon] form miss', formId, err?.message || err);
    }
  }

  fireSpell(spell) {
    stampSpell(spell);
    if (!spell.overlay) spell.overlay = overlayForSkill(spell.id, spell.kind, spell.element);
    const origin = this.pos.clone();
    origin.y = 1.15;
    const dir = new THREE.Vector3();
    if (this.tps?.enabled) this.tps.getLookDirection(dir);
    else dir.copy(this.aim).setY(0);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    else dir.normalize();
    const flat = dir.clone().setY(0);
    if (flat.lengthSq() < 1e-6) {
      const yaw = this.tps?.enabled ? this.tps.yaw : 0;
      flat.set(Math.sin(yaw), 0, Math.cos(yaw));
    } else flat.normalize();
    origin.addScaledVector(dir, 0.45);
    this.aiming?.setRanges(1.1, spell.range, spell.kind === 'zone' || spell.kind === 'nova' ? 'zone' : 'line');
    const sprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const animName = animForSpell(this.player?.clips, spell, { comboStage: this.comboStage || 0, sprint: sprinting });
    const shotDur = this.player?.clips?.[animName]?.duration || 0.42;
    if (this._formVis) {
      const melee = spell.kind === 'slash' || spell.kind === 'dash';
      const formShot = !melee && this._formActions?.skill
        ? 'skill'
        : (this._formActions?.attack2 && (this.comboStage || 0) >= 1 ? 'attack2' : 'attack');
      this._formOneShot(formShot);
    }
    else this.player?.requestOneShot(animName, shotDur);
    playSfx(spell.kind === 'slash' || spell.kind === 'dash' ? 'combat_hit' : 'combat_spell', { volume: 0.32 });
    this.vfx.aura({ origin: this.pos.clone(), color: spell.color, life: 0.28 });
    const tel = spell.telegraphSec || 0.15;
    this.casting = Math.max(0.16, tel);
    this.castMax = this.casting;
    if (spell.kind === 'slash') {
      this.vfx.cone({ origin: this.pos, dir: flat, color: spell.color, range: spell.range, half: 0.85, life: tel });
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
    if (!spell.totem) this.echoTotem(spell);
    const onHit = (e) => {
      this.hurt(e, roll(spell.damage), spell);
      if (spell.poison || (this.classId === 'ranger' && this.classState?.poisonCoat && Math.random() < 0.18)) {
        e.poisonT = Math.max(e.poisonT || 0, 4);
        this.vfx.mist({ origin: e.pos.clone().setY(1.1), color: 0x53e93f, radius: 0.9, life: 0.8 });
      }
      const p = e.pos.clone().setY(1.1);
      if (spell.element === 'fire') this.vfx.fire({ origin: p, color: spell.color, duration: 'small' });
      else if (spell.element === 'ice' || spell.element === 'frost') this.vfx.mist({ origin: p, color: spell.color, radius: 1.2, life: 1.0 });
      else if (spell.element === 'holy' || spell.element === 'nature') this.vfx.mist({ origin: p, color: spell.color, radius: 1.15, life: 0.9 });
      else this.vfx.smoke({ origin: p, color: spell.color, life: 0.65 });
      this.vfx.impact({ origin: p, color: spell.color });
    };

    if (spell.kind === 'slash') {
      const win = hitWindowSec(shotDur, 0.32);
      this.hitQ.push({
        t: win,
        fn: () => {
          this.vfx.slash({ origin, dir: flat, color: spell.color, range: spell.range });
          this.smashBarriersAlong(flat, spell.range);
          this.hitCone(flat, spell.range, 0.85, roll(spell.damage));
          this.linear.wave({
            origin, dir, color: spell.color,
            range: (spell.range || 3) + 1.6,
            speed: 22,
            onHit,
            overlay: spell.overlay || null,
          });
        },
      });
      if (!this.downed) this.dashAlong(flat, 0.42);
    } else if (spell.kind === 'projectile') {
      this.hitQ.push({
        t: hitWindowSec(shotDur, 0.22),
        fn: () => {
          const bolt = this.linear.line({
            origin, dir, color: spell.color, range: spell.range,
            speed: spell.speed || 20, forks: !!spell.forks, onHit,
            meshPath: spell.meshPath || null,
            shader: elementShader(spell.element),
            overlay: spell.overlay || null,
          });
          const travel = spell.range / (spell.speed || 20);
          this.vfx.speedTrail({
            mesh: bolt.root,
            color: spell.color,
            life: travel + 0.12,
            kind: elementTrailKind(spell.element),
          });
          this.smashBarriersAlong(flat, spell.range);
        },
      });
    } else if (spell.kind === 'beam') {
      const bolt = this.linear.line({
        origin, dir, color: spell.color, range: spell.range,
        speed: 38, width: 0.22, forks: spell.forks || spell.linear === 'thunder', onHit,
        meshPath: spell.meshPath || null,
        shader: elementShader(spell.element),
        overlay: spell.overlay || null,
      });
      this.vfx.speedTrail({
        mesh: bolt.root,
        color: spell.color,
        life: spell.range / 38 + 0.1,
        kind: elementTrailKind(spell.element),
      });
      this.smashBarriersAlong(flat, spell.range);
      this.hitLine(flat, spell.range, 0.55, roll(spell.damage));
      this.punch(70, 0.35);
    } else if (spell.kind === 'fissure') {
      this.linear.fissure({ origin: this.pos, dir: flat, color: spell.color, range: spell.range, onHit, meshPath: spell.meshPath || null });
      this.vfx.fire({ origin: this.pos.clone().setY(0.7), color: spell.color, duration: 'long', life: 1.4 });
      this.smashBarriersAlong(flat, spell.range);
      this.hitLine(flat, spell.range, 0.85, roll(spell.damage));
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
      this.dashAlong(flat, spell.range);
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
    if (/summon|familiar|totem|spirit_wolf|raise_dead|_pet|elemental/i.test(`${spell.id} ${spell.name || ''}`)) {
      void this.spawnSummon(spell);
    }
  }

  async spawnSummon(spell) {
    const live = (this.summons || []).filter((s) => s.alive);
    if (live.length >= 2) return;
    try {
      const pf = playerPrefab(this.raceId, this.classId === 'mage' ? 'mage' : 'warrior', this.weaponId);
      pf.height = 1.5;
      const actor = await spawnActor({ prefab: pf, equipped: true });
      const pos = this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0, 1.2));
      actor.bindTerrain(this.sampler);
      actor.root.position.copy(pos);
      groundRoot(actor.root, this.sampler, pos.x, pos.z);
      (this.layers?.Actors || this.group).add(actor.root);
      this.summons.push({
        actor, pos, alive: true, hp: 48, hpMax: 48, speed: 5.2,
        life: 16, hitCd: 0, aim: this.aim.clone(),
      });
      toast(`${spell.name} · summoned`);
    } catch (err) {
      console.warn('[grudge-dungeon] summon miss', err);
    }
  }

  tickSummons(dt) {
    for (const s of this.summons || []) {
      if (!s.alive) continue;
      s.life -= dt;
      if (s.life <= 0 || s.hp <= 0) {
        s.alive = false;
        s.actor.dispose();
        continue;
      }
      s.hitCd = Math.max(0, s.hitCd - dt);
      const foe = this.enemies.filter((e) => e.alive).sort((a, b) => a.pos.distanceTo(s.pos) - b.pos.distanceTo(s.pos))[0];
      if (foe) {
        const dir = foe.pos.clone().sub(s.pos).setY(0);
        const d = dir.length();
        if (d > 0.001) dir.normalize();
        if (d > 2.2) {
          s.pos.addScaledVector(dir, s.speed * dt);
        } else if (s.hitCd <= 0) {
          this.hurt(foe, 12);
          s.hitCd = 1.1;
          s.actor.requestOneShot('attack', 0.28);
        }
        s.actor.root.rotation.y = Math.atan2(dir.x, dir.z);
        s.actor.setGait(d > 2.2, false);
      } else s.actor.setGait(false, false);
      s.actor.root.position.copy(s.pos);
      groundRoot(s.actor.root, this.sampler, s.pos.x, s.pos.z);
      s.actor.update(dt);
    }
  }

  smashNearestProp() {
    if (!this.pinata || !this.pos) return;
    const n = this.pinata.nearest(this.pos, 2.8);
    if (!n) { toast('Nothing to break'); return; }
    const dmg = Math.max(8, Math.round((this.sheet?.damage || 12) * 0.7));
    this.player?.requestOneShot?.('attack', 0.28);
    this.pinata.hit(n.id, dmg, 'any');
  }

  smashBarriersAlong(dir, range) {
    if (!this.d) return;
    this.pinata?.splash(this.pos, Math.min(range, 4.5), Math.max(6, Math.round((this.sheet?.damage || 12) * 0.45)));
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
    if (inRange(this.pos) && !this.downed) {
      const full = this.healFocus === 'player' || !focusAlly?.alive;
      this.hp = healOne(this, this.hp, this.sheet?.hpMax || PLAY.hp, full);
    }
    for (let i = 0; i < this.allies.length; i++) {
      const b = this.allies[i];
      if (!b.alive || b.downed || !inRange(b.pos)) continue;
      const full = focusAlly === b;
      b.hp = healOne(b, b.hp, b.hpMax, full || this.healFocus === 'player');
    }
    const mistAt = (origin || this.pos).clone();
    mistAt.y = 0.85;
    this.vfx.mist({ origin: mistAt, color: color || 0xc8f0a8, radius: Math.min(reach, 4.4), life: 2.2 });
    if (from) toast(`${from} · ${name}`);
  }

  hurt(e, dmg, spell = null) {
    if (!e.alive) return;
    if (!e.status) e.status = makeStatus();
    applyHitReact(e.status, inferCc(spell));
    paintStatus(e.actor, e.status);
    if (this.classId === 'thief' && this.classState?.hidden) {
      this.endThiefInvis();
      toast('Exposed');
    }
    if (this.classState?.afterStrikeT > 0) dmg = Math.round(dmg * 1.28);
    if (this.classState?.markStacks > 0) dmg = Math.round(dmg * (1 + this.classState.markStacks * 0.02));
    if ((e.markStacks || 0) > 0) dmg = Math.round(dmg * (1 + e.markStacks * 0.12));
    if ((this.classState?.meleeSlowT || 0) > 0 && Math.random() < 0.5) {
      toast('Whiff');
      return;
    }
    const kind = spell?.kind || '';
    if (this.classState?.nextRanged && (kind === 'projectile' || kind === 'beam')) {
      this.classState.nextRanged = false;
      if (!e.status) e.status = makeStatus();
      applyHitReact(e.status, { stun: classSkill0('thief')?.nextRangedStun || 2 });
      paintStatus(e.actor, e.status);
    } else if (this.classState?.nextMelee && (kind === 'slash' || kind === 'dash')) {
      this.classState.nextMelee = false;
      this.classState.meleeSlowT = classSkill0('thief')?.nextMeleeSec || 5;
      if (!e.status) e.status = makeStatus();
      applyHitReact(e.status, { root: 5 });
      paintStatus(e.actor, e.status);
    }
    e.hp -= dmg;
    const tankMul = this.classId === 'warrior' ? THREAT.tankMul : 1;
    addThreat(e, 'player', dmg * THREAT.damageMul * tankMul);
    pull(this, e, 8);
    playSfx('combat_hit', { volume: 0.3 });
    this.vfx.shake.add(0.22);
    if (e.hp <= 0) {
      e.alive = false;
      e.looted = false;
      e.loot = corpseYield(corpseKind(e));
      e.actor.die();
      this.punch(e.boss ? 90 : 40, e.boss ? 0.7 : 0.3);
      toast(e.boss ? `${e.prefab?.label || 'The warlord'} falls` : `${e.prefab?.label || 'Foe'} down`);
    } else {
      e.actor.requestOneShot(e.status.stun || e.status.freeze ? 'stun' : 'hit', e.status.stun || e.status.freeze ? 0.35 : 0.18);
    }
  }

  nearCorpse() {
    if (this.phase !== 'crawl' || this.downed) return null;
    const nearDown = (this.allies || []).some((a) => a.downed && a.pos.distanceTo(this.pos) < 1.7);
    if (nearDown) return null;
    let best = null;
    let bestD = 1.8;
    for (const e of this.enemies || []) {
      if (e.alive || e.looted || !(e.loot?.length)) continue;
      const d = e.pos.distanceTo(this.pos);
      if (d < bestD) { best = e; bestD = d; }
    }
    return best;
  }

  tryLootCorpse() {
    const e = this.nearCorpse();
    if (!e) return false;
    for (const it of e.loot) this.bag = addLoot(this.bag, it.id, it.n);
    const names = e.loot.map((it) => `${BAG_DEFS[it.id]?.label || it.id} ×${it.n}`).join(' · ');
    e.looted = true;
    e.loot = [];
    this._lootE = true;
    this.player?.requestOneShot?.('interact', 0.45);
    toast(`Looted · ${names}`);
    return true;
  }

  aggroRoom(roomId) {
    for (const e of this.enemies || []) {
      if (!e.alive || e.room?.id !== roomId) continue;
      e.asleep = false;
      pull(this, e, 12);
    }
  }

  finishOpenGate(g) {
    if (!g) return false;
    this.gates.playOpen(g);
    this.script?.gatesOpen.add(g.toRoom);
    this.script?.gatesOpen.add(g.fromRoom);
    this.gateCast = null;
    this._gateE = true;
    toast('Gate opens');
    return true;
  }

  tryOpenGate(fromKey) {
    if (this.phase !== 'crawl' || this.downed) return false;
    const nearDown = (this.allies || []).some((a) => a.downed && a.pos.distanceTo(this.pos) < 1.7);
    if (nearDown || this.nearCorpse()) return false;
    const g = this.gates?.near(this.pos.x, this.pos.z);
    if (!g) return false;
    const living = livingInRoom(this, g.fromRoom);
    if (!living.length) return this.finishOpenGate(g);
    if (fromKey) {
      this._gateE = true;
      if (!this.gateCast || this.gateCast.gate !== g) {
        this.gateCast = { gate: g, t: 0, max: GATE_FORCE_SEC, aggroed: false };
      }
    }
    return true;
  }

  tickGate(dt) {
    this.gates?.update(dt);
    const g = this.gates?.near(this.pos.x, this.pos.z);
    if (!g || this.downed) { this.gateCast = null; return; }
    if (!livingInRoom(this, g.fromRoom).length) {
      if (this.gateCast?.gate === g) this.finishOpenGate(g);
      return;
    }
    const holding = this.keys.has('KeyE') || this._gateE;
    if (this.gateCast && this.gateCast.gate === g && holding) {
      this.gateCast.t += dt;
      if (!this.gateCast.aggroed && this.gateCast.t >= 0.2) {
        this.gateCast.aggroed = true;
        this.aggroRoom(g.fromRoom);
        toast('Forcing the gate · hall aggro');
      }
      if (this.gateCast.t >= (this.gateCast.max || GATE_FORCE_SEC)) this.finishOpenGate(g);
    } else if (!holding) this.gateCast = null;
  }

  hitRadius(pos, r, dmg) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.pos.distanceTo(pos) <= r + e.radius) this.hurt(e, dmg, this.loadout?.[this.activeSlot - 1]);
    }
    this.pinata?.splash(pos, r + 0.4, dmg);
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
      if (!e.status) e.status = makeStatus();
      tickStatus(e.status, dt);
      paintStatus(e.actor, e.status);
      if (e.asleep) {
        e.actor.setGait(false, false);
        continue;
      }
      if (!canAct(e.status) || !canMove(e.status)) {
        e.actor.setGait(false, false);
        continue;
      }
      const dist = e.pos.distanceTo(this.pos);
      const see = !this.classState?.hidden && losToPlayer(this, e);
      e.hitCd = Math.max(0, e.hitCd - dt);
      const dir = this.pos.clone().sub(e.pos).setY(0);
      if (dir.lengthSq() > 1e-6) dir.normalize();

      if (e.wind > 0) {
        e.wind -= dt;
        e.actor.setGait(false, false);
        if (see) e.actor.root.rotation.y = Math.atan2(dir.x, dir.z);
        if (e.wind <= 0 && see) {
          if (e.windSpell) this.resolveFactionCast(e);
          else this.resolveEnemyCast(e, dir);
        }
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

      if ((e.aggro || 0) > 0) {
        e.aggro -= dt;
        if (e.packId) {
          for (const o of this.enemies) {
            if (o !== e && o.alive && o.packId === e.packId) o.aggro = Math.max(o.aggro || 0, 6);
          }
        }
      }
      if (e.aiPlayer) {
        tickFactionUnit(e, dt, this);
        continue;
      }
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

  beginFactionCast(e, spell, targetPos) {
    const tel = telegraphForSkill(spell);
    const dir = targetPos.clone().sub(e.pos).setY(0);
    if (dir.lengthSq() > 1e-6) dir.normalize();
    else dir.set(0, 0, 1);
    e.windSpell = spell;
    e.windKind = tel.variant === 'aoe' ? 'zone' : tel.variant === 'incoming' ? 'linear' : 'cone';
    e.windMax = Math.max(0.35, tel.sec);
    e.wind = e.windMax;
    e.castDir = dir.clone();
    e.mark = tel.variant === 'incoming' ? null : (tel.variant === 'aoe' ? targetPos.clone() : e.pos.clone());
    e.actor.requestOneShot(spell.kind === 'slash' ? 'attack' : 'cast', e.windMax);
    playSfx(spell.kind === 'slash' ? 'combat_hit' : 'combat_spell', { volume: 0.28 });
    playSfx('warning', { volume: 0.2 });
    const col = spell.color || 0xd8433a;
    if (e.windKind === 'zone') this.vfx.zone({ origin: (e.mark || targetPos).clone(), color: col, radius: spell.range || 3.2, life: e.windMax, dps: 0 });
    else if (e.windKind === 'linear') this.vfx.linear({ origin: e.pos, dir, color: col, range: spell.range || 9, width: 0.7, life: e.windMax });
    else this.vfx.cone({ origin: e.pos, dir, color: col, range: Math.min(spell.range || 3.2, 4), half: 0.75, life: e.windMax });
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

  resolveFactionCast(e) {
    const spell = e.windSpell;
    e.windSpell = null;
    if (!spell) return;
    const dir = e.castDir || this.pos.clone().sub(e.pos).setY(0).normalize();
    const dmg = resolveHit(spell.damage || 12, e.sheet, this.sheet);
    playSfx('combat_hit', { volume: 0.32 });
    if (spell.heal) {
      const mates = this.enemies.filter((o) => o.alive && o.packId === e.packId);
      for (const m of mates) m.hp = Math.min(m.hpMax, m.hp + spell.heal * (e.nerf || 0.62));
      this.vfx.nova({ origin: e.pos.clone(), color: spell.color || 0x8fe05a, range: spell.range || 5 });
      return;
    }
    if (spell.kind === 'slash' || e.windKind === 'cone') {
      this.vfx.slash({ origin: e.pos.clone().setY(1.1), dir, color: spell.color, range: 2.4 });
      this.splashParty(e.pos, (spell.range || 3) + 0.4, dmg, e.sheet, 'cone');
    } else if (e.windKind === 'zone' || spell.kind === 'nova' || spell.kind === 'zone') {
      const mark = e.mark || this.pos.clone();
      this.vfx.nova({ origin: mark, color: spell.color, range: spell.range || 3.2 });
      this.splashParty(mark, spell.range || 3.2, dmg, e.sheet, 'aoe');
    } else {
      this.vfx.beam({ origin: e.pos.clone().setY(1.2), dir, color: spell.color, range: spell.range || 9 });
      this.hitLineFrom(e.pos, dir, spell.range || 9, 0.65, dmg);
    }
    if (e.boss && e.hp < e.hpMax * 0.5) {
      this.vfx.zone({ origin: this.pos.clone(), color: 0xd8433a, radius: 3.6, life: 0.9, dps: 0 });
    }
  }

  resolveEnemyCast(e, dir) {
    const col = e.boss ? 0xd8433a : 0xc9cedb;
    if (e.windKind === 'zone') {
      const mark = this.pos.clone();
      this.vfx.nova({ origin: mark, color: col, range: 3.4 });
      this.splashParty(mark, 3.4, e.boss ? 18 : 10, { damage: e.boss ? 40 : 16, crit: 0.06, critFactor: 1.5 }, 'aoe');
      this.vfx.gridFire({
        origin: mark,
        color: col,
        radius: 3.2,
        life: 4.8,
        scale: 2.15,
        dps: e.boss ? 6 : 3,
        onTick: (it) => {
          this.splashParty(mark, it.radius + 0.45, it.dps, { damage: 8 }, 'aoe');
        },
      });
    } else if (e.windKind === 'linear') {
      this.vfx.beam({ origin: e.pos.clone().setY(1.2), dir, color: 0x9b6cf0, range: 9 });
      this.hitLineFrom(e.pos, dir, 9, 0.7, e.boss ? 14 : 10);
    } else {
      this.vfx.slash({ origin: e.pos.clone().setY(1.1), dir, color: col, range: 2.2 });
      this.splashParty(e.pos, 3.4, e.boss ? 16 : 8, { damage: e.boss ? 36 : 14, crit: 0.05, critFactor: 1.5 }, 'cone');
    }
    this.vfx.shake.add(e.boss ? 0.4 : 0.22);
  }

  hitLineFrom(origin, dir, range, width, dmg) {
    const hit = (pos) => {
      const to = pos.clone().sub(origin);
      const along = to.dot(dir);
      if (along < 0 || along > range) return false;
      const closest = origin.clone().addScaledVector(dir, along);
      return closest.distanceTo(pos) <= width + 0.4;
    };
    if (hit(this.pos)) this.takeDamage(dmg, { damage: 14, crit: 0.05, critFactor: 1.5 }, 'line');
    for (const a of this.allies || []) {
      if (!a.downed && hit(a.pos)) this.hurtAlly(a, dmg * 0.65);
    }
  }

  objective() {
    if (this.phase === 'loading') return 'Loading dungeon…';
    if (this.phase === 'lobby') return 'Pick class · weapon · allies · then ENTER CRAWL';
    if (this.script?.complete) return 'Boss slain · portal + chest';
    if (this.downed) return 'Downed · crawl · ally hold E to lift';
    const listed = (this.script?.script?.path || []).filter((p) => p.type === 'combat' || p.type === 'elite' || p.type === 'boss');
    const have = listed.filter((p) => this.script?.cleared?.has(p.id)).length;
    const living = this.enemies.filter((e) => e.alive && !e.asleep);
    const boss = this.enemies.find((e) => e.boss && e.alive);
    const rooms = listed.length ? `Rooms ${have}/${listed.length}` : '';
    if (boss && !boss.asleep) return `${rooms} · slay ${boss.prefab?.label || 'warlord'} · ${living.length} awake`;
    if (living.length) return `${rooms} · clear hall · ${living.length} foes`;
    return rooms || 'Find the warlord';
  }

  _gateHud() {
    const g = this.gates?.near(this.pos.x, this.pos.z);
    if (!g || this.downed) return null;
    const n = livingInRoom(this, g.fromRoom).length;
    return {
      force: n > 0,
      n,
      t: this.gateCast?.t || 0,
      max: GATE_FORCE_SEC,
    };
  }

  _lootHud() {
    const e = this.nearCorpse();
    if (!e) return null;
    return {
      name: e.prefab?.label || 'Body',
      items: e.loot.map((it) => ({
        id: it.id,
        n: it.n,
        label: BAG_DEFS[it.id]?.label || it.id,
        icon: BAG_DEFS[it.id]?.icon || '',
      })),
    };
  }

  _hudState(sheet, extra = {}) {
    const listed = (this.script?.script?.path || []).filter((p) => p.type === 'combat' || p.type === 'elite' || p.type === 'boss');
    return {
      hp: this.hp,
      hpMax: sheet.hpMax,
      mana: this.mana,
      manaMax: sheet.manaMax,
      stamina: this.stamina,
      staminaMax: sheet.staminaMax,
      className: sheet.className,
      raceName: sheet.raceName,
      raceId: this.raceId,
      classId: this.classId,
      level: sheet.level,
      icon: sheet.icon,
      cds: this.cds,
      cdMax: Object.fromEntries((this.loadout || []).map((s) => [s.slot, s.cd])),
      activeSlot: this.activeSlot,
      casting: this.gateCast
        ? Math.max(0, (this.gateCast.max || GATE_FORCE_SEC) - this.gateCast.t)
        : (extra.casting != null ? extra.casting : this.casting),
      castMax: this.gateCast ? (this.gateCast.max || GATE_FORCE_SEC) : this.castMax,
      castName: this.gateCast ? 'Open gate' : ((this.loadout?.[this.activeSlot - 1]?.name) || extra.castName || ''),
      castHeal: !this.gateCast && !!(this.loadout?.[this.activeSlot - 1]?.heal && this.casting > 0),
      healFocus: this.healFocus,
      objective: extra.objective || this.objective(),
      party: [
        {
          name: sheet.className || this.classId, hp: this.hp, hpMax: sheet.hpMax, you: true,
          raceId: this.raceId, classId: this.classId, id: 'player', skills: this.loadout, weaponId: this.weaponId,
        },
        ...(this.allies || []).map((a, i) => ({
          name: CLASSES[a.classId]?.label || a.classId,
          hp: a.hp, hpMax: a.hpMax, you: false, raceId: a.raceId, classId: a.classId, id: String(i),
          skills: a.loadout,
        })),
      ],
      weaponId: this.weaponId,
      phase: this.phase,
      timer0: this.timer0,
      reviveT: this.reviveT,
      downed: this.downed,
      rooms: listed.map((p) => p.type),
      iframes: this.iframes,
      parryT: this.parryT,
      lockpick: this.lockpick,
      lootBody: this._lootHud(),
      gate: this._gateHud(),
      classState: this.classState,
      classCds: this.classCds,
      classCdMax: Object.fromEntries((this.classSkills || []).map((s) => [s.slot, s.cd])),
      classActive: this.classActive,
      ...extra,
    };
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
    if (this.phase === 'loading') {
      this.player?.update(dt);
      for (const a of this.allies || []) a.actor?.update(dt);
      const sheet = this.sheet || fallbackSheet(this.raceId, this.classId);
      renderHud(this._hudState(sheet, { casting: 0, target: null }));
      return;
    }
    if (this.ended) {
      this.player?.update(dt);
      for (const e of this.enemies) e.actor.update(dt);
      this.vfx.update(gdt, this.enemies, this.playCamera() || this.ctx.cam);
      return;
    }
    this.now = (this.now || 0) + gdt;
    if (this.hitQ?.length) {
      for (const h of this.hitQ) h.t -= gdt;
      const due = this.hitQ.filter((h) => h.t <= 0);
      this.hitQ = this.hitQ.filter((h) => h.t > 0);
      for (const h of due) {
        try { h.fn(); } catch (err) { console.warn('[grudge-dungeon] hitQ', err); }
      }
    }
    for (const k of Object.keys(this.cds)) this.cds[k] = Math.max(0, this.cds[k] - gdt);
    for (const k of Object.keys(this.classCds || {})) this.classCds[k] = Math.max(0, this.classCds[k] - gdt);
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
    this.pinata?.update(gdt);
    this.mana = Math.min(sheet.manaMax, this.mana + sheet.manaRegen * gdt);
    if (!this.downed) this.hp = Math.min(sheet.hpMax, this.hp + sheet.hpRegen * gdt);
    this.tickRevive(gdt);
    this.tickGate(gdt);
    if (!this.keys.has('ShiftLeft') && !this.keys.has('ShiftRight')) {
      this.stamina = Math.min(sheet.staminaMax, (this.stamina ?? sheet.staminaMax) + sheet.staminaRegen * gdt);
    }
    if (this.phase === 'lobby') {
      this.lobby?.update(this.vfx.clock || 0);
      this.player?.update(gdt);
      for (const a of this.allies) a.actor.update(gdt);
      const pose = this.lobby?.cameraPose();
      if (pose) this._aimLobbyCam(pose);
      renderHud(this._hudState(sheet, {
        casting: 0, target: null,
        objective: 'Team lobby · pick class · weapon · allies · ENTER CRAWL',
      }));
      window.__THREE_GAME_DIAGNOSTICS__ = { state: 'lobby', physics: this.phys ? 'rapier' : 'grid', instanceId: this.instance?.id };
      return;
    }
    this.tryMove(gdt);
    this.tickSummons(gdt);
    this.tickEnemies(gdt);
    tickWisps(this, gdt);
    const lens = this.playCamera() || this.ctx.cam;
    this.vfx.update(gdt, this.enemies, lens);
    this.linear.update(gdt, this.enemies);
    const armed = this.loadout[this.activeSlot - 1];
    this.aiming?.setRanges(1.1, armed?.range || 10, armed?.kind === 'zone' || armed?.kind === 'nova' ? 'zone' : 'line');
    if (this.tps?.enabled) this.aiming?.setPointer(0, 0);
    this.aiming?.update(this.pos, this.aim, this.enemies);
    this.aiming?.lookAhead(this.look, 2.6);
    const aimLock = this.aiming?.target;
    this.tps.setSoftLock(aimLock ? { x: aimLock.pos.x, y: 1.2, z: aimLock.pos.z } : null, aimLock ? 0.45 : 0);
    this.tps.setAnchor(this.pos.x, this.pos.y, this.pos.z);
    this.tps.setSprinting(this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'));
    const shake = this.vfx.shake.offset(dt);
    this.tps.shake(Math.hypot(shake.x, shake.z));
    this.tps.update(gdt);
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
        const boss = this.enemies.find((e) => e.boss);
        this.spawnBossReward(boss?.pos || this.pos);
        this.ended = 'win';
        setTimeout(() => { if (this.active) void this.reportCompletion(true); }, 2800);
      },
    });

    const allDown = this.downed && (this.allies || []).every((a) => a.downed || !a.alive);
    if (allDown) {
      this.ended = 'lose';
      void this.reportCompletion(false);
    }

    tickInstanceLod(this.layers, this.playCamera() || this.ctx.cam, this.pos);
    const awake = this.enemies.filter((e) => e.alive && !e.asleep);
    const lock = awake.sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos))[0];
    renderHud(this._hudState(sheet, {
      target: lock ? { name: lock.prefab?.label || lock.name || 'Foe', hp: lock.hp, hpMax: lock.hpMax } : null,
    }));
  }
}

export { spellById };
