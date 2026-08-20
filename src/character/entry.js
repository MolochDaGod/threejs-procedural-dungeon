/**
 * Character entry — Toon `{race}.glb` + SkeletonUtils.clone + one mixer.
 * Stamps warlordsPlayContract. Extra clips from combat.grudge-studio.com donor.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { ANIM_URLS, COMBAT_CLIP_URLS, PLAY, raceCharacterUrl } from '../ssot.js';
import { plantFeet } from '../terrain/footPlant.js';

const loader = new GLTFLoader();
const cache = new Map();

function loadGltf(url) {
  if (cache.has(url)) return cache.get(url);
  const p = new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, (err) => {
      cache.delete(url);
      reject(err);
    });
  });
  cache.set(url, p);
  return p;
}

function findAnimRoot(root) {
  let skinned = null;
  root.traverse((o) => {
    if (!skinned && o.isSkinnedMesh) skinned = o;
  });
  if (skinned) {
    let p = skinned;
    while (p.parent && p.parent !== root) p = p.parent;
    return p;
  }
  return root;
}

function stripPositionTracks(clip) {
  clip.tracks = clip.tracks.filter((t) => !/\.position$/.test(t.name));
  return clip;
}

function classifyClips(clips) {
  const out = { idle: null, walk: null, run: null, attack: null, cast: null, death: null, dodge: null };
  const hit = (re) => clips.find((c) => re.test(c.name));
  out.idle   = hit(/idle|stand|breath|gs_idle/i);
  out.walk   = hit(/walk|locomot|gs_walk|bow_walk|magic_walk/i);
  out.run    = hit(/run|sprint|gs_run/i) || out.walk;
  out.attack = hit(/sword_attack|attack|slash|melee|strike|combat/i);
  out.cast   = hit(/magic_cast|cast|spell|magic|shoot|bow_shot/i) || out.attack;
  out.death  = hit(/death|die|dead/i);
  out.dodge  = hit(/dodge|roll|dash|evade|sidestep/i) || out.run || out.walk;
  if (!out.idle && clips[0]) out.idle = clips[0];
  return out;
}

function applyWardrobe(root, role = 'warrior') {
  const keep = {
    warrior: /sword|blade|axe|hammer|shield/i,
    mage:    /staff|wand|tome|book/i,
    ranger:  /bow|spear|arrow|quiver/i,
    worge:   /sword|blade|staff|tome|book|wand/i,
    flex:    /sword|blade|staff|tome|book|wand/i,
  }[role] || /sword/i;
  const hide = /weapon|sword|axe|bow|staff|shield|quiver|hammer|spear|wand/i;
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (hide.test(o.name) && !keep.test(o.name)) o.visible = false;
  });
}

function visibleBox(root) {
  const box = new THREE.Box3();
  let hit = false;
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    box.expandByObject(o);
    hit = true;
  });
  return hit ? box : new THREE.Box3().setFromObject(root);
}

function isolateMeshes(root, hide, keep) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.name || '';
    if (hide && hide.test(n)) o.visible = false;
    if (keep && !keep.test(n)) o.visible = false;
  });
}

function fitHeight(root, target) {
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);
  let box = visibleBox(root);
  let size = box.getSize(new THREE.Vector3());
  let h = size.y || 1;
  if (h > 20) {
    root.scale.setScalar(0.01);
    root.updateMatrixWorld(true);
    box = visibleBox(root);
    h = box.getSize(new THREE.Vector3()).y || 1;
  }
  root.scale.multiplyScalar(target / Math.max(h, 0.01));
  root.updateMatrixWorld(true);
  box = visibleBox(root);
  root.position.y -= box.min.y;
}

function stampContract(actor, { raceId, role, url }) {
  const stamp = {
    v: 1,
    loader: 'dungeon-character-entry',
    race: raceId,
    classId: role,
    mixerCount: 1,
    skeleton: 'Bip001',
    face: 'toon-plusZ',
    ground: 'terrain-sampler',
    mesh: url,
  };
  actor.root.userData.warlordsPlayContract = stamp;
  if (actor.visual) actor.visual.userData.warlordsPlayContract = stamp;
}

export class Actor {
  constructor() {
    this.root = new THREE.Group();
    this.visual = null;
    this.mixer = null;
    this.clips = { idle: null, walk: null, run: null, attack: null, cast: null, death: null, dodge: null };
    this.actions = {};
    this.gait = 'idle';
    this.busy = 0;
    this.busyMax = 0;
    this.cancelAt = 0;
    this.alive = true;
    this.ready = false;
    this.groundSampler = null;
  }

  play(name, fade = 0.18, loop = true, timeScale = 1) {
    const clip = this.clips[name] || this.clips.idle;
    if (!this.mixer || !clip) return null;
    const next = this.mixer.clipAction(clip);
    next.setEffectiveTimeScale(timeScale);
    if (this.actions.cur === next && next.isRunning() && loop) return next;
    next.enabled = true;
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.clampWhenFinished = !loop;
    if (this.actions.cur === next && next.isRunning()) {
      return next;
    }
    next.reset();
    if (this.actions.cur && this.actions.cur !== next) this.actions.cur.fadeOut(fade);
    next.fadeIn(fade).play();
    this.actions.cur = next;
    return next;
  }

  requestOneShot(name, duration = 0.45, { cancelFrac = 0.32, fade = 0.1, timeScale = 1 } = {}) {
    if (!this.alive) return;
    this.busy = duration;
    this.busyMax = duration;
    this.cancelAt = duration * (1 - cancelFrac);
    this.play(name, fade, false, timeScale);
  }

  canCancel() {
    if (this.busy <= 0) return true;
    return this.busy <= this.cancelAt;
  }

  cancelBusy() {
    this.busy = 0;
    this.busyMax = 0;
    this.cancelAt = 0;
    this.gait = '';
  }

  setGait(moving, sprint) {
    if (!this.alive) return;
    if (this.busy > 0) return;
    const next = !moving ? 'idle' : sprint ? 'run' : 'walk';
    if (next === this.gait) return;
    this.gait = next;
    const fade = next === 'idle' ? 0.22 : 0.16;
    const act = this.play(next, fade, true);
    if (act && next === 'run' && !this.clips.run) act.timeScale = 1.28;
    else if (act) act.timeScale = next === 'walk' ? 1.02 : 1;
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
    if (this.groundSampler) plantFeet(this.root, this.groundSampler);
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

async function gatherClips(gltf) {
  const native = gltf.animations?.filter((c) => c.tracks?.length) || [];
  const extra = [];
  const urls = [
    ...Object.entries(ANIM_URLS).map(([key, url]) => ({ key, url })),
    ...COMBAT_CLIP_URLS.map((url) => ({ key: 'combat', url })),
  ];
  await Promise.all(urls.map(async ({ key, url }) => {
    try {
      const g = await loadGltf(url);
      for (const c of g.animations || []) {
        if (!c.tracks?.length) continue;
        const copy = c.clone();
        copy.name = copy.name || key;
        extra.push(copy);
      }
    } catch {
      /* optional clip */
    }
  }));
  return [...native, ...extra];
}

export async function spawnActor({
  raceId,
  height = PLAY.playerHeight,
  role = 'warrior',
  meshUrl = null,
  clips = 'toon',
  hide = null,
  keep = null,
} = {}) {
  const actor = new Actor();
  const url = meshUrl || raceCharacterUrl(raceId);
  const native = clips === 'native' || !!meshUrl;
  let gltf;
  try {
    gltf = await loadGltf(url);
  } catch (err) {
    console.warn('[grudge-dungeon] character CDN miss', raceId || url, err);
    const fallback = makeFallback(actor, height, 0xc9a227);
    stampContract(fallback, { raceId, role, url });
    return fallback;
  }
  const visual = cloneSkinned(gltf.scene);
  visual.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material?.map) o.material.map.colorSpace = THREE.SRGBColorSpace;
      if (o.material?.color) o.material.color.set(0xffffff);
    }
  });
  isolateMeshes(visual, hide, keep);
  if (!native) applyWardrobe(visual, role);
  fitHeight(visual, height);
  actor.visual = visual;
  actor.root.add(visual);

  const animRoot = findAnimRoot(visual);
  actor.mixer = new THREE.AnimationMixer(animRoot);
  const raw = native
    ? (gltf.animations || []).map((c) => stripPositionTracks(c.clone()))
    : (await gatherClips(gltf)).map(stripPositionTracks);
  const classified = classifyClips(raw);
  actor.clips = classified;
  if (!classified.idle) {
    console.warn('[grudge-dungeon] no idle clip for', raceId || url);
  } else {
    actor.play('idle', 0, true);
    actor.mixer.update(1 / 30);
    visual.updateMatrixWorld(true);
    const after = visibleBox(visual);
    visual.position.y -= after.min.y;
  }
  stampContract(actor, { raceId, role, url });
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
