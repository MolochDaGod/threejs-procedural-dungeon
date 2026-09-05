/**
 * Mechanic compiler — isomorphic.
 * Seeded dungeon document → colliders + layers + encounters + ruleset stamps.
 * Browser play and /api/mechanic share this. No LLM, no second generator.
 */
import { buildColliderAssets } from '../physics/colliders.js';
import { ENV_LAYERS, PHYSICS_LAYERS } from '../env/layers.js';
import { DUNGEON_RULESET, RULESET_VERSION, isGatedRoom, poolRule, roomRule } from '../ruleset.js';
import { planEncounters, critRooms } from '../play/encounters.js';
import { biomeOf } from '../ssot.js';
import { compileDressPlan, dressSummary } from '../gen/dressPlan.js';
import { CUSTOM_GRUDGE_KINDS } from '../gen/customGrudge.js';

export { RULESET_VERSION };

function asArray(x) {
  if (!x) return x;
  if (Array.isArray(x)) return x;
  return Array.from(x);
}

/** Revive JSON-posted typed arrays so greedy merge still works. */
export function hydrateDungeon(raw) {
  if (!raw) return raw;
  const d = { ...raw };
  if (d.grid && !(d.grid instanceof Uint8Array)) d.grid = Uint8Array.from(d.grid);
  if (d.doorway && !(d.doorway instanceof Uint8Array) && !(d.doorway instanceof Uint8ClampedArray)) {
    d.doorway = Uint8Array.from(d.doorway);
  }
  if (d.roomId && !(d.roomId instanceof Int16Array)) d.roomId = Int16Array.from(d.roomId);
  if (d.corridor && !(d.corridor instanceof Uint8Array)) d.corridor = Uint8Array.from(d.corridor);
  if (d.flags && !(d.flags instanceof Uint16Array)) d.flags = Uint16Array.from(d.flags);
  if (d.barrierStage && !(d.barrierStage instanceof Uint8Array)) d.barrierStage = Uint8Array.from(d.barrierStage);
  if (d.cellRole && !(d.cellRole instanceof Uint8Array)) d.cellRole = Uint8Array.from(d.cellRole);
  return d;
}

export function serializeDungeon(d) {
  if (!d) return null;
  return {
    valid: d.valid,
    seed: d.seed,
    name: d.name,
    W: d.W,
    H: d.H,
    params: d.params,
    entrance: d.entrance,
    boss: d.boss,
    maxDepth: d.maxDepth,
    rooms: d.rooms,
    edges: d.edges,
    grid: asArray(d.grid),
    roomId: asArray(d.roomId),
    doorway: asArray(d.doorway),
    corridor: asArray(d.corridor),
    flags: asArray(d.flags),
    cellRole: asArray(d.cellRole),
    platforms: d.platforms || [],
    eventRoom: d.eventRoom || null,
    stats: d.stats,
  };
}

function stampMechanics(dungeon, colliders) {
  const theme = dungeon.params?.themeKey || 'ancient';
  const pool = poolRule(theme);
  const stamps = [];
  const rooms = dungeon.rooms || [];
  for (const r of rooms) {
    const rule = roomRule(r.type);
    if (rule.gated) {
      stamps.push({
        id: `mech-gate-${r.id}`,
        mechanic: 'clear_gate',
        roomId: r.id,
        roomType: r.type,
        deeperOnly: true,
      });
    }
    if (rule.spawn) {
      stamps.push({
        id: `mech-awaken-${r.id}`,
        mechanic: 'awaken_on_enter',
        roomId: r.id,
        roomType: r.type,
      });
    }
    if (rule.barriers) {
      stamps.push({
        id: `mech-barrier-${r.id}`,
        mechanic: 'barrier_layer',
        roomId: r.id,
        roomType: r.type,
      });
    }
    if (rule.shrine) {
      stamps.push({
        id: `mech-shrine-${r.id}`,
        mechanic: 'shrine_once',
        roomId: r.id,
        key: DUNGEON_RULESET.shrine.key,
      });
    }
    if (rule.phases) {
      stamps.push({
        id: `mech-boss-${r.id}`,
        mechanic: 'boss_phases',
        roomId: r.id,
        at: rule.phases,
      });
    }
  }
  const water = (colliders || []).filter((n) => n.kind === 'pool');
  if (water.length) {
    stamps.push({
      id: 'mech-pool-hazard',
      mechanic: 'pool_hazard',
      theme,
      dps: pool.dps,
      slow: pool.slow,
      solid: pool.solid,
      label: pool.label,
      volumes: water.length,
    });
  }
  stamps.push({
    id: 'mech-telegraph',
    mechanic: 'telegraph_all',
    banInstant: true,
  });
  return stamps;
}

/**
 * @param {object} dungeon generateDungeon result
 * @param {{ linear?: boolean }} [opts]
 */
export function compileMechanics(dungeon, opts = {}) {
  const d = hydrateDungeon(dungeon);
  if (!d?.valid) {
    return {
      schema: 'grudge.dungeon.mechanics/v1',
      version: RULESET_VERSION,
      ok: false,
      error: 'dungeon not valid',
    };
  }
  const linear = opts.linear !== false;
  const colliders = buildColliderAssets(d);
  const { biome, plan } = planEncounters(d, { linear });
  const path = critRooms(d).map((r) => ({ id: r.id, type: r.type, depth: r.depth }));
  const stamps = stampMechanics(d, colliders);
  const dress = compileDressPlan(d);
  const gated = (d.rooms || []).filter(isGatedRoom).map((r) => r.id);
  const counts = {
    colliders: colliders.length,
    walls: colliders.filter((n) => n.kind === 'wall').length,
    voids: colliders.filter((n) => n.kind === 'void_shell').length,
    floors: colliders.filter((n) => n.kind === 'floor').length,
    pools: colliders.filter((n) => n.kind === 'pool').length,
    doors: colliders.filter((n) => n.kind === 'doorway').length,
    rooms: colliders.filter((n) => n.kind === 'room').length,
    encounters: plan.length,
    stamps: stamps.length,
    dress: dress.length,
  };
  return {
    schema: 'grudge.dungeon.mechanics/v1',
    version: RULESET_VERSION,
    ok: true,
    seed: d.seed,
    theme: d.params?.themeKey || null,
    linear,
    biome,
    path,
    gatedRooms: gated,
    colliders,
    layers: {
      physics: PHYSICS_LAYERS,
      env: Object.keys(ENV_LAYERS),
    },
    encounters: plan.map((j) => ({
      roomId: j.room.id,
      roomType: j.room.type,
      name: j.name,
      kind: j.kind,
      role: j.role,
      hp: j.hp,
      attacks: j.attacks,
    })),
    stamps,
    dress,
    dressSummary: dressSummary(dress),
    ruleset: DUNGEON_RULESET.version,
    counts,
    rapier: colliders.filter((n) => n.solid || n.sensor).map((n) => ({
      id: n.id,
      body: 'fixed',
      shape: 'cuboid',
      hx: n.collider.params[0],
      hy: n.collider.params[1],
      hz: n.collider.params[2],
      translation: n.position,
      sensor: !!n.sensor,
      layer: n.physicsLayer,
    })),
  };
}

/**
 * AI / Node script document — events, bosses, terrain stamps the play runtime executes.
 * Same seed + dungeon document ⇒ same script. No LLM in this path.
 */
export function compileDungeonScript(dungeon, opts = {}) {
  const mechanics = compileMechanics(dungeon, opts);
  if (!mechanics.ok) {
    return {
      schema: 'grudge.dungeon.script/v1',
      version: RULESET_VERSION,
      ok: false,
      error: mechanics.error || 'compile failed',
    };
  }
  const d = hydrateDungeon(dungeon);
  const kindId = opts.kindId && CUSTOM_GRUDGE_KINDS[opts.kindId] ? opts.kindId : 'instance';
  const kind = CUSTOM_GRUDGE_KINDS[kindId];
  const events = (mechanics.stamps || []).map((s) => ({
    id: s.id,
    when: s.mechanic === 'awaken_on_enter' ? 'enter_room'
      : s.mechanic === 'clear_gate' ? 'room_cleared'
      : s.mechanic === 'boss_phases' ? 'boss_hp'
      : s.mechanic === 'shrine_once' ? 'interact'
      : s.mechanic === 'pool_hazard' ? 'overlap_water'
      : s.mechanic === 'barrier_layer' ? 'room_stamp'
      : s.mechanic === 'telegraph_all' ? 'enemy_cast'
      : s.mechanic,
    do: s.mechanic,
    roomId: s.roomId ?? null,
    roomType: s.roomType ?? null,
    at: s.at || null,
    theme: s.theme || null,
    dps: s.dps,
    slow: s.slow,
  }));
  if (d.eventRoom) {
    events.push({
      id: 'script-event-platform',
      when: 'enter_room',
      do: 'event_platforms',
      roomId: d.eventRoom.roomId ?? d.eventRoom.room?.id ?? null,
      roomType: 'event',
      pads: d.eventRoom.sockets || null,
    });
  }
  const bosses = (mechanics.encounters || [])
    .filter((e) => e.kind === 'boss')
    .map((e) => ({
      roomId: e.roomId,
      name: e.name,
      hp: e.hp,
      phases: roomRule('boss').phases || [0.66, 0.33],
      brain: 'warlord',
      telegraph: 'aoe',
    }));
  return {
    schema: 'grudge.dungeon.script/v1',
    version: RULESET_VERSION,
    ok: true,
    seed: d.seed,
    theme: d.params?.themeKey || null,
    linear: mechanics.linear,
    kind: kindId,
    pass: kind.pass,
    completeOn: kind.pass === 'dungeon-complete' ? 'boss-slain' : kind.pass,
    path: mechanics.path,
    gatedRooms: mechanics.gatedRooms,
    events,
    bosses,
    terrain: {
      platforms: d.platforms || [],
      eventRoom: d.eventRoom || null,
      pools: mechanics.counts?.pools || 0,
      barriers: (mechanics.stamps || []).filter((s) => s.mechanic === 'barrier_layer').length,
    },
    encounters: mechanics.encounters,
    ruleset: DUNGEON_RULESET.version,
  };
}
