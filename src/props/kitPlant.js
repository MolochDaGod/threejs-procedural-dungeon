/**
 * Isolate-by-name interior kits (lp-dungeon, brick, halloween).
 * Same pattern as saharaKit — never fuse the pack.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PROP_KITS } from '../content/props/kits.js';
import { MAGIC_ROCKS, MAGIC_ROCK_DIAMETER_M } from '../content/props/magicRocks.js';
import { CELL_FLAG } from '../grid/cells.js';
import { DUNGEON_SI } from '../ssot.js';
import { plantObjectOnTerrain } from '../terrain/footPlant.js';
import { loadGltf } from '../play/assets.js';

const loader = new GLTFLoader();
const packs = {};
let ready = false;

export function interiorKitsReady() {
  return ready;
}

export function hasKit(id) {
  return !!packs[id];
}

function findMesh(root, name) {
  if (!root || !name) return null;
  let found = null;
  root.traverse((o) => {
    if (found || !o.isMesh) return;
    if (o.name === name || o.name.startsWith(name) || name.startsWith(o.name)) found = o;
  });
  if (found) return found;
  root.traverse((o) => {
    if (found || !o.isMesh) return;
    if (o.parent && (o.parent.name === name || o.parent.name.startsWith(name))) found = o;
  });
  return found;
}

function fitProp(root, targetH) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const h = Math.max(size.y, 0.001);
  root.scale.multiplyScalar(targetH / h);
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;
}

async function loadOne(id, kit) {
  if (packs[id]) return packs[id];
  const gltf = await new Promise((res, rej) => loader.load(kit.glb, res, undefined, rej));
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material?.map) o.material.map.colorSpace = THREE.SRGBColorSpace;
    }
  });
  packs[id] = { kit, scene: gltf.scene };
  return packs[id];
}

export async function loadInteriorKits() {
  const jobs = Object.entries(PROP_KITS).map(([id, kit]) =>
    loadOne(id, kit).catch((err) => {
      console.warn(`[grudge-dungeon] kit ${id} miss`, err);
      return null;
    }),
  );
  await Promise.all(jobs);
  ready = Object.values(packs).some(Boolean);
  return packs;
}

function kitForBiome(theme) {
  const prefer = {
    ancient: ['modular', 'dungeon', 'brick'],
    grim: ['modular', 'halloween', 'dungeon', 'brick'],
    verdant: ['halloween', 'dungeon', 'brick'],
    molten: ['brick', 'dungeon', 'modular'],
    frost: ['brick', 'dungeon', 'modular'],
  };
  return (prefer[theme] || prefer.ancient).filter((id) => packs[id]);
}

function pieceForRole(packIds, role, stage = 0, salt = 0) {
  for (const id of packIds) {
    const pack = packs[id];
    if (!pack) continue;
    const pieces = pack.kit.pieces.filter((p) => p.role === role);
    if (!pieces.length) continue;
    if (role === 'barrier') {
      const staged = pieces.find((p) => p.stage === stage) || pieces[Math.min(stage, pieces.length - 1)];
      const mesh = findMesh(pack.scene, staged.mesh);
      if (mesh) return { pack, piece: staged, mesh };
    } else {
      const piece = pieces[Math.abs(salt) % pieces.length];
      const mesh = findMesh(pack.scene, piece.mesh);
      if (mesh) return { pack, piece, mesh };
    }
  }
  return null;
}

function plantAt(group, src, x, z, yaw, targetH) {
  const mesh = src.clone();
  mesh.material = src.material;
  const wrap = new THREE.Group();
  wrap.add(mesh);
  wrap.position.set(x, DUNGEON_SI.groundY, z);
  wrap.rotation.y = yaw;
  group.add(wrap);
  fitProp(wrap, targetH);
  wrap.position.x = x;
  wrap.position.z = z;
  plantObjectOnTerrain(wrap, group.userData?.sampler || group.parent?.userData?.sampler);
  return wrap;
}

const ROLE_NAME = { 1: 'wall', 2: 'pillar', 3: 'debris', 4: 'barrier' };

export function plantCoverKits(dungeon, group) {
  if (!ready || !dungeon?.flags) return 0;
  const theme = dungeon.params?.themeKey || 'ancient';
  const packIds = kitForBiome(theme);
  if (!packIds.length) return 0;
  const W = dungeon.W, H = dungeon.H;
  const wx = (gx) => gx - W / 2 + 0.5;
  const wz = (gz) => gz - H / 2 + 0.5;
  dungeon.coverMeshes = dungeon.coverMeshes || {};
  let n = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const f = dungeon.flags[i];
      if (!(f & (CELL_FLAG.BLOCK | CELL_FLAG.BARRIER))) continue;
      const roleBit = dungeon.coverRole?.[i] || ((f & CELL_FLAG.BARRIER) ? 4 : 2);
      const role = ROLE_NAME[roleBit] || ((f & CELL_FLAG.BARRIER) ? 'barrier' : 'pillar');
      const stage = dungeon.barrierStage?.[i] || 0;
      const salt = x + y * 13;
      const hit = pieceForRole(packIds, role, stage, salt)
        || pieceForRole(packIds, role === 'wall' ? 'pillar' : role, stage, salt)
        || pieceForRole(packIds, 'pillar', 0, salt);
      if (!hit) continue;
      const yaw = role === 'wall' ? (x % 2 ? 0 : Math.PI / 2) : (x + y) * 0.7;
      const wrap = plantAt(group, hit.mesh, wx(x), wz(y), yaw, hit.piece.h / DUNGEON_SI.cell);
      wrap.name = `cover-${role}-${x}-${y}`;
      wrap.userData = {
        gx: x, gz: y, i, role, stage, packIds,
        pieceId: hit.piece.id,
        hp: hit.piece.hp || undefined,
      };
      dungeon.coverMeshes[i] = wrap;
      n++;
    }
  }
  dungeon.onBarrierDamaged = (i, gx, gz, stage, gone) => {
    const wrap = dungeon.coverMeshes?.[i];
    if (!wrap) return;
    if (gone) {
      wrap.visible = false;
      return;
    }
    const hit = pieceForRole(wrap.userData.packIds || packIds, 'barrier', stage);
    if (!hit) return;
    while (wrap.children.length) wrap.remove(wrap.children[0]);
    const mesh = hit.mesh.clone();
    mesh.material = hit.mesh.material;
    wrap.add(mesh);
    wrap.userData.stage = stage;
    fitProp(wrap, hit.piece.h / DUNGEON_SI.cell);
    wrap.position.x = wx(gx);
    wrap.position.z = wz(gz);
  };
  return n;
}

function cloneRoot(src) {
  const wrap = src.clone(true);
  wrap.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material) o.material = o.material.clone();
    }
  });
  return wrap;
}

/** Gothic wall torch replaces GEO.torch on the existing torch stamps. */
export function plantWallTorches(dungeon, group) {
  const pack = packs.torch;
  if (!pack || !dungeon?.torches?.length || !group) return 0;
  const wx = (gx) => gx - dungeon.W / 2 + 0.5;
  const wz = (gz) => gz - dungeon.H / 2 + 0.5;
  const h = (pack.kit.pieces[0]?.h || 0.85) / DUNGEON_SI.cell;
  let n = 0;
  for (const t of dungeon.torches) {
    const wrap = cloneRoot(pack.scene);
    const X = wx(t.x) + t.dx * 0.42;
    const Z = wz(t.y) + t.dy * 0.42;
    wrap.name = `torch-${t.x}-${t.y}`;
    wrap.position.set(X, DUNGEON_SI.groundY + 1.15 / DUNGEON_SI.cell, Z);
    wrap.rotation.y = Math.atan2(t.dx, t.dy);
    group.add(wrap);
    fitProp(wrap, h);
    wrap.position.set(X, DUNGEON_SI.groundY + 1.15 / DUNGEON_SI.cell, Z);
    n++;
  }
  return n;
}

/** Small room vignettes: rainforest temple (verdant) and smelter variants (molten). */
export function plantRoomScenes(dungeon, group) {
  if (!group || !dungeon?.rooms) return 0;
  const theme = dungeon.params?.themeKey || 'ancient';
  const wx = (gx) => gx - dungeon.W / 2 + 0.5;
  const wz = (gz) => gz - dungeon.H / 2 + 0.5;
  let n = 0;

  const temple = packs.temple;
  if (temple && (temple.kit.biomes || []).includes(theme)) {
    const want = new Set(temple.kit.rooms || ['shrine']);
    for (const r of dungeon.rooms) {
      if (!want.has(r.type)) continue;
      const wrap = cloneRoot(temple.scene);
      const X = wx(r.cx);
      const Z = wz(r.cy + r.h * 0.22);
      wrap.name = `temple-scene-${r.id}`;
      wrap.position.set(X, DUNGEON_SI.groundY, Z);
      group.add(wrap);
      fitProp(wrap, (temple.kit.sceneH || 5.2) / DUNGEON_SI.cell);
      wrap.position.set(X, DUNGEON_SI.groundY, Z);
      n++;
    }
  }

  const smelter = packs.smelter;
  if (smelter && (smelter.kit.biomes || []).includes(theme)) {
    const want = new Set(smelter.kit.rooms || ['elite']);
    const versions = smelter.kit.pieces.filter((p) => p.role === 'scene');
    for (const r of dungeon.rooms) {
      if (!want.has(r.type)) continue;
      const piece = versions[Math.abs(r.id) % versions.length];
      const mesh = findMesh(smelter.scene, piece.mesh);
      if (!mesh) continue;
      const X = wx(r.cx);
      const Z = wz(r.cy - r.h * 0.18);
      const wrap = plantAt(group, mesh, X, Z, r.id * 0.4, piece.h / DUNGEON_SI.cell);
      wrap.name = `smelter-scene-${r.id}`;
      n++;
    }
  }
  return n;
}

const magicRockScenes = {};

async function loadMagicRock(def) {
  if (magicRockScenes[def.id]) return magicRockScenes[def.id];
  const gltf = await loadGltf(def.glb);
  if (!gltf?.scene) throw new Error(`magic-rock miss ${def.id}`);
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material?.map) o.material.map.colorSpace = THREE.SRGBColorSpace;
    }
  });
  magicRockScenes[def.id] = gltf.scene;
  return gltf.scene;
}

/**
 * Play-client dress stamps (SI metres). Carpets / wall art / furniture.
 * Architecture walls stay Kenney TILE.WALL — this never replaces them.
 */
export async function plantDressPlan(stamps, group) {
  if (!group || !stamps?.length) return 0;
  if (!ready) await loadInteriorKits();
  let n = 0;
  for (const s of stamps) {
    try {
      if (s.source === 'kit' && s.kitId && s.mesh) {
        const pack = packs[s.kitId];
        const mesh = pack ? findMesh(pack.scene, s.mesh) : null;
        if (!mesh) continue;
        const src = mesh.clone();
        src.material = mesh.material;
        const wrap = new THREE.Group();
        wrap.add(src);
        wrap.position.set(s.x, s.y || DUNGEON_SI.groundY, s.z);
        wrap.rotation.y = s.yaw || 0;
        wrap.name = `dress-${s.role}-${s.roomId}`;
        wrap.userData = { dress: s.role, block: !!s.block };
        group.add(wrap);
        fitProp(wrap, s.h || 0.8);
        wrap.position.set(s.x, s.y || DUNGEON_SI.groundY, s.z);
        n++;
        continue;
      }
      if (!s.url) continue;
      const gltf = await new Promise((res, rej) => loader.load(s.url, res, undefined, rej));
      const wrap = cloneRoot(gltf.scene);
      wrap.name = `dress-${s.role}-${s.roomId}`;
      wrap.position.set(s.x, s.y || DUNGEON_SI.groundY, s.z);
      wrap.rotation.y = s.yaw || 0;
      wrap.userData = { dress: s.role, block: !!s.block };
      group.add(wrap);
      fitProp(wrap, s.h || 0.8);
      wrap.position.set(s.x, s.y || DUNGEON_SI.groundY, s.z);
      if (s.role === 'carpet') wrap.position.y = 0.02;
      if (s.role === 'wall_art') wrap.position.y = s.y || 1.55;
      n++;
    } catch (err) {
      console.warn('[grudge-dungeon] dress miss', s.role, err?.message || err);
    }
  }
  return n;
}

/** Isolated magic rocks as shrine / treasure / boss objects — never the fused pack. */
export async function plantMagicRocks(dungeon, group) {
  if (!group || !dungeon?.rooms) return 0;
  const theme = dungeon.params?.themeKey || 'ancient';
  const wx = (gx) => gx - dungeon.W / 2 + 0.5;
  const wz = (gz) => gz - dungeon.H / 2 + 0.5;
  const pool = MAGIC_ROCKS.filter((r) => (r.biomes || []).includes(theme) || theme === 'ancient');
  const pick = pool.length ? pool : MAGIC_ROCKS;
  let n = 0;
  const rooms = dungeon.rooms.filter((r) => r.type === 'shrine' || r.type === 'treasure' || r.type === 'boss');
  for (const r of rooms) {
    const def = pick[Math.abs(r.id) % pick.length];
    try {
      const scene = await loadMagicRock(def);
      const wrap = cloneRoot(scene);
      const X = wx(r.cx);
      const Z = wz(r.cy);
      wrap.name = `magic-rock-${def.id}-${r.id}`;
      wrap.position.set(X, DUNGEON_SI.groundY, Z);
      group.add(wrap);
      fitProp(wrap, (def.h || MAGIC_ROCK_DIAMETER_M) / DUNGEON_SI.cell);
      wrap.position.set(X, DUNGEON_SI.groundY, Z);
      n++;
    } catch (err) {
      console.warn('[grudge-dungeon] magic-rock miss', def.id, err);
    }
  }
  return n;
}
