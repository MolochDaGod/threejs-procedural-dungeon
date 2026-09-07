/**
 * Class combat slots from ObjectStore master-skillTrees.
 * Weapon 1–6 stay on the equipped T8 kit. Class F + click row are tree actives.
 * Do not invent skill ids.
 */
import { iconUrlFromPath, resolveSkillIcon } from './skillIcons.js';
import { overlayForSkill } from './stylizedProjectiles.js';
import { classSkill0 } from './classSkill0.js';
import { compileLabSkill, labSkillsFor } from './combatLabSkills.js';

export const CLASS_TREES_URL = 'https://info.grudge-studio.com/api/v1/master-skillTrees.json';

let _trees = null;

export async function loadClassTrees() {
  if (_trees?.skillTrees) return _trees;
  const r = await fetch(CLASS_TREES_URL, { mode: 'cors' });
  if (!r.ok) throw new Error(`class trees ${r.status}`);
  _trees = await r.json();
  return _trees;
}

export function classTreeOf(trees, classId) {
  const map = trees?.skillTrees || trees || {};
  if (map[classId]) return map[classId];
  if (classId === 'worge' && map.knight) return map.knight;
  if (classId === 'priest' && map.mage) return map.mage;
  if (classId === 'raider' && map.warrior) return map.warrior;
  if (classId === 'thief' && map.ranger) return map.ranger;
  if (classId === 'verduror' && map.worge) return map.worge;
  return map.warrior || null;
}

function playKind(sk, g) {
  const t = `${g.type || ''} ${g.name || ''} ${sk.name || ''} ${sk.effect || ''} ${sk.description || ''}`.toLowerCase();
  if (g.healPercent || /heal/.test(t)) return 'nova';
  if (g.isAoE || /nova|storm|shout|aura|cataclysm/.test(t)) return 'nova';
  if (/buff|ward|shield|regen/.test(t) && !(g.damage > 0)) return 'nova';
  if (/debuff|taunt|sleep|confuse/.test(t) && !(g.damage > 0)) return 'nova';
  if (/magical|spell|bolt|brand|lightning|meteor|flame/.test(t)) return 'projectile';
  return 'slash';
}

function elementOf(sk, g) {
  const t = `${g.type || ''} ${g.name || ''} ${sk.effect || ''} ${sk.description || ''}`.toLowerCase();
  if (/fire|flame|ignite|burn/.test(t)) return 'fire';
  if (/ice|frost|sleep/.test(t)) return 'ice';
  if (/storm|thunder|lightning/.test(t)) return 'storm';
  if (/nature|vine|bark|entangle/.test(t)) return 'nature';
  if (/holy|bless|divine|purify/.test(t)) return 'holy';
  if (/shadow|bleed|drain/.test(t)) return 'shadow';
  return /magical|spell|arcane/.test(t) ? 'arcane' : 'physical';
}

const COLOR = {
  fire: 0xe8973f, ice: 0x8fd4ff, storm: 0x5a8fe8, nature: 0x6bbf4a,
  holy: 0xffe08a, shadow: 0x9b6cf0, arcane: 0xb070ff, physical: 0xe8e0c8,
};

export function compileClassSkill(sk, index = 0) {
  const g = sk.grantedAbility || {};
  const kind = playKind(sk, g);
  const element = elementOf(sk, g);
  const raw = Number(g.damage || 0);
  const damage = raw > 4 ? raw : raw > 0 ? Math.round(raw * 42) : (/heal|buff/.test(kind) ? 0 : 28);
  const heal = g.healPercent ? Math.round((g.healPercent || 0) * 80) : 0;
  const id = g.id || sk.id;
  const overlay = overlayForSkill(id, kind, element);
  return {
    id,
    catalogSkillId: id,
    name: g.name || sk.name || id,
    kind,
    classSkill: true,
    element,
    color: COLOR[element] || COLOR.physical,
    mana: Number(g.manaCost || 0),
    stamina: Number(g.staminaCost || (kind === 'slash' ? 10 : 0)),
    cd: Number(g.cooldown ?? 5),
    range: g.isAoE || kind === 'nova' ? 6.4 : kind === 'projectile' ? 14 : 3.2,
    damage,
    heal,
    speed: 18,
    telegraphSec: kind === 'slash' ? 0.14 : 0.28,
    taunt: /taunt/.test(`${sk.id} ${g.id} ${sk.name}`),
    overlay,
    overlayRef: overlay?.overlayRef || overlay?.vfxRef || null,
    iconUrl: resolveSkillIcon({
      id,
      iconUrl: iconUrlFromPath(g.iconUrl || sk.iconUrl || sk.icon) || undefined,
      icon: g.iconUrl || sk.iconUrl || sk.icon,
    }),
    slot: index,
    key: index === 0 ? 'F' : '',
    anim: kind === 'slash' ? 'attack' : 'cast',
  };
}

/** Four combat-castable class skills at play level. F is slot 0. */
export function classLoadoutFor(classId, trees, level = 20) {
  const tree = classTreeOf(trees, classId);
  const nodes = [];
  for (const tier of tree?.tiers || []) {
    if ((tier.requiredLevel || 1) > level) continue;
    for (const sk of tier.skills || []) {
      if (sk.passive && !sk.grantedAbility) continue;
      nodes.push(sk);
    }
  }
  const granted = nodes.filter((s) => s.grantedAbility);
  const pick = (granted.length ? granted : nodes.filter((s) => !s.passive)).slice(0, 6);
  const treeRows = pick.map((sk, i) => compileClassSkill(sk, i));
  const labRows = labSkillsFor(classId).map((d, i) => compileLabSkill(d, i));
  const f0 = classSkill0(classId);
  const used = new Set(f0 ? [f0.id] : []);
  const merged = [];
  if (f0) {
    const head = { ...f0, classSkill: true, slot: 0, key: 'F' };
    head.iconUrl = resolveSkillIcon(head);
    merged.push(head);
  }
  for (const s of [...labRows, ...treeRows]) {
    if (used.has(s.id)) continue;
    used.add(s.id);
    merged.push(s);
    if (merged.length >= 6) break;
  }
  return merged.map((s, i) => ({ ...s, slot: i, key: i === 0 ? 'F' : '', iconUrl: resolveSkillIcon(s) }));
}
