/**
 * Warlords Era monster / boss prefabs — Toon-RTS races, equipped loadouts.
 * brain: melee | ranger | mage | warlord
 */
import { THEME_ENEMY } from '../ssot.js';

const P = (o) => ({ equipped: true, ...o });

export const THEME_CAST = {
  ancient: {
    combat: [
      P({ id: 'wight_blade', label: 'Wight Blade', raceId: 'undead', role: 'warrior', brain: 'melee', height: 1.70, hp: 46, speed: 3.15, radius: 0.42 }),
      P({ id: 'wight_bow', label: 'Wight Bow', raceId: 'undead', role: 'ranger', brain: 'ranger', height: 1.68, hp: 38, speed: 3.25, radius: 0.40 }),
    ],
    elites: [
      P({ id: 'barrow_mage', label: 'Barrow Mage', raceId: 'undead', role: 'mage', brain: 'mage', height: 1.90, hp: 82, speed: 2.75, radius: 0.48 }),
      P({ id: 'barrow_brute', label: 'Barrow Brute', raceId: 'undead', role: 'warrior', brain: 'melee', height: 2.05, hp: 110, speed: 2.45, radius: 0.56 }),
    ],
    bosses: [
      P({ id: 'lich_warlord', label: 'Lich Warlord', raceId: 'undead', role: 'mage', brain: 'warlord', height: 2.48, hp: 248, speed: 2.25, radius: 0.78 }),
    ],
  },
  molten: {
    combat: [
      P({ id: 'ash_reaver', label: 'Ash Reaver', raceId: 'orc', role: 'warrior', brain: 'melee', height: 1.74, hp: 50, speed: 3.20, radius: 0.44 }),
      P({ id: 'cinder_hunter', label: 'Cinder Hunter', raceId: 'orc', role: 'ranger', brain: 'ranger', height: 1.70, hp: 40, speed: 3.40, radius: 0.40 }),
    ],
    elites: [
      P({ id: 'cinder_shaman', label: 'Cinder Shaman', raceId: 'orc', role: 'mage', brain: 'mage', height: 1.92, hp: 88, speed: 2.70, radius: 0.50 }),
      P({ id: 'slag_brute', label: 'Slag Brute', raceId: 'orc', role: 'warrior', brain: 'melee', height: 2.10, hp: 118, speed: 2.40, radius: 0.58 }),
    ],
    bosses: [
      P({ id: 'slag_warlord', label: 'Slag Warlord', raceId: 'orc', role: 'warrior', brain: 'warlord', height: 2.52, hp: 260, speed: 2.35, radius: 0.82 }),
    ],
  },
  frost: {
    combat: [
      P({ id: 'rime_thane', label: 'Rime Guard', raceId: 'dwarf', role: 'warrior', brain: 'melee', height: 1.58, hp: 54, speed: 2.85, radius: 0.46 }),
      P({ id: 'rime_bolt', label: 'Rime Bolt', raceId: 'dwarf', role: 'ranger', brain: 'ranger', height: 1.54, hp: 42, speed: 3.00, radius: 0.42 }),
    ],
    elites: [
      P({ id: 'hoar_runecaster', label: 'Hoar Runecaster', raceId: 'dwarf', role: 'mage', brain: 'mage', height: 1.72, hp: 90, speed: 2.55, radius: 0.48 }),
      P({ id: 'ice_warden', label: 'Ice Warden', raceId: 'dwarf', role: 'warrior', brain: 'melee', height: 1.80, hp: 120, speed: 2.35, radius: 0.54 }),
    ],
    bosses: [
      P({ id: 'glacier_warlord', label: 'Glacier Warlord', raceId: 'dwarf', role: 'warrior', brain: 'warlord', height: 2.20, hp: 270, speed: 2.15, radius: 0.80 }),
    ],
  },
  grim: {
    combat: [
      P({ id: 'grave_stalker', label: 'Grave Stalker', raceId: 'undead', role: 'ranger', brain: 'ranger', height: 1.72, hp: 44, speed: 3.35, radius: 0.40 }),
      P({ id: 'grave_blade', label: 'Grave Blade', raceId: 'undead', role: 'warrior', brain: 'melee', height: 1.74, hp: 48, speed: 3.10, radius: 0.42 }),
    ],
    elites: [
      P({ id: 'ossuary_blade', label: 'Ossuary Blade', raceId: 'undead', role: 'warrior', brain: 'melee', height: 1.94, hp: 86, speed: 2.80, radius: 0.50 }),
      P({ id: 'plague_chanter', label: 'Plague Chanter', raceId: 'undead', role: 'mage', brain: 'mage', height: 1.88, hp: 80, speed: 2.70, radius: 0.48 }),
    ],
    bosses: [
      P({ id: 'death_warlord', label: 'Death Warlord', raceId: 'undead', role: 'mage', brain: 'warlord', height: 2.55, hp: 255, speed: 2.20, radius: 0.80 }),
    ],
  },
  verdant: {
    combat: [
      P({ id: 'thorn_raider', label: 'Thorn Raider', raceId: 'orc', role: 'ranger', brain: 'ranger', height: 1.70, hp: 42, speed: 3.40, radius: 0.40 }),
      P({ id: 'briar_cleaver', label: 'Briar Cleaver', raceId: 'orc', role: 'warrior', brain: 'melee', height: 1.76, hp: 50, speed: 3.10, radius: 0.44 }),
    ],
    elites: [
      P({ id: 'root_brute', label: 'Root Brute', raceId: 'orc', role: 'warrior', brain: 'melee', height: 1.98, hp: 94, speed: 2.65, radius: 0.54 }),
      P({ id: 'spore_mage', label: 'Spore Mage', raceId: 'orc', role: 'mage', brain: 'mage', height: 1.86, hp: 84, speed: 2.70, radius: 0.48 }),
    ],
    bosses: [
      P({ id: 'bloom_warlord', label: 'Bloom Warlord', raceId: 'orc', role: 'mage', brain: 'warlord', height: 2.46, hp: 242, speed: 2.30, radius: 0.78 }),
    ],
  },
};

export function prefabFor(themeKey, roomType, salt = 0) {
  const pack = THEME_CAST[themeKey] || THEME_CAST.ancient;
  const list = roomType === 'boss' ? pack.bosses : roomType === 'elite' ? pack.elites : pack.combat;
  return list[Math.abs(salt) % list.length];
}

export function playerPrefab(raceId, classId = 'worge', weaponId = '1h_tome') {
  const role = classId === 'worge' || classId === 'mage' || classId === 'ranger' ? classId : 'warrior';
  return {
    id: `hero_${raceId}_${role}_${weaponId}`,
    label: role === 'worge' ? 'Worge' : 'Warlord',
    raceId,
    role,
    weaponId: role === 'worge' ? weaponId : null,
    height: 1.82,
    equipped: true,
  };
}

export function themeFoeRace(themeKey) {
  return THEME_ENEMY[themeKey] || 'orc';
}
