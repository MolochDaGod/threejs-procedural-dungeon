/**
 * Lazy Rapier world for dungeon play. WASM is not on first paint.
 * Cuboid proxies from collider assets (kit: never visual-mesh collision).
 * CCT: kinematic capsule r=0.32 halfH=0.55, gravityY -30.
 */
import { DUNGEON_SI, PLAY } from '../ssot.js';

let rapierPromise = null;

export function loadRapier() {
  if (!rapierPromise) {
    rapierPromise = import('@dimforge/rapier3d-compat').then(async (RAPIER) => {
      await RAPIER.init();
      return RAPIER;
    });
  }
  return rapierPromise;
}

export async function createPlayPhysics(dungeon) {
  const RAPIER = await loadRapier();
  const world = new RAPIER.World({ x: 0, y: DUNGEON_SI.gravity, z: 0 });
  const solids = (dungeon.mechanics?.colliders || []).filter(
    (n) => n.solid && n.collider?.kind === 'box',
  );
  for (const n of solids) {
    const [hx, hy, hz] = n.collider.params;
    const [x, y, z] = n.position;
    const rb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
    const cd = RAPIER.ColliderDesc.cuboid(hx, hy, hz);
    world.createCollider(cd, rb);
  }
  const controller = world.createCharacterController(0.01);
  controller.setApplyImpulsesToDynamicBodies(false);
  controller.enableAutostep(0.4, 0.25, true);
  controller.enableSnapToGround(0.45);
  return { RAPIER, world, controller, solids: solids.length };
}

export function spawnPlayCapsule(phys, pos) {
  const { RAPIER, world } = phys;
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(pos.x, pos.y + PLAY.capsuleHalfH, pos.z),
  );
  const col = world.createCollider(
    RAPIER.ColliderDesc.capsule(PLAY.capsuleHalfH, PLAY.capsuleR),
    body,
  );
  return { body, col };
}

export function stepPlayCapsule(phys, capsule, desired, dt) {
  const { world, controller } = phys;
  controller.computeColliderMovement(capsule.col, desired);
  const mv = controller.computedMovement();
  const t = capsule.body.translation();
  capsule.body.setNextKinematicTranslation({
    x: t.x + mv.x,
    y: t.y + mv.y,
    z: t.z + mv.z,
  });
  world.timestep = Math.min(1 / 30, Math.max(1 / 120, dt));
  world.step();
  const out = capsule.body.translation();
  return {
    x: out.x,
    y: out.y - PLAY.capsuleHalfH,
    z: out.z,
    grounded: controller.computedGrounded(),
  };
}

export function disposePlayPhysics(phys) {
  try { phys?.world?.free(); } catch { /* wasm already dropped */ }
}
