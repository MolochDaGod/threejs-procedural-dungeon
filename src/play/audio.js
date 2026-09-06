/**
 * Kenney RPG + Impact SFX via R2 CDN. Binaries stay on assets.*; D1 is index only.
 * No secrets in the client.
 */
const CDN = 'https://assets.grudge-studio.com/audio/kenney';

export const SFX = {
  combat_hit: `${CDN}/impacts/punch/punch-heavy-01.ogg`,
  combat_spell: `${CDN}/rpg/weapons/draw-knife1.ogg`,
  combat_block: `${CDN}/impacts/metal/metal-medium-01.ogg`,
  pinata: `${CDN}/impacts/wood/wood-heavy-01.ogg`,
  ui_click: `${CDN}/impacts/soft/soft-medium-01.ogg`,
  shrine: `${CDN}/rpg/inventory/handle-coins.ogg`,
  warning: `${CDN}/impacts/bell/bell-heavy-01.ogg`,
};

const cache = new Map();
let muted = false;

export function playSfx(role, { volume = 0.35 } = {}) {
  if (muted) return;
  const url = SFX[role];
  if (!url || typeof Audio === 'undefined') return;
  try {
    let a = cache.get(url);
    if (!a) {
      a = new Audio(url);
      a.preload = 'auto';
      cache.set(url, a);
    }
    const n = a.cloneNode();
    n.volume = volume;
    n.play()?.catch(() => {});
  } catch { /* autoplay */ }
}
