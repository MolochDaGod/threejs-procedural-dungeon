/**
 * Flare shrine wisps — beam + telegraph AoE. Uses dungeon TelegraphField / VfxWorld.
 * Cadence from Flare WispEvent (spline / circles / recover). Not a second VFX stack.
 */
import * as THREE from 'three';
import { FLARE_WISP } from '../content/flare.js';

export function mountShrineWisps(session) {
  const d = session.d;
  const theme = d?.params?.themeKey || 'ancient';
  const pal = FLARE_WISP.palettes[theme] || FLARE_WISP.palettes.ancient;
  const rooms = (d.rooms || []).filter((r) => r.type === 'shrine' || r.type === 'event');
  session.wisps = [];
  for (const r of rooms) {
    const w = session.worldOf(d, r.cx, r.cy);
    const group = new THREE.Group();
    group.position.set(w.x, 0.35, w.z);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 10),
      new THREE.MeshBasicMaterial({ color: pal.color, transparent: true, opacity: 0.92 }),
    );
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.18, FLARE_WISP.beamH, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: pal.color, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide,
      }),
    );
    beam.position.y = FLARE_WISP.beamH * 0.5;
    group.add(core, beam);
    session.group.add(group);
    session.wisps.push({
      pal, group, core, beam,
      pos: new THREE.Vector3(w.x, 0.35, w.z),
      hp: FLARE_WISP.hp,
      hpMax: FLARE_WISP.hp,
      alive: true,
      aggro: FLARE_WISP.aggro,
      cd: 2.2,
      phase: 'idle',
      bob: Math.random() * 6,
    });
  }
  return session.wisps;
}

export function tickWisps(session, dt) {
  const list = session.wisps;
  if (!list?.length) return;
  for (const w of list) {
    if (!w.alive) continue;
    w.bob += dt;
    w.core.position.y = 0.12 + Math.sin(w.bob * 2.2) * 0.08;
    w.cd = Math.max(0, w.cd - dt);
    const dist = w.pos.distanceTo(session.pos);
    if (w.phase === 'warn') {
      w.warnT -= dt;
      if (w.warnT <= 0) {
        w.phase = 'idle';
        session.vfx.mist({ origin: w.mark.clone().setY(0.9), color: w.pal.color, radius: 1.9, life: 0.9 });
        if (session.pos.distanceTo(w.mark) <= 2.1) session.takeDamage(9, { damage: 12 }, 'aoe');
      }
      continue;
    }
    if (dist > w.aggro || w.cd > 0) continue;
    w.cd = 3.4;
    w.phase = 'warn';
    w.warnT = 1.15;
    w.mark = session.pos.clone();
    session.tele.incoming({
      origin: w.mark,
      range: 1.8,
      color: w.pal.color,
      life: 1.15,
    });
  }
}
