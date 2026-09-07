/**
 * Skill icon resolve — ObjectStore / CDN paths only.
 * Local /ui/craftpix/icons does not ship. Do not invent AI icons.
 */
import { SKILL_ICON_CDN } from './skillIconCdn.js';

export const ICONS_CDN = 'https://assets.grudge-studio.com';
const CPX = `${ICONS_CDN}/ui/craftpix`;
export const CRAFTPIX_SLOT_BG = `${CPX}/Action%20Bar/Slots/AB_MainSlot_Background.png`;
export const CRAFTPIX_SLOT_BORDER = `${CPX}/Action%20Bar/Slots/AB_MainSlot_Border.png`;
export const CRAFTPIX_SLOT_CD = `${CPX}/Action%20Bar/Slots/AB_MainSlot_Cooldown.png`;
export const CRAFTPIX_FILL_BG = `${CPX}/Fill%20Bars/AB_FillBar_Background.png`;
export const CRAFTPIX_FILL = `${CPX}/Fill%20Bars/AB_FillBar_Fill.png`;
export const CRAFTPIX_CAST_BG = `${CPX}/Cast%20Bar/Castbar_Background.png`;
export const CRAFTPIX_CAST_FILL = `${CPX}/Cast%20Bar/Castbar_Fill.png`;
export const CRAFTPIX_AVATAR_BG = `${CPX}/Action%20Bar/Avatar%20Frame/AB_AvatarFrame_Background.png`;
export const CRAFTPIX_AVATAR_BORDER = `${CPX}/Action%20Bar/Avatar%20Frame/AB_AvatarFrame_Border.png`;
export const CRAFTPIX_PB_BG = `${CPX}/Unit%20Frames/Bars/UnitFrame_PB_Background.png`;
export const CRAFTPIX_PB_FILL = `${CPX}/Unit%20Frames/Bars/UnitFrame_PB_Fill.png`;
export const CRAFTPIX_SB_BG = `${CPX}/Unit%20Frames/Bars/UnitFrame_SB_Background.png`;
export const CRAFTPIX_SB_FILL = `${CPX}/Unit%20Frames/Bars/UnitFrame_SB_Fill.png`;
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
