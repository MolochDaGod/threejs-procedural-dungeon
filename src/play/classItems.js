/**
 * Class items — existing SSOT, not a second skill tree.
 *
 *   WARRIOR_BATTLE_FORMS  gameopen class-relic-skillTrees.json
 *   RANGER_LOG            lockpick.ts + poison coat (bow_poison_arrow)
 *   MAGE_WAND             wand spell book; T0 wand crafts into T8 mage staves
 *   WORGE_NATURE_GRIMOIRE forms bear / raptor / bird
 *
 * Extra warrior tank hook = Grudge Bulwark T8 “Grudge Endurance”
 * (block builds stacks). Owner still TBD on a further named mechanic.
 */
import { T0_STARTERS } from './t0ClassSets.js';

export const CLASS_ITEM = {
  warrior: 'WARRIOR_BATTLE_FORMS',
  ranger: 'RANGER_LOG',
  mage: 'MAGE_WAND',
  worge: 'WORGE_NATURE_GRIMOIRE',
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
  block: { stamina: 8, factor: 0.45, facingDot: 0.2 },
  tauntSkillId: 'tower_fortress',
  /** Catalog passive on Grudge Bulwark T8 — not a new named system. */
  grudgeEndurance: { maxStacks: 10, defPerStack: 0.02, onBlock: 1, onParry: 1 },
  lastStand: { hpFrac: 0.2, blockBonus: 0.4 },
};

export const RANGER_LOG = {
  relicId: 'RANGER_LOG',
  lockpick: true,
  /** Auto poison from class relic + Wraithbone `bow_poison_arrow`. */
  poison: {
    autoApply: true,
    chance: 0.18,
    coatSkillId: 'bow_poison_arrow',
    sources: ['harvest', 'poison_monster'],
  },
  trees: ['stealth', 'poison', 'quick_swap'],
};

/** Wand earns/crafts catalog spells; T0 apprentice wand is the starter focus. */
export const MAGE_WAND = {
  relicId: 'MAGE_WAND',
  starter: T0_STARTERS.mage.t0,
  starterName: T0_STARTERS.mage.name,
  craftsInto: ['Emberwrath Staff T8', 'Glacial Spire T8'],
  schools: ['portal', 'mobility', 'buff', 'heal', 'fire', 'water'],
  /** Recipe slots accept catalog skill ids — not invented spells. */
  recipeSlots: 5,
  earnedDefault: T0_STARTERS.mage.skills,
};

export const WORGE_GRIMOIRE = {
  relicId: 'WORGE_NATURE_GRIMOIRE',
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

export function classItemFor(classId) {
  if (classId === 'warrior') return { id: CLASS_ITEM.warrior, tank: WARRIOR_TANK };
  if (classId === 'ranger') return { id: CLASS_ITEM.ranger, log: RANGER_LOG };
  if (classId === 'mage') return { id: CLASS_ITEM.mage, wand: MAGE_WAND };
  if (classId === 'worge') return { id: CLASS_ITEM.worge, grimoire: WORGE_GRIMOIRE };
  return null;
}

export function makeClassState(classId) {
  const item = classItemFor(classId);
  if (!item) return { classId, relicId: null };
  if (item.tank) {
    return {
      classId,
      relicId: item.id,
      form: WARRIOR_TANK.defaultForm,
      grudgeStacks: 0,
      autoParryCd: 0,
    };
  }
  if (item.log) {
    return {
      classId,
      relicId: item.id,
      poisonCoat: true,
      lockpick: null,
    };
  }
  if (item.wand) {
    return {
      classId,
      relicId: item.id,
      earned: MAGE_WAND.earnedDefault.slice(),
    };
  }
  if (item.grimoire) {
    return {
      classId,
      relicId: item.id,
      form: WORGE_GRIMOIRE.defaultForm,
      unlocked: ['bear'],
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
  if (!state || state.relicId !== CLASS_ITEM.mage) return state;
  if (!skillId || state.earned.includes(skillId)) return state;
  if (state.earned.length >= MAGE_WAND.recipeSlots) return state;
  state.earned.push(skillId);
  return state;
}
