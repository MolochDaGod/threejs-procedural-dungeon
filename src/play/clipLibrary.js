/**
 * Clip libraries: Bip001 retargeted JSON (play SSOT) + Mixamo 25-bone packs (defaults).
 * Play mesh stays Toon RTS. One mixer. Prefer bip001 over mixamo/estes GLB.
 * Disk Mixamo packs are catalogued here — convert/ship as needed, do not dump all FBX.
 */
const B = '/models/anims/bip001';

/** Shipped retargeted Three.js AnimationClip JSON (quaternion, Bip001). */
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
];

/** Mixamo 25-bone, meshless Toon RTS author packs — fallback library, not play mesh. */
export const MIXAMO_PACKS = {
  skeleton: 'mixamo-25',
  root: 'D:/Games/Models/_anim_packs',
  packs: {
    traversal: 'traversal',
    action_adventure: 'action_adventure',
    rifle: 'rifle',
    pistol_handgun_locomotion: 'pistol_handgun_locomotion',
    locomotion: 'locomotion',
    magic_spell: 'magic_spell',
    magic_loco: 'magic_loco',
    longbow: 'longbow',
    sword_shield: 'sword_shield',
  },
};

export const CLIP_LIBRARY = {
  playMesh: 'toon-rts',
  prefer: 'bip001',
  bip001: BIP001_PLAY,
  mixamo: MIXAMO_PACKS,
};
