/**
 * Clip libraries under D:\Games\Models\_anim_packs
 *
 * READ at runtime (browser): Three.js AnimationClip JSON (Bip001, quaternion-only)
 *              and GLB (GLTFLoader + Meshopt).
 * AUTHOR only: Mixamo 25-bone FBX (no mesh) — convert with grudge-convert, do not
 *              parse FBX in the SPA. 30characters.glb = outline, not play body.
 *
 * Prefer: bip001 retargeted JSON > Mixamo FBX rematch > Estes GLB > wk-knight donor.
 */
const B = '/models/anims/bip001';

/** Always loaded on Toon play spawn. */
export const BIP001_PLAY = [
  { url: `${B}/loco/idle.json`, stem: 'idle' },
  { url: `${B}/loco/walk_forward.json`, stem: 'walk' },
  { url: `${B}/loco/run_forward.json`, stem: 'run' },
  { url: `${B}/loco/jump.json`, stem: 'jump' },
  { url: `${B}/loco/dodging.json`, stem: 'dodge' },
  { url: `${B}/loco/dodge_back.json`, stem: 'dodge' },
  { url: `${B}/loco/land_roll.json`, stem: 'slide' },
  { url: `${B}/loco/crouch_walk.json`, stem: 'crouch' },
  { url: `${B}/loco/plant_seed.json`, stem: 'plant' },
  { url: `${B}/climb/up.json`, stem: 'climb' },
  { url: `${B}/climb/down.json`, stem: 'climb_down' },
  { url: `${B}/climb/to_top.json`, stem: 'climb_top' },
  { url: `${B}/climb/wall_run.json`, stem: 'wall_run' },
  { url: `${B}/swim/swimming.json`, stem: 'swim' },
  { url: `${B}/swim/treading.json`, stem: 'treading' },
  { url: `${B}/magic/estes_skill1.json`, stem: 'skill1' },
  { url: `${B}/magic/estes_skill2.json`, stem: 'skill2' },
  { url: `${B}/magic/estes_skill3.json`, stem: 'skill3' },
  { url: `${B}/magic/estes_attack1.json`, stem: 'attack1' },
  { url: `${B}/magic/estes_attack2.json`, stem: 'attack2' },
  { url: `${B}/magic/estes_dead.json`, stem: 'dead' },
  { url: `${B}/magic/estes_verigo.json`, stem: 'verigo' },
  { url: `${B}/death/death-from-front.json`, stem: 'death' },
];

/** Generic Mixamo-named rifle JSON (Bip001). Loaded only for gun weapons. */
export const BIP001_RIFLE = [
  { url: `${B}/rifle/idle.json`, stem: 'idle' },
  { url: `${B}/rifle/walking.json`, stem: 'walk' },
  { url: `${B}/rifle/run-forward.json`, stem: 'run' },
  { url: `${B}/rifle/firing-rifle.json`, stem: 'shoot' },
  { url: `${B}/rifle/rifle-aiming-idle.json`, stem: 'aim' },
  { url: `${B}/rifle/reloading.json`, stem: 'reload' },
  { url: `${B}/rifle/hit-reaction.json`, stem: 'hit' },
  { url: `${B}/rifle/death-from-front-headshot.json`, stem: 'death' },
];

export function bip001ExtraForWeapon(weaponId) {
  const w = String(weaponId || '');
  if (/rifle|musket|carbine|shotgun/.test(w)) return BIP001_RIFLE;
  return [];
}

/**
 * Mixamo 25-bone FBX on disk (meshless Toon RTS). Author library.
 * Counts from 2026-09 review. Convert via grudge-convert fbx2glb — no FBX in browser.
 */
export const MIXAMO_PACKS = {
  skeleton: 'mixamo-25',
  root: 'D:/Games/Models/_anim_packs',
  outlineGlb: 'D:/Games/Models/_anim_packs/30characters.glb',
  format: 'fbx',
  packs: {
    locomotion: { dir: 'locomotion', fbx: 60 },
    action_adventure: { dir: 'action_adventure', fbx: 29 },
    traversal: { dir: 'traversal', fbx: 9 },
    rifle: { dir: 'rifle', fbx: 37 },
    pistol: { dir: 'pistol', fbx: 20 },
    pistol_handgun_locomotion: { dir: 'pistol_handgun_locomotion', fbx: 21 },
    longbow: { dir: 'longbow', fbx: 39 },
    sword_shield: { dir: 'sword_shield', fbx: 17 },
    greatsword: { dir: 'greatsword', fbx: 51 },
    farming: { dir: 'farming', fbx: 25 },
    magic_loco: { dir: 'magic_loco', fbx: 16 },
    magic_spell: { dir: 'magic_spell', fbx: 13 },
  },
};

/** Already Bip001 JSON on disk (retargeted/). ~689 clips. Play subset shipped above. */
export const BIP001_DISK = {
  root: 'D:/Games/Models/_anim_packs/retargeted',
  format: 'three-animationclip-json',
  skeleton: 'Bip001',
  tracks: 'quaternion-only',
  weapons: {
    sword_shield: 109,
    '2h_melee': 71,
    magic: 62,
    unarmed: 59,
    ghost_rider: 57,
    dual_wield: 51,
    axe: 47,
    rifle: 33,
    hammer: 26,
    longbow: 13,
    pistol: 13,
    spear_melee: 13,
  },
  mobility: 12,
  locomotion: 16,
  special: 107,
};

export const CLIP_READERS = {
  json: 'THREE.AnimationClip.parse — shipped /models/anims/bip001',
  glb: 'GLTFLoader + MeshoptDecoder + Mixamo/Bip001 rematch',
  fbx: 'author only — grudge-convert fbx2glb, not in SPA',
};

export const CLIP_LIBRARY = {
  playMesh: 'toon-rts',
  prefer: 'bip001',
  bip001: BIP001_PLAY,
  mixamo: MIXAMO_PACKS,
  disk: BIP001_DISK,
  readers: CLIP_READERS,
};
