/**
 * Melee combo = chained catalog slash ids already on the kit.
 * Gap close uses that kit's dash id (MM close), not a new skill.
 */
export const MELEE_COMBO = {
  sword_shield: ['sword_vengeful_slash', 'sword_deep_wound', 'sword_heroic_cleave'],
  two_hand: ['gs_cleave', 'gs_impale', 'gs_sunder'],
  greataxe: ['gs_cleave', 'gs_whirlwind', 'gs_colossus'],
  mace_sword: ['sword_vengeful_slash', 'hammer_quake_strike', 'hammer_titan_crush'],
  hammer_holy_tome: ['hammer_earthshatter', 'hammer_thunderous_charge', 'hammer_seismic_slam'],
  spear: ['spear_thrust', 'spear_impale', 'spear_vault'],
  dual: ['dagger_shadow_stab', 'dagger_crimson_stab', 'dagger_lunging_stabs'],
  dagger_ice_tome: ['dagger_shadow_stab', 'dagger_phantom_dash', 'dagger_raging_blades'],
  unarmed: ['claw_rending_slash', 'claw_bear_maul', 'claw_raptor_pounce'],
  mace_nature_tome: ['hammer_earthshatter', 'hammer_thunderous_charge', 'staff_natures_fury'],
};

export const GAP_CLOSE = {
  sword_shield: 'sword_blood_rush',
  two_hand: 'gs_judgement',
  spear: 'spear_vault',
  dual: 'dagger_phantom_dash',
  dagger_ice_tome: 'dagger_phantom_dash',
  unarmed: 'claw_raptor_pounce',
  hammer_holy_tome: 'hammer_thunderous_charge',
  mace_nature_tome: 'hammer_thunderous_charge',
  mace_sword: 'sword_clan_charge',
};

export function comboIdsFor(weaponId) {
  return MELEE_COMBO[weaponId] || null;
}

export function nextComboSkill(loadout, weaponId, stage) {
  const chain = comboIdsFor(weaponId);
  if (!chain) return null;
  const id = chain[stage % chain.length];
  return (loadout || []).find((s) => s.id === id) || (loadout || []).find((s) => s.kind === 'slash') || null;
}

export function gapCloseSkill(loadout, weaponId) {
  const id = GAP_CLOSE[weaponId];
  if (id) {
    const hit = (loadout || []).find((s) => s.id === id);
    if (hit) return hit;
  }
  return (loadout || []).find((s) => s.kind === 'dash') || null;
}

export function isMeleeKit(weaponId) {
  return !!MELEE_COMBO[weaponId];
}
