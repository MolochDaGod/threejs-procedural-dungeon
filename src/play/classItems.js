/**
 * Class ITEMS (WoW “class thing in a bag”) — not trinkets.
 * Relic / trinket is a separate equipment slot (trinketId), like WoW relics.
 *
 *   WARRIOR_BATTLE_FORMS  Battle Forms
 *   RAIDER_TWO_HAND       Two-Hand
 *   MAGE_WAND             Apprentice Wand
 *   PRIEST_WAND           Sapling Wand
 *   RANGER_LOG            poisons / traps / stealth
 *   WORGE_NATURE_GRIMOIRE / VERDUROR_GRIMOIRE  form book
 */
import { T0_STARTERS } from './t0ClassSets.js';

export const CLASS_ITEM = {
  warrior: 'WARRIOR_BATTLE_FORMS',
  raider: 'RAIDER_TWO_HAND',
  mage: 'MAGE_WAND',
  priest: 'PRIEST_WAND',
  ranger: 'RANGER_LOG',
  thief: 'THIEF_SATCHEL',
  worge: 'WORGE_NATURE_GRIMOIRE',
  verduror: 'VERDUROR_GRIMOIRE',
};

/** Battle Forms — tanking, not a WoW threat-copy. */
export const WARRIOR_TANK = {
  relicId: 'WARRIOR_BATTLE_FORMS',
  defaultForm: 'form_bulwark',
  forms: {
    form_bulwark: { id: 'form_bulwark', name: 'Bulwark Form', blockChance: 0.15, parryWindow: 0.2, maxStamina: 30, defense: 12 },
    form_onslaught: { id: 'form_onslaught', name: 'Onslaught Form', damage: 0.2, attackSpeed: 0.1, defense: -0.05 },
    form_bloodward: { id: 'form_bloodward', name: 'Bloodward Form', lifesteal: 0.08, healOnBlock: 0.03 },
    form_dread: { id: 'form_dread', name: 'Dread Form', fearProc: 0.12 },
    form_colossus: { id: 'form_colossus', name: 'Colossus Form', damage: 0.35, attackSpeed: -0.1, pushForce: 0.25 },
  },
  autoParry: true,
  autoParryChance: 0.28,
  block: { stamina: 8, factor: 0.45, facingDot: 0.2 },
  tauntSkillId: 'w_taunt',
  handGlow: 0xd8433a,
  /** Catalog passive on Grudge Bulwark T8 — not a new named system. */
  grudgeEndurance: { maxStacks: 10, defPerStack: 0.02, onBlock: 1, onParry: 1 },
  lastStand: { hpFrac: 0.2, blockBonus: 0.4 },
};

export const RANGER_LOG = {
  classItemId: 'RANGER_LOG',
  name: 'Ranger Log',
  lockpick: true,
  poison: {
    autoApply: true,
    chance: 0.18,
    coatSkillId: 'bow_poison_arrow',
    sources: ['harvest', 'poison_monster'],
    unlocks: ['bow_poison_arrow', 't0_bow_pinning_arrow'],
  },
  traps: {
    lockpick: true,
    unlocks: ['lockpick', 'snare'],
  },
  stealth: {
    invisSec: 8,
    shadowStrike: 'r_shadow_strike',
    unlocks: ['r_invis', 'r_shadow_strike'],
  },
  trees: ['stealth', 'poison', 'traps'],
};

/** Casting outlaw satchel — lockpick, stealth, combat theft. */
export const THIEF_SATCHEL = {
  classItemId: 'THIEF_SATCHEL',
  name: 'Satchel of Tools',
  lockpick: true,
  lockMake: true,
  stealth: { invisSec: 8, mark: 't_marking_marks', speedMul: 0.7 },
  theft: { steal: true, combatTheft: true },
  trees: ['lockpick', 'stealth', 'theft'],
  unlocks: ['lockpick', 'lock_set', 't_invis', 't_marking_marks'],
};

/** Casting `two_hand` — raider 2H mastery. Block can proc auto-parry. */
export const RAIDER_TWO_HAND = {
  classItemId: 'RAIDER_TWO_HAND',
  relicId: 'RAIDER_TWO_HAND',
  name: 'Two-Hand',
  autoParry: true,
  autoParryChance: 0.22,
  overpowerSec: 8,
  handGlow: 0x8fd4ff,
};

/** Wand earns/crafts catalog spells; T0 apprentice wand is the starter focus. */
export const MAGE_WAND = {
  classItemId: 'MAGE_WAND',
  relicId: 'MAGE_WAND',
  starter: T0_STARTERS.mage.t0,
  starterName: T0_STARTERS.mage.name,
  craftsInto: ['Emberwrath Staff T8', 'Glacial Spire T8'],
  schools: ['portal', 'mobility', 'buff', 'heal', 'fire', 'water'],
  /** Recipe slots accept catalog skill ids — not invented spells. */
  recipeSlots: 5,
  earnedDefault: T0_STARTERS.mage.skills,
  hold: 'wand',
};

/** Priest wand book — user sapling wand; T0 priest still t0-wand recipes. */
export const PRIEST_WAND = {
  classItemId: 'PRIEST_WAND',
  relicId: 'PRIEST_WAND',
  starter: T0_STARTERS.priest.t0,
  starterName: 'Sapling Wand',
  schools: ['heal', 'holy', 'cure', 'water', 'portal'],
  recipeSlots: 5,
  earnedDefault: T0_STARTERS.priest.skills,
  hold: 'wand',
};

export const WORGE_GRIMOIRE = {
  classItemId: 'WORGE_NATURE_GRIMOIRE',
  relicId: 'WORGE_NATURE_GRIMOIRE',
  name: 'Grimoire of Forms',
  starter: T0_STARTERS.worge.t0,
  starterName: T0_STARTERS.worge.name,
  defaultForm: 'bear',
  /** Grimoire form ids that have a forestry claw family (claw-weapon-ssot). */
  forms: ['bear', 'raptor', 'bird', 'wolf', 'cheetah', 'spider'],
  clawSlot4: {
    defaultForm: null,
    station: 'enchanting-table',
    appliedByClass: 'worge',
    requiresKnownForm: true,
    binds: {
      bear: 'bear_form',
      raptor: 'raptor_form',
      bird: 'bird_form',
      wolf: 'wolf_form',
      cheetah: 'cheetah_form',
      spider: 'spider_form',
    },
  },
  shiftKeys: { bear: 'Digit1', raptor: 'Digit3', bird: 'Digit5' },
};

/** Verduror form book — Iguana is the healing start form (FantasyPack1). */
export const VERDUROR_GRIMOIRE = {
  classItemId: 'VERDUROR_GRIMOIRE',
  relicId: 'VERDUROR_GRIMOIRE',
  name: 'Grimoire of Forms',
  starter: T0_STARTERS.verduror.t0,
  starterName: T0_STARTERS.verduror.name,
  defaultForm: 'iguana',
  forms: ['iguana', 'crane', 'mist'],
  plantSkills: true,
  enchantPaper: true,
};

export function classItemFor(classId) {
  if (classId === 'warrior') return { id: CLASS_ITEM.warrior, tank: WARRIOR_TANK, name: 'Battle Forms' };
  if (classId === 'raider') return { id: CLASS_ITEM.raider, twoHand: RAIDER_TWO_HAND, name: RAIDER_TWO_HAND.name };
  if (classId === 'ranger') return { id: CLASS_ITEM.ranger, log: RANGER_LOG, name: 'Ranger Log' };
  if (classId === 'thief') return { id: CLASS_ITEM.thief, satchel: THIEF_SATCHEL, name: THIEF_SATCHEL.name };
  if (classId === 'mage') return { id: CLASS_ITEM.mage, wand: MAGE_WAND, name: MAGE_WAND.starterName };
  if (classId === 'priest') return { id: CLASS_ITEM.priest, wand: PRIEST_WAND, name: PRIEST_WAND.starterName };
  if (classId === 'worge') return { id: CLASS_ITEM.worge, grimoire: WORGE_GRIMOIRE, name: WORGE_GRIMOIRE.name };
  if (classId === 'verduror') return { id: CLASS_ITEM.verduror, grimoire: VERDUROR_GRIMOIRE, name: VERDUROR_GRIMOIRE.name };
  return null;
}

export function makeClassState(classId) {
  const item = classItemFor(classId);
  if (!item) return { classId, relicId: null };
  if (item.tank) {
    return {
      classId,
      classItemId: item.id,
      relicId: item.id,
      trinketId: null,
      form: WARRIOR_TANK.defaultForm,
      grudgeStacks: 0,
      autoParryCd: 0,
    };
  }
  if (item.log) {
    return {
      classId,
      classItemId: item.id,
      relicId: item.id,
      trinketId: null,
      poisonCoat: true,
      lockpick: null,
      log: { poison: ['bow_poison_arrow'], traps: ['lockpick'], stealth: ['r_invis'] },
    };
  }
  if (item.satchel) {
    return {
      classId,
      classItemId: item.id,
      relicId: item.id,
      trinketId: null,
      satchel: { lockpick: true, stealth: ['t_invis'], theft: true, sets: 1 },
      markStacks: 0,
      markT: 0,
    };
  }
  if (item.twoHand) {
    return {
      classId,
      classItemId: item.id,
      relicId: item.id,
      trinketId: null,
      autoParryCd: 0,
      overpowerT: 0,
    };
  }
  if (item.wand) {
    const book = item.wand;
    return {
      classId,
      classItemId: item.id,
      relicId: item.id,
      trinketId: null,
      earned: (book.earnedDefault || []).slice(),
      wandPick: 0,
    };
  }
  if (item.grimoire) {
    return {
      classId,
      classItemId: item.id,
      relicId: item.id,
      trinketId: null,
      form: item.grimoire.defaultForm,
      unlocked: item.grimoire.defaultForm === 'iguana' ? ['iguana'] : ['bear'],
    };
  }
  return { classId, relicId: item.id };
}

export function addGrudgeStack(state) {
  if (!state || state.relicId !== CLASS_ITEM.warrior) return state;
  const max = WARRIOR_TANK.grudgeEndurance.maxStacks;
  state.grudgeStacks = Math.min(max, (state.grudgeStacks || 0) + 1);
  return state;
}

export function grudgeDefenseMul(state) {
  const n = state?.grudgeStacks || 0;
  return 1 + n * WARRIOR_TANK.grudgeEndurance.defPerStack;
}

export function craftWorgeForm(state, formId) {
  if (!state || state.relicId !== CLASS_ITEM.worge) return state;
  if (!WORGE_GRIMOIRE.forms.includes(formId)) return state;
  if (!state.unlocked.includes(formId)) state.unlocked.push(formId);
  state.form = formId;
  return state;
}

export function earnWandSpell(state, skillId) {
  if (!state || (state.relicId !== CLASS_ITEM.mage && state.relicId !== CLASS_ITEM.priest)) return state;
  if (!skillId || state.earned.includes(skillId)) return state;
  if (state.earned.length >= MAGE_WAND.recipeSlots) return state;
  state.earned.push(skillId);
  return state;
}
