/**
 * Warlords Era character deploy — SkeletonUtils.clone + per-instance mixer.
 * Never mounts the shared cache root. Never invents empty clips.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { ANIM_URLS, PLAY, raceCharacterUrl } from '../ssot.js';

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
  const out = { idle: null, walk: null, run: null, attack: null, cast: null, death: null };
  const hit = (re) => clips.find((c) => re.test(c.name));
  out.idle   = hit(/idle|stand|breath|gs_idle/i);
  out.walk   = hit(/walk|locomot|gs_walk|bow_walk|magic_walk/i);
  out.run    = hit(/run|sprint|gs_run/i) || out.walk;
  out.attack = hit(/sword_attack|attack|slash|melee|strike|combat/i);
  out.cast   = hit(/magic_cast|cast|spell|magic|shoot|bow_shot/i) || out.attack;
  out.death  = hit(/death|die|dead/i);
  if (!out.idle && clips[0]) out.idle = clips[0];
  return out;
}

function applyWardrobe(root, role = 'warrior') {
  const keep = {
    warrior: /sword|blade|axe|hammer|shield/i,
    mage:    /staff|wand|tome|book/i,
    ranger:  /bow|spear|arrow|quiver/i,
  }[role] || /sword/i;
  const hide = /weapon|sword|axe|bow|staff|shield|quiver|hammer|spear|wand/i;
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (hide.test(o.name) && !keep.test(o.name)) o.visible = false;
  });
}

function fitHeight(root, target) {
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  let h = size.y || 1;
  if (h > 20) {
    root.scale.setScalar(0.01);
    root.updateMatrixWorld(true);
    box.setFromObject(root);
    h = box.getSize(new THREE.Vector3()).y || 1;
  }
  root.scale.multiplyScalar(target / Math.max(h, 0.01));
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  root.position.y -= box.min.y;
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

async function gatherClips(gltf) {
  const native = gltf.animations?.filter((c) => c.tracks?.length) || [];
  const extra = [];
  await Promise.all(Object.entries(ANIM_URLS).map(async ([key, url]) => {
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

export async function spawnActor({ raceId, height = PLAY.playerHeight, role = 'warrior' }) {
  const actor = new Actor();
  const url = raceCharacterUrl(raceId);
  let gltf;
  try {
    gltf = await loadGltf(url);
  } catch (err) {
    console.warn('[grudge-dungeon] character CDN miss', raceId, err);
    return makeFallback(actor, height, 0xc9a227);
  }
  const visual = cloneSkinned(gltf.scene);
  visual.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material?.map) o.material.map.colorSpace = THREE.SRGBColorSpace;
    }
  });
  applyWardrobe(visual, role);
  fitHeight(visual, height);
  actor.visual = visual;
  actor.root.add(visual);

  const animRoot = findAnimRoot(visual);
  actor.mixer = new THREE.AnimationMixer(animRoot);
  const clips = (await gatherClips(gltf)).map(stripPositionTracks);
  const classified = classifyClips(clips);
  actor.clips = classified;
  if (!classified.idle) {
    console.warn('[grudge-dungeon] no idle clip for', raceId);
  } else {
    actor.play('idle', 0, true);
    actor.mixer.update(1 / 30);
  }
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
