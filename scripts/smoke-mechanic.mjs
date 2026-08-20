/**
 * Local smoke: greedy colliders + mechanic compile on a tiny carved grid.
 * Does not boot WebGL / generateDungeon (those live in src/main.js).
 */
import { buildColliderAssets, greedyRects, hitsSolid, TILE } from '../src/physics/colliders.js';
import { compileMechanics } from '../src/mechanic/compile.js';
import { readFileSync } from 'node:fs';
import { DUNGEON_KINDS, DUNGEON_SI, HERO_24, PIRATE_FACES, PLAY, PROP_KITS, creatureOf, creaturesForBiome } from '../src/ssot.js';
import { CELL_FLAG, damageBarrier, destroyCell, stampCover } from '../src/grid/cells.js';
import { DOWNLOAD_REVIEW } from '../src/content/downloads-review.js';
import { saharaByBiome } from '../src/content/props/sahara.js';
import { lookOf } from '../src/content/looks/matlib.js';
import { makeGridSampler } from '../src/terrain/ground.js';

const W = 12, H = 10;
const grid = new Uint8Array(W * H);
const roomId = new Int16Array(W * H).fill(-1);
const doorway = new Uint8Array(W * H);
for (let i = 0; i < grid.length; i++) grid[i] = TILE.VOID;
function fill(x0, y0, x1, y1, t, rid) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    grid[y * W + x] = t;
    if (rid != null && t === TILE.FLOOR) roomId[y * W + x] = rid;
  }
}
fill(0, 0, W - 1, H - 1, TILE.WALL);
fill(2, 2, 5, 5, TILE.FLOOR, 0);
fill(6, 3, 9, 7, TILE.FLOOR, 1);
grid[3 * W + 6] = TILE.FLOOR; doorway[3 * W + 6] = 1;
grid[4 * W + 4] = TILE.POOL;

const dungeon = {
  valid: true,
  seed: 1337,
  name: 'SMOKE',
  W, H, grid, roomId, doorway,
  params: { themeKey: 'molten', seed: 1337, roomCount: 2 },
  entrance: 0,
  boss: 1,
  maxDepth: 1,
  rooms: [
    { id: 0, cx: 3.5, cy: 3.5, w: 4, h: 4, type: 'entrance', depth: 0, degree: 1 },
    { id: 1, cx: 7.5, cy: 5, w: 4, h: 5, type: 'boss', depth: 1, degree: 1, miniboss: false },
  ],
  edges: [{ a: 0, b: 1, isLoop: false, isCritical: true }],
};

const wallMask = new Uint8Array(W * H);
for (let i = 0; i < wallMask.length; i++) wallMask[i] = grid[i] === TILE.WALL ? 1 : 0;
const rects = greedyRects(wallMask, W, H);
const cols = buildColliderAssets(dungeon);
const mech = compileMechanics(dungeon, { linear: true });
const mid = { x: (3.5 - W / 2) * DUNGEON_SI.cell, z: (3.5 - H / 2) * DUNGEON_SI.cell };
const wallPt = { x: (0.5 - W / 2) * DUNGEON_SI.cell, z: (3.5 - H / 2) * DUNGEON_SI.cell };
const blocked = hitsSolid(cols, wallPt.x, wallPt.z, PLAY.capsuleR || 0.32);
const sample = makeGridSampler(dungeon);
const floorY = sample(mid.x, mid.z);

const report = {
  greedyWallRects: rects.length,
  colliders: cols.length,
  kinds: cols.reduce((a, n) => ((a[n.kind] = (a[n.kind] || 0) + 1), a), {}),
  mechanicsOk: mech.ok,
  stamps: mech.stamps?.map((s) => s.mechanic),
  encounters: mech.encounters?.length,
  floorWalkable: !hitsSolid(cols, mid.x, mid.z, PLAY.capsuleR),
  voidBlocked: blocked,
  terrainY: floorY,
  groundY: DUNGEON_SI.groundY,
  kinds: Object.keys(DUNGEON_KINDS),
  troll: creatureOf('troll')?.mesh,
};
dungeon.flags = new Uint16Array(W * H);
dungeon.flags[2 * W + 3] = CELL_FLAG.BREAKABLE | CELL_FLAG.SUBFLOOR;
const smashed = destroyCell(dungeon, 3, 2);
report.smash = smashed && dungeon.grid[2 * W + 3] === TILE.POOL;
const saharaCat = JSON.parse(readFileSync(new URL('../public/models/props/sahara-catalog.json', import.meta.url), 'utf8'));
const sb = saharaByBiome(saharaCat);
report.sahara = Object.fromEntries(Object.entries(sb).map(([k, v]) => [k, v.length]));
report.look = lookOf('frost').aiPrompt.slice(0, 40);
report.dragon = creatureOf('desert_dragon')?.mesh;
report.spike = true;
dungeon.flags[5 * W + 7] = CELL_FLAG.BARRIER;
dungeon.barrierStage = new Uint8Array(W * H);
const b1 = damageBarrier(dungeon, 7, 5);
const b2 = damageBarrier(dungeon, 7, 5);
const b3 = damageBarrier(dungeon, 7, 5);
report.barrierGone = b1 && b2 && b3 && !(dungeon.flags[5 * W + 7] & CELL_FLAG.BARRIER);
stampCover(dungeon, { raw: () => 0.4 });
report.cover = [...dungeon.flags].filter((f) => f & (CELL_FLAG.BLOCK | CELL_FLAG.BARRIER)).length;
report.spiderSeeds = (creatureOf('spider')?.biomes || []).length;
report.spiderInFrost = creaturesForBiome('frost').some((c) => c.id === 'spider');
report.heroes24 = HERO_24.length;
report.pirates = PIRATE_FACES.map((p) => p.id);
report.downloadsUse = DOWNLOAD_REVIEW.use.length;
report.kits = Object.keys(PROP_KITS);
report.modularWall = PROP_KITS.modular?.pieces.some((p) => p.role === 'wall');
report.torchKit = PROP_KITS.torch?.cloneScene === true;
report.smelterVersions = PROP_KITS.smelter?.pieces.filter((p) => p.role === 'scene').length;
report.templeRooms = PROP_KITS.temple?.rooms;
if (!mech.ok || !report.floorWalkable || !report.voidBlocked || rects.length < 1 || floorY !== DUNGEON_SI.groundY || !report.troll || !report.smash || !report.barrierGone || report.heroes24 !== 24 || report.spiderSeeds < 2 || !report.modularWall || report.smelterVersions !== 5) {
  console.error('SMOKE FAIL', report);
  process.exit(1);
}
console.log('SMOKE OK', JSON.stringify(report, null, 2));
