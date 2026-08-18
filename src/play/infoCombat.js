/**
 * Combat math + class/race sheets from info.grudge-studio.com.
 * Formulas: master-attributes.json combatFormulas.
 */
import { INFO, PLAY } from '../ssot.js';

const ATTR_KEYS = [
  'strength', 'vitality', 'endurance', 'dexterity',
  'agility', 'intellect', 'wisdom', 'tactics',
];

const BASE = {
  health: 80,
  mana: 36,
  stamina: 55,
  damage: 10,
  defense: 8,
  block: 0.04,
  blockEffect: 0.28,
  criticalChance: 0.05,
  criticalDamage: 1.5,
  manaRegen: 5,
  healthRegen: 1.1,
  evasion: 0.02,
};

let cache = null;

export async function loadInfoCombat() {
  if (cache) return cache;
  const [classes, races, attrs] = await Promise.all([
    fetch(`${INFO}/api/v1/classes.json`).then((r) => r.json()),
    fetch(`${INFO}/api/v1/races.json`).then((r) => r.json()),
    fetch(`${INFO}/api/v1/master-attributes.json`).then((r) => r.json()),
  ]);
  cache = { classes, races, attrs };
  return cache;
}

function attrMap(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k.toLowerCase()] = Number(v) || 0;
  return out;
}

function addGains(pool, gains, pts) {
  if (!gains || !pts) return;
  for (const [stat, g] of Object.entries(gains)) {
    if (!g) continue;
    pool[stat] = (pool[stat] || 0) + (g.flat || 0) * pts;
    if (g.percent) pool[`${stat}Pct`] = (pool[`${stat}Pct`] || 0) + g.percent * pts;
  }
}

export function deriveSheet(info, raceId = 'human', classId = 'worge') {
  const cls = info.classes.classes[classId] || info.classes.classes.worge || info.classes.classes.warrior;
  const race = info.races.races[raceId] || info.races.races.human;
  const points = { ...attrMap(cls.startingAttributes), ...Object.fromEntries(ATTR_KEYS.map((k) => [k, 0])) };
  const raceBonus = attrMap(race.bonuses);
  for (const k of ATTR_KEYS) points[k] = (points[k] || 0) + (raceBonus[k] || 0);

  const pool = { ...BASE };
  const catalog = info.attrs.attributes || [];
  for (const def of catalog) {
    addGains(pool, def.gains, points[def.id] || 0);
  }
  const applyPct = (key) => {
    const pct = pool[`${key}Pct`] || 0;
    pool[key] = (pool[key] || 0) * (1 + pct / 100);
  };
  applyPct('health');
  applyPct('mana');
  applyPct('stamina');

  const caps = info.attrs.statCaps || {};
  const cap = (key, v) => {
    const c = caps[key]?.value;
    return c == null ? v : Math.min(v, c);
  };
  const asChance = (v) => (v > 1 ? v / 100 : v);

  return {
    raceId,
    classId: cls.id,
    className: cls.name,
    raceName: race.name,
    color: cls.color,
    icon: cls.iconUrl || `${INFO}${cls.icon || ''}`,
    raceIcon: race.iconUrl || `${INFO}${race.icon || ''}`,
    points,
    hpMax: Math.round(pool.health),
    manaMax: Math.round(pool.mana),
    staminaMax: Math.round(pool.stamina),
    damage: pool.damage,
    defense: pool.defense,
    block: cap('block', asChance(pool.block)),
    blockEffect: cap('blockEffect', asChance(pool.blockEffect)),
    crit: cap('criticalChance', asChance(pool.criticalChance)),
    critFactor: Math.min(caps.criticalDamage?.value ?? 3, pool.criticalDamage || 1.5),
    manaRegen: pool.manaRegen ?? PLAY.manaRegen,
    hpRegen: pool.healthRegen ?? PLAY.hpRegen,
    staminaRegen: PLAY.staminaRegen,
    formulas: info.attrs.combatFormulas,
  };
}

/** info.* combatFormulas: mitigate, optional block, then crit if not blocked. */
export function resolveHit(incoming, attacker, defender, rng = Math.random) {
  let dmg = Math.max(0, incoming * (1 + (attacker?.damage || 0) * 0.008));
  let blocked = false;
  if (defender?.block > 0 && rng() < defender.block) {
    blocked = true;
    dmg *= 1 - Math.min(0.9, defender.blockEffect || 0.3);
  }
  if (!blocked && attacker?.crit > 0 && rng() < attacker.crit) {
    dmg *= attacker.critFactor || 1.5;
  }
  const def = Math.max(0, defender?.defense || 0);
  dmg *= (100 - Math.sqrt(def)) / 100;
  return Math.max(1, Math.round(dmg));
}

export function fallbackSheet(raceId = 'human', classId = 'worge') {
  return {
    raceId,
    classId,
    className: classId,
    raceName: raceId,
    color: '#d97706',
    icon: 'https://assets.grudge-studio.com/icons/warlords/classes/worge.png',
    raceIcon: `https://assets.grudge-studio.com/icons/warlords/races/${raceId}.webp`,
    points: {},
    hpMax: PLAY.hp,
    manaMax: PLAY.mana,
    staminaMax: PLAY.stamina,
    damage: 18,
    defense: 20,
    block: 0.08,
    blockEffect: 0.35,
    crit: 0.08,
    critFactor: 1.6,
    manaRegen: PLAY.manaRegen,
    hpRegen: PLAY.hpRegen,
    staminaRegen: PLAY.staminaRegen,
    formulas: {
      mitigation: 'Damage Taken = Incoming × (100 - √Defense) / 100',
    },
  };
}
