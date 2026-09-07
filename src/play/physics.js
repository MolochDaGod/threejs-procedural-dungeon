/**
 * Rapier world for a generated dungeon grid.
 * Fleet SSOT: @dimforge/rapier3d-compat ^0.19.3, fixed 1/60, SI meters,
 * kinematic CCT, cuboid proxies (never visual-mesh collision).
 *
 * Optional: if WASM fails to load, callers keep using grid walkable().
 */
import { worldOf } from '../gen/cells.js';
import { buildColliderAssets } from '../physics/colliders.js';

export const RAPIER_PKG = '@dimforge/rapier3d-compat';
export const RAPIER_FIXED_DT = 1 / 60;
export const RAPIER_GRAVITY_Y = -30;
export const CCT_RADIUS = 0.32;
export const CCT_HALF = 0.55;
export const CCT_OFFSET = 0.01;

export async function createDungeonPhysics(dungeon) {
  let RAPIER;
  try {
    RAPIER = (await import('@dimforge/rapier3d-compat')).default;
    await RAPIER.init();
  } catch (err) {
    console.warn('[dungeon-physics] Rapier unavailable, grid nav only', err?.message || err);
    return null;
  }

  try {
  const world = new RAPIER.World({ x: 0, y: RAPIER_GRAVITY_Y, z: 0 });
  const nodes = buildColliderAssets(dungeon);
  const barrierByCell = new Map();

  for (const n of nodes) {
    if (n.collider?.kind !== 'box') continue;
    const walk = n.kind === 'floor' || n.kind === 'platform' || n.walk;
    const wallish = n.kind === 'wall' || n.kind === 'void_shell' || n.kind === 'cover';
    if (!walk && !wallish && !n.sensor) continue;
    const [hx, hy, hz] = n.collider.params;
    const [x, y, z] = n.position;
    if (![hx, hy, hz, x, y, z].every((v) => Number.isFinite(v))) continue;
    const desc = RAPIER.ColliderDesc.cuboid(hx, hy, hz)
      .setTranslation(x, y, z)
      .setFriction(n.bounce ? 0.2 : 0.9)
      .setRestitution(n.restitution || (n.bounce ? 1.15 : 0));
    if (n.sensor) desc.setSensor(true);
    const col = world.createCollider(desc);
    if (n.breakable && n.cellI != null) barrierByCell.set(n.cellI, col);
  }

  const controller = world.createCharacterController(CCT_OFFSET);
  controller.setUp({ x: 0, y: 1, z: 0 });
  controller.setMaxSlopeClimbAngle((45 * Math.PI) / 180);
  controller.setMinSlopeSlideAngle((30 * Math.PI) / 180);
  controller.enableAutostep(0.5, 0.2, true);
  controller.enableSnapToGround(0.5);
  controller.setApplyImpulsesToDynamicBodies(true);

  const ent = dungeon.rooms?.[dungeon.entrance];
  const start = worldOf(dungeon, ent?.cx ?? dungeon.W / 2, ent?.cy ?? dungeon.H / 2);
  const sx = Number.isFinite(start.x) ? start.x : 0;
  const sz = Number.isFinite(start.z) ? start.z : 0;
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      sx,
      CCT_RADIUS + CCT_HALF,
      sz,
    ),
  );
  const capsule = world.createCollider(RAPIER.ColliderDesc.capsule(CCT_HALF, CCT_RADIUS), body);

  return {
    RAPIER,
    world,
    controller,
    body,
    capsule,
    walls: nodes.filter((n) => n.kind === 'wall').length,
    barriers: barrierByCell,
    acc: 0,
    vy: 0,
  };
  } catch (err) {
    console.warn('[dungeon-physics] world setup failed, grid nav only', err?.message || err);
    return null;
  }
}

export function stepDungeonPhysics(phys, wishX, wishZ, dt, jumpPressed = false) {
  if (!phys) return null;
  phys.acc += Math.min(dt, 0.1);
  let guard = 0;
  const out = { x: 0, y: 0, z: 0, grounded: false };
  while (phys.acc >= RAPIER_FIXED_DT && guard++ < 8) {
    if (jumpPressed && phys.controller.computedGrounded()) phys.vy = 8.2;
    phys.vy += RAPIER_GRAVITY_Y * RAPIER_FIXED_DT;
    const desired = {
      x: wishX * RAPIER_FIXED_DT,
      y: phys.vy * RAPIER_FIXED_DT,
      z: wishZ * RAPIER_FIXED_DT,
    };
    phys.controller.computeColliderMovement(phys.capsule, desired);
    const mv = phys.controller.computedMovement();
    const t = phys.body.translation();
    phys.body.setNextKinematicTranslation({
      x: t.x + mv.x,
      y: t.y + mv.y,
      z: t.z + mv.z,
    });
    if (phys.controller.computedGrounded()) phys.vy = 0;
    phys.world.step();
    phys.acc -= RAPIER_FIXED_DT;
  }
  const t = phys.body.translation();
  out.x = t.x;
  out.y = t.y - CCT_RADIUS - CCT_HALF;
  out.z = t.z;
  out.grounded = phys.controller.computedGrounded();
  return out;
}

export function setPhysicsFeet(phys, x, z) {
  if (!phys) return;
  const t = phys.body.translation();
  phys.body.setNextKinematicTranslation({
    x,
    y: t.y,
    z,
  });
}

export function dropBarrierCollider(phys, cellI) {
  if (!phys?.barriers) return false;
  const col = phys.barriers.get(cellI);
  if (!col) return false;
  try {
    phys.world.removeCollider(col, true);
  } catch {
    /* already gone */
  }
  phys.barriers.delete(cellI);
  return true;
}

export function disposeDungeonPhysics(phys) {
  if (!phys) return;
  phys.barriers?.clear();
  phys.world.free();
}
