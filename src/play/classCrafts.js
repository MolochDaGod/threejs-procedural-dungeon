/**
 * Unique class-made goods. Session bag until Railway account bag
 * (grudgewarlords.com/craft/). Maker can offer/trade in-crawl; refill rules stay
 * on warrior/raider. Do not invent a second recipe DB.
 */
import { ICONS_CDN } from './skillIcons.js';

const icon = (file) => `${ICONS_CDN}/game-assets/icons/abilities/${file}`;

export const CLASS_CRAFTS = {
  lockpick_set: {
    id: 'lockpick_set',
    name: 'Lockpicking Set',
    makers: ['ranger', 'thief'],
    kind: 'tool',
    cost: { iron_bit: 1, cloth_scrap: 1 },
    label: 'Lockpicking set',
  },
  form_page: {
    id: 'form_page',
    name: 'Form Page',
    makers: ['worge', 'verduror'],
    kind: 'page',
    cost: { cloth_scrap: 1 },
    label: 'Claw form page',
  },
  tonic_blood: {
    id: 'tonic_blood',
    name: 'Tonic of Blood',
    makers: ['warrior', 'raider'],
    kind: 'tonic',
    refill: ['warrior', 'raider'],
    healFrac: 0.28,
    mana: 24,
    stamina: 24,
    fillPerSec: 8,
    maxCharge: 100,
    minUse: 25,
    label: 'Tonic of Blood',
  },
  spell_page: {
    id: 'spell_page',
    name: 'Spell Page',
    makers: ['mage', 'priest'],
    kind: 'page',
    cost: { cloth_scrap: 1 },
    label: 'Single-use spell page',
  },
  spell_page_portal: {
    id: 'spell_page_portal',
    name: 'Portal Page',
    makers: ['mage', 'priest'],
    kind: 'portal',
    cost: { cloth_scrap: 1, stone_chip: 1 },
    label: 'Single-use portal page',
  },
  tonic_power: {
    id: 'tonic_power',
    name: 'Tonic of Power',
    makers: ['warrior', 'raider'],
    kind: 'tonic',
    refill: ['warrior', 'raider'],
    healFrac: 0.12,
    mana: 40,
    stamina: 40,
    fillPerSec: 8,
    maxCharge: 100,
    minUse: 25,
    label: 'Tonic of Power',
  },
};

export function craftsForClass(classId) {
  return Object.values(CLASS_CRAFTS).filter((c) => c.makers.includes(classId));
}

export function canRefillTonic(classId) {
  return classId === 'warrior' || classId === 'raider';
}

export function tonicIcon() {
  return icon('ability_arcane_focus.png');
}
