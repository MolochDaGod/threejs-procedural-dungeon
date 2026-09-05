/**
 * Hero loadouts = T8 catalog prefabs + that weapon’s skill tree.
 * T0 sapling / apprentice wand = class starting equipment only.
 * Authority: master-weapon-prefabs.json · master-weaponSkills.json.
 * Do not invent skill ids.
 */
export const T0_CATALOG = 'https://info.grudge-studio.com/api/v1/t0-weapons.json';
export const PREFAB_CATALOG = 'https://info.grudge-studio.com/api/v1/master-weapon-prefabs.json';
export const WEAPON_SKILLS_HTML = 'https://info.grudge-studio.com/WEAPON_SKILLS.html';

/**
 * Flatten a T8 five-slot tree to the dungeon 6-slot bar.
 * Slot 1 primary · 2–3 style · 4–5 ability · 6 ultimate.
 * Off-hand (shield / hammer / tome) injects its primary into slot 2.
 */
export function bar6FromTree(slots, offSlots) {
  const pick = (list, type) => (list || []).find((s) => s.type === type)?.skillIds || [];
  const prim = pick(slots, 'primary');
  const sec = pick(slots, 'secondary');
  const ab = pick(slots, 'ability');
  const ult = pick(slots, 'ultimate');
  const offP = pick(offSlots, 'primary')[0];
  const offS = pick(offSlots, 'secondary')[0];
  const ids = offP
    ? [prim[0], offP, sec[0] || ab[0], ab[0], offS || ab[1] || sec[1], ult[0]]
    : [prim[0], sec[0], sec[1] || ab[0], ab[0], ab[1] || ab[2], ult[0]];
  return ids.filter(Boolean).slice(0, 6);
}

/** T0 three-slot starter → 6-slot by repeating school (starting gear only). */
export function bar6FromStarter(slots) {
  const pick = (type) => (slots || []).find((s) => s.type === type)?.skillIds || [];
  const a = pick('primary')[0];
  const b = pick('secondary')[0];
  const choice = pick('ability');
  return [a, b, choice[0], choice[1] || choice[0], a, b].filter(Boolean).slice(0, 6);
}

/** Class starting equipment — T0 sapling wand / training weapons. */
export const T0_STARTERS = {
  warrior: {
    t0: 't0-sword', name: 'Training Sword',
    skills: ['t0_sword_practice_slash', 't0_sword_guard_stance', 't0_sword_quick_thrust'],
  },
  raider: {
    t0: 't0-greatsword', name: 'Training Greatsword',
    skills: ['t0_greatsword_practice_cleave', 't0_greatsword_power_stance', 't0_greatsword_overhead'],
  },
  mage: {
    t0: 't0-wand', name: 'Apprentice Wand',
    skills: ['t0_wand_practice_bolt', 't0_wand_focus', 't0_wand_frost_spark'],
  },
  priest: {
    t0: 't0-wand', name: 'Apprentice Wand',
    skills: ['t0_wand_practice_bolt', 't0_wand_focus', 't0_tome_minor_heal'],
  },
  ranger: {
    t0: 't0-bow', name: 'Short Bow',
    skills: ['t0_bow_practice_shot', 't0_bow_take_aim', 't0_bow_pinning_arrow'],
  },
  thief: {
    t0: 't0-dagger', name: 'Training Dagger',
    skills: ['t0_dagger_practice_stab', 't0_dagger_evade_step', 't0_dagger_poison_scratch'],
  },
  worge: {
    t0: 't0-nature-staff', name: 'Sapling Staff',
    skills: ['t0_staff_practice_root', 't0_staff_nature_ward', 't0_staff_vine_lash'],
  },
  verduror: {
    t0: 't0-claw', name: 'Training Claws',
    skills: ['t0_claw_practice_slash', 't0_claw_instinct', 't0_claw_blood_frenzy'],
  },
};

const T8 = {
  bloodfeud: {
    uuid: 'ITEM-20260621232130-000009-2B92F7C8', name: 'Bloodfeud Blade T8', type: 'SWORD',
    slots: [
      { type: 'primary', skillIds: ['sword_vengeful_slash'] },
      { type: 'secondary', skillIds: ['sword_blood_rush', 'sword_iron_grudge', 'sword_clan_charge'] },
      { type: 'ability', skillIds: ['sword_heroic_cleave', 'sword_parry_counter', 'sword_deep_wound', 'sword_shadow_edge', 'sword_execute'] },
      { type: 'ultimate', skillIds: ['sword_crimson_reprisal'] },
    ],
  },
  doomspire: {
    uuid: 'ITEM-20260621232130-0000AB-7B2578D3', name: 'Doomspire T8', type: 'GREATSWORD',
    slots: [
      { type: 'primary', skillIds: ['gs_cleave'] },
      { type: 'secondary', skillIds: ['gs_whirlwind', 'gs_impale', 'gs_giant_reach'] },
      { type: 'ability', skillIds: ['gs_bladestorm', 'gs_colossus', 'gs_sunder', 'gs_judgement'] },
      { type: 'ultimate', skillIds: ['greatsword_stunning_slash'] },
    ],
  },
  bulwark: {
    uuid: 'ITEM-20260621232130-0003D6-FB846592', name: 'Grudge Bulwark T8', type: 'SHIELD',
    slots: [
      { type: 'primary', skillIds: ['tower_fortress'] },
      { type: 'secondary', skillIds: ['tower_wall', 'tower_endure', 'tower_regen'] },
      { type: 'ability', skillIds: ['tower_plant', 'tower_ancestral', 'tower_last'] },
    ],
    passives: ['Fortress Heart', 'Grudge Endurance', 'Last Stand'],
  },
  grudgehammer: {
    uuid: 'ITEM-20260621232130-000117-6AE92733', name: 'Grudgehammer T8', type: 'HAMMER',
    slots: [
      { type: 'primary', skillIds: ['hammer_earthshatter'] },
      { type: 'secondary', skillIds: ['hammer_thunderous_charge', 'hammer_quake_strike', 'hammer_iron_skin'] },
      { type: 'ability', skillIds: ['hammer_cataclysm_blow', 'hammer_crimson_smash', 'hammer_shockwave', 'hammer_titan_crush'] },
      { type: 'ultimate', skillIds: ['hammer_seismic_slam'] },
    ],
  },
  emberwrath: {
    uuid: 'ITEM-20260621232130-00025B-48F5EC34', name: 'Emberwrath Staff T8', type: 'STAFF',
    slots: [
      { type: 'primary', skillIds: ['staff_fire_bolt'] },
      { type: 'secondary', skillIds: ['staff_flame_wave', 'staff_ice_nova', 'staff_divine_wave'] },
      { type: 'ability', skillIds: ['staff_inferno_shield', 'staff_glacial_shield', 'staff_meteor_strike', 'staff_blizzard', 'staff_radiant_heal'] },
      { type: 'ultimate', skillIds: ['staff_flame_nova'] },
    ],
  },
  glacial: {
    uuid: 'ITEM-20260621232130-000291-2EC2F24E', name: 'Glacial Spire T8', type: 'STAFF',
    slots: [
      { type: 'primary', skillIds: ['staff_frost_bolt'] },
      { type: 'secondary', skillIds: ['staff_flame_wave', 'staff_ice_nova', 'staff_divine_wave'] },
      { type: 'ability', skillIds: ['staff_inferno_shield', 'staff_glacial_shield', 'staff_meteor_strike', 'staff_blizzard', 'staff_radiant_heal'] },
      { type: 'ultimate', skillIds: ['staff_absolute_zero'] },
    ],
  },
  dawnspire: {
    uuid: 'ITEM-20260621232130-0002C7-337A0B93', name: 'Dawnspire T8', type: 'STAFF',
    slots: [
      { type: 'primary', skillIds: ['staff_holy_light'] },
      { type: 'secondary', skillIds: ['staff_flame_wave', 'staff_ice_nova', 'staff_divine_wave'] },
      { type: 'ability', skillIds: ['staff_inferno_shield', 'staff_glacial_shield', 'staff_meteor_strike', 'staff_blizzard', 'staff_radiant_heal'] },
      { type: 'ultimate', skillIds: ['staff_holy_beacon'] },
    ],
  },
  verdant: {
    uuid: 'ITEM-20260621232130-000352-E9A5A69B', name: 'Verdant Wrath T8', type: 'STAFF',
    slots: [
      { type: 'primary', skillIds: ['staff_fire_bolt'] },
      { type: 'secondary', skillIds: ['staff_flame_wave', 'staff_ice_nova', 'staff_divine_wave'] },
      { type: 'ability', skillIds: ['staff_inferno_shield', 'staff_glacial_shield', 'staff_meteor_strike', 'staff_blizzard', 'staff_radiant_heal'] },
      { type: 'ultimate', skillIds: ['staff_natures_fury'] },
    ],
  },
  wraithbone: {
    uuid: 'ITEM-20260621232130-0001B9-97A9346F', name: 'Wraithbone Bow T8', type: 'BOW',
    slots: [
      { type: 'primary', skillIds: ['bow_quick_shot'] },
      { type: 'secondary', skillIds: ['bow_multishot', 'bow_piercing'] },
      { type: 'ability', skillIds: ['bow_bear_trap', 'bow_swift_quiver', 'bow_poison_arrow'] },
      { type: 'ultimate', skillIds: ['bow_phantom_arrows'] },
    ],
  },
  ironPike: {
    uuid: 'ITEM-20260621232130-000183-336AC739', name: 'Iron Pike T8', type: 'SPEAR',
    slots: [
      { type: 'primary', skillIds: ['spear_thrust'] },
      { type: 'secondary', skillIds: ['spear_javelin', 'spear_vault', 'spear_wall'] },
      { type: 'ability', skillIds: ['spear_impale', 'spear_cyclone', 'spear_dragon', 'spear_phantom'] },
      { type: 'ultimate', skillIds: ['spear_storm'] },
    ],
  },
  bloodshiv: {
    uuid: 'ITEM-20260621232130-000075-F5282F6D', name: 'Bloodshiv T8', type: 'DAGGER',
    slots: [
      { type: 'primary', skillIds: ['dagger_shadow_stab'] },
      { type: 'secondary', skillIds: ['dagger_phantom_dash', 'dagger_assassin_focus', 'dagger_lunging_stabs'] },
      { type: 'ability', skillIds: ['dagger_vengeful_ambush', 'dagger_crimson_stab', 'dagger_shadow_strike', 'dagger_flame_dagger', 'dagger_bloodletter_rage'] },
      { type: 'ultimate', skillIds: ['dagger_raging_blades'] },
    ],
  },
  blaster: {
    uuid: 'ITEM-20260621232130-000225-5FCBC4E7', name: 'Blackpowder Blaster T8', type: 'GUN',
    slots: [
      { type: 'primary', skillIds: ['gun_grudge_shot'] },
      { type: 'secondary', skillIds: ['gun_explosive_round', 'gun_flame_burst', 'gun_sniper_round'] },
      { type: 'ability', skillIds: ['gun_hellfire_barrage', 'gun_crimson_blast', 'gun_shadow_shot', 'gun_cannon_execute'] },
      { type: 'ultimate', skillIds: ['gun_demon_blast'] },
    ],
  },
};

const TOME = { t0: 't0-offhand-tome', name: 'Novice Tome' };

/**
 * Lv20 dungeon heroes — two T8 sets per spec (Q swap).
 * Kit overlay id is wardrobe only; skills come from the prefab tree.
 */
export const T8_CLASS_SETS = {
  warrior: [
    {
      id: 'sword_shield',
      t8: T8.bloodfeud.uuid, name: T8.bloodfeud.name, off: T8.bulwark.uuid, offName: T8.bulwark.name,
      skills: ['sword_vengeful_slash', 'tower_fortress', 'sword_parry_counter', 'sword_iron_grudge', 'tower_endure', 'sword_crimson_reprisal'],
    },
    {
      id: 'two_hand',
      t8: T8.doomspire.uuid, name: T8.doomspire.name,
      skills: bar6FromTree(T8.doomspire.slots),
    },
  ],
  raider: [
    {
      id: 'two_hand',
      t8: T8.doomspire.uuid, name: T8.doomspire.name,
      skills: bar6FromTree(T8.doomspire.slots),
    },
    {
      id: 'mace_sword',
      t8: T8.bloodfeud.uuid, name: T8.bloodfeud.name, off: T8.grudgehammer.uuid, offName: T8.grudgehammer.name,
      skills: bar6FromTree(T8.bloodfeud.slots, T8.grudgehammer.slots),
    },
  ],
  mage: [
    {
      id: 'fire_staff', brand: 'fire',
      t8: T8.emberwrath.uuid, name: T8.emberwrath.name,
      skills: bar6FromTree(T8.emberwrath.slots),
    },
    {
      id: 'ice_staff', brand: 'ice',
      t8: T8.glacial.uuid, name: T8.glacial.name,
      skills: bar6FromTree(T8.glacial.slots),
    },
  ],
  priest: [
    {
      id: 'holy_staff', brand: 'holy',
      t8: T8.dawnspire.uuid, name: T8.dawnspire.name,
      // Dawnspire catalog heals on the 6-slot — bar6FromTree buried radiant/divine under shields.
      skills: ['staff_holy_light', 'staff_divine_wave', 't0_tome_minor_heal', 'staff_radiant_heal', 'staff_holy_beacon', 'staff_ice_nova'],
    },
    {
      id: 'hammer_holy_tome',
      t8: T8.grudgehammer.uuid, name: T8.grudgehammer.name, off: TOME.t0, offName: TOME.name,
      skills: ['hammer_earthshatter', 't0_tome_minor_heal', 'hammer_thunderous_charge', 'staff_holy_light', 'staff_radiant_heal', 'hammer_seismic_slam'],
    },
  ],
  ranger: [
    {
      id: 'bow',
      t8: T8.wraithbone.uuid, name: T8.wraithbone.name,
      skills: bar6FromTree(T8.wraithbone.slots),
    },
    {
      id: 'spear',
      t8: T8.ironPike.uuid, name: T8.ironPike.name,
      skills: bar6FromTree(T8.ironPike.slots),
    },
  ],
  thief: [
    {
      id: 'dual',
      t8: T8.bloodshiv.uuid, name: T8.bloodshiv.name, off: T8.bloodshiv.uuid,
      skills: bar6FromTree(T8.bloodshiv.slots),
    },
    {
      id: 'pistol',
      t8: T8.blaster.uuid, name: T8.blaster.name,
      skills: bar6FromTree(T8.blaster.slots),
    },
  ],
  worge: [
    {
      id: 'dagger_ice_tome',
      t8: T8.bloodshiv.uuid, name: T8.bloodshiv.name, off: TOME.t0, offName: TOME.name,
      skills: ['dagger_shadow_stab', 'staff_frost_bolt', 'dagger_phantom_dash', 'staff_ice_nova', 'dagger_crimson_stab', 'dagger_raging_blades'],
    },
    {
      id: 'nature_staff',
      t8: T8.verdant.uuid, name: T8.verdant.name,
      skills: ['staff_natures_fury', 'staff_divine_wave', 'staff_radiant_heal', 'staff_glacial_shield', 'staff_blizzard', 'staff_ice_nova'],
    },
  ],
  verduror: [
    {
      id: 'unarmed',
      t8: 'ITEM-20260822000000-7FDFEE-782E79BC', name: 'Bear Claws T8', t0: 't0-claw',
      skills: ['claw_rending_slash', 'claw_beast_stomp', 'claw_instinct', 'claw_bear_maul', 'claw_bear_guard', 'claw_blood_frenzy'],
    },
    {
      id: 'mace_nature_tome',
      t8: T8.grudgehammer.uuid, name: T8.grudgehammer.name, off: TOME.t0, offName: TOME.name,
      skills: ['hammer_earthshatter', 't0_tome_minor_heal', 'hammer_iron_skin', 'staff_natures_fury', 'staff_radiant_heal', 'hammer_seismic_slam'],
    },
  ],
};

/** @deprecated Use T8_CLASS_SETS. Kept so older imports still resolve to hero T8 bars. */
export const T0_CLASS_SETS = T8_CLASS_SETS;

export const T8_PREFABS = T8;

function sk(name, kind, element, color, extra = {}) {
  return { name, kind, element, color, mana: 0, stamina: 3, cd: 1, range: 3, damage: 20, ...extra };
}

const PHY = 0xe8e0c8;
const FIR = 0xff6a22;
const ICE = 0x8fd4ff;
const HOL = 0xffe08a;
const NAT = 0x6bbf4a;
const SHD = 0x9b6cf0;
const ARC = 0xb070ff;
const STL = 0xc9cedb;

/** Delivery for dungeon linear cast — catalog text, not new trees. */
export const CATALOG_SKILL_PLAY = {
  t0_sword_practice_slash: sk('Practice Slash', 'slash', 'physical', PHY, { stamina: 2, cd: 0.45, range: 2.8, damage: 18 }),
  t0_sword_guard_stance: sk('Guard Stance', 'nova', 'physical', STL, { stamina: 2, cd: 6, range: 2.2, damage: 0 }),
  t0_sword_quick_thrust: sk('Quick Thrust', 'slash', 'physical', PHY, { stamina: 2, cd: 3, range: 3.4, damage: 16 }),
  t0_sword_wide_sweep: sk('Wide Sweep', 'slash', 'physical', PHY, { stamina: 2, cd: 4, range: 3.2, damage: 14 }),
  t0_greatsword_practice_cleave: sk('Practice Cleave', 'slash', 'physical', PHY, { stamina: 2, cd: 0.55, range: 3.2, damage: 28 }),
  t0_greatsword_power_stance: sk('Power Stance', 'nova', 'physical', STL, { stamina: 2, cd: 6, range: 2, damage: 0 }),
  t0_greatsword_overhead: sk('Overhead Swing', 'slash', 'physical', PHY, { stamina: 2, cd: 5, range: 3.1, damage: 26 }),
  t0_wand_practice_bolt: sk('Practice Bolt', 'projectile', 'arcane', ARC, { mana: 4, stamina: 0, cd: 0.45, range: 12, damage: 14, speed: 16 }),
  t0_wand_focus: sk('Focus', 'nova', 'arcane', ARC, { mana: 4, stamina: 0, cd: 5, range: 2, damage: 0 }),
  t0_wand_frost_spark: sk('Frost Spark', 'projectile', 'ice', ICE, { mana: 4, stamina: 0, cd: 4, range: 11, damage: 12, speed: 18 }),
  t0_wand_arcane_ping: sk('Arcane Ping', 'projectile', 'arcane', ARC, { mana: 4, stamina: 0, cd: 3, range: 8, damage: 10, speed: 16 }),
  t0_tome_minor_heal: sk('Minor Heal', 'nova', 'holy', HOL, { mana: 8, stamina: 0, cd: 5, range: 3.2, damage: 0, heal: 12 }),
  t0_tome_practice_cantrip: sk('Cantrip', 'projectile', 'arcane', ARC, { mana: 6, stamina: 0, cd: 0.8, range: 12, damage: 12, speed: 16 }),
  t0_dagger_practice_stab: sk('Practice Stab', 'slash', 'physical', STL, { stamina: 2, cd: 0.4, range: 2.4, damage: 14 }),
  t0_dagger_evade_step: sk('Evade Step', 'dash', 'physical', SHD, { stamina: 2, cd: 4, range: 4.2, damage: 0 }),
  t0_dagger_backstab: sk('Backstab', 'slash', 'physical', STL, { stamina: 2, cd: 5, range: 2.4, damage: 20 }),
  t0_dagger_poison_scratch: sk('Poison Scratch', 'slash', 'nature', NAT, { stamina: 2, cd: 6, range: 2.4, damage: 10, poison: true }),
  t0_staff_practice_root: sk('Practice Root', 'zone', 'nature', NAT, { mana: 8, stamina: 0, cd: 5, range: 3.2, damage: 10 }),
  t0_staff_nature_ward: sk('Nature Ward', 'nova', 'nature', NAT, { mana: 10, stamina: 0, cd: 8, range: 2.6, damage: 0 }),
  t0_staff_vine_lash: sk('Vine Lash', 'projectile', 'nature', NAT, { mana: 10, stamina: 0, cd: 3, range: 12, damage: 16, speed: 16 }),
  t0_staff_healing_sprout: sk('Healing Sprout', 'nova', 'nature', NAT, { mana: 12, stamina: 0, cd: 6, range: 3.4, damage: 0, heal: 14 }),
  t0_bow_practice_shot: sk('Practice Shot', 'projectile', 'physical', STL, { stamina: 2, cd: 0.5, range: 16, damage: 20, speed: 28 }),
  t0_bow_take_aim: sk('Take Aim', 'nova', 'physical', STL, { stamina: 2, cd: 4, range: 2, damage: 0 }),
  t0_bow_pinning_arrow: sk('Pinning Arrow', 'projectile', 'physical', STL, { stamina: 2, cd: 5, range: 16, damage: 16, speed: 26 }),
  t0_bow_rapid_fire: sk('Rapid Fire', 'projectile', 'physical', STL, { stamina: 2, cd: 4, range: 14, damage: 12, speed: 30 }),
  t0_hammer_practice_smash: sk('Practice Smash', 'slash', 'physical', STL, { stamina: 2, cd: 0.55, range: 2.6, damage: 22 }),
  t0_hammer_brace: sk('Brace', 'nova', 'physical', STL, { stamina: 2, cd: 6, range: 2, damage: 0 }),
  t0_hammer_shockwave: sk('Shockwave', 'nova', 'physical', STL, { stamina: 2, cd: 5, range: 3.2, damage: 16 }),
  t0_greatsword_spinning_cut: sk('Spinning Cut', 'slash', 'physical', PHY, { stamina: 2, cd: 6, range: 3.4, damage: 22 }),

  sword_vengeful_slash: sk('Vengeful Slash', 'slash', 'physical', PHY, { cd: 0.45, range: 2.8, damage: 45 }),
  sword_blood_rush: sk('Blood Rush', 'dash', 'physical', 0xd8433a, { cd: 8, range: 8, damage: 35 }),
  sword_iron_grudge: sk('Iron Grudge', 'nova', 'physical', STL, { cd: 12, range: 2.4, damage: 0, block: true }),
  sword_clan_charge: sk('Clan Charge', 'dash', 'physical', PHY, { cd: 10, range: 8, damage: 40 }),
  sword_heroic_cleave: sk('Heroic Cleave', 'slash', 'physical', PHY, { cd: 6, range: 3.6, damage: 60 }),
  sword_parry_counter: sk('Parry Counter', 'slash', 'physical', STL, { cd: 8, range: 2.8, damage: 80, parry: true }),
  sword_deep_wound: sk('Deep Wound', 'slash', 'physical', 0xd8433a, { cd: 4, range: 2.8, damage: 30 }),
  sword_crimson_reprisal: sk('Crimson Reprisal', 'slash', 'physical', 0xd8433a, { cd: 45, range: 4.2, damage: 150, heal: 20 }),

  gs_cleave: sk('Cleaving Strike', 'slash', 'physical', PHY, { cd: 0.55, range: 3.2, damage: 55 }),
  gs_whirlwind: sk('Whirlwind Slash', 'nova', 'physical', PHY, { cd: 8, range: 4, damage: 65 }),
  gs_impale: sk('Impaling Thrust', 'slash', 'physical', PHY, { cd: 10, range: 6, damage: 70 }),
  gs_giant_reach: sk("Giant's Reach", 'projectile', 'physical', PHY, { cd: 8, range: 8, damage: 60, speed: 18 }),
  gs_bladestorm: sk('Blade Storm', 'nova', 'physical', PHY, { cd: 15, range: 4, damage: 120 }),
  gs_colossus: sk('Colossus Cleave', 'fissure', 'physical', PHY, { cd: 12, range: 6, damage: 90 }),
  gs_sunder: sk('Sundering Strike', 'slash', 'physical', PHY, { cd: 10, range: 3, damage: 75 }),
  gs_judgement: sk('Judgement Cut', 'dash', 'physical', SHD, { cd: 18, range: 12, damage: 110 }),
  greatsword_stunning_slash: sk('Stunning Slash', 'nova', 'physical', PHY, { stamina: 5, cd: 45, range: 4.2, damage: 170 }),

  hammer_earthshatter: sk('Earthshatter', 'nova', 'physical', STL, { cd: 0.7, range: 3.2, damage: 55 }),
  hammer_thunderous_charge: sk('Thunderous Charge', 'dash', 'physical', STL, { cd: 10, range: 8, damage: 45 }),
  hammer_quake_strike: sk('Quake Strike', 'nova', 'physical', STL, { cd: 12, range: 3.6, damage: 70 }),
  hammer_iron_skin: sk('Iron Skin', 'nova', 'physical', STL, { cd: 18, range: 2.2, damage: 0, block: true }),
  hammer_cataclysm_blow: sk('Cataclysm Blow', 'nova', 'physical', STL, { cd: 15, range: 3.8, damage: 80 }),
  hammer_crimson_smash: sk('Crimson Smash', 'nova', 'physical', 0xd8433a, { cd: 10, range: 3.4, damage: 65 }),
  hammer_shockwave: sk('Shockwave', 'nova', 'physical', STL, { cd: 12, range: 3.6, damage: 55 }),
  hammer_titan_crush: sk('Titan Crush', 'slash', 'physical', STL, { cd: 18, range: 2.8, damage: 150 }),
  hammer_seismic_slam: sk('Seismic Slam', 'nova', 'physical', STL, { cd: 55, range: 4.5, damage: 220 }),

  spear_thrust: sk('Quick Thrust', 'slash', 'physical', PHY, { cd: 0.5, range: 4, damage: 40 }),
  spear_javelin: sk('Javelin Throw', 'projectile', 'physical', PHY, { cd: 8, range: 20, damage: 65, speed: 26 }),
  spear_vault: sk('Vaulting Strike', 'dash', 'physical', PHY, { cd: 10, range: 8, damage: 70 }),
  spear_wall: sk('Wall of Spears', 'zone', 'physical', PHY, { cd: 15, range: 6, damage: 40 }),
  spear_impale: sk('Impale', 'slash', 'physical', PHY, { cd: 10, range: 4, damage: 50 }),
  spear_cyclone: sk('Cyclone Sweep', 'nova', 'physical', PHY, { cd: 12, range: 4, damage: 80 }),
  spear_dragon: sk('Dragon Strike', 'dash', 'fire', FIR, { cd: 14, range: 6, damage: 100 }),
  spear_phantom: sk('Phantom Lance', 'projectile', 'shadow', SHD, { cd: 16, range: 12, damage: 90, speed: 22 }),
  spear_storm: sk('Storm of Spears', 'nova', 'physical', PHY, { cd: 50, range: 10, damage: 200 }),

  bow_quick_shot: sk('Quick Shot', 'projectile', 'physical', STL, { cd: 0.4, range: 18, damage: 45, speed: 30 }),
  bow_multishot: sk('Multishot', 'projectile', 'physical', STL, { cd: 8, range: 14, damage: 35, speed: 24 }),
  bow_piercing: sk('Piercing Shot', 'projectile', 'physical', STL, { cd: 6, range: 18, damage: 60, speed: 32 }),
  bow_bear_trap: sk('Bear Trap', 'zone', 'physical', STL, { cd: 15, range: 3.2, damage: 20 }),
  bow_swift_quiver: sk('Swift Quiver', 'nova', 'physical', STL, { cd: 20, range: 2, damage: 0 }),
  bow_poison_arrow: sk('Poison Arrow', 'projectile', 'nature', NAT, { cd: 12, range: 16, damage: 30, speed: 26, poison: true }),
  bow_phantom_arrows: sk('Phantom Arrows', 'projectile', 'shadow', SHD, { stamina: 5, cd: 45, range: 18, damage: 110, speed: 28 }),

  dagger_shadow_stab: sk('Shadow Stab', 'slash', 'physical', STL, { cd: 0.4, range: 2.4, damage: 40 }),
  dagger_phantom_dash: sk('Phantom Dash', 'dash', 'shadow', SHD, { cd: 8, range: 6, damage: 45 }),
  dagger_assassin_focus: sk("Assassin's Focus", 'nova', 'physical', SHD, { cd: 15, range: 2, damage: 0 }),
  dagger_lunging_stabs: sk('Lunging Stabs', 'dash', 'physical', STL, { cd: 10, range: 6, damage: 60 }),
  dagger_vengeful_ambush: sk('Vengeful Ambush', 'dash', 'shadow', SHD, { stamina: 5, cd: 45, range: 8, damage: 100 }),
  dagger_crimson_stab: sk('Crimson Stab', 'slash', 'physical', 0xd8433a, { cd: 8, range: 2.4, damage: 50 }),
  dagger_shadow_strike: sk('Shadow Strike', 'nova', 'shadow', SHD, { cd: 10, range: 3.2, damage: 55 }),
  dagger_flame_dagger: sk('Flame Dagger', 'nova', 'fire', FIR, { cd: 8, range: 3, damage: 40 }),
  dagger_bloodletter_rage: sk('Bloodletter Rage', 'slash', 'physical', 0xd8433a, { cd: 18, range: 2.6, damage: 100, heal: 16 }),
  dagger_raging_blades: sk('Raging Blades', 'nova', 'physical', 0xd8433a, { stamina: 5, cd: 45, range: 3.6, damage: 100, heal: 18 }),

  gun_grudge_shot: sk('Grudge Shot', 'projectile', 'physical', 0xffcc88, { cd: 0.7, range: 16, damage: 60, speed: 42 }),
  gun_explosive_round: sk('Explosive Round', 'projectile', 'fire', FIR, { cd: 8, range: 14, damage: 70, speed: 32 }),
  gun_flame_burst: sk('Flame Burst', 'slash', 'fire', FIR, { cd: 10, range: 8, damage: 50 }),
  gun_sniper_round: sk('Sniper Round', 'projectile', 'physical', 0xffcc88, { cd: 12, range: 22, damage: 120, speed: 48 }),
  gun_hellfire_barrage: sk('Hellfire Barrage', 'projectile', 'fire', FIR, { stamina: 5, cd: 18, range: 16, damage: 100, speed: 36 }),
  gun_crimson_blast: sk('Crimson Blast', 'projectile', 'shadow', 0xd8433a, { cd: 15, range: 16, damage: 80, speed: 32, heal: 12 }),
  gun_shadow_shot: sk('Shadow Shot', 'projectile', 'shadow', SHD, { cd: 12, range: 16, damage: 60, speed: 28 }),
  gun_cannon_execute: sk('Cannon Execute', 'projectile', 'physical', 0xffcc88, { cd: 20, range: 16, damage: 200, speed: 34 }),
  gun_demon_blast: sk('Demon Blast', 'projectile', 'fire', FIR, { cd: 55, range: 14, damage: 250, speed: 28 }),

  staff_fire_bolt: sk('Fire Bolt', 'projectile', 'fire', FIR, { mana: 5, stamina: 0, cd: 1.1, range: 16, damage: 50, speed: 18 }),
  staff_flame_wave: sk('Flame Wave', 'fissure', 'fire', FIR, { mana: 5, stamina: 0, cd: 8, range: 10, damage: 60 }),
  staff_inferno_shield: sk('Inferno Shield', 'nova', 'fire', FIR, { mana: 5, stamina: 0, cd: 15, range: 2.4, damage: 8 }),
  staff_meteor_strike: sk('Meteor Strike', 'nova', 'fire', FIR, { mana: 5, stamina: 0, cd: 18, range: 4.2, damage: 150 }),
  staff_flame_nova: sk('Flame Nova', 'nova', 'fire', FIR, { mana: 15, stamina: 0, cd: 45, range: 4, damage: 150 }),
  staff_frost_bolt: sk('Frost Bolt', 'projectile', 'ice', ICE, { mana: 5, stamina: 0, cd: 1.2, range: 16, damage: 45, speed: 20 }),
  staff_ice_nova: sk('Ice Nova', 'nova', 'ice', ICE, { mana: 5, stamina: 0, cd: 10, range: 3.6, damage: 55 }),
  staff_glacial_shield: sk('Glacial Shield', 'nova', 'ice', ICE, { mana: 5, stamina: 0, cd: 15, range: 2.4, damage: 0 }),
  staff_blizzard: sk('Blizzard', 'zone', 'ice', ICE, { mana: 5, stamina: 0, cd: 20, range: 4.2, damage: 100 }),
  staff_absolute_zero: sk('Absolute Zero', 'nova', 'ice', ICE, { mana: 5, stamina: 0, cd: 60, range: 4.5, damage: 180 }),
  staff_holy_light: sk('Holy Light', 'beam', 'holy', HOL, { mana: 5, stamina: 0, cd: 2, range: 14, damage: 18, heal: 24 }),
  staff_divine_wave: sk('Divine Wave', 'nova', 'holy', HOL, { mana: 5, stamina: 0, cd: 12, range: 3.8, damage: 16, heal: 22 }),
  staff_radiant_heal: sk('Radiant Salvation', 'nova', 'holy', HOL, { mana: 5, stamina: 0, cd: 25, range: 4.2, damage: 0, heal: 36 }),
  staff_holy_beacon: sk('Holy Beacon', 'zone', 'holy', HOL, { mana: 15, stamina: 0, cd: 45, range: 3.4, damage: 8, heal: 20 }),
  staff_natures_fury: sk("Nature's Fury", 'fissure', 'nature', NAT, { mana: 15, stamina: 0, cd: 8, range: 10, damage: 22 }),
  staff_earthquake: sk('Earthquake', 'zone', 'nature', NAT, { mana: 18, stamina: 0, cd: 10, range: 4.5, damage: 20 }),

  tower_fortress: sk('Iron Fortress', 'nova', 'physical', STL, { stamina: 8, cd: 10, range: 8, damage: 12, taunt: true }),
  tower_wall: sk('Shield Wall', 'nova', 'physical', STL, { stamina: 8, cd: 12, range: 3.2, damage: 0, block: true }),
  tower_endure: sk('Bulwark Stance', 'nova', 'physical', STL, { stamina: 6, cd: 14, range: 2.4, damage: 0, block: true }),
  tower_regen: sk('Fortify', 'nova', 'physical', STL, { stamina: 6, cd: 16, range: 2.6, damage: 0, heal: 18 }),
  tower_plant: sk('Planted Guard', 'zone', 'physical', STL, { stamina: 8, cd: 18, range: 3.4, damage: 10, taunt: true }),
  tower_ancestral: sk('Ancestral Guard', 'nova', 'physical', STL, { stamina: 8, cd: 20, range: 3.6, damage: 8, block: true }),
  tower_last: sk('Last Stand', 'nova', 'physical', STL, { stamina: 10, cd: 45, range: 2.8, damage: 0, block: true }),

  t0_claw_practice_slash: sk('Practice Slash', 'slash', 'physical', PHY, { stamina: 2, cd: 0.4, range: 2.4, damage: 16 }),
  t0_claw_instinct: sk('Instinct', 'nova', 'nature', NAT, { stamina: 2, cd: 8, range: 2.2, damage: 0, heal: 8 }),
  t0_claw_blood_frenzy: sk('Blood Frenzy', 'nova', 'physical', 0xd8433a, { stamina: 2, cd: 8, range: 2.4, damage: 0 }),
  t0_claw_beast_stomp: sk('Beast Stomp', 'nova', 'physical', STL, { stamina: 2, cd: 6, range: 3.2, damage: 14 }),
  claw_rending_slash: sk('Rending Slash', 'slash', 'physical', PHY, { cd: 0.4, range: 2.6, damage: 42 }),
  claw_blood_frenzy: sk('Blood Frenzy', 'nova', 'physical', 0xd8433a, { cd: 8, range: 2.6, damage: 0 }),
  claw_beast_stomp: sk('Beast Stomp', 'nova', 'physical', STL, { cd: 10, range: 3.6, damage: 38 }),
  claw_instinct: sk('Instinct', 'nova', 'nature', NAT, { cd: 12, range: 2.4, damage: 0, heal: 14 }),
  claw_bear_maul: sk('Bear Maul', 'slash', 'physical', PHY, { cd: 8, range: 2.8, damage: 48 }),
  claw_bear_guard: sk('Bear Guard', 'nova', 'physical', STL, { cd: 10, range: 2.4, damage: 0, block: true }),
  claw_raptor_pounce: sk('Raptor Pounce', 'dash', 'physical', PHY, { cd: 8, range: 6, damage: 40 }),
  claw_raptor_shred: sk('Raptor Shred', 'slash', 'physical', 0xd8433a, { cd: 8, range: 2.6, damage: 36 }),
  claw_bird_talon: sk('Sky Talon', 'slash', 'physical', PHY, { cd: 8, range: 3.2, damage: 34 }),
  claw_bird_gust: sk('Wing Gust', 'nova', 'physical', STL, { cd: 10, range: 3.4, damage: 22 }),
  claw_wolf_howl: sk('Wolf Howl', 'nova', 'physical', PHY, { cd: 12, range: 6, damage: 10, taunt: true }),
  claw_wolf_hamstring: sk('Hamstring', 'slash', 'physical', PHY, { cd: 8, range: 2.8, damage: 32 }),
  claw_cheetah_sprint: sk('Cheetah Sprint', 'dash', 'physical', PHY, { cd: 8, range: 8, damage: 18 }),
  claw_cheetah_rake: sk('Rake', 'slash', 'physical', 0xd8433a, { cd: 8, range: 2.6, damage: 34 }),
  claw_spider_venom: sk('Venom Bite', 'slash', 'nature', NAT, { cd: 8, range: 2.4, damage: 28, poison: true }),
  claw_spider_web: sk('Web Bind', 'zone', 'nature', NAT, { cd: 12, range: 3.2, damage: 16 }),
  bear_form: sk('Bear Form', 'nova', 'nature', NAT, { stamina: 8, cd: 0, range: 2, damage: 0 }),
  raptor_form: sk('Raptor Form', 'nova', 'nature', NAT, { stamina: 8, cd: 0, range: 2, damage: 0 }),
  bird_form: sk('Bird Form', 'nova', 'nature', NAT, { stamina: 8, cd: 0, range: 2, damage: 0 }),
  wolf_form: sk('Wolf Form', 'nova', 'nature', NAT, { stamina: 8, cd: 0, range: 2, damage: 0 }),
  cheetah_form: sk('Cheetah Form', 'nova', 'nature', NAT, { stamina: 8, cd: 0, range: 2, damage: 0 }),
  spider_form: sk('Spider Form', 'nova', 'nature', NAT, { stamina: 8, cd: 0, range: 2, damage: 0 }),
};

export function setsForClass(classId = 'worge') {
  return T8_CLASS_SETS[classId] || T8_CLASS_SETS.worge;
}

export function setByKitId(classId, kitId) {
  const sets = setsForClass(classId);
  return sets.find((s) => s.id === kitId) || sets[0];
}

export function starterForClass(classId = 'mage') {
  return T0_STARTERS[classId] || T0_STARTERS.mage;
}
