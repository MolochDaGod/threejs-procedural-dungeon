/**
 * Grimoire forms.
 * Bear SSOT = Casting worge-bear: ONE wk-warbear.glb + six race albedos.
 * Do not rematch clips onto race GLBs. Iguana = FantasyPack1 per-race bake.
 */
import * as THREE from 'three';
import { RACES } from '../ssot.js';

export const CASTING = 'https://casting.grudge.studio';
export const WORGE_BEAR_MESH = `${CASTING}/models/class-forms/worge-bear/wk-warbear.glb`;
/** Standing SI — larger than orc 2.0 m. Measure skinned mesh after idle pose. */
export const WORGE_BEAR_HEIGHT_M = 2.8;
export const IGUANA_HEIGHT_M = 2.0;

const BEAR_ALBEDO_EXT = {
  WK: 'png',
  ELF: 'jpg',
  BRB: 'jpg',
  ORC: 'jpg',
  DWF: 'jpg',
  UD: 'jpg',
};

export function bearAlbedoUrl(raceId) {
  const prefix = (RACES[raceId]?.prefix || 'WK').toUpperCase();
  const ext = BEAR_ALBEDO_EXT[prefix] || 'jpg';
  return `${CASTING}/models/class-forms/worge-bear/tex/${prefix}.${ext}`;
}

export const FORM_RACE_SKIN = {
  human: 'WK',
  barbarian: 'BRB',
  elf: 'ELF',
  dwarf: 'DWF',
  orc: 'ORC',
  undead: 'UD',
};

/** Three pack albedos → three factions. Race gets a small color multiply only. */
export const IGUANA_FACTION_ALBEDO = {
  Crusade: 'Iguana_green.png',
  Fabled: 'Iguana_pink.png',
  Legion: 'Iguana_blue.png',
};

/** Slight per-race edit on the faction texture (not a sixth albedo). */
export const IGUANA_RACE_TINT = {
  human:     0xffffff,
  barbarian: 0xffe0c4,
  elf:       0xfff0ff,
  dwarf:     0xd8b8c8,
  orc:       0xc8e8c0,
  undead:    0xc0d0ff,
};

export function iguanaAlbedoUrl(raceId) {
  const faction = RACES[raceId]?.faction || 'Crusade';
  const file = IGUANA_FACTION_ALBEDO[faction] || IGUANA_FACTION_ALBEDO.Crusade;
  return `/models/forms/iguana/tex/${file}`;
}

export function iguanaTint(raceId) {
  return IGUANA_RACE_TINT[raceId] || 0xffffff;
}

export const IGUANA_MESH = '/models/forms/iguana/human.glb';
export const IGUANA_NORMAL = '/models/forms/iguana/tex/Iguana_nrml.png';

export const FORMS = {
  bear: {
    id: 'bear',
    name: 'Bear Form',
    classIds: ['worge'],
    start: false,
    heightM: WORGE_BEAR_HEIGHT_M,
    meshUrl: WORGE_BEAR_MESH,
    albedo: bearAlbedoUrl,
  },
  iguana: {
    id: 'iguana',
    name: 'Iguana Form',
    classIds: ['verduror'],
    start: true,
    heal: true,
    heightM: IGUANA_HEIGHT_M,
    meshUrl: IGUANA_MESH,
    albedo: iguanaAlbedoUrl,
    tint: iguanaTint,
  },
};

const _meshBox = new THREE.Box3();

function expandSkinned(root, box) {
  box.makeEmpty();
  root.traverse((o) => {
    if (o.isSkinnedMesh && o.visible) box.expandByObject(o);
  });
  if (box.isEmpty()) {
    root.traverse((o) => {
      if (o.isMesh && o.visible) box.expandByObject(o);
    });
  }
}

/** Skinned-mesh height after idle, then feet on y=0. Never the whole GLB scene AABB. */
export function fitFormToSi(root, heightM) {
  if (!root) return;
  root.updateMatrixWorld(true);
  expandSkinned(root, _meshBox);
  if (_meshBox.isEmpty()) _meshBox.setFromObject(root);
  const h = Math.max(0.2, _meshBox.max.y - _meshBox.min.y);
  root.scale.multiplyScalar(heightM / h);
  root.updateMatrixWorld(true);
  expandSkinned(root, _meshBox);
  if (!_meshBox.isEmpty()) root.position.y -= _meshBox.min.y;
}

export function formUrl(formId, raceId) {
  const f = FORMS[formId];
  if (!f) return null;
  if (typeof f.meshUrl === 'function') return f.meshUrl(raceId);
  return f.meshUrl;
}

export function defaultFormFor(classId) {
  if (classId === 'verduror') return 'iguana';
  return null;
}

/** Casting worgeBearForms clip stems — lowercase keys (classifyFormClip lowercases). */
export const WORGE_BEAR_CLIP_ROLES = {
  warbear_stand: 'idle',
  warbear_move: 'run',
  warbear_attack00: 'attack',
  warbear_attack01: 'attack2',
  warbear_activeskill: 'skill',
  warbear_activeskill_return: 'skillReturn',
  warbear_hit: 'hit',
  warbear_stun: 'stun',
  warbear_die: 'death',
  warbear_lobbyintro: 'idle',
  warbear_lobbystand00: 'idle',
  warbear_lobbystand01: 'idle',
};

export function classifyFormClip(name) {
  const n = String(name || '').toLowerCase();
  if (WORGE_BEAR_CLIP_ROLES[n]) return WORGE_BEAR_CLIP_ROLES[n];
  const stem = (n.match(/warbear_[a-z0-9_]+/) || [n])[0];
  if (WORGE_BEAR_CLIP_ROLES[stem]) return WORGE_BEAR_CLIP_ROLES[stem];
  if (/stand|idle|wait/.test(n)) return 'idle';
  if (/run|sprint/.test(n)) return 'run';
  if (/walk|move|locomotion/.test(n)) return 'walk';
  if (/attack|slash|bite|claw|strike/.test(n)) return 'attack';
  if (/hit|flinch|damage/.test(n)) return 'hit';
  if (/stun/.test(n)) return 'stun';
  if (/die|death/.test(n)) return 'death';
  return null;
}
