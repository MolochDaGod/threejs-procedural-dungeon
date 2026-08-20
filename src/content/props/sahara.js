/**
 * Sahara cartoon nature pack — isolate by mesh name, never load fused.
 * Author units are millimetres; runtime ×100 then fit to targetHeightM.
 *
 * Season → dungeon biome:
 *   Spring → verdant
 *   Summer #1–36 → ancient (Sahara heat / tomb)
 *   Summer #37–72 → molten (dry rock / slag clutter)
 *   Winter #1–40 → frost
 *   Winter #41–54 → grim
 *   Earth globe / Demo plate → skip in rooms
 */
export const SAHARA_GLB = 'models/props/sahara-cartoon.glb';
export const SAHARA_CATALOG = 'models/props/sahara-catalog.json';
export const SAHARA_CM_TO_M = 100;

export function roleFromLongestM(longestM) {
  if (longestM >= 2.4) return { role: 'tree', targetHeightM: 4.0 };
  if (longestM >= 1.2) return { role: 'tree_small', targetHeightM: 2.4 };
  if (longestM >= 0.55) return { role: 'bush', targetHeightM: 1.1 };
  if (longestM >= 0.28) return { role: 'rock', targetHeightM: 0.85 };
  return { role: 'clutter', targetHeightM: 0.45 };
}

export function normalizeSaharaItem(raw) {
  const longest = Math.max(raw.rawM[0], raw.rawM[1], raw.rawM[2]) * SAHARA_CM_TO_M;
  const { role, targetHeightM } = roleFromLongestM(longest);
  return {
    ...raw,
    longestM: Math.round(longest * 1000) / 1000,
    role,
    targetHeightM,
    skip: raw.season === 'earth' || raw.season === 'demo' || raw.verts > 12000,
  };
}

export function saharaByBiome(catalog) {
  const items = (catalog?.sahara?.items || []).map(normalizeSaharaItem).filter((i) => !i.skip);
  const out = { ancient: [], molten: [], frost: [], grim: [], verdant: [] };
  for (const i of items) {
    if (out[i.biome]) out[i.biome].push(i);
  }
  return out;
}
