/**
 * Warlords Era character deploy — SkeletonUtils.clone + per-instance mixer.
 * Race GLBs are full Toon-RTS wardrobes on one Bip001 skeleton.
 * Never mount the shared cache root. Never invent empty clips.
 */
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { ANIM_URLS, CLIP_DONOR, PLAY, RACES, ROLE_KITS, raceCharacterUrl } from '../ssot.js';
import { loadGltf } from './assets.js';

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

function kitToWant(role, equipped) {
  const kit = ROLE_KITS[role] || ROLE_KITS.warrior;
  const want = {
    body: kit.body,
    arms: kit.arms,
    legs: kit.legs,
    head: kit.head,
    shoulders: kit.shoulders,
  };
  if (!equipped) return want;
  if (kit.weapon === 'sword') want.sword = 'A';
  if (kit.weapon === 'axe') want.axe = 'A';
  if (kit.weapon === 'staff') want.staff = 'A';
  if (kit.weapon === 'bow') want.bow = true;
  if (kit.shield) want.shield = 'A';
  if (kit.quiver) want.quiver = true;
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
function applyWardrobe(root, role = 'warrior', equipped = true, raceId = 'human') {
  const prefix = racePrefix(raceId);
  const want = kitToWant(role, equipped);
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
  return String(name || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

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
    const dest = boneMap.get(boneKey(node));
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

function classifyClips(clips) {
  const out = { idle: null, walk: null, run: null, attack: null, cast: null, death: null };
  const hit = (re) => clips.find((c) => re.test(c.name));
  out.idle   = hit(/^idle$/i) || hit(/gs_idle|idle|stand|breath/i);
  out.walk   = hit(/^walk$/i) || hit(/gs_walk|bow_walk|magic_walk|walk|locomot/i);
  out.run    = hit(/^run$/i) || hit(/gs_run|run|sprint/i) || out.walk;
  out.attack = hit(/^attack$/i) || hit(/sword_attack|slash|melee|strike|combat/i);
  out.cast   = hit(/magic_cast|^cast$|bow_shot|spell|shoot/i) || out.attack;
  out.death  = hit(/death|die|dead/i);
  if (!out.idle && clips[0]) out.idle = clips[0];
  return out;
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
    this.clips = { idle: null, walk: null, run: null, attack: null, cast: null, death: null };
    this.actions = {};
    this.gait = 'idle';
    this.busy = 0;
    this.alive = true;
    this.ready = false;
  }

  play(name, fade = 0.12, loop = true) {
    const clip = this.clips[name] || this.clips.idle;
    if (!this.mixer || !clip) return null;
    const next = this.mixer.clipAction(clip);
    if (this.actions.cur === next && next.isRunning()) return next;
    next.reset();
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.clampWhenFinished = !loop;
    next.enabled = true;
    if (this.actions.cur && this.actions.cur !== next) this.actions.cur.fadeOut(fade);
    next.fadeIn(fade).play();
    this.actions.cur = next;
    return next;
  }

  requestOneShot(name, duration = 0.45) {
    if (!this.alive) return;
    this.busy = duration;
    this.play(name, 0.06, false);
  }

  setGait(moving, sprint) {
    if (!this.alive || this.busy > 0) return;
    const next = !moving ? 'idle' : sprint ? 'run' : 'walk';
    if (next === this.gait) return;
    this.gait = next;
    const act = this.play(next, 0.14, true);
    if (act && next === 'run' && !this.clips.run) act.timeScale = 1.35;
    else if (act) act.timeScale = next === 'walk' ? 1.05 : 1;
  }

  update(dt) {
    if (this.busy > 0) {
      this.busy -= dt;
      if (this.busy <= 0 && this.alive) {
        this.gait = '';
        this.setGait(false, false);
      }
    }
    this.mixer?.update(dt);
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

async function gatherClips(gltf, boneMap) {
  const native = (gltf.animations || []).filter((c) => c.tracks?.length);
  const extra = [];
  const tryUrl = async (url, forceName = null) => {
    const g = await loadGltf(url);
    for (const c of g.animations || []) {
      if (!c.tracks?.length) continue;
      const copy = remapClipTracks(c, boneMap);
      if (!copy.tracks.length) continue;
      if (forceName) copy.name = forceName;
      extra.push(copy);
    }
  };
  try {
    await tryUrl(CLIP_DONOR);
  } catch {
    /* donor optional */
  }
  if (extra.length < 3) {
    await Promise.all(Object.entries(ANIM_URLS).map(async ([key, url]) => {
      try { await tryUrl(url, key); } catch { /* optional */ }
    }));
  }
  return [...native.map((c) => remapClipTracks(c, boneMap)).filter((c) => c.tracks.length), ...extra];
}

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
  actor.prefab = prefab || { raceId: rid, role: r, height: h };
  const url = raceCharacterUrl(rid);
  let gltf;
  try {
    gltf = await loadGltf(url);
  } catch (err) {
    console.warn('[grudge-dungeon] character CDN miss', rid, err);
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
  applyWardrobe(visual, r, eq, rid);
  actor.visual = visual;
  actor.root.add(visual);

  const animRoot = findAnimRoot(visual);
  actor.mixer = new THREE.AnimationMixer(animRoot);
  const clips = await gatherClips(gltf, collectBoneMap(visual));
  actor.clips = classifyClips(clips);
  if (!actor.clips.idle) {
    console.warn('[grudge-dungeon] no idle clip for', rid);
  } else {
    actor.play('idle', 0, true);
    actor.mixer.update(1 / 30);
  }
  fitHeight(visual, h);
  actor.ready = true;
  return actor;
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
