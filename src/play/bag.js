/**
 * Session dungeon bag. Production ownership is Railway account bag
 * (grudge-production-wiring) via grudgewarlords.com/craft/ — not this map.
 * Character sheet: info.grudge-studio.com/main-panel.html
 * This is crawl yield only — not a second DB. Unique gear is never minted here.
 */
import { resolveSkillIcon, ICONS_CDN } from './skillIcons.js';

const KEY = 'grudge-dungeon-bag';

export const BAG_DEFS = {
  wood_scrap: { id: 'wood_scrap', label: 'Wood scrap', icon: `${ICONS_CDN}/game-assets/icons/skills_rpg/skill_bark_skin.png` },
  stone_chip: { id: 'stone_chip', label: 'Stone chip', icon: `${ICONS_CDN}/game-assets/icons/skills_rpg/skill_iron_hide.png` },
  cloth_scrap: { id: 'cloth_scrap', label: 'Cloth scrap', icon: `${ICONS_CDN}/game-assets/icons/abilities/ability_mana_shield.png` },
  iron_bit: { id: 'iron_bit', label: 'Iron bit', icon: `${ICONS_CDN}/game-assets/icons/skills_rpg/skill_execute.png` },
  lockpick_set: { id: 'lockpick_set', label: 'Lockpicking set', icon: resolveSkillIcon({ id: 'lockpick_set' }) },
  form_page: { id: 'form_page', label: 'Form page', icon: resolveSkillIcon({ id: 'form_page' }) },
  tonic_blood: { id: 'tonic_blood', label: 'Tonic of Blood', icon: resolveSkillIcon({ id: 'tonic_blood' }) },
  tonic_power: { id: 'tonic_power', label: 'Tonic of Power', icon: resolveSkillIcon({ id: 'tonic_power' }) },
  spell_page: { id: 'spell_page', label: 'Spell page', icon: resolveSkillIcon({ id: 'spell_page' }) },
  spell_page_portal: { id: 'spell_page_portal', label: 'Portal page', icon: resolveSkillIcon({ id: 'spell_page_portal' }) },
};

export function spendLoot(bag, cost) {
  const next = { ...bag };
  for (const [id, n] of Object.entries(cost || {})) {
    if ((next[id] || 0) < n) return null;
    next[id] -= n;
    if (next[id] <= 0) delete next[id];
  }
  saveBag(next);
  return next;
}

export function loadBag() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

export function saveBag(bag) {
  try { localStorage.setItem(KEY, JSON.stringify(bag)); } catch { /* guest */ }
}

/** Session corpse yield — existing bag ids only. */
export function corpseYield(kind = 'trash') {
  if (kind === 'boss') return [{ id: 'iron_bit', n: 2 }, { id: 'stone_chip', n: 3 }];
  if (kind === 'elite') return [{ id: 'iron_bit', n: 1 }, { id: 'cloth_scrap', n: 1 }];
  const pool = ['wood_scrap', 'cloth_scrap', 'stone_chip'];
  return [{ id: pool[Math.floor(Math.random() * 3)], n: 1 }];
}

export function addLoot(bag, id, n = 1) {
  const next = { ...bag, [id]: (bag[id] || 0) + n };
  saveBag(next);
  return next;
}

export function bagSlots(bag) {
  return Object.entries(bag)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ ...BAG_DEFS[id], id, n, label: BAG_DEFS[id]?.label || id }));
}
