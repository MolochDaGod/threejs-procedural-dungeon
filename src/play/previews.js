/**
 * Forge-floor cast preview — idle Warlords prefabs at spawn / elite / boss.
 * Hidden while the crawl is active.
 */
import * as THREE from 'three';
import { spawnActor } from './characters.js';
import { prefabFor } from './prefabs.js';
import { CELL_M, cellCenter } from '../gen/cells.js';

export class ForgeCast {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'forge-cast';
    this.actors = [];
    this.token = 0;
  }

  async refresh(dungeon, parent) {
    const token = ++this.token;
    this.dispose();
    if (!dungeon?.valid) return;
    parent.add(this.root);
    const theme = dungeon.params.themeKey;
    const jobs = [];
    const rooms = dungeon.rooms || [];
    const combat = rooms.filter((r) => r.type === 'combat').slice(0, 2);
    const elite = rooms.find((r) => r.type === 'elite');
    const boss = rooms[dungeon.boss];
    for (const r of combat) jobs.push({ r, prefab: prefabFor(theme, 'combat', r.id) });
    if (elite) jobs.push({ r: elite, prefab: prefabFor(theme, 'elite', elite.id + 3) });
    if (boss) jobs.push({ r: boss, prefab: prefabFor(theme, 'boss', boss.id) });

    const spawned = await Promise.all(jobs.map(async (j) => {
      const actor = await spawnActor({ prefab: j.prefab, equipped: true });
      return { actor, j };
    }));
    if (token !== this.token) {
      for (const { actor } of spawned) actor.dispose();
      return;
    }
    for (const { actor, j } of spawned) {
      const w = cellCenter(dungeon, j.r.cx, j.r.cy);
      actor.root.position.set(w.x, 0, w.z);
      // Forge group is scaled by CELL_M; actor is already SI meters.
      actor.root.scale.setScalar(1 / CELL_M);
      actor.root.rotation.y = (j.r.id * 0.9) % (Math.PI * 2);
      actor.setGait(false, false);
      this.root.add(actor.root);
      this.actors.push(actor);
    }
  }

  setVisible(on) {
    this.root.visible = on;
  }

  update(dt) {
    if (!this.root.visible) return;
    for (const a of this.actors) a.update(dt);
  }

  dispose() {
    for (const a of this.actors) a.dispose();
    this.actors = [];
    if (this.root.parent) this.root.parent.remove(this.root);
    while (this.root.children.length) this.root.remove(this.root.children[0]);
  }
}
