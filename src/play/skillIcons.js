/**
 * Skill icon resolve — ObjectStore / CDN paths only.
 * Local /ui/craftpix/icons does not ship. Do not invent AI icons.
 */
import { SKILL_ICON_CDN } from './skillIconCdn.js';

export const ICONS_CDN = 'https://assets.grudge-studio.com';
export const CRAFTPIX_SLOT_BG =
  `${ICONS_CDN}/ui/craftpix/Action%20Bar/Slots/AB_MainSlot_Background.png`;
export const CRAFTPIX_SLOT_BORDER =
  `${ICONS_CDN}/ui/craftpix/Action%20Bar/Slots/AB_MainSlot_Border.png`;
const FALLBACK = `${ICONS_CDN}/game-assets/icons/abilities/ability_arcane_focus.png`;

export function iconUrlFromPath(p) {
  if (!p) return '';
  const s = String(p);
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/icons/') || s.startsWith('/game-assets/')) return `${ICONS_CDN}${s}`;
  const rel = s.replace(/^\.\//, '').replace(/^\//, '');
  return `${ICONS_CDN}/${rel}`;
}

export function resolveSkillIcon(spell) {
  if (!spell) return FALLBACK;
  if (spell.iconUrl) {
    const u = iconUrlFromPath(spell.iconUrl);
    if (u) return u;
  }
  if (spell.id && SKILL_ICON_CDN[spell.id]) return SKILL_ICON_CDN[spell.id];
  if (spell.icon) {
    const u = iconUrlFromPath(spell.icon);
    if (u) return u;
  }
  return FALLBACK;
}
