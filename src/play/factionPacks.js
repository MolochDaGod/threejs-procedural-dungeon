/**
 * Faction dungeon packs — AI players on the same class/weapon/sheet math.
 * Level = player level (WoW merge). Flat nerf vs equal-level hero.
 * Pack sizes 2 / 3 / 5 / 6 with group roles. Boss = 1.8× faction hero.
 */
import { CLASS_IDS, PLAY, biomeOf, creatureOf, enemyFactionRaces, loadoutFor, weaponsForClass } from '../ssot.js';

/** Flat rate vs equal-level player (WoW dungeon trash). */
export const FACTION_NERF = {
  trash: 0.62,
  elite: 0.72,
  boss: 0.88,
  speed: 0.86,
};

export const PACK_COMPS = {
  2: ['warrior', 'ranger'],
  3: ['warrior', 'priest', 'mage'],
  5: ['warrior', 'priest', 'ranger', 'mage', 'thief'],
  6: ['warrior', 'priest', 'ranger', 'mage', 'raider', 'thief'],
};

export const PACK_ROLE = {
  warrior: 'tank',
  raider: 'melee',
  priest: 'heal',
  verduror: 'heal',
  mage: 'cast',
  ranger: 'kite',
  thief: 'peel',
  worge: 'flex',
};

export function packSizeForRoom(r) {
  if (r.type === 'elite' || r.miniboss) return r.depth >= 3 ? 6 : 5;
  if (r.depth >= 3) return 3;
  return 2;
}

export function nerfSheet(sheet, mul) {
  if (!sheet) return sheet;
  return {
    ...sheet,
    hpMax: Math.max(24, Math.round(sheet.hpMax * mul)),
    manaMax: Math.max(20, Math.round((sheet.manaMax || PLAY.mana) * mul)),
    staminaMax: Math.max(20, Math.round((sheet.staminaMax || PLAY.stamina) * mul)),
    damage: (sheet.damage || 12) * mul,
    defense: (sheet.defense || 8) * mul,
  };
}

export function factionUnit({
  room, raceId, classId, index, packId, packSize, level, elite = false, boss = false,
}) {
  const cid = CLASS_IDS.includes(classId) ? classId : 'warrior';
  const weaponId = weaponsForClass(cid)[0];
  const loadout = loadoutFor(cid, weaponId);
  const scale = boss ? 1.8 : 1;
  const nerf = boss ? FACTION_NERF.boss : elite ? FACTION_NERF.elite : FACTION_NERF.trash;
  return {
    room,
    name: boss ? `${raceId} warlord` : `${raceId} ${cid}`,
    id: boss ? `faction-boss-${raceId}` : `faction-${packId}-${index}`,
    kind: boss ? 'boss' : elite ? 'miniboss' : 'grunt',
    role: cid,
    classId: cid,
    raceId,
    weaponId,
    loadout,
    packId,
    packSize,
    packRole: boss ? 'boss' : (PACK_ROLE[cid] || 'melee'),
    aiPlayer: true,
    level,
    nerf,
    height: PLAY.playerHeight * scale,
    scale,
    hp: null,
    radius: 0.38 * scale,
    speed: PLAY.walkSpeed * FACTION_NERF.speed * (boss ? 0.9 : 1),
    attacks: loadout.map((s) => s.id),
    clips: 'toon',
    brain: PACK_ROLE[cid] === 'kite' || PACK_ROLE[cid] === 'cast' ? 'kite' : 'pursue',
    telegraph: PACK_ROLE[cid] === 'cast' ? 'incoming' : PACK_ROLE[cid] === 'heal' ? 'aoe' : 'cone',
    phase: !!boss,
    boss: !!boss,
    equipped: true,
  };
}

export function planFactionPacks(dungeon, { playerRace = 'human', level = PLAY.level, linear = true } = {}) {
  const rooms = linear
    ? (dungeon.rooms || []).filter((r) => r.type !== 'entrance')
    : dungeon.rooms || [];
  const races = enemyFactionRaces(playerRace);
  const biome = biomeOf(dungeon.params?.themeKey);
  const plan = [];
  let packSeq = 0;

  for (const r of rooms) {
    if (r.type === 'treasure' || r.type === 'shrine' || r.type === 'vendor') continue;
    if (r.type === 'boss') {
      plan.push(factionUnit({
        room: r,
        raceId: races[0],
        classId: 'warrior',
        index: 0,
        packId: `boss-${r.id}`,
        packSize: 1,
        level,
        boss: true,
      }));
      const pet = creatureOf(biome?.elites?.[0] || biome?.boss);
      if (pet) {
        plan.push({
          room: r,
          name: pet.label,
          id: `${pet.id}-add`,
          kind: 'miniboss',
          role: pet.role,
          height: pet.height,
          hp: Math.round((pet.hp || 160) * FACTION_NERF.elite),
          radius: pet.radius,
          speed: pet.speed,
          attacks: pet.attacks,
          meshUrl: pet.mesh,
          clips: 'native',
          hide: pet.hide,
          keep: pet.keep,
          brain: pet.brain,
          telegraph: pet.telegraph,
          packId: `boss-${r.id}`,
          animal: true,
        });
      }
      continue;
    }

    const size = packSizeForRoom(r);
    const comp = PACK_COMPS[size] || PACK_COMPS[3];
    const packId = `pack-${r.id}-${packSeq++}`;
    const elite = r.type === 'elite' || r.miniboss;
    for (let i = 0; i < comp.length; i++) {
      const animal = !elite && i === comp.length - 1 && (r.id + i) % 5 === 0;
      if (animal) {
        const name = (biome?.grunts || [])[(r.id + i) % Math.max(1, (biome.grunts || []).length)];
        const cr = creatureOf(name);
        if (cr) {
          plan.push({
            room: r,
            name: cr.label,
            id: `${packId}-beast`,
            kind: 'grunt',
            role: cr.role,
            height: cr.height,
            hp: Math.round((cr.hp || 52) * FACTION_NERF.trash),
            radius: cr.radius,
            speed: cr.speed,
            attacks: cr.attacks,
            meshUrl: cr.mesh,
            clips: 'native',
            hide: cr.hide,
            keep: cr.keep,
            brain: cr.brain,
            telegraph: cr.telegraph,
            packId,
            packSize: size,
            animal: true,
          });
          continue;
        }
      }
      plan.push(factionUnit({
        room: r,
        raceId: races[i % races.length],
        classId: comp[i],
        index: i,
        packId,
        packSize: size,
        level,
        elite: elite && i === 0,
      }));
    }
  }
  return plan;
}

export function packMates(enemies, packId) {
  return (enemies || []).filter((e) => e.alive && e.packId === packId);
}

/**
 * Hostile AI player — same 6-slot catalog as the player, threat/pack assist.
 */
export function tickFactionUnit(e, dt, session) {
  if (!e.aiPlayer || !e.alive) return false;
  e.casting = Math.max(0, (e.casting || 0) - dt);
  e.hitCd = Math.max(0, (e.hitCd || 0) - dt);
  if (!e.cds) {
    e.cds = {};
    for (const s of e.loadout || []) e.cds[s.id] = 0;
  }
  for (const id of Object.keys(e.cds)) e.cds[id] = Math.max(0, e.cds[id] - dt);
  if (e.wind > 0) return true;

  const pack = packMates(session.enemies, e.packId);
  const target = session.pos;
  const dist = e.pos.distanceTo(target);
  const hold = e.packRole === 'tank' ? 2.1 : e.packRole === 'heal' ? 6.4 : e.packRole === 'kite' ? 8.2 : 3.2;
  const hurt = pack.length
    ? pack.reduce((s, m) => s + m.hp, 0) / pack.reduce((s, m) => s + m.hpMax, 0)
    : 1;

  const ready = (e.loadout || []).filter((s) => (e.cds[s.id] || 0) <= 0);
  let spell = null;
  if (e.packRole === 'heal' && hurt < 0.72) {
    spell = ready.find((s) => s.heal > 0) || ready.find((s) => s.kind === 'nova');
  }
  if (!spell && dist <= hold + 1.5) {
    spell = ready.find((s) => (s.kind === 'slash' && dist < 3.4) || (s.kind !== 'slash' && dist <= (s.range || 8)))
      || ready[0];
  }
  if (!spell || e.hitCd > 0) return true;
  e.cds[spell.id] = spell.cd || 1.4;
  e.hitCd = (spell.cd || 1.4) * 0.45;
  session.beginFactionCast?.(e, spell, target);
  return true;
}
