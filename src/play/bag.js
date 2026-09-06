/**
 * Session dungeon bag. Production ownership is Railway account bag
 * (grudge-production-wiring). This is crawl yield only — not a second DB.
 */
const KEY = 'grudge-dungeon-bag';

export const BAG_DEFS = {
  wood_scrap: { id: 'wood_scrap', label: 'Wood scrap', icon: '/ui/craftpix/icons/nature.png' },
  stone_chip: { id: 'stone_chip', label: 'Stone chip', icon: '/ui/craftpix/icons/shield.png' },
  cloth_scrap: { id: 'cloth_scrap', label: 'Cloth scrap', icon: '/ui/craftpix/icons/tome.png' },
  iron_bit: { id: 'iron_bit', label: 'Iron bit', icon: '/ui/craftpix/icons/sword.png' },
  lockpick_set: { id: 'lockpick_set', label: 'Lockpicking set', icon: '/ui/craftpix/icons/tome.png' },
  form_page: { id: 'form_page', label: 'Form page', icon: '/ui/craftpix/icons/nature.png' },
  tonic_blood: { id: 'tonic_blood', label: 'Tonic of Blood', icon: '/ui/craftpix/icons/holy.png' },
  tonic_power: { id: 'tonic_power', label: 'Tonic of Power', icon: '/ui/craftpix/icons/fireball.png' },
  spell_page: { id: 'spell_page', label: 'Spell page', icon: '/ui/craftpix/icons/tome.png' },
  spell_page_portal: { id: 'spell_page_portal', label: 'Portal page', icon: '/ui/craftpix/icons/void.png' },
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
