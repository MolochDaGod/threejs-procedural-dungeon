/**
 * combat.attacks — enemy telegraph catalog. Instant hits banned.
 */
export const ENEMY_ATTACKS = {
  swipe:    { id: 'swipe',    kind: 'cone',      telegraph: 'cone',   telegraphSec: 0.42, range: 3.2, half: 0.75, damage: 10, color: 0xc9cedb, anim: 'attack' },
  slash:    { id: 'slash',    kind: 'cone',      telegraph: 'cone',   telegraphSec: 0.55, range: 3.8, half: 0.9,  damage: 14, color: 0xe8e0c8, anim: 'attack' },
  linear:   { id: 'linear',   kind: 'line',      telegraph: 'linear', telegraphSec: 0.70, range: 10,  width: 0.95, damage: 12, color: 0x9b6cf0, anim: 'cast' },
  circle:   { id: 'circle',   kind: 'aoe',       telegraph: 'circle', telegraphSec: 1.15, radius: 3.4, damage: 16, color: 0xd8433a, anim: 'cast', planted: true },
  column:   { id: 'column',   kind: 'column',    telegraph: 'column', telegraphSec: 1.05, radius: 1.35, damage: 18, color: 0xff4030, anim: 'cast', planted: true },
  bend:     { id: 'bend',     kind: 'bend',      telegraph: 'charge', telegraphSec: 1.60, radius: 4.2, damage: 20, color: 0xff6a22, anim: 'cast', planted: true, explode: true },
  mist:     { id: 'mist',     kind: 'mist',      telegraph: 'circle', telegraphSec: 0.85, radius: 3.6, damage: 6,  color: 0x7d9a6a, anim: 'cast', linger: 5.2, dps: 4 },
  /** Casting EarthAbility finale — spike + ground burst. Boss / arena rooms only. */
  earth_spike: {
    id: 'earth_spike', kind: 'earth_spike', telegraph: 'column', telegraphSec: 1.15,
    radius: 2.4, height: 3.6, damage: 22, color: 0xc4a574, anim: 'cast', planted: true, breakFloor: true,
  },
  /** Casting fire path — spline multi-shot, tintable. */
  fire_fan: {
    id: 'fire_fan', kind: 'fire_fan', telegraph: 'linear', telegraphSec: 0.85,
    range: 14, shots: 5, spread: 0.38, arc: 2.2, damage: 11, color: 0xff6a1e, anim: 'cast',
    colors: [0xff6a1e, 0xffa040, 0xff3a1a, 0xffe08a, 0xff8c2a],
  },
};

export const ROLE_ATTACKS = {
  grunt:    ['swipe', 'slash'],
  caster:   ['linear', 'bend', 'circle', 'fire_fan'],
  miniboss: ['slash', 'column', 'circle', 'linear', 'earth_spike'],
  boss:     ['slash', 'column', 'circle', 'bend', 'mist', 'linear', 'earth_spike', 'fire_fan'],
};
