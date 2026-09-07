/**
 * Warlords Era character deploy — SkeletonUtils.clone + per-instance mixer.
 * Race GLBs are full Toon-RTS wardrobes on one Bip001 skeleton.
 * Never mount the shared cache root. Never invent empty clips.
 */
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { ANIM_URLS, CLIP_DONOR, ESTES_CAST_DONOR, PLAY, RACES, ROLE_KITS, WEAPON_KITS, WORGE_WEAPONS, raceCharacterUrl, weaponClipPack } from '../ssot.js';
import { BIP001_PLAY, bip001ExtraForWeapon } from './clipLibrary.js';
import { loadGltf } from './assets.js';
import { plantFeet } from '../terrain/footPlant.js';
import {
  LOCO_KEYS,
  animForSpell,
  classifyClips,
  clipStem,
  hitWindowSec,
  resolveClipName,
  stampAnimClip,
} from './clipRoles.js';
import { attachAlertMark } from './alertMark.js';

export { animForSpell, classifyClips, clipStem, hitWindowSec, resolveClipName };

const RACE_PREFIXES = ['WK_', 'BRB_', 'ELF_', 'DWF_', 'ORC_', 'UD_'];

const SLOT_DEFS = [
  { slot: 'body', re: /^(?:Units_)?Body_([A-Z])$/i, group: 'armor' },
  { slot: 'arms', re: /^(?:Units_)?Arms_([A-Z])$/i, group: 'armor' },
  { slot: 'legs', re: /^(?:Units_)?Legs_([A-Z])$/i, group: 'armor' },
  { slot: 'head', re: /^(?:Units_)?(?:Head|Haed)_([A-Z])$/i, group: 'armor' },
  { slot: 'shoulders', re: /^(?:Units_)?Shoulderpads_([A-Z])$/i, group: 'armor' },
  { slot: 'axe', re: /^(?:Units_|weapon_|Weapon_)?[Aa]xe(?:_([A-Z]))?$/i, group: 'weapon_r' },
  { slot: 'hammer', re: /^(?:Units_|weapon_|Weapon_)?[Hh]ammer(?:_([A-Z]))?$/i, group: 'weapon_r' },
  { slot: 'sword', re: /^(?:Units_|weapon_|Weapon_)?[Ss]word(?:_([A-Z]))?$/i, group: 'weapon_r' },
  { slot: 'dagger', re: /^(?:Units_|weapon_|Weapon_)?[Dd]agger(?:_([A-Z]))?$/i, group: 'weapon_r' },
  { slot: 'pick', re: /^(?:Units_|weapon_|Weapon_)?[Pp]ick(?:_([A-Z]))?$/i, group: 'weapon_r' },
  { slot: 'spear', re: /^(?:Units_|weapon_|Weapon_)?[Ss]pear(?:_([A-Z]))?$/i, group: 'weapon_r' },
  { slot: 'bow', re: /^(?:Units_|weapon_|Weapon_)?[Bb]ow(?:_([A-Z]))?$/i, group: 'weapon_l' },
  { slot: 'staff', re: /^(?:Units_|weapon_|Weapon_)?[Ss]taff(?:_([A-Z]))?$/i, group: 'weapon_l' },
  { slot: 'shield', re: /^(?:Units_)?[Ss]hield_([A-Z])$/i, group: 'shield' },
  { slot: 'bag', re: /^(?:Xtra_|Units_)?[Bb]ag$/i, group: 'utility' },
  { slot: 'wood', re: /^(?:Xtra_|Units_)?[Ww]ood$/i, group: 'utility' },
  { slot: 'quiver', re: /^(?:Xtra_|Units_)?[Qq]uiver$/i, group: 'utility' },
];

const WARDROBE_HINT = /units_|weapon_|shield|xtra_|shoulder|body_|arms_|legs_|head_/i;

function resolveKit(role, weaponId) {
  const base = { ...(ROLE_KITS[role] || ROLE_KITS.warrior) };
  const kit = WEAPON_KITS[weaponId];
  if (kit) {
    Object.assign(base, kit);
    return base;
  }
  if (role !== 'worge' && role !== 'verduror' && role !== 'priest') return base;
  const opt = WORGE_WEAPONS[weaponId] || WORGE_WEAPONS['1h_tome'];
  base.weapon = opt.weapon;
  base.tome = !!opt.tome;
  base.staffVar = opt.staffVar;
  base.staffTint = opt.staffTint;
  base.shield = false;
  return base;
}

function kitToWant(role, equipped, weaponId) {
  const kit = resolveKit(role, weaponId);
  const want = {
    body: kit.body,
    arms: kit.arms,
    legs: kit.legs,
    head: kit.head,
    shoulders: kit.shoulders,
  };
  if (!equipped || kit.unarmed) return want;
  if (kit.weapon === 'sword') want.sword = 'A';
  if (kit.weapon === 'axe') want.axe = 'A';
  if (kit.weapon === 'hammer') want.hammer = 'A';
  if (kit.weapon === 'spear') want.spear = true;
  if (kit.weapon === 'dagger') want.dagger = true;
  if (kit.weapon === 'staff') want.staff = kit.staffVar || 'A';
  if (kit.weapon === 'bow') want.bow = true;
  if (kit.offHand === 'hammer') want.hammer = 'A';
  if (kit.offHand === 'sword') want.sword = 'A';
  if (kit.shield) want.shield = 'A';
  if (kit.quiver) want.quiver = true;
  if (kit.tome) want.tome = true;
  want.staffTint = kit.staffTint;
  want.tomeTint = kit.tomeTint;
  want.dual = !!kit.dual;
  return want;
}

function racePrefix(raceId) {
  const p = RACES[raceId]?.prefix || 'WK';
  return p.endsWith('_') ? p : `${p}_`;
}

function stripRacePrefix(name, preferred) {
  if (!name) return name;
  if (preferred && name.startsWith(preferred)) return name.slice(preferred.length);
  for (const p of RACE_PREFIXES) {
    if (name.startsWith(p)) return name.slice(p.length);
  }
  const lower = name.toLowerCase();
  for (const p of RACE_PREFIXES) {
    if (lower.startsWith(p.toLowerCase())) return name.slice(p.length);
  }
  return name;
}

function variantOf(match, def) {
  if (!match) return 'A';
  const letter = String(match[1] || 'A').toUpperCase().replace(/[^A-Z]/g, '');
  return letter || 'A';
}

/**
 * One body + one head + one arms + one legs + class weapon.
 * Showing every mesh is the classic spiked / deformed wardrobe blob.
 */
function makeTome(tint = 0xb070ff) {
  const g = new THREE.Group();
  g.name = 'worge_tome';
  const c = new THREE.Color(tint);
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.22, 0.045),
    new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.28), roughness: 0.55, metalness: 0.15, emissive: c, emissiveIntensity: 0.22 }),
  );
  const page = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.19, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.85 }),
  );
  page.position.z = 0.012;
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.028, 0),
    new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7, roughness: 0.25 }),
  );
  gem.position.set(0, 0.02, 0.03);
  g.add(cover, page, gem);
  g.rotation.set(-0.35, 0.4, 0.15);
  g.position.set(0.04, 0.06, 0.08);
  return g;
}

function attachTome(root, tint) {
  const hand = root.getObjectByName('L_hand_container')
    || root.getObjectByName('Bip001 L Hand')
    || root.getObjectByName('Bip001_L_Hand');
  if (!hand) return;
  const old = hand.getObjectByName('worge_tome');
  if (old) hand.remove(old);
  hand.add(makeTome(tint));
}

function leftHand(root) {
  return root.getObjectByName('L_hand_container')
    || root.getObjectByName('Bip001 L Hand')
    || root.getObjectByName('Bip001_L_Hand');
}

function tintMesh(mesh, hex) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const m of mats) {
    if (!m?.color) continue;
    const copy = m.clone();
    copy.color.multiply(new THREE.Color(hex));
    copy.emissive = new THREE.Color(hex);
    copy.emissiveIntensity = 0.22;
    mesh.material = copy;
  }
}

function applyWardrobe(root, role = 'warrior', equipped = true, raceId = 'human', weaponId = '1h_tome') {
  const prefix = racePrefix(raceId);
  const want = kitToWant(role, equipped, weaponId);
  const catalog = {};
  root.traverse((o) => {
    if (!o.isMesh) return;
    const stripped = stripRacePrefix(o.name || '', prefix);
    let matched = false;
    for (const def of SLOT_DEFS) {
      const m = stripped.match(def.re) || (o.name || '').match(def.re);
      if (!m) continue;
      const v = variantOf(m, def);
      if (!catalog[def.slot]) catalog[def.slot] = {};
      if (!catalog[def.slot][v]) catalog[def.slot][v] = o;
      o.visible = false;
      matched = true;
      break;
    }
    if (!matched && WARDROBE_HINT.test(o.name || '')) o.visible = false;
  });

  const pick = (slot, letter) => {
    const variants = catalog[slot];
    if (!variants) return;
    const key = letter === true ? Object.keys(variants)[0] : (variants[letter] ? letter : (variants.A ? 'A' : Object.keys(variants)[0]));
    if (!key || !variants[key]) return;
    variants[key].visible = true;
  };

  pick('body', want.body || 'A');
  pick('arms', want.arms || 'A');
  pick('legs', want.legs || 'A');
  pick('head', want.head || 'A');
  if (want.shoulders) pick('shoulders', want.shoulders);
  for (const slot of ['sword', 'axe', 'hammer', 'staff', 'bow', 'shield', 'quiver', 'dagger', 'spear']) {
    if (want[slot]) pick(slot, want[slot]);
  }
  if (want.staffTint && catalog.staff) {
    for (const mesh of Object.values(catalog.staff)) {
      if (mesh.visible) tintMesh(mesh, want.staffTint);
    }
  }
  if (want.dual && want.hammer && catalog.hammer) {
    const lh = leftHand(root);
    for (const mesh of Object.values(catalog.hammer)) {
      if (!mesh.visible || !lh) continue;
      lh.attach(mesh);
    }
  }
  if (want.tome) attachTome(root, want.tomeTint);

  let vis = 0;
  root.traverse((o) => { if (o.isMesh && o.visible) vis++; });
  if (vis < 3) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const n = (o.name || '').toLowerCase();
      if (/units_head_a|units_body_a|units_arms_a|units_legs_a|head_a|body_a|arms_a|legs_a/.test(n)) {
        o.visible = true;
      }
    });
  }
}

function findAnimRoot(root) {
  return root.getObjectByName('RootNode')
    || root.getObjectByName('Bip001')
    || root;
}

function boneKey(name) {
  const stem = String(name || '').replace(/_\d+$/, '');
  return stem.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

/** Mixamo clip stems → Bip001 (alphanumeric). anim_death.glb is Mixamo. */
const MIXAMO_BIP = {
  mixamorighips: 'bip001pelvis',
  mixamorigspine: 'bip001spine',
  mixamorigspine1: 'bip001spine1',
  mixamorigspine2: 'bip001spine2',
  mixamorigneck: 'bip001neck',
  mixamorighead: 'bip001head',
  mixamorigleftshoulder: 'bip001lclavicle',
  mixamorigleftarm: 'bip001lupperarm',
  mixamorigleftforearm: 'bip001lforearm',
  mixamoriglefthand: 'bip001lhand',
  mixamorigrightshoulder: 'bip001rclavicle',
  mixamorigrightarm: 'bip001rupperarm',
  mixamorigrightforearm: 'bip001rforearm',
  mixamorigrighthand: 'bip001rhand',
  mixamorigleftupleg: 'bip001lthigh',
  mixamorigleftleg: 'bip001lcalf',
  mixamorigleftfoot: 'bip001lfoot',
  mixamoriglefttoebase: 'bip001ltoe0',
  mixamorigrightupleg: 'bip001rthigh',
  mixamorigrightleg: 'bip001rcalf',
  mixamorigrightfoot: 'bip001rfoot',
  mixamorigrighttoebase: 'bip001rtoe0',
};

function collectBoneMap(root) {
  const map = new Map();
  root.traverse((o) => {
    if (o.isBone && o.name) map.set(boneKey(o.name), o.name);
  });
  if (map.size === 0) {
    root.traverse((o) => {
      if (o.name && /bip001/i.test(o.name)) map.set(boneKey(o.name), o.name);
    });
  }
  return map;
}

/**
 * Combat Gladiators retarget: rotation-only, alphanumeric bone match.
 * Translation/scale tracks from a donor rest pose crush the race bind.
 */
function remapClipTracks(clip, boneMap) {
  const copy = clip.clone();
  const keep = [];
  for (const track of copy.tracks) {
    const dot = track.name.lastIndexOf('.');
    if (dot < 0) continue;
    const node = track.name.slice(0, dot);
    const path = track.name.slice(dot + 1);
    if (/position|scale/i.test(path)) continue;
    const key = boneKey(node);
    const dest = boneMap.get(key) || boneMap.get(MIXAMO_BIP[key]);
    if (!dest) continue;
    track.name = `${dest}.${path}`;
    keep.push(track);
  }
  copy.tracks = keep;
  return copy;
}

function stripPositionTracks(clip) {
  clip.tracks = clip.tracks.filter((t) => !/\.position$/.test(t.name));
  return clip;
}

function isolateMeshes(root, hide, keep) {
  if (!hide && !keep) return;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.name || '';
    if (keep && keep.test(n)) { o.visible = true; return; }
    if (hide && hide.test(n)) o.visible = false;
  });
}



function visibleBox(root) {
  const box = new THREE.Box3();
  let any = false;
  root.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    const b = new THREE.Box3().setFromObject(o);
    if (!Number.isFinite(b.min.x)) return;
    if (!any) { box.copy(b); any = true; }
    else box.union(b);
  });
  if (!any) box.setFromObject(root);
  return box;
}

function fitHeight(root, target) {
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);
  let box = visibleBox(root);
  let h = box.getSize(new THREE.Vector3()).y || 1;
  if (h > 20) {
    root.scale.setScalar(0.01);
    root.updateMatrixWorld(true);
    box = visibleBox(root);
    h = box.getSize(new THREE.Vector3()).y || 1;
  }
  root.scale.multiplyScalar(target / Math.max(h, 0.01));
  root.updateMatrixWorld(true);
  box = visibleBox(root);
  if (Number.isFinite(box.min.y)) root.position.y -= box.min.y;
}

export class Actor {
  constructor() {
    this.root = new THREE.Group();
    this.visual = null;
    this.mixer = null;
    this.clipBank = [];
    this.clips = { idle: null, walk: null, run: null, attack: null, cast: null, death: null };
    this.actions = {};
    this.loco = {};
    this.gait = 'idle';
    this.gaitW = Object.fromEntries(LOCO_KEYS.map((k) => [k, k === 'idle' ? 1 : 0]));
    this.busy = 0;
    this.moveLock = 0;
    this._hold = null;
    this.alive = true;
    this.dead = false;
    this.ready = false;
    this.groundSampler = null;
  }

  bindTerrain(sampler) {
    this.groundSampler = sampler || null;
  }

  _locoAction(name) {
    const clip = this.clips[name];
    if (!this.mixer || !clip) return null;
    if (!this.loco[name]) {
      const a = this.mixer.clipAction(clip);
      a.setLoop(THREE.LoopRepeat, Infinity);
      a.enabled = true;
      a.play();
      a.setEffectiveWeight(0);
      this.loco[name] = a;
    }
    return this.loco[name];
  }

  play(name, fade = 0.12, loop = true) {
    const resolved = resolveClipName(this.clips, name) || name;
    const clip = this.clips[resolved];
    if (!this.mixer || !clip) return null;
    if (loop && LOCO_KEYS.includes(resolved)) {
      this._locoAction(resolved);
      return this.loco[resolved];
    }
    const next = this.mixer.clipAction(clip);
    if (this.actions.overlay && this.actions.overlay !== next) {
      this.actions.overlay.fadeOut(fade);
    }
    next.reset();
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.clampWhenFinished = !loop;
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.fadeIn(fade).play();
    this.actions.overlay = next;
    return next;
  }

  requestOneShot(name, duration = 0.45) {
    if (!this.alive) return null;
    const resolved = resolveClipName(this.clips, name);
    if (!resolved) return null;
    const clip = this.clips[resolved];
    const dur = clip?.duration > 0.05 ? clip.duration : duration;
    this._hold = null;
    this.busy = dur;
    this.moveLock = Math.min(0.28, dur * 0.42);
    return this.play(resolved, 0.08, false);
  }

  setHold(name, on) {
    if (!this.alive) return;
    if (on) {
      const resolved = resolveClipName(this.clips, name);
      if (!resolved) return;
      if (this._hold !== resolved) {
        this.play(resolved, 0.1, true);
        this._hold = resolved;
      }
    } else if (this._hold) {
      this.actions.overlay?.fadeOut(0.12);
      this._hold = null;
    }
  }

  die() {
    this.alive = false;
    this.dead = true;
    this.busy = 0;
    this._hold = null;
    const act = this.play('death', 0.12, false);
    if (act) {
      for (const k of LOCO_KEYS) {
        if (this.loco[k]) {
          this.loco[k].setEffectiveWeight(0);
          this.loco[k].fadeOut(0.12);
        }
      }
    } else {
      for (const k of LOCO_KEYS) {
        if (this.loco[k]) this.loco[k].paused = true;
      }
      if (this.actions.overlay) {
        this.actions.overlay.paused = true;
        this.actions.overlay.clampWhenFinished = true;
      }
    }
    return act;
  }

  setGait(moving, sprint, opts = {}) {
    if (!this.alive || this.dead) return;
    let next = 'idle';
    if (opts.downed) next = this.clips.crawl ? 'crawl' : 'walk';
    else if (opts.sneak) next = moving ? (this.clips.sneak ? 'sneak' : 'walk') : (this.clips.crouch ? 'crouch' : 'idle');
    else if (opts.strafe === 'left' && moving && this.clips.strafeL) next = 'strafeL';
    else if (opts.strafe === 'right' && moving && this.clips.strafeR) next = 'strafeR';
    else if (!moving) next = 'idle';
    else if (sprint) next = this.clips.sprint ? 'sprint' : 'run';
    else next = 'walk';
    this.gait = next;
    for (const key of LOCO_KEYS) {
      if (this.clips[key]) this._locoAction(key);
    }
  }

  update(dt) {
    if (this.dead) {
      this.mixer?.update(dt);
      return;
    }
    if (this.moveLock > 0) this.moveLock -= dt;
    if (this.busy > 0) {
      this.busy -= dt;
      if (this.busy <= 0 && !this._hold) this.actions.overlay = null;
    }
    const overlayOn = (this.busy > 0 || this._hold) ? 0.28 : 1;
    const want = Object.fromEntries(LOCO_KEYS.map((k) => [k, 0]));
    const gait = this.clips[this.gait] ? this.gait : 'idle';
    want[gait] = overlayOn;
    const k = 1 - Math.exp(-12 * dt);
    for (const key of LOCO_KEYS) {
      this.gaitW[key] = this.gaitW[key] ?? 0;
      this.gaitW[key] += (want[key] - this.gaitW[key]) * k;
      const a = this.loco[key];
      if (a) a.setEffectiveWeight(Math.max(0, this.gaitW[key]));
    }
    this.mixer?.update(dt);
    if (this.groundSampler && !this.airborne) plantFeet(this.root, this.groundSampler);
  }

  dispose() {
    this.mixer?.stopAllAction();
    this.visual?.traverse((o) => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m.dispose?.();
      }
    });
  }
}

async function gatherClips(gltf, boneMap, weaponId = '') {
  const native = (gltf.animations || []).filter((c) => c.tracks?.length);
  const extra = [];
  const take = (c, { forceName = null, source = 'donor' } = {}) => {
    const copy = remapClipTracks(c, boneMap);
    if (!copy.tracks.length) return;
    stampAnimClip(copy, source, forceName || c.name);
    extra.push(copy);
  };
  const tryUrl = async (url, forceName = null, source = 'donor') => {
    const g = await loadGltf(url);
    for (const c of g.animations || []) {
      if (!c.tracks?.length) continue;
      take(c, { forceName, source });
    }
  };
  const tryJson = async (url, forceName, source = 'json') => {
    let json = gatherClips._json.get(url);
    if (!json) {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`clip json ${r.status}`);
      json = await r.json();
      gatherClips._json.set(url, json);
    }
    const clip = THREE.AnimationClip.parse(json);
    if (!clip?.tracks?.length) return;
    take(clip, { forceName, source });
  };
  const bipRows = [...BIP001_PLAY, ...bip001ExtraForWeapon(weaponId)];
  await Promise.all(bipRows.map(async (row) => {
    try { await tryJson(row.url, row.stem, 'bip001'); } catch { /* pack miss */ }
  }));
  try {
    await tryUrl(CLIP_DONOR, null, 'donor');
  } catch {
    /* donor optional */
  }
  try {
    const g = await loadGltf(ESTES_CAST_DONOR);
    for (const c of g.animations || []) {
      if (!c.tracks?.length) continue;
      const stem = clipStem(c.name).toLowerCase();
      if (stem === 'run' || stem === 'fight_idle') continue;
      take(c, { source: 'estes' });
    }
  } catch {
    /* estes optional */
  }
  await Promise.all(Object.entries(ANIM_URLS).map(async ([key, url]) => {
    try { await tryUrl(url, key, key === 'death' ? 'death' : 'donor'); } catch { /* optional */ }
  }));
  const pack = weaponClipPack(weaponId);
  if (pack) {
    await Promise.all(Object.entries(pack).map(async ([role, url]) => {
      try { await tryJson(url, role); } catch { /* catalog miss */ }
    }));
  }
  const remapped = native.map((c) => {
    const copy = remapClipTracks(c, boneMap);
    if (!copy.tracks.length) return null;
    stampAnimClip(copy, 'native', c.name);
    return copy;
  }).filter(Boolean);
  return [...remapped, ...extra];
}
gatherClips._json = new Map();

export async function spawnActor({
  raceId,
  height = PLAY.playerHeight,
  role = 'warrior',
  equipped = true,
  prefab = null,
} = {}) {
  const actor = new Actor();
  const rid = prefab?.raceId || raceId || 'human';
  const h = prefab?.height || height;
  const r = prefab?.role || role;
  const eq = prefab?.equipped ?? equipped;
  const wid = prefab?.weaponId || '1h_tome';
  actor.prefab = prefab || { raceId: rid, role: r, height: h, weaponId: wid };
  const nativeMesh = prefab?.mesh || null;
  const url = nativeMesh || raceCharacterUrl(rid);
  let gltf;
  try {
    gltf = await loadGltf(url);
  } catch (err) {
    console.warn('[grudge-dungeon] character CDN miss', rid || url, err);
    return makeFallback(actor, h, r === 'mage' ? 0x7a4ad9 : 0xc9a227);
  }
  const visual = cloneSkinned(gltf.scene);
  visual.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      if (o.material?.map) o.material.map.colorSpace = THREE.SRGBColorSpace;
    }
  });
  if (nativeMesh) isolateMeshes(visual, prefab.hide, prefab.keep);
  else applyWardrobe(visual, r, eq, rid, wid);
  actor.visual = visual;
  actor.root.add(visual);

  const animRoot = findAnimRoot(visual);
  actor.mixer = new THREE.AnimationMixer(animRoot);
  const clips = nativeMesh
    ? (gltf.animations || []).map((c) => stampAnimClip(stripPositionTracks(c.clone()), 'native', c.name))
    : await gatherClips(gltf, collectBoneMap(visual), wid);
  actor.clipBank = clips;
  actor.clips = classifyClips(clips, wid);
  if (!actor.clips.idle) {
    console.warn('[grudge-dungeon] no idle clip for', rid);
  } else {
    actor.play('idle', 0, true);
    actor.mixer.update(1 / 30);
  }
  fitHeight(visual, h);
  if (prefab?.yaw) visual.rotation.y = prefab.yaw;
  attachAlertMark(actor, h);
  actor.ready = true;
  const stamp = {
    v: 1,
    loader: 'dungeon-spawnActor',
    race: rid,
    classId: r,
    weaponId: wid,
    t8: prefab?.t8 || null,
    mixerCount: 1,
    skeleton: 'Bip001',
    face: 'toon-plusZ',
    ground: 'bone-box-feet',
    mesh: url,
    capsule: false,
  };
  actor.root.userData.warlordsPlayContract = stamp;
  visual.userData.warlordsPlayContract = stamp;
  return actor;
}

/** Re-apply mesh_ids kit on the same mixer/root — Q swap / lobby weapon pick. */
export function reequipActor(actor, classId, weaponId) {
  if (!actor?.visual) return;
  const raceId = actor.prefab?.raceId || 'human';
  applyWardrobe(actor.visual, classId || actor.prefab?.role, true, raceId, weaponId);
  if (actor.prefab) {
    actor.prefab.weaponId = weaponId;
    actor.prefab.role = classId || actor.prefab.role;
    actor.prefab.classId = classId || actor.prefab.classId;
  }
  if (actor.clipBank?.length) {
    actor.clips = classifyClips(actor.clipBank, weaponId);
    actor.loco = {};
    actor.gait = 'idle';
    actor.play('idle', 0.08, true);
  }
  const stamp = actor.root?.userData?.warlordsPlayContract;
  if (stamp) {
    stamp.weaponId = weaponId;
    stamp.classId = classId || stamp.classId;
  }
}

function makeFallback(actor, height, color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, height * 0.55, 6, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1 }),
  );
  body.position.y = height * 0.5;
  body.castShadow = true;
  g.add(body);
  actor.visual = g;
  actor.root.add(g);
  actor.ready = true;
  return actor;
}
