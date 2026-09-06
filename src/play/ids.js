/**
 * Fleet id law (grudge-production-wiring) — classify only, no second DB.
 * Account GRUDGE_… ≠ hero GRDG-… ≠ characters.id UUID ≠ catalog ITEM-… ≠ session ent_
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function classifyId(raw) {
  const s = String(raw || '').trim();
  if (!s) return { kind: 'empty', value: '' };
  if (UUID_RE.test(s)) return { kind: 'characterUuid', value: s.toLowerCase() };
  if (/^GRUDGE_/i.test(s)) return { kind: 'grudgeId', value: s };
  if (/^GRDG-/i.test(s)) return { kind: 'grudgeCode', value: s };
  if (/^ITEM-/i.test(s)) return { kind: 'catalogPrefab', value: s };
  if (/^ent_/i.test(s)) return { kind: 'sessionEnt', value: s };
  return { kind: 'catalogSlug', value: s };
}

/** Play handoff PK — Railway characters.id only. */
export function playCharacterId(raw) {
  const c = classifyId(raw);
  return c.kind === 'characterUuid' ? c.value : null;
}

export function isCatalogPrefabId(raw) {
  return classifyId(raw).kind === 'catalogPrefab';
}
