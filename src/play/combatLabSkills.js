/**
 * Combat lab (saber-academy /admin Weapon Skill Studio) class skills + editor effects.
 * Ids and knobs from artifacts/saber-academy/src/game/data/weapon-skills.json.
 * Play math still goes through dungeon fireSpell — not a second combat engine.
 */
import seed from './data/combat-lab-skills.json' with { type: 'json' };
import { overlayForSkill } from './stylizedProjectiles.js';
import { resolveSkillIcon } from './skillIcons.js';

export const CLASS_TO_LAB = {
  warrior: 'warrior',
  raider: 'blade dancer',
  mage: 'mage',
  priest: 'mage',
  ranger: 'ranger',
  thief: 'ranger',
  worge: 'worge',
  verduror: 'worge',
};

function labKind(k) {
  if (k === 'boomerang') return 'projectile';
  if (k === 'push' || k === 'heal') return 'nova';
  return k || 'slash';
}

function elementOf(def) {
  const t = `${def.texture || ''} ${def.impact || ''} ${def.id || ''} ${def.name || ''}`.toLowerCase();
  if (/flame|fire|cinder/.test(t)) return 'fire';
  if (/frost|ice|frozen/.test(t)) return 'ice';
  if (/heal|holy|radiant/.test(t)) return 'holy';
  if (/arcane|gale|air/.test(t)) return 'arcane';
  if (/earth|stone|hit/.test(t) && /heave|charge|pounce|howl/.test(t)) return 'physical';
  if (/crit|sunder|warcry|whirl/.test(t)) return 'physical';
  return 'physical';
}

function hexColor(n) {
  if (typeof n === 'string' && n.startsWith('#')) return parseInt(n.slice(1), 16);
  return Number(n) || 0xe8e0c8;
}

/** Editor primitives that match this skill's texture/impact/kind. */
export function primitivesFor(def, catalog = seed) {
  const fx = catalog.effects || [];
  const tex = String(def.texture || '');
  const impact = String(def.impact || '');
  const kinds = new Set(['cast', 'impact']);
  if (/flame|fire/.test(tex) || /flamestrike/.test(impact)) {
    kinds.add('fire');
    kinds.add('flame');
    kinds.add('travel');
  }
  if (/frost|ice|frozen/.test(`${tex} ${impact}`)) kinds.add('frost');
  if (/heal/.test(tex) || def.kind === 'heal') kinds.add('heal');
  if (/crit|hit/.test(`${tex} ${impact}`)) kinds.add('trail');
  if (def.kind === 'dash' || def.kind === 'boomerang') kinds.add('residual');
  if (def.kind === 'nova' || def.kind === 'push') kinds.add('aura');
  kinds.add('smoke');
  return fx.filter((e) => kinds.has(e.kind));
}

export function compileLabSkill(def, slot) {
  const kind = labKind(def.kind);
  const element = elementOf(def);
  const overlay = overlayForSkill(def.id, kind, element);
  const range = Number(def.range) > 0 ? Number(def.range) : Number(def.radius || 6);
  return {
    id: def.id,
    catalogSkillId: def.id,
    name: def.name,
    kind,
    labKind: def.kind,
    classSkill: true,
    combatLab: true,
    element,
    color: hexColor(def.color),
    mana: 0,
    stamina: Number(def.forceCost || 12),
    cd: Number(def.cooldown || 6),
    range,
    damage: Number(def.damage || 0),
    heal: def.kind === 'heal' ? Number(def.damage || 0) : 0,
    speed: Number(def.speed || 22),
    telegraphSec: def.castT ? Number(def.castT) * 0.32 : (kind === 'slash' || kind === 'dash' ? 0.14 : 0.26),
    taunt: !!def.taunt,
    overlay,
    overlayRef: overlay?.overlayRef || overlay?.vfxRef || null,
    meshId: def.meshId || null,
    texture: def.texture || null,
    impact: def.impact || null,
    labEffects: primitivesFor(def),
    anim: kind === 'slash' || kind === 'dash' ? 'attack' : 'cast',
    slot,
    key: slot === 0 ? 'F' : '',
    iconUrl: resolveSkillIcon({ id: def.id, name: def.name, element }),
  };
}

export function labSkillsFor(classId) {
  const key = CLASS_TO_LAB[classId] || 'warrior';
  const a = seed.classSkills?.[key] || [];
  const b = seed.classSkillsB?.[key] || [];
  const seen = new Set();
  const out = [];
  for (const d of [...a, ...b]) {
    if (!d?.id || seen.has(d.id)) continue;
    seen.add(d.id);
    out.push(d);
  }
  return out;
}

export function parseFxColor(c, fallback = 0xe8e0c8) {
  if (typeof c === 'number') return c;
  if (typeof c === 'string' && c[0] === '#') return parseInt(c.slice(1), 16) || fallback;
  return fallback;
}
