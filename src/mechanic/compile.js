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
