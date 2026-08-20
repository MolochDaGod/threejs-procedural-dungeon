import ancient from './ancient.js';
import molten from './molten.js';
import frost from './frost.js';
import grim from './grim.js';
import verdant from './verdant.js';

export const BIOMES = { ancient, molten, frost, grim, verdant };
export const THEME_BIOME = BIOMES;

export const POOL_RULES = Object.fromEntries(
  Object.values(BIOMES).map((b) => [b.id, b.pool]),
);

export function biomeOf(themeKey) {
  return BIOMES[themeKey] || ancient;
}

export { ancient, molten, frost, grim, verdant };
