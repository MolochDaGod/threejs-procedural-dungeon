/**
 * Play catalog hydrate — public GETs only, no secrets.
 *   SkillAPI DO  https://weapon-skills.grudge-studio.com  (health + bundle)
 *   ObjectStore  info.grudge-studio.com/master-weaponSkills  (icons / vfx refs)
 * Local CATALOG_SKILL_PLAY stays the play math SSOT. DO currently holds 1 draft.
 */
import { SPELLS } from '../ssot.js';
import { SKILLS } from './weaponSkills.js';
import { iconUrlFromPath } from './skillIcons.js';
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
  if (prefab.impactRef) local.impactEffectId = local.impactEffectId || prefab.impactRef;
  if (prefab.modelRef && !local.meshPath) local.meshPath = resolvePlayUrl(prefab.modelRef);
}

function walkSkills(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.id === 'string' && node.id.includes('_')) fn(node);
  for (const v of Object.values(node)) {
    if (Array.isArray(v)) v.forEach((x) => walkSkills(x, fn));
    else if (v && typeof v === 'object') walkSkills(v, fn);
  }
}

export function stampSpell(spell) {
  if (!spell?.id) return spell;
  const live = catalogList().find((s) => s.id === spell.id);
  if (!live) return spell;
  if (live.iconUrl) spell.iconUrl = live.iconUrl;
  if (live.meshPath) spell.meshPath = live.meshPath;
  if (live.telegraphSec != null) spell.telegraphSec = live.telegraphSec;
  if (live.castEffectId) spell.castEffectId = live.castEffectId;
  if (live.impactEffectId) spell.impactEffectId = live.impactEffectId;
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
      if (id && byId.has(id)) applyRemote(byId.get(id), remote);
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
  if (spell.kind === 'nova' || spell.kind === 'zone') return { variant: 'aoe', sec: spell.telegraphSec || 1.1 };
  if (spell.kind === 'projectile' || spell.kind === 'beam' || spell.kind === 'fissure') {
    return { variant: 'incoming', sec: spell.telegraphSec || 0.7 };
  }
  return { variant: 'cone', sec: Math.max(0.35, spell.telegraphSec || 0.42) };
}
