/**
 * Local smoke: greedy colliders + mechanic compile on a tiny carved grid.
 * Does not boot WebGL / generateDungeon (those live in src/main.js).
 */
import { buildColliderAssets, greedyRects, hitsSolid, TILE } from '../src/physics/colliders.js';
import { compileMechanics, compileDungeonScript } from '../src/mechanic/compile.js';
import { bindScript, tickScript } from '../src/play/scriptRuntime.js';
import { readFileSync } from 'node:fs';
import { CLASS_IDS, CLASS_WEAPON_SETS, COMBAT_DEPLOY, DUNGEON_KINDS, DUNGEON_SI, HERO_24, PIRATE_FACES, PLAY, PLAY_DEFAULTS, PROP_KITS, creatureOf, creaturesForBiome, loadoutFor, skillById } from '../src/ssot.js';
import { allyRaces } from '../src/play/party.js';
import { flareBossForTheme, flareOf, FLARE_HOST } from '../src/content/flare.js';
import { CELL_FLAG, damageBarrier, destroyCell, stampCover, firstObstruction, lineOpen } from '../src/grid/cells.js';
import { createLosField, losOpen } from '../src/play/los.js';
import { CELL_ROLE, carveRoleRect } from '../src/grid/roles.js';
import { stampEventPlatformRoom } from '../src/grid/eventPlatform.js';
import { DOWNLOAD_REVIEW } from '../src/content/downloads-review.js';
import { saharaByBiome } from '../src/content/props/sahara.js';
import { lookOf } from '../src/content/looks/matlib.js';
import { makeGridSampler } from '../src/terrain/ground.js';
import { PUFF, puffPreset } from '../src/vfx/particles.js';
import { fallbackSheet } from '../src/play/infoCombat.js';
import { compileDressPlan, ROOM_DRESS } from '../src/gen/dressPlan.js';
import { CATALOG_SKILL_PLAY, T0_STARTERS, T8_CLASS_SETS } from '../src/play/t0ClassSets.js';
import { resolveSkillIcon } from '../src/play/skillIcons.js';
import { classLoadoutFor, compileClassSkill } from '../src/play/classSkills.js';
import { CLASS_SKILL_0 } from '../src/play/classSkill0.js';
import { WORGE_BEAR_MESH, bearAlbedoUrl, iguanaAlbedoUrl, iguanaTint } from '../src/play/forms.js';
import { CLASS_ITEM, RAIDER_TWO_HAND, PRIEST_WAND, THIEF_SATCHEL } from '../src/play/classItems.js';
import { CLASS_CRAFTS, craftsForClass, canRefillTonic } from '../src/play/classCrafts.js';
import { resolvePlayUrl } from '../src/play/playUrl.js';
import { HUD_BINDS_DEFAULT, optimalSlots } from '../src/play/hudLayout.js';
import { GAP_CLOSE, MELEE_COMBO } from '../src/play/meleeCombo.js';
import { CLIP_DONOR_NAMES, CLIP_SKIP, classifyClips, resolveClipName, animForSpell, hitWindowSec } from '../src/play/clipRoles.js';
import { classifyId, playCharacterId } from '../src/play/ids.js';
import { COMBAT_ITEMS } from '../src/play/combatItems.js';
import { canAct, inferCc, makeStatus } from '../src/play/status.js';
import { playerPrefab } from '../src/play/prefabs.js';
import { RANGER_LOG, WARRIOR_TANK, WORGE_GRIMOIRE, MAGE_WAND, makeClassState, craftWorgeForm } from '../src/play/classItems.js';
import { createLockpickSession, attemptLockpickTumble, pinInSweetZone, setLockpickPinAngle } from '../src/play/lockpick.js';
import { applyTaunt, topThreatKey, THREAT } from '../src/play/aggro.js';
import { playKitPieces } from '../src/d1.js';
import { FACTION_NERF, PACK_COMPS, packSizeForRoom, planFactionPacks } from '../src/play/factionPacks.js';

const W = 12, H = 10;
const grid = new Uint8Array(W * H);
const roomId = new Int16Array(W * H).fill(-1);
const doorway = new Uint8Array(W * H);
for (let i = 0; i < grid.length; i++) grid[i] = TILE.VOID;
function fill(x0, y0, x1, y1, t, rid) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    grid[y * W + x] = t;
    if (rid != null && t === TILE.FLOOR) roomId[y * W + x] = rid;
  }
}
fill(0, 0, W - 1, H - 1, TILE.WALL);
fill(2, 2, 5, 5, TILE.FLOOR, 0);
fill(6, 3, 9, 7, TILE.FLOOR, 1);
grid[3 * W + 6] = TILE.FLOOR; doorway[3 * W + 6] = 1;
grid[4 * W + 4] = TILE.POOL;

const dungeon = {
  valid: true,
  seed: 1337,
  name: 'SMOKE',
  W, H, grid, roomId, doorway,
  params: { themeKey: 'molten', seed: 1337, roomCount: 2 },
  entrance: 0,
  boss: 1,
  maxDepth: 1,
  rooms: [
    { id: 0, cx: 3.5, cy: 3.5, w: 4, h: 4, type: 'entrance', depth: 0, degree: 1 },
    { id: 1, cx: 7.5, cy: 5, w: 4, h: 5, type: 'boss', depth: 1, degree: 1, miniboss: false },
  ],
  edges: [{ a: 0, b: 1, isLoop: false, isCritical: true }],
};

const wallMask = new Uint8Array(W * H);
for (let i = 0; i < wallMask.length; i++) wallMask[i] = grid[i] === TILE.WALL ? 1 : 0;
const rects = greedyRects(wallMask, W, H);
dungeon.flags = new Uint16Array(W * H);
dungeon.barrierStage = new Uint8Array(W * H);
dungeon.coverRole = new Uint8Array(W * H);
stampCover(dungeon, { raw: () => 0.2 });
dungeon.grid[5 * W + 8] = TILE.FLOOR;
dungeon.roomId[5 * W + 8] = 1;
dungeon.flags[5 * W + 8] = CELL_FLAG.BARRIER;
dungeon.barrierStage[5 * W + 8] = 0;
const cols = buildColliderAssets(dungeon);
const mech = compileMechanics(dungeon, { linear: true });
const mid = { x: (3.5 - W / 2) * DUNGEON_SI.cell, z: (3.5 - H / 2) * DUNGEON_SI.cell };
const wallPt = { x: (0.5 - W / 2) * DUNGEON_SI.cell, z: (3.5 - H / 2) * DUNGEON_SI.cell };
const blocked = hitsSolid(cols, wallPt.x, wallPt.z, PLAY.capsuleR || 0.32);
const sample = makeGridSampler(dungeon);
const floorY = sample(mid.x, mid.z);

const report = {
  greedyWallRects: rects.length,
  colliders: cols.length,
  kinds: cols.reduce((a, n) => ((a[n.kind] = (a[n.kind] || 0) + 1), a), {}),
  mechanicsOk: mech.ok,
  stamps: mech.stamps?.map((s) => s.mechanic),
  encounters: mech.encounters?.length,
  floorWalkable: !hitsSolid(cols, mid.x, mid.z, PLAY.capsuleR),
  voidBlocked: blocked,
  terrainY: floorY,
  groundY: DUNGEON_SI.groundY,
  kinds: Object.keys(DUNGEON_KINDS),
  troll: creatureOf('troll')?.mesh,
};
dungeon.flags[2 * W + 3] |= CELL_FLAG.BREAKABLE | CELL_FLAG.SUBFLOOR;
const smashed = destroyCell(dungeon, 3, 2);
report.smash = smashed && dungeon.grid[2 * W + 3] === TILE.POOL;
report.coverFlags = [...dungeon.flags].filter((f) => f & (CELL_FLAG.BLOCK | CELL_FLAG.BARRIER)).length;
report.barrierCols = cols.filter((n) => n.location?.tags?.includes('barrier')).length;
report.barrierSmash = damageBarrier(dungeon, 8, 5)
  && damageBarrier(dungeon, 8, 5)
  && damageBarrier(dungeon, 8, 5);
const los = createLosField(dungeon);
const midW = { x: (3.5 - W / 2) * DUNGEON_SI.cell, z: (3.5 - H / 2) * DUNGEON_SI.cell };
const wallW = { x: (0.5 - W / 2) * DUNGEON_SI.cell, z: (3.5 - H / 2) * DUNGEON_SI.cell };
report.losBlocked = !losOpen(los, midW.x, midW.z, wallW.x, wallW.z);
report.losHit = firstObstruction(dungeon, midW.x, midW.z, wallW.x, wallW.z)?.kind || null;
report.lineOpenFloor = lineOpen(dungeon, midW.x, midW.z, midW.x + 0.4, midW.z);
const saharaCat = JSON.parse(readFileSync(new URL('../public/models/props/sahara-catalog.json', import.meta.url), 'utf8'));
const sb = saharaByBiome(saharaCat);
report.sahara = Object.fromEntries(Object.entries(sb).map(([k, v]) => [k, v.length]));
report.look = lookOf('frost').aiPrompt.slice(0, 40);
report.dragon = creatureOf('desert_dragon')?.mesh;
report.spike = true;
dungeon.flags[5 * W + 7] = CELL_FLAG.BARRIER;
dungeon.barrierStage = new Uint8Array(W * H);
const b1 = damageBarrier(dungeon, 7, 5);
const b2 = damageBarrier(dungeon, 7, 5);
const b3 = damageBarrier(dungeon, 7, 5);
report.barrierGone = b1 && b2 && b3 && !(dungeon.flags[5 * W + 7] & CELL_FLAG.BARRIER);
stampCover(dungeon, { raw: () => 0.4 });
report.cover = [...dungeon.flags].filter((f) => f & (CELL_FLAG.BLOCK | CELL_FLAG.BARRIER)).length;
report.spiderSeeds = (creatureOf('spider')?.biomes || []).length;
report.spiderInFrost = creaturesForBiome('frost').some((c) => c.id === 'spider');
report.heroes24 = HERO_24.length;
report.pirates = PIRATE_FACES.map((p) => p.id);
report.downloadsUse = DOWNLOAD_REVIEW.use.length;
report.kits = Object.keys(PROP_KITS);
report.modularWall = PROP_KITS.modular?.pieces.some((p) => p.role === 'wall');
report.torchKit = PROP_KITS.torch?.cloneScene === true;
report.smelterVersions = PROP_KITS.smelter?.pieces.filter((p) => p.role === 'scene').length;
report.templeRooms = PROP_KITS.temple?.rooms;
dungeon.flags[3 * W + 3] = CELL_FLAG.SAFE;
const lavaN = carveRoleRect(dungeon, { x0: 7, y0: 4, x1: 8, y1: 5, role: 'lava' });
report.carveLava = lavaN >= 1 && dungeon.grid[4 * W + 7] === TILE.POOL;
const voidN = carveRoleRect(dungeon, { x0: 8, y0: 6, x1: 8, y1: 6, role: 'void' });
report.carveVoid = voidN >= 1 && dungeon.grid[6 * W + 8] === TILE.VOID;
dungeon.rooms[1].type = 'combat';
dungeon.rooms[1].w = 8;
dungeon.rooms[1].h = 8;
dungeon.doorway[4 * W + 6] = 1;
const ev = stampEventPlatformRoom(dungeon, { raw: () => 0.31 });
report.eventRoom = !!ev && dungeon.rooms.some((r) => r.type === 'event');
report.eventPlatforms = (dungeon.platforms || []).length;
report.eventSockets = !!(ev?.sockets?.entrance && ev?.sockets?.exit);
report.puffKit = Object.keys(PUFF);
report.puffHeal = puffPreset('healMist', { color: 0xc8f0a8 }).opacity >= 0.8;
report.puffFire = puffPreset('fireSmall').kind === 'fire' && puffPreset('fireLong').loop === true;
report.classSpecs = CLASS_IDS.length;
report.dualWeapons = CLASS_IDS.every((id) => (CLASS_WEAPON_SETS[id] || []).length >= 2);
report.t8Warrior = T8_CLASS_SETS.warrior[0].skills.includes('tower_fortress')
  && T8_CLASS_SETS.warrior[0].skills.includes('sword_parry_counter')
  && T8_CLASS_SETS.warrior[0].t8 === 'ITEM-20260621232130-000009-2B92F7C8';
report.t8Raider = T8_CLASS_SETS.raider[1].off === 'ITEM-20260621232130-000117-6AE92733';
report.t8Mage = T8_CLASS_SETS.mage[0].brand === 'fire' && loadoutFor('mage', 'fire_staff')[0].id === 'staff_fire_bolt';
report.t8Priest = T8_CLASS_SETS.priest[0].brand === 'holy' && T8_CLASS_SETS.priest[1].off === 't0-offhand-tome';
report.holyHeal = (skillById('staff_holy_light').heal || 0) >= 20;
report.radiantHeal = (skillById('staff_radiant_heal').heal || 0) >= 30;
report.priestBarHeal = loadoutFor('priest').filter((s) => s.heal > 0).length >= 3;
report.factionAllies = allyRaces('human').every((id) => id === 'human' || id === 'barbarian')
  && allyRaces('orc').every((id) => id === 'orc' || id === 'undead');
report.playDefaults = PLAY_DEFAULTS.rooms === 7 && PLAY_DEFAULTS.kind === 'biome' && PLAY_DEFAULTS.yuka === true;
report.combatDonor = COMBAT_DEPLOY.clipDonor.includes('combat.grudge-studio.com') && COMBAT_DEPLOY.telegraphWarning.includes('telegraph_warning');
report.uuidHero = playCharacterId('3f1c2a10-9b4e-4c11-8d22-0a1b2c3d4e5f') === '3f1c2a10-9b4e-4c11-8d22-0a1b2c3d4e5f';
report.uuidRejectAccount = playCharacterId('GRUDGE_ABC') === null && classifyId('GRUDGE_ABC').kind === 'grudgeId';
report.uuidRejectCode = playCharacterId('GRDG-12-AB') === null && classifyId('GRDG-12-AB').kind === 'grudgeCode';
report.uuidPrefab = classifyId('ITEM-20260621232130-000009-2B92F7C8').kind === 'catalogPrefab';
report.uuidSkill = classifyId('SKIL-AAAA-BBBB-CCCC').kind === 'skillDef';
report.uuidIcon = classifyId('ICON-AAAA-BBBB-CCCC').kind === 'iconAsset';
const itemIcons = Object.values(COMBAT_ITEMS).map((i) => i.iconUrl);
report.itemIconsLabeled = itemIcons.every((u) => u && !/ability_arcane_focus/.test(u)) && new Set(itemIcons).size >= 6;
report.classF0All = ['warrior', 'raider', 'mage', 'priest', 'ranger', 'thief', 'worge', 'verduror'].every((id) => CLASS_SKILL_0[id]?.id);
report.classF0Icons = ['w_taunt', 'rd_overpower', 'bear_form', 'v_iguana_form'].every((id) => /assets\.grudge-studio\.com/.test(resolveSkillIcon({ id })));
report.tauntNotArcane = !/ability_arcane_focus/.test(resolveSkillIcon({ id: 'w_taunt' }));
const donorClips = CLIP_DONOR_NAMES.map((name) => ({ name }));
const swordRoles = classifyClips(donorClips, 'sword_shield');
const gsRoles = classifyClips(donorClips, 'two_hand');
report.clipDonorCount = CLIP_DONOR_NAMES.length >= 50;
report.clipSword = swordRoles.attack?.name === 'sword_attack_a'
  && swordRoles.attack2?.name === 'sword_attack_c'
  && swordRoles.attack3?.name === 'sword_combo_finisher'
  && swordRoles.block?.name === 'sword_block'
  && swordRoles.parry?.name === 'shield_bash'
  && swordRoles.dodge?.name === 'dodge'
  && swordRoles.crawl?.name === 'crawl'
  && swordRoles.slide?.name === 'slide_start'
  && swordRoles.jump?.name === 'jump'
  && swordRoles.sprint?.name === 'sprint';
report.clipJumpNotWall = swordRoles.jump?.name !== 'wall_jump_start' && !CLIP_SKIP.includes('dodge');
report.clipHitNoAttack = resolveClipName(swordRoles, 'hit') === null && !swordRoles.hit;
report.clipParryChain = resolveClipName(swordRoles, 'parry') === 'parry';
report.clipGsLoco = gsRoles.idle?.name === 'gs_idle' && gsRoles.walk?.name === 'gs_walk';
report.animSlash = animForSpell(swordRoles, { kind: 'slash' }, { comboStage: 0 }) === 'attack';
report.animCombo = animForSpell(swordRoles, { kind: 'slash' }, { comboStage: 2 }) === 'attack3';
report.animDash = animForSpell(swordRoles, { kind: 'dash' }) === 'dashAtk';
report.hitWindow = Math.abs(hitWindowSec(1, 0.32) - 0.32) < 1e-6;
const playSrc = readFileSync(new URL('../src/play/index.js', import.meta.url), 'utf8');
report.hitQTick = playSrc.includes('this.hitQ.filter') && playSrc.includes('h.fn()');
report.parryClip = playSrc.includes("requestOneShot?.('parry'") && playSrc.includes("requestOneShot?.('hit'");
report.noFlinchAttack = !playSrc.includes("requestOneShot?.('attack', 0.16)");
report.dungeonKinds = DUNGEON_KINDS.biome && DUNGEON_KINDS.faction && DUNGEON_KINDS.boss;
report.flareBoss = flareBossForTheme('molten').id === 'flare_fireworm'
  && flareOf('flare_skel_warrior')?.mesh.startsWith(FLARE_HOST)
  && creatureOf('flare_framis')?.kind === 'boss';
report.flareIndoor = flareBossForTheme('molten').height <= 2.6;
report.t8Worge = T8_CLASS_SETS.worge[0].t8 === 'ITEM-20260621232130-000075-F5282F6D'
  && T8_CLASS_SETS.worge[1].t8 === 'ITEM-20260621232130-000352-E9A5A69B';
report.t8Verduror = T8_CLASS_SETS.verduror[0].id === 'unarmed' && T8_CLASS_SETS.verduror[1].t8 === 'ITEM-20260621232130-000117-6AE92733';
report.t8Claws = T8_CLASS_SETS.verduror[0].skills[0] === 'claw_rending_slash'
  && !T8_CLASS_SETS.verduror[0].skills.includes('bear_form')
  && T0_STARTERS.verduror.t0 === 't0-claw';
report.t8Bar6 = Object.values(T8_CLASS_SETS).every((sets) => sets.every((s) => s.skills.length === 6));
report.t8SkillsKnown = Object.values(T8_CLASS_SETS).flat().every((s) => s.skills.every((id) => CATALOG_SKILL_PLAY[id]));
report.t0Wand = T0_STARTERS.mage.t0 === 't0-wand';
report.t0Sapling = T0_STARTERS.worge.t0 === 't0-nature-staff';
report.warriorTank = WARRIOR_TANK.autoParry && WARRIOR_TANK.block && WARRIOR_TANK.tauntSkillId === 'w_taunt';
report.rangerLog = RANGER_LOG.lockpick && RANGER_LOG.poison.coatSkillId === 'bow_poison_arrow';
report.mageWand = MAGE_WAND.starter === 't0-wand' && MAGE_WAND.schools.includes('fire');
report.worgeForms = WORGE_GRIMOIRE.forms.includes('bear') && craftWorgeForm(makeClassState('worge'), 'raptor').unlocked.includes('raptor');
const lp = createLockpickSession({ targetId: 'dungeon_chest:smoke', kind: 'dungeon_chest', difficulty: 10, label: 'Smoke latch', seed: 7 });
const lp2 = setLockpickPinAngle(lp, lp.sweetAngle);
report.lockpickSweet = pinInSweetZone(lp2);
report.lockpickOpen = attemptLockpickTumble(lp2).status === 'success' || attemptLockpickTumble({ ...lp2, holdProgress: 0.9 }).status === 'success';
const foe = { alive: true, threatTable: new Map(), aggro: 0 };
applyTaunt(foe, 'player', 0);
report.tauntHolds = topThreatKey(foe, 0) === 'player' && THREAT.taunt >= 10000;
report.playLevel = PLAY.level;
report.tpsIndoor = PLAY.tps.distance >= 2.5 && PLAY.tps.distance <= 8 && PLAY.tps.minDistance < PLAY.tps.distance && PLAY.tps.followLambda >= 8;
report.fleetDodge = PLAY.dodge.iframeEnd === 0.34 && PLAY.dodge.doubleTapSec > 0 && PLAY.block.key === 'KeyE' && PLAY.parry.shiftRmb === true;
report.hudBinds = HUD_BINDS_DEFAULT.w1 === 'Digit1' && HUD_BINDS_DEFAULT.i6 === 'Digit6' && HUD_BINDS_DEFAULT.m8 === 'Digit8' && HUD_BINDS_DEFAULT.c0 === 'KeyF';
report.hudOptimal = optimalSlots([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'ult' }], [{ id: 'c' }]).weapon.length === 5;
const comboIds = Object.values(MELEE_COMBO).flat();
report.comboKnown = comboIds.every((id) => CATALOG_SKILL_PLAY[id]);
report.gapKnown = Object.values(GAP_CLOSE).every((id) => CATALOG_SKILL_PLAY[id]);
const st = makeStatus();
st.stun = 1;
report.statusStun = canAct(st) === false;
report.ccFreeze = !!inferCc({ id: 'staff_ice_nova', name: 'Ice Nova', element: 'ice' }).freeze;
report.slideCtrl = PLAY.slide.key === 'ControlLeft';
report.parryStun = PLAY.parry.stun >= 1;
report.f0 = CLASS_SKILL_0.warrior.id === 'w_taunt' && CLASS_SKILL_0.warrior.cd === 15 && CLASS_SKILL_0.mage.totem === 'spell' && CLASS_SKILL_0.priest.totem === 'blessed' && CLASS_SKILL_0.raider.id === 'rd_overpower' && CLASS_SKILL_0.ranger.id === 'r_invis' && CLASS_SKILL_0.ranger.shadowStrike.id === 'r_shadow_strike' && CLASS_SKILL_0.ranger.invisSec === 8;
report.warbear = WORGE_BEAR_MESH.includes('wk-warbear.glb') && bearAlbedoUrl('human').includes('/tex/WK.png') && bearAlbedoUrl('orc').includes('/tex/ORC.jpg');
report.iguanaFaction = iguanaAlbedoUrl('human').includes('Iguana_green') && iguanaAlbedoUrl('elf').includes('Iguana_pink') && iguanaAlbedoUrl('orc').includes('Iguana_blue') && iguanaTint('human') === 0xffffff && iguanaTint('undead') === 0xc0d0ff;
report.verdurorF = CLASS_SKILL_0.verduror?.form === 'iguana';
report.thiefF = CLASS_SKILL_0.thief?.id === 't_invis' && CLASS_SKILL_0.thief.mark?.id === 't_marking_marks' && CLASS_ITEM.thief === 'THIEF_SATCHEL';
report.classCrafts = craftsForClass('ranger').some((c) => c.id === 'lockpick_set') && craftsForClass('worge').some((c) => c.id === 'form_page') && canRefillTonic('warrior') && !canRefillTonic('mage') && CLASS_CRAFTS.tonic_blood.refill.includes('raider') && craftsForClass('mage').some((c) => c.id === 'spell_page') && craftsForClass('priest').some((c) => c.id === 'spell_page_portal');
report.classItems4 = CLASS_ITEM.warrior === 'WARRIOR_BATTLE_FORMS' && CLASS_ITEM.raider === 'RAIDER_TWO_HAND' && CLASS_ITEM.mage === 'MAGE_WAND' && CLASS_ITEM.priest === 'PRIEST_WAND' && PRIEST_WAND.starterName === 'Sapling Wand' && RAIDER_TWO_HAND.autoParry === true;
const nameDup = Object.values(CATALOG_SKILL_PLAY).map((s) => s.name);
report.skillNames = nameDup.every((n) => n && n.length > 1);
report.lv20hp = fallbackSheet('human', 'warrior').hpMax > PLAY.hp;
const dress = compileDressPlan(dungeon);
report.dress = dress.length;
report.dressRoles = dress.reduce((a, s) => ((a[s.role] = (a[s.role] || 0) + 1), a), {});
report.dressRecipes = Object.keys(ROOM_DRESS).length;
const kitJson = JSON.parse(readFileSync(new URL('../public/warlords-dungeon-kit.json', import.meta.url), 'utf8'));
report.playKit = playKitPieces(kitJson).length;
report.playCarpets = playKitPieces(kitJson, 'carpet').length;
report.playWallArt = playKitPieces(kitJson, 'wall_art').length;
report.playFurniture = playKitPieces(kitJson, 'furniture').length;
const script = compileDungeonScript(dungeon, { linear: true, kindId: 'instance' });
report.scriptOk = script.ok && script.completeOn === 'boss-slain' && script.pass === 'dungeon-complete';
const fakeSession = {
  d: dungeon,
  pos: { x: mid.x, z: mid.z },
  enemies: [],
  phase: 'loading',
};
bindScript(fakeSession, dungeon, { linear: true });
tickScript(fakeSession);
report.noClearOnLoad = fakeSession.script.complete !== true;
fakeSession.phase = 'lobby';
tickScript(fakeSession);
report.noClearOnLobby = fakeSession.script.complete !== true;
fakeSession.phase = 'crawl';
tickScript(fakeSession);
report.noClearEmptyBoss = fakeSession.script.complete !== true;
fakeSession.enemies = [{ boss: true, alive: true, hp: 100, hpMax: 100 }];
tickScript(fakeSession);
report.noClearLivingBoss = fakeSession.script.complete !== true;
const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
report.endHiddenCss = css.includes('#play-hud [hidden]') && css.includes('display:none!important');
report.lobbyCss = css.includes('.ph-lobby') && css.includes('.ph-timer') && css.includes('.ph-revive');
report.scriptEvents = (script.events || []).length;
report.scriptBosses = (script.bosses || []).length;
const cols2 = buildColliderAssets(dungeon);
report.platformCols = cols2.filter((n) => n.kind === 'platform').length;
report.factionPacks = Object.keys(PACK_COMPS).map(Number);
report.factionNerf = FACTION_NERF.trash;
report.factionBossScale = DUNGEON_KINDS.faction.heroScale;
const fp = planFactionPacks({
  ...dungeon,
  rooms: [
    { id: 0, type: 'combat', depth: 1, cx: 3, cy: 3, w: 4, h: 4 },
    { id: 1, type: 'combat', depth: 3, cx: 5, cy: 5, w: 4, h: 4 },
    { id: 2, type: 'elite', depth: 2, cx: 6, cy: 6, w: 5, h: 5 },
    { id: 3, type: 'elite', depth: 4, cx: 7, cy: 7, w: 5, h: 5 },
    { id: 4, type: 'boss', depth: 5, cx: 8, cy: 8, w: 6, h: 6 },
  ],
  params: { themeKey: 'molten' },
}, { playerRace: 'human', level: 20, linear: false });
report.factionAiPlayers = fp.filter((u) => u.aiPlayer).length;
report.factionBoss18 = fp.some((u) => u.boss && u.scale === 1.8);
report.pack2 = packSizeForRoom({ type: 'combat', depth: 1 }) === 2;
report.pack3 = packSizeForRoom({ type: 'combat', depth: 3 }) === 3;
report.pack5 = packSizeForRoom({ type: 'elite', depth: 2 }) === 5;
report.pack6 = packSizeForRoom({ type: 'elite', depth: 3 }) === 6;
const warBar = loadoutFor('warrior', 'sword_shield');
report.canonWarrior = warBar[0].id === 'sword_vengeful_slash' && warBar.every((s) => !['cleave', 'fireball', 'thunder'].includes(s.id));
report.canonMage = loadoutFor('mage', 'fire_staff')[0].id === 'staff_fire_bolt';
report.canonAlias = skillById('fireball').id === 'staff_fire_bolt';
report.canonMesh = !!skillById('staff_fire_bolt').meshPath;
report.orbFire = String(skillById('staff_fire_bolt').meshPath || '').includes('orb-fire');
report.orbIce = String(skillById('staff_frost_bolt').meshPath || '').includes('orb-ice');
const skillApiSrc = readFileSync(new URL('../src/play/skillApi.js', import.meta.url), 'utf8');
report.skillApiHealth = skillApiSrc.includes('/api/health') && skillApiSrc.includes('master-weaponSkills.json');
const linearSrc = readFileSync(new URL('../src/play/linearCast.js', import.meta.url), 'utf8');
report.linearWave = linearSrc.includes('wave({') && linearSrc.includes('orb-');
report.rockCdn = resolvePlayUrl('models/vfx/rocks/magic-rock-1.glb').startsWith('https://assets.grudge-studio.com/models/');
report.rock3Cdn = resolvePlayUrl('models/vfx/rocks/magic-rock-3.glb').includes('/models/vfx/rocks/magic-rock-3.glb');
report.noDiskFs = resolvePlayUrl('/@fs/D:/Games/Models/x.glb') === '';
report.spiderLocal = resolvePlayUrl('models/creatures/spider.glb') === '/models/creatures/spider.glb';
const heroPf = playerPrefab('human', 'warrior', 'sword_shield');
report.prefabT8 = typeof heroPf.t8 === 'string' && heroPf.t8.startsWith('ITEM-') && Array.isArray(heroPf.skills) && heroPf.skills.length === 6;
const warIcon = loadoutFor('warrior', 'sword_shield')[0];
report.weaponIconCdn = /^https:\/\/assets\.grudge-studio\.com\//.test(resolveSkillIcon(warIcon));
report.noCraftpixIcon = !resolveSkillIcon(warIcon).includes('/ui/craftpix/icons/');
const stubTree = {
  skillTrees: {
    warrior: {
      tiers: [{
        requiredLevel: 1,
        skills: [
          { id: 'w_taunt', name: 'Taunt', iconUrl: '/icons/skill_nobg/Warriorskill_01_nobg.png', grantedAbility: { id: 'taunt', name: 'Taunt', type: 'debuff', staminaCost: 12, cooldown: 8 } },
          { id: 'w_life_drain', name: 'Life Drain', iconUrl: '/icons/skill_nobg/Warriorskill_09_nobg.png', grantedAbility: { id: 'life_drain_strike', name: 'Life Drain', type: 'physical', damage: 1.4, staminaCost: 20, cooldown: 3 } },
        ],
      }],
    },
  },
};
const clsBar = classLoadoutFor('warrior', stubTree, 20);
report.classBar = clsBar[0].id === 'w_taunt' && clsBar[0].cd === 15 && clsBar.some((s) => s.kind === 'slash');
report.classIconCdn = /^https:\/\/assets\.grudge-studio\.com\//.test(clsBar[1].iconUrl || '');
report.classCompile = compileClassSkill(stubTree.skillTrees.warrior.tiers[0].skills[1], 1).catalogSkillId === 'life_drain_strike';
const fireSrc = readFileSync(new URL('../src/vfx/instancedFire.js', import.meta.url), 'utf8');
report.fireHasUpdate = /update\s*\(/.test(fireSrc) && fireSrc.includes('uniforms');
const mainSrc = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
report.fireTickGuarded = mainSrc.includes("typeof fx.fire?.update === 'function'");
if (!mech.ok || !report.scriptOk || !report.floorWalkable || !report.voidBlocked || rects.length < 1 || floorY !== DUNGEON_SI.groundY || !report.troll || !report.smash || !report.barrierGone || report.heroes24 !== 24 || report.spiderSeeds < 2 || !report.modularWall || report.smelterVersions !== 5 || !report.carveLava || !report.carveVoid || !report.eventRoom || report.eventPlatforms < 4 || !report.eventSockets || report.platformCols < 2 || !report.puffHeal || !report.puffFire || report.puffKit.length < 6 || report.classSpecs !== 8 || !report.dualWeapons || report.playLevel !== 20 || !report.tpsIndoor || !report.fleetDodge || !report.hudBinds || !report.hudOptimal || !report.comboKnown || !report.gapKnown || !report.statusStun || !report.ccFreeze || !report.slideCtrl || !report.parryStun || !report.f0 || !report.warbear || !report.iguanaFaction || !report.verdurorF || !report.thiefF || !report.classCrafts || !report.classItems4 || !report.skillNames || !report.lv20hp || report.dress < 1 || !report.playCarpets || !report.playWallArt || report.playFurniture < 2 || !report.t8Warrior || !report.t8Raider || !report.t8Mage || !report.t8Priest || !report.t8Worge || !report.t8Verduror || !report.t8Claws || !report.t8Bar6 || !report.t8SkillsKnown || !report.t0Wand || !report.t0Sapling || !report.warriorTank || !report.rangerLog || !report.mageWand || !report.worgeForms || !report.lockpickSweet || !report.lockpickOpen || !report.tauntHolds || !report.holyHeal || !report.radiantHeal || !report.priestBarHeal || !report.factionAllies || !report.playDefaults || !report.combatDonor || !report.uuidHero || !report.uuidRejectAccount || !report.uuidRejectCode || !report.uuidPrefab || !report.uuidSkill || !report.uuidIcon || !report.itemIconsLabeled || !report.classF0All || !report.classF0Icons || !report.tauntNotArcane || !report.clipDonorCount || !report.clipSword || !report.clipJumpNotWall || !report.clipHitNoAttack || !report.clipParryChain || !report.clipGsLoco || !report.animSlash || !report.animCombo || !report.animDash || !report.hitWindow || !report.hitQTick || !report.parryClip || !report.noFlinchAttack || !report.dungeonKinds || !report.flareBoss || !report.flareIndoor || !report.pack2 || !report.pack3 || !report.pack5 || !report.pack6 || !report.factionBoss18 || report.factionAiPlayers < 8 || !report.canonWarrior || !report.canonMage || !report.canonAlias || !report.canonMesh || !report.orbFire || !report.orbIce || !report.skillApiHealth || !report.linearWave || !report.rockCdn || !report.rock3Cdn || !report.noDiskFs || !report.spiderLocal || !report.prefabT8 || !report.weaponIconCdn || !report.noCraftpixIcon || !report.classBar || !report.classIconCdn || !report.classCompile || !report.fireHasUpdate || !report.fireTickGuarded || !report.noClearOnLoad || !report.noClearOnLobby || !report.noClearEmptyBoss || !report.noClearLivingBoss || !report.endHiddenCss || !report.lobbyCss) {
  console.error('SMOKE FAIL', report);
  process.exit(1);
}
console.log('SMOKE OK', JSON.stringify(report, null, 2));
