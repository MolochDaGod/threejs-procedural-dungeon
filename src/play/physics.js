/**
 * Rapier world for a generated dungeon grid.
 * Fleet SSOT: @dimforge/rapier3d-compat ^0.19.3, fixed 1/60, SI meters,
 * kinematic CCT, cuboid proxies (never visual-mesh collision).
 *
 * Optional: if WASM fails to load, callers keep using grid walkable().
 */
import { CELL_M, FLOOR_THICK_M, WALL_HEIGHT_M, worldOf } from '../gen/cells.js';
import { wallRuns } from '../gen/navmesh.js';

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
  const { walls } = wallRuns(dungeon);

  const floorDesc = RAPIER.ColliderDesc.cuboid(dungeon.W * CELL_M * 0.5 + 4, FLOOR_THICK_M * 0.5, dungeon.H * CELL_M * 0.5 + 4)
    .setTranslation(0, -FLOOR_THICK_M * 0.5, 0)
    .setFriction(0.9);
  world.createCollider(floorDesc);

  for (const run of walls) {
    const hx = Math.max(run.sx * CELL_M * 0.5, 0.45);
    const hz = Math.max(run.sz * CELL_M * 0.5, 0.45);
    const desc = RAPIER.ColliderDesc.cuboid(hx, WALL_HEIGHT_M * 0.5, hz)
      .setTranslation(run.cx, WALL_HEIGHT_M * 0.5, run.cz)
      .setFriction(0.6);
    world.createCollider(desc);
  }

  const controller = world.createCharacterController(CCT_OFFSET);
  controller.setUp({ x: 0, y: 1, z: 0 });
  controller.setMaxSlopeClimbAngle((45 * Math.PI) / 180);
  controller.setMinSlopeSlideAngle((30 * Math.PI) / 180);
  controller.enableAutostep(0.5, 0.2, true);
  controller.enableSnapToGround(0.5);
  controller.setApplyImpulsesToDynamicBodies(true);

  const start = worldOf(dungeon, dungeon.rooms[dungeon.entrance].cx, dungeon.rooms[dungeon.entrance].cy);
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      start.x,
      CCT_RADIUS + CCT_HALF,
      start.z,
    ),
  );
  const capsule = world.createCollider(RAPIER.ColliderDesc.capsule(CCT_HALF, CCT_RADIUS), body);

  return {
    RAPIER,
    world,
    controller,
    body,
    capsule,
    walls: walls.length,
    acc: 0,
    vy: 0,
  };
  } catch (err) {
    console.warn('[dungeon-physics] world setup failed, grid nav only', err?.message || err);
    return null;
  }
}

export function stepDungeonPhysics(phys, wishX, wishZ, dt) {
  if (!phys) return null;
  phys.acc += Math.min(dt, 0.1);
  let guard = 0;
  const out = { x: 0, y: 0, z: 0 };
  while (phys.acc >= RAPIER_FIXED_DT && guard++ < 8) {
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

export function disposeDungeonPhysics(phys) {
  if (!phys) return;
  phys.world.free();
}
