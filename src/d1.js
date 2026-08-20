/**
 * D1 / CDN kit + seed-deploy helpers.
 * D1 is the asset index (gn_assets, world_dungeons). Player bag/roster stays Railway.
 */
import { CDN, DUNGEON_KIT_URL, DUNGEON_LAYOUT, biomeOf } from './ssot.js';

let kitCache = null;
let kitPromise = null;

export async function loadDungeonKit() {
  if (kitCache) return kitCache;
  if (!kitPromise) {
    kitPromise = fetch(DUNGEON_KIT_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`kit ${r.status}`);
        return r.json();
      })
      .then((json) => {
        kitCache = json;
        return json;
      })
      .catch((err) => {
        console.warn('[grudge-dungeon] D1 kit miss', err);
        kitCache = { version: 'offline', pieces: [], characters: {}, worldDungeons: [] };
        return kitCache;
      });
  }
  return kitPromise;
}

export function pieceUrl(piece) {
  if (!piece?.glb) return null;
  if (/^https?:/i.test(piece.glb)) return piece.glb;
  return `${CDN}/${piece.glb.replace(/^\/+/, '')}`;
}

/**
 * Interior wall door — KayKit door/gate only.
 * Do NOT plant 2cave.glb / outdoor cave scenes on a room wall (looks like a tree/tunnel from above).
 */
export function entrancePiece(portal, kit) {
  const pieces = kit?.pieces || [];
  const want =
    portal === 'gate' ? ['kaykit_door_gate', 'kaykit_door']
    : ['kaykit_door', 'kaykit_door_gate'];
  for (const id of want) {
    const p = pieces.find((x) => x.id === id);
    if (p) return p;
  }
  return {
    id: 'kaykit_door',
    glb: 'game-assets/glb/kaykit/gltf/door.glb',
    targetHeightM: 3.6,
    category: 'entrance',
  };
}

export function portalForTheme(themeKey, kit) {
  const biome = biomeOf(themeKey);
  const world = (kit?.worldDungeons || []).find((d) => d.theme === themeKey);
  return world?.portal || biome.portal || 'cave_door';
}

export function readSeedQuery() {
  const q = new URLSearchParams(location.search);
  const seed = q.get('seed');
  const rooms = q.get('rooms');
  return {
    seed: seed != null && seed !== '' ? (parseInt(seed, 10) >>> 0) : null,
    theme: q.get('theme') || null,
    rooms: rooms != null ? Math.max(DUNGEON_LAYOUT.roomsMin, Math.min(DUNGEON_LAYOUT.roomsMax, +rooms)) : null,
    race: q.get('race') || null,
    classId: q.get('class') || null,
    weapon: q.get('weapon') || null,
    linear: q.get('linear') == null ? null : q.get('linear') !== '0',
    kind: q.get('kind') || null,
  };
}

export function writeSeedQuery(params) {
  const u = new URL(location.href);
  const set = (k, v) => {
    if (v == null || v === '') u.searchParams.delete(k);
    else u.searchParams.set(k, String(v));
  };
  set('seed', params.seed);
  set('theme', params.theme);
  set('rooms', params.roomCount);
  set('race', params.race);
  set('class', params.classId);
  set('weapon', params.weapon);
  set('linear', params.linear ? '1' : '0');
  set('kind', params.kind);
  history.replaceState(null, '', u);
}
