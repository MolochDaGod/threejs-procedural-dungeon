/** Combat bar slots 6–7: session consumables / thrown. Not a second bag DB. */
import { ICONS_CDN } from './skillIcons.js';

export const COMBAT_ITEMS = {
  health_flask: {
    id: 'health_flask',
    name: 'Health Flask',
    kind: 'heal',
    heal: 42,
    cd: 8,
    iconUrl: `${ICONS_CDN}/game-assets/icons/abilities/ability_arcane_focus.png`,
  },
  bandage: {
    id: 'bandage',
    name: 'Bandage',
    kind: 'heal',
    heal: 22,
    cd: 4,
    iconUrl: `${ICONS_CDN}/game-assets/icons/abilities/ability_arcane_focus.png`,
  },
  throwing_knife: {
    id: 'throwing_knife',
    name: 'Throwing Knife',
    kind: 'projectile',
    damage: 28,
    range: 12,
    speed: 26,
    cd: 3,
    element: 'physical',
    color: 0xc9cedb,
  },
  lockpick: {
    id: 'lockpick',
    name: 'Lockpick',
    kind: 'tool',
    cd: 1,
    iconUrl: `${ICONS_CDN}/game-assets/icons/abilities/ability_arcane_focus.png`,
  },
  lockpick_set: {
    id: 'lockpick_set',
    name: 'Lockpicking Set',
    kind: 'tool',
    cd: 1,
    iconUrl: `${ICONS_CDN}/game-assets/icons/abilities/ability_arcane_focus.png`,
  },
  form_page: {
    id: 'form_page',
    name: 'Form Page',
    kind: 'page',
    cd: 8,
    iconUrl: `${ICONS_CDN}/game-assets/icons/abilities/ability_arcane_focus.png`,
  },
  tonic_blood: {
    id: 'tonic_blood',
    name: 'Tonic of Blood',
    kind: 'tonic',
    cd: 6,
    iconUrl: `${ICONS_CDN}/game-assets/icons/abilities/ability_arcane_focus.png`,
  },
  spell_page: {
    id: 'spell_page',
    name: 'Spell Page',
    kind: 'spell_page',
    cd: 2,
    iconUrl: `${ICONS_CDN}/game-assets/icons/abilities/ability_arcane_focus.png`,
  },
  spell_page_portal: {
    id: 'spell_page_portal',
    name: 'Portal Page',
    kind: 'portal',
    cd: 8,
    iconUrl: `${ICONS_CDN}/game-assets/icons/abilities/ability_arcane_focus.png`,
  },
  tonic_power: {
    id: 'tonic_power',
    name: 'Tonic of Power',
    kind: 'tonic',
    cd: 6,
    iconUrl: `${ICONS_CDN}/game-assets/icons/abilities/ability_arcane_focus.png`,
  },
  bomb: {
    id: 'bomb',
    name: 'Bomb',
    kind: 'nova',
    damage: 48,
    range: 3.4,
    cd: 10,
    element: 'fire',
    color: 0xff6a22,
  },
};

export const DEFAULT_ITEM_SLOTS = ['health_flask', 'bomb'];

export function starterItemCounts() {
  return { health_flask: 3, bandage: 2, throwing_knife: 4, bomb: 2, lockpick: 2 };
}
