/**
 * Grimoire forms.
 * Bear SSOT = Casting worge-bear: ONE wk-warbear.glb + six race albedos.
 * Do not rematch clips onto race GLBs. Iguana = FantasyPack1 per-race bake.
 */
import { RACES } from '../ssot.js';

export const CASTING = 'https://casting.grudge.studio';
export const WORGE_BEAR_MESH = `${CASTING}/models/class-forms/worge-bear/wk-warbear.glb`;
export const WORGE_BEAR_HEIGHT_M = 2.0;

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
    heightM: 1.65,
    meshUrl: IGUANA_MESH,
    albedo: iguanaAlbedoUrl,
    tint: iguanaTint,
  },
};

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

export const WORGE_BEAR_CLIP_ROLES = {
  warbear_stand: 'idle',
  warbear_move: 'walk',
  warbear_attack00: 'attack',
  warbear_attack01: 'attack',
  warbear_hit: 'hit',
  warbear_stun: 'stun',
  warbear_die: 'death',
};
