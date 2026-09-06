/**
 * Play-side dungeon script runtime.
 * Executes mechanic stamps (awaken, gates, boss phases, pool, event pads).
 * Complete rule is boss-slain — not “every spawned foe is dead”.
 * Node compile and this runtime share compileDungeonScript. Do not fork a second generator.
 */
import { cellOf } from '../gen/cells.js';
import { isGatedRoom, roomRule } from '../ruleset.js';
import { compileDungeonScript } from '../mechanic/compile.js';

export { compileDungeonScript };

export const COMPLETE_ON = 'boss-slain';
export const PASS_INSTANCE = 'dungeon-complete';

function roomIdAt(session, wx, wz) {
  const d = session.d;
  if (!d?.roomId) return -1;
  const c = cellOf(d, wx, wz);
  if (c.x < 0 || c.y < 0 || c.x >= d.W || c.y >= d.H) return -1;
  return d.roomId[c.y * d.W + c.x];
}

function livingInRoom(session, roomId) {
  return session.enemies.filter((e) => e.alive && e.room?.id === roomId);
}

export function createScriptRuntime(script) {
  return {
    script,
    awake: new Set(),
    cleared: new Set(),
    gatesOpen: new Set(),
    phasesFired: new Set(),
    complete: false,
    pass: null,
    lastRoom: -1,
    reported: false,
  };
}

export function bindScript(session, dungeon, opts = {}) {
  const script = opts.script || compileDungeonScript(dungeon, {
    linear: opts.linear !== false,
    kind: dungeon.params?.kind || 'biome',
    playerRace: opts.playerRace || session.raceId,
  });
  session.script = createScriptRuntime(script);
  session.mechanics = opts.mechanics || null;
  const entrance = dungeon.entrance;
  if (entrance != null) {
    session.script.awake.add(entrance);
    session.script.gatesOpen.add(entrance);
  }
  return session.script;
}

export function awakenRoom(session, roomId, { toastFn } = {}) {
  const rt = session.script;
  if (!rt || roomId < 0 || rt.awake.has(roomId)) return false;
  rt.awake.add(roomId);
  let n = 0;
  for (const e of session.enemies) {
    if (e.room?.id !== roomId) continue;
    e.asleep = false;
    n += 1;
  }
  toastFn?.(n ? `Hall ${roomId} awakens` : null);
  return true;
}

export function clearRoom(session, roomId, { toastFn } = {}) {
  const rt = session.script;
  if (!rt || roomId < 0 || rt.cleared.has(roomId)) return false;
  if (livingInRoom(session, roomId).length) return false;
  rt.cleared.add(roomId);
  rt.gatesOpen.add(roomId);
  toastFn?.('Path opens');
  return true;
}

export function tickScript(session, { toastFn, onPhase, onComplete } = {}) {
  const rt = session.script;
  if (!rt || rt.complete || !session.d) return rt;
  const rid = roomIdAt(session, session.pos.x, session.pos.z);
  if (rid >= 0 && rid !== rt.lastRoom) {
    rt.lastRoom = rid;
    const room = session.d.rooms?.[rid];
    if (room && roomRule(room.type).spawn) {
      awakenRoom(session, rid, { toastFn });
    }
  }
  if (rid >= 0) clearRoom(session, rid, { toastFn });

  const boss = session.enemies.find((e) => e.boss);
  if (boss?.alive && boss.hpMax > 0) {
    const frac = boss.hp / boss.hpMax;
    for (const at of rt.script.bossPhases || [0.66, 0.33]) {
      const key = String(at);
      if (frac <= at && !rt.phasesFired.has(key)) {
        rt.phasesFired.add(key);
        onPhase?.(boss, at);
      }
    }
  }

  if (session.phase !== 'crawl') return rt;

  const bosses = session.enemies.filter((e) => e.boss);
  if (!bosses.length) return rt;
  const bossDead = bosses.every((e) => !e.alive);
  if (!bossDead) return rt;

  const listed = (rt.script.path || []).filter((p) => p.type === 'combat' || p.type === 'elite' || p.type === 'boss');
  const roomsNeed = listed.length || 1;
  const roomsHave = listed.filter((p) => rt.cleared.has(p.id)).length;
  rt.roomsNeed = roomsNeed;
  rt.roomsHave = roomsHave;
  if (roomsHave < roomsNeed) {
    const bossRoom = session.d.boss;
    if (bossRoom != null) clearRoom(session, bossRoom, { toastFn });
    if (listed.filter((p) => rt.cleared.has(p.id)).length < roomsNeed) return rt;
  }

  const bossRoom = session.d.boss;
  if (bossRoom != null) clearRoom(session, bossRoom, { toastFn });
  rt.complete = true;
  rt.pass = rt.script.pass || PASS_INSTANCE;
  onComplete?.(rt);
  return rt;
}

/** Block walking into a gated room whose prior hall is not cleared. */
export function gateBlocks(session, wx, wz) {
  const rt = session.script;
  const d = session.d;
  if (!rt || !d?.rooms) return false;
  const dest = roomIdAt(session, wx, wz);
  if (dest < 0) return false;
  if (rt.gatesOpen.has(dest) || rt.cleared.has(dest) || rt.awake.has(dest)) return false;
  const room = d.rooms[dest];
  if (!isGatedRoom(room)) return false;
  const here = roomIdAt(session, session.pos.x, session.pos.z);
  if (here === dest) return false;
  if (here >= 0 && !rt.cleared.has(here) && isGatedRoom(d.rooms[here])) return true;
  if (room.type === 'boss' || room.type === 'elite' || room.type === 'event' || room.type === 'combat') {
    const prev = (rt.script.path || []).findIndex((p) => p.id === dest);
    if (prev > 0) {
      const before = rt.script.path[prev - 1];
      if (before && isGatedRoom(d.rooms[before.id]) && !rt.cleared.has(before.id)) return true;
    }
  }
  return false;
}

export function completionPayload(session, { win = true } = {}) {
  const d = session.d;
  const rt = session.script;
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  return {
    schema: 'grudge.dungeon.complete/v1',
    win: !!win,
    pass: win ? (rt?.pass || PASS_INSTANCE) : 'wipe',
    completeOn: COMPLETE_ON,
    seed: d?.seed ?? null,
    name: d?.name || null,
    theme: d?.params?.themeKey || null,
    instanceId: session.instance?.id || null,
    characterId: q.get('characterId') || session.characterId || null,
    era: q.get('era') || 'warlords',
    from: q.get('from') || '',
    classId: session.classId,
    raceId: session.raceId,
    host: 'grudge-dungeons',
  };
}

export function warlordsReturnUrl(payload) {
  const u = new URL('https://grudgewarlords.com/home');
  u.searchParams.set('era', payload.era || 'warlords');
  u.searchParams.set('from', 'dungeon');
  if (payload.win) u.searchParams.set('dungeonComplete', '1');
  else u.searchParams.set('dungeonWipe', '1');
  if (payload.characterId) u.searchParams.set('characterId', payload.characterId);
  if (payload.seed != null) u.searchParams.set('seed', String(payload.seed));
  if (payload.instanceId) u.searchParams.set('instanceId', payload.instanceId);
  if (payload.pass) u.searchParams.set('pass', payload.pass);
  if (payload.theme) u.searchParams.set('theme', payload.theme);
  return `${u.pathname}${u.search}`;
}
