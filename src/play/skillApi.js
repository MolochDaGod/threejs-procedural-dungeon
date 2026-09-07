/**
 * Play catalog hydrate — public GETs only, no secrets.
 *   SkillAPI DO  https://weapon-skills.grudge-studio.com  (health + bundle)
 *   ObjectStore  info.grudge-studio.com/master-weaponSkills  (icons / vfx refs)
 * Local CATALOG_SKILL_PLAY stays the play math SSOT. DO currently holds 1 draft.
 */
import { SPELLS } from '../ssot.js';
import { SKILLS } from './weaponSkills.js';
import { iconUrlFromPath, resolveSkillIcon } from './skillIcons.js';
import { resolvePlayUrl } from './playUrl.js';

export const SKILL_API = 'https://weapon-skills.grudge-studio.com';
export const INFO_WEAPON_SKILLS = 'https://info.grudge-studio.com/api/v1/master-weaponSkills.json';

let merged = false;
export const catalogStatus = {
  skillApi: false,
  infoSkills: 0,
  stamped: 0,
};

async function getJson(url) {
  const r = await fetch(url, { mode: 'cors' });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

function catalogList() {
  return Array.isArray(SKILLS) && SKILLS.length ? SKILLS : (Array.isArray(SPELLS) ? SPELLS : []);
}

function applyRemote(local, remote) {
  if (!local || !remote) return;
  if (remote.telegraphSec != null) local.telegraphSec = remote.telegraphSec;
  if (remote.meshPath) local.meshPath = resolvePlayUrl(remote.meshPath);
  if (remote.castEffectId) local.castEffectId = remote.castEffectId;
  if (remote.impactEffectId) local.impactEffectId = remote.impactEffectId;
  const icon = remote.iconUrl || remote.icon;
  if (icon) local.iconUrl = iconUrlFromPath(icon);
  const prefab = remote.prefab || {};
  if (prefab.vfxRef) local.castEffectId = local.castEffectId || prefab.vfxRef;
  if (prefab.overlayRef) local.overlayRef = prefab.overlayRef;
  if (prefab.impactRef) local.impactEffectId = local.impactEffectId || prefab.impactRef;
  if (prefab.modelRef && !local.meshPath) local.meshPath = resolvePlayUrl(prefab.modelRef);
  if (prefab.overlay) local.overlay = { ...(local.overlay || {}), ...prefab.overlay };
}

function walkSkills(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.id === 'string' && node.id.includes('_')) fn(node);
  for (const v of Object.values(node)) {
    if (Array.isArray(v)) v.forEach((x) => walkSkills(x, fn));
    else if (v && typeof v === 'object') walkSkills(v, fn);
  }
}

/**
 * Travel + clip stamps on existing skill ids.
 * Patterns cover meteor / blizzard / chain for every class.
 * SKILL_FX is the one-class-at-a-time pass (warrior first).
 */
const SKILL_FX = {
  w_taunt: { anim: 'warcry', travel: 'zone' },
  warcry: { anim: 'warcry', travel: 'zone' },
  sunder: { kind: 'dash', anim: 'dashAtk', travel: 'dash', range: 8 },
  life_drain_strike: { kind: 'slash', anim: 'attack', travel: 'wave' },
  concussive_blow: { kind: 'slash', anim: 'attack', travel: 'wave' },
  sunder_armor: { kind: 'slash', anim: 'attack', travel: 'wave' },
  execute: { kind: 'slash', anim: 'attack3', travel: 'wave' },
  guardian_aura: { anim: 'cast', travel: 'zone' },
  demoralizing_shout: { anim: 'warcry', travel: 'zone' },
  avatar_form: { anim: 'cast', travel: 'zone' },
};

export function bindSkillTravel(spell) {
  if (!spell?.id) return spell;
  const blob = `${spell.id} ${spell.name || ''}`.toLowerCase();
  if (/meteor/.test(blob)) {
    spell.travel = spell.travel || 'incoming';
    if (spell.kind === 'projectile' || spell.kind === 'slash') spell.kind = 'nova';
    if (!spell.anim || spell.anim === 'attack') spell.anim = 'cast';
  } else if (/blizzard/.test(blob)) {
    spell.travel = spell.travel || 'zone';
    spell.kind = 'zone';
    spell.linger = spell.linger || 4.2;
    spell.anim = spell.anim || 'cast';
  } else if (/chain.?lightning|thundergod/.test(blob)) {
    spell.kind = 'beam';
    spell.forks = true;
    spell.linear = spell.linear || 'thunder';
    spell.anim = spell.anim || 'cast';
  }
  const row = SKILL_FX[spell.id];
  if (row) {
    if (row.kind) spell.kind = row.kind;
    if (row.anim) spell.anim = row.anim;
    if (row.travel) spell.travel = row.travel;
    if (row.range != null) spell.range = row.range;
    if (row.linger != null) spell.linger = row.linger;
  }
  return spell;
}

export function stampSpell(spell) {
  if (!spell?.id) return spell;
  const live = catalogList().find((s) => s.id === spell.id);
  if (live) {
    if (live.iconUrl) spell.iconUrl = live.iconUrl;
    if (live.meshPath) spell.meshPath = live.meshPath;
    if (live.telegraphSec != null) spell.telegraphSec = live.telegraphSec;
    if (live.castEffectId) spell.castEffectId = live.castEffectId;
    if (live.impactEffectId) spell.impactEffectId = live.impactEffectId;
    if (live.overlay) spell.overlay = live.overlay;
    if (live.t8) spell.t8 = live.t8;
    if (live.weaponName) spell.weaponName = live.weaponName;
  }
  bindSkillTravel(spell);
  spell.iconUrl = resolveSkillIcon(spell);
  if (!spell.uuid) spell.uuid = live?.uuid || `grudge.skill.${spell.id}`;
  if (!spell.labId) spell.labId = live?.labId || spell.id;
  return spell;
}

export async function hydrateSkillApi() {
  if (merged) return SPELLS;
  merged = true;
  const byId = new Map(catalogList().map((s) => [s.id, s]));

  try {
    const health = await getJson(`${SKILL_API}/api/health`);
    catalogStatus.skillApi = !!health?.ok;
  } catch (err) {
    console.warn('[grudge-dungeon] SkillAPI health miss', err?.message || err);
  }

  try {
    const bundle = await getJson(`${SKILL_API}/api/v1/bundle`);
    const list = Array.isArray(bundle?.skills) ? bundle.skills : [];
    for (const remote of list) {
      const id = remote.id || remote.skillId;
      if (!id || id === 'skill-do-smoke') continue;
      if (byId.has(id)) applyRemote(byId.get(id), remote);
    }
  } catch (err) {
    console.warn('[grudge-dungeon] SkillAPI bundle miss', err?.message || err);
  }

  try {
    const info = await getJson(INFO_WEAPON_SKILLS);
    let n = 0;
    walkSkills(info, (row) => {
      const local = byId.get(row.id);
      if (!local) return;
      applyRemote(local, row);
      n += 1;
    });
    catalogStatus.infoSkills = n;
    catalogStatus.stamped = n;
  } catch (err) {
    console.warn('[grudge-dungeon] info weaponSkills miss', err?.message || err);
  }
  return SPELLS;
}

export function telegraphForSkill(spell) {
  if (!spell) return { variant: 'cone', sec: 0.42 };
  if (spell.travel === 'incoming') return { variant: 'incoming', sec: spell.telegraphSec || 0.85 };
  if (spell.kind === 'nova' || spell.kind === 'zone') return { variant: 'aoe', sec: spell.telegraphSec || 1.1 };
  if (spell.kind === 'projectile' || spell.kind === 'beam' || spell.kind === 'fissure') {
    return { variant: 'incoming', sec: spell.telegraphSec || 0.7 };
  }
  return { variant: 'cone', sec: Math.max(0.35, spell.telegraphSec || 0.42) };
}
