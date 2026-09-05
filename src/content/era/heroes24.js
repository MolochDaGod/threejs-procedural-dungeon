/**
 * Lore roster: 6 races × 4 classes = 24, plus 3 pirate faces.
 * Play mesh stays Toon {race}.glb. Portraits are 2D chrome only.
 */
const CDN_FACE = 'https://client.grudge-studio.com/images/portraits';
const LORE_FACE = 'https://grudge-heros.puter.site/media/heroes/portraits';

const CLASS_FILE = {
  warrior: 'warrior', raider: 'warrior',
  mage: 'mage', priest: 'mage',
  ranger: 'ranger', thief: 'ranger',
  worge: 'worg', verduror: 'worg',
};

const SPEC_LORE = {
  'human-priest': { name: 'Sister Calia Vellum', title: 'The Atoning Light' },
  'human-raider': { name: 'Hrolf Two-Hands', title: 'The Parry King' },
  'human-thief': { name: 'Nix Goldhook', title: 'The Harbor Cut' },
  'human-verduror': { name: 'Ilya Mistreed', title: 'The Jade Channel' },
  'elf-priest': { name: 'Saelith Dawnward', title: 'The Disciple' },
  'elf-verduror': { name: 'Nimue Craneveil', title: 'The Mist Weaver' },
  'orc-raider': { name: "Grom'kar Skullsplitter", title: 'The Two-Hand' },
  'orc-thief': { name: 'Rokka Coinblade', title: 'The Outlaw' },
};

const LORE = {
  'human-warrior': { name: 'Sir Aldric Valorheart', title: 'The Iron Bastion' },
  'human-worge': { name: 'Gareth Moonshadow', title: 'The Twilight Stalker' },
  'human-mage': { name: 'Archmage Elara Brightspire', title: 'The Storm Caller' },
  'human-ranger': { name: 'Kael Shadowblade', title: 'The Shadow Blade' },
  'barbarian-warrior': { name: 'Ulfgar Bonecrusher', title: 'The Mountain Breaker' },
  'barbarian-worge': { name: 'Hrothgar Fangborn', title: 'The Beast of the North' },
  'barbarian-mage': { name: 'Volka Stormborn', title: 'The Frost Witch' },
  'barbarian-ranger': { name: 'Svala Windrider', title: 'The Silent Huntress' },
  'dwarf-warrior': { name: 'Thane Ironshield', title: 'The Mountain Guardian' },
  'dwarf-worge': { name: 'Bromm Earthshaker', title: 'The Cavern Beast' },
  'dwarf-mage': { name: 'Runa Forgekeeper', title: 'The Runesmith' },
  'dwarf-ranger': { name: 'Durin Tunnelwatcher', title: 'The Deep Scout' },
  'elf-warrior': { name: 'Thalion Bladedancer', title: 'The Graceful Death' },
  'elf-worge': { name: 'Sylara Wildheart', title: 'The Forest Spirit' },
  'elf-mage': { name: 'Lyra Stormweaver', title: 'The Storm Weaver' },
  'elf-ranger': { name: 'Aelindra Swiftbow', title: 'The Wind Walker' },
  'orc-warrior': { name: 'Grommash Ironjaw', title: 'The Warchief' },
  'orc-worge': { name: 'Fenris Bloodfang', title: 'The Alpha' },
  'orc-mage': { name: "Zul'jin the Hexmaster", title: 'The Blood Shaman' },
  'orc-ranger': { name: 'Razak Deadeye', title: 'The Trophy Hunter' },
  'undead-warrior': { name: 'Lord Malachar', title: 'The Deathless Knight' },
  'undead-worge': { name: 'The Ghoulfather', title: 'The Abomination' },
  'undead-mage': { name: 'Necromancer Vexis', title: 'The Soul Harvester' },
  'undead-ranger': { name: 'Shade Whisper', title: 'The Phantom Archer' },
};

export const HERO_24 = ['human', 'barbarian', 'elf', 'dwarf', 'orc', 'undead'].flatMap((race) =>
  ['warrior', 'mage', 'ranger', 'worge'].map((cls) => {
    const id = `${race}-${cls}`;
    const lore = LORE[id] || { name: `${race} ${cls}`, title: '' };
    return {
      id,
      race,
      classId: cls,
      name: lore.name,
      title: lore.title,
      portrait: `${LORE_FACE}/${race}_${CLASS_FILE[cls]}.png`,
      portraitFallback: `${CDN_FACE}/${race}.png`,
    };
  }),
);

export const PIRATE_FACES = [
  {
    id: 'racalvin',
    label: 'Racalvin the Pirate King',
    title: 'The Scourge of the Seven Seas',
    race: 'barbarian',
    classId: 'ranger',
    portrait: `${LORE_FACE}/pirate_king.png`,
    portraitFallback: `${CDN_FACE}/barbarian.png`,
  },
  {
    id: 'john-wayne',
    label: 'Cpt. John Wayne',
    title: 'The Sky Captain',
    race: 'human',
    classId: 'warrior',
    portrait: `${LORE_FACE}/sky_captain.png`,
    portraitFallback: `${CDN_FACE}/human.png`,
  },
  {
    id: 'scoujge-faithbear',
    label: 'Scoujge Faithbear',
    title: 'The Faithbear',
    race: 'human',
    classId: 'mage',
    portrait: `${LORE_FACE}/scoujge_faithbear.png`,
    portraitFallback: `${CDN_FACE}/human.png`,
  },
];

export function heroOf(raceId, classId) {
  const specId = `${raceId}-${classId}`;
  if (SPEC_LORE[specId]) {
    const file = CLASS_FILE[classId] || classId;
    return {
      id: specId,
      race: raceId,
      classId,
      name: SPEC_LORE[specId].name,
      title: SPEC_LORE[specId].title,
      portrait: `${LORE_FACE}/${raceId}_${file}.png`,
      portraitFallback: `${CDN_FACE}/${raceId}.png`,
    };
  }
  const familyFile = CLASS_FILE[classId];
  return HERO_24.find((h) => h.race === raceId && h.classId === classId)
    || HERO_24.find((h) => h.race === raceId && CLASS_FILE[h.classId] === familyFile)
    || PIRATE_FACES.find((h) => h.race === raceId && h.classId === classId)
    || null;
}

export function portraitUrl(raceId, classId) {
  if (classId) {
    const h = heroOf(raceId, classId);
    if (h?.portrait) return h.portrait;
    const file = CLASS_FILE[classId] || classId;
    return `${LORE_FACE}/${raceId || 'human'}_${file}.png`;
  }
  return `${CDN_FACE}/${raceId || 'human'}.png`;
}

export function portraitFallback(raceId) {
  return `${CDN_FACE}/${raceId || 'human'}.png`;
}
