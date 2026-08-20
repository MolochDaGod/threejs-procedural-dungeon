/**
 * Encounter plan. kind = biome | faction | boss.
 * Attacks always telegraph (cone / linear-incoming / aoe). One generator.
 */
import {
  AGGRO, ENEMY_ATTACKS, PLAY, ROLE_ATTACKS, biomeOf,
  enemyFactionRaces, creatureOf,
} from '../ssot.js';

function unitFromName(name, room, fallbackKind) {
  const cr = creatureOf(name);
  if (cr) {
    return {
      room,
      name: cr.label,
      id: cr.id,
      kind: cr.kind === 'miniboss' ? 'miniboss' : cr.kind,
      role: cr.role,
      height: cr.height,
      hp: cr.hp,
      radius: cr.radius,
      speed: cr.speed,
      attacks: cr.attacks,
      meshUrl: cr.mesh,
      clips: 'native',
      hide: cr.hide,
      keep: cr.keep,
      brain: cr.brain,
      telegraph: cr.telegraph,
    };
  }
  const caster = fallbackKind === 'caster' || /bow|bolt|hunter|mage|shaman|chanter|runecaster|spore/i.test(name);
  const elite = fallbackKind === 'miniboss' || fallbackKind === 'elite';
  return {
    room,
    name,
    id: name,
    kind: elite ? 'miniboss' : caster ? 'caster' : 'grunt',
    role: caster ? 'mage' : 'warrior',
    height: elite ? PLAY.minibossHeight : PLAY.enemyHeight,
    hp: elite ? 168 : caster ? 44 : 52,
    radius: elite ? 0.58 : 0.42,
    speed: caster ? 2.5 : elite ? 2.6 : 3.2,
    attacks: elite ? ROLE_ATTACKS.miniboss : caster ? ROLE_ATTACKS.caster : ROLE_ATTACKS.grunt,
    clips: 'toon',
    brain: caster ? 'kite' : 'pursue',
    telegraph: caster ? 'incoming' : 'cone',
  };
}

export function planEncounters(dungeon, { linear = true, kind = 'biome', playerRace = 'human' } = {}) {
  const biome = biomeOf(dungeon.params.themeKey);
  const rooms = linear ? critRooms(dungeon) : dungeon.rooms;
  const plan = [];
  const k = kind || dungeon.params?.kind || 'biome';

  const pushBoss = (r) => {
    const cr = creatureOf(biome.boss);
    if (k === 'faction') {
      const races = enemyFactionRaces(playerRace);
      plan.push({
        room: r,
        name: `${races[0]} warlord`,
        id: 'faction-warlord',
        kind: 'boss',
        role: 'mage',
        raceId: races[0],
        height: PLAY.playerHeight * 1.5 * 1.2,
        hp: 480,
        radius: 0.9,
        speed: 2.0,
        attacks: ROLE_ATTACKS.boss,
        clips: 'toon',
        brain: 'pursue',
        telegraph: 'aoe',
        phase: true,
        scale: 1.5,
      });
      return;
    }
    if (cr) {
      plan.push({ ...unitFromName(biome.boss, r, 'boss'), kind: 'boss', phase: true, height: Math.max(cr.height, PLAY.bossHeight), hp: 420 });
      return;
    }
    plan.push({
      room: r,
      name: biome.boss,
      id: biome.boss,
      kind: 'boss',
      role: 'mage',
      height: PLAY.bossHeight,
      hp: 420,
      radius: 0.82,
      speed: 2.2,
      attacks: ROLE_ATTACKS.boss,
      clips: 'toon',
      brain: 'pursue',
      telegraph: 'aoe',
      phase: true,
    });
  };

  for (const r of rooms) {
    if (r.type === 'entrance' || r.type === 'treasure' || r.type === 'shrine') continue;
    if (r.type === 'boss') {
      pushBoss(r);
      continue;
    }
    if (k === 'boss') continue;

    if (k === 'faction') {
      const races = enemyFactionRaces(playerRace);
      const scale = 1.5;
      const n = r.type === 'elite' || r.miniboss ? 2 : (r.depth > 2 ? 3 : 2);
      for (let i = 0; i < n; i++) {
        const raceId = races[i % races.length];
        const elite = r.type === 'elite' || r.miniboss || i === 0;
        plan.push({
          room: r,
          name: `${raceId} ${elite ? 'champion' : 'raider'}`,
          id: `faction-${raceId}-${i}`,
          kind: elite ? 'miniboss' : 'grunt',
          role: i === n - 1 ? 'mage' : 'warrior',
          raceId,
          height: PLAY.playerHeight * scale * (elite ? 1.08 : 1),
          hp: elite ? 200 : 90,
          radius: 0.55 * scale,
          speed: 2.8,
          attacks: ROLE_ATTACKS.boss,
          clips: 'toon',
          brain: i === n - 1 ? 'kite' : 'pursue',
          telegraph: i === n - 1 ? 'incoming' : 'cone',
          scale,
        });
      }
      continue;
    }

    if (r.type === 'elite' || r.miniboss) {
      plan.push(unitFromName(pick(biome.elites, r.id), r, 'miniboss'));
      plan.push(unitFromName(pick(biome.grunts, r.id + 3), r, 'grunt'));
      continue;
    }
    const n = r.depth > 2 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const name = pick(biome.grunts, r.id * 7 + i);
      const caster = /bow|bolt|hunter|dino/i.test(name) || i === n - 1;
      plan.push(unitFromName(name, r, caster ? 'caster' : 'grunt'));
    }
  }
  return { biome, kind: k, plan };
}

function pick(arr, n) {
  if (!arr?.length) return 'foe';
  return arr[Math.abs(n) % arr.length];
}

export function critRooms(dungeon) {
  const rooms = dungeon.rooms;
  const adj = new Map();
  for (const e of dungeon.edges) {
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a).push(e.b);
    adj.get(e.b).push(e.a);
  }
  const path = [];
  let cur = dungeon.boss;
  const seen = new Set();
  while (cur != null && !seen.has(cur)) {
    seen.add(cur);
    path.push(rooms[cur]);
    if (cur === dungeon.entrance) break;
    const nbrs = adj.get(cur) || [];
    let best = null, bestD = Infinity;
    for (const n of nbrs) {
      if (seen.has(n)) continue;
      const r = rooms[n];
      if (r.depth < rooms[cur].depth && r.depth < bestD) {
        bestD = r.depth;
        best = n;
      }
    }
    if (best == null) break;
    cur = best;
  }
  path.reverse();
  if (!path.length) path.push(rooms[dungeon.entrance], rooms[dungeon.boss]);
  return path.filter(Boolean);
}

export function pickAttack(e) {
  const ids = e.attacks || ROLE_ATTACKS[e.kind] || ROLE_ATTACKS.grunt;
  if (e.kind === 'boss' && e.phase) {
    const hp = e.hp / e.hpMax;
    if (hp < 0.33) return ENEMY_ATTACKS[ids[(e.castI || 0) % ids.length]];
    if (hp < 0.66) {
      const mid = ids.filter((id) => id !== 'mist');
      return ENEMY_ATTACKS[mid[(e.castI || 0) % mid.length]];
    }
    return ENEMY_ATTACKS[['slash', 'linear', 'column'][(e.castI || 0) % 3]];
  }
  return ENEMY_ATTACKS[ids[(e.castI || 0) % ids.length]] || ENEMY_ATTACKS.swipe;
}

export function nextAttack(e) {
  e.castI = (e.castI || 0) + 1;
  return pickAttack(e);
}

export { AGGRO, ENEMY_ATTACKS };
