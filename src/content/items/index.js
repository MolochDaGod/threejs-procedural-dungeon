/**
 * Dungeon items — shrine, chests, Worge weapon stances.
 * Not a second bag DB. Shrine is once-per-room; chests are treasure-room props.
 */
export const ITEMS = {
  shrine: { id: 'shrine', kind: 'shrine', use: 'KeyE', once: true, restoreHp: true, restoreMana: true },
  chest_common: { id: 'chest_common', kind: 'chest', rarity: 'common', mesh: 'kaykit_chest_common' },
  chest_rare: { id: 'chest_rare', kind: 'chest', rarity: 'rare', mesh: 'kaykit_chest_rare' },
};

export const WORGE_WEAPONS = {
  tome:   { id: 'tome',   label: '1H+TOME', slots: ['cleave', 'holy_nova', 'thunder', 'fireball', 'frostlance', 'void_dash'] },
  nature: { id: 'nature', label: 'NATURE',  slots: ['holy_nova', 'frostlance', 'cleave', 'void_dash', 'thunder', 'fireball'] },
  arcane: { id: 'arcane', label: 'ARCANE',  slots: ['thunder', 'fireball', 'frostlance', 'holy_nova', 'void_dash', 'cleave'] },
};
