/** Custom Grudge dungeon kinds — instance is the default crawl. */
export const CUSTOM_GRUDGE_KINDS = {
  instance: {
    id: 'instance',
    label: 'Dungeon instance',
    linear: true,
    pass: 'dungeon-complete',
  },
  faction: {
    id: 'faction',
    label: 'Faction halls',
    linear: true,
  },
  boss: {
    id: 'boss',
    label: 'Boss only',
    linear: true,
    pass: 'dungeon-complete',
  },
};

export function customGrudgeFromDungeon(dungeon, opts = {}) {
  return {
    schema: 'grudge.custom-grudge/v1',
    kind: opts.kind || 'instance',
    linear: opts.linear !== false,
    era: opts.era || 'warlords',
    seed: dungeon?.seed,
    theme: dungeon?.params?.themeKey,
    name: dungeon?.name,
    rooms: (dungeon?.rooms || []).map((r) => ({ id: r.id, type: r.type, depth: r.depth })),
  };
}

export function downloadCustomGrudge(doc) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `custom-grudge-${doc.seed || 'seed'}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
