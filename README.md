# Grudge Dungeons — Warlords Era

**This game is [https://grudge-dungeons.vercel.app](https://grudge-dungeons.vercel.app).** That is the only playable Warlords crawl.

[procedural-dungeon.netlify.app](https://procedural-dungeon.netlify.app) is **not** Grudge. It is Majid Manzarpour’s upstream **generator demo** (watch a seed carve rooms). No Toon kits, no Rapier TPS, no T8 skills, not game-ready. This repo kept that `generateDungeon` pipeline and built play on it — one generator, **this** Vercel host.

Play bodies are Toon-RTS `{race}.glb` from the Grudge CDN, bound like [Grudge Gladiators](https://combat.grudge-studio.com/) — not vendored Unity FBX, not Meshy, not capsules.

Forge → **ENTER DUNGEON** / `E` → indoor shoulder TPS crawl. Full contract: [`docs/GRUDGE_DUNGEON.md`](docs/GRUDGE_DUNGEON.md). Clip names: [`src/play/clipRoles.js`](src/play/clipRoles.js).

| SSOT | Value |
| --- | --- |
| Manifest | `public/ssot.json` **1.2.6** |
| Kit | `warlords-dungeon-kit.json` **2.2.0** |
| Nav | `grid-8` · cell **2.15 m** · wall **3.85 m** |
| Physics | Rapier CCT `r=0.32` halfH `0.55` · gravity −30 · lazy WASM |
| Camera | owned `PlayTpsCamera` boom **4.6 m** — OrbitControls never writes the lens |
| Mixer | **one** `AnimationMixer` per Actor |
| Linear crawl | **7 rooms**, 0 loops |
| Complete | **boss slain** (not empty-enemy) |

Do **not** add `three-player-controller` as a package. Harvest gait overlay + hit windows only.

---

## Audit (2026-09-05)

Honest vs shipped. Green = live on `grudge-dungeons.vercel.app`. Yellow = wired but incomplete. Red = do not treat as done.

| Area | Status | Fact |
| --- | --- | --- |
| One `generateDungeon` | Green | No second dungeon host / Vercel project |
| Toon play mesh + `loadRaceKit` wardrobe | Green | `SkeletonUtils.clone` + mesh_ids kit |
| Rapier CCT + indoor TPS | Green | `src/play/physics.js` + `tpsCamera.js` |
| T8 weapon catalog (not Cleave/Fireball) | Green | `weaponSkills.js` + aliases (`fireball` → `staff_fire_bolt`) |
| Combat bar 1–5 / 6–7 items / 8 mounts | Green | ElvUI layout in `hudLayout.js` |
| F class-0 (taunt, overpower, totems, invis…) | Green | `classSkill0.js` |
| 8 classes, 4-man fill | Green | warrior/raider, mage/priest, ranger/thief, worge/verduror |
| Donor clips classified by **exact name** | Green | 55 names in `wk-knight.glb`; skip swim/fish/wall/stairs/torch/cover |
| Gait overlay + delayed slash/projectile | Green | hit at 0.32× clip · bolt at 0.22× |
| Ally AI same anim pick + tank parry | Green | `party.js` + `animForSpell` |
| Session bag unique crafts | Green | lockpick set / form page / tonics / spell pages — **not** Railway yet |
| Hurt / stun clips | Yellow | **not on donor** — flinch no-ops (never fake `attack`) |
| Magic / bow unique casts | Yellow | no `magic_cast` / `bow_shot` on donor — reuse `attack` |
| Death clip | Green | donor has none; `anim_death.glb` on `Actor.die()` (freeze pose if missing) |
| Corpse loot | Green | stand on body · **E** loot popup → session bag (`BAG_DEFS` only) |
| Interior dress | Green | KayKit barrel/crate/ruin on **room walls**; full wall meshes are architecture-only (not mid-hall cover) |
| Warbear / iguana forms | Yellow | Casting warbear URL + local iguana albedos; not Railway `formSkin` |
| Account bag / character UUID handoff | Green | CHARACTER → `info.grudge-studio.com/main-panel.html` · CRAFT → `grudgewarlords.com/craft/?era=warlords&from=&returnTo=` · crawl bag stays session yield |

---

## Play

1. Forge (or **Linear crawl** — **7 rooms**, 0 loops).
2. Lobby: race + **8 classes** + weapon set (`Q` swap).
3. **ENTER DUNGEON** / `E`. Timer starts on crawl, not lobby.
4. Critical path: entrance → combat/elite → mini-boss → **boss arena** → portal + chest.
5. Bars: **1–5** weapon skills · **6–7** items · **8** mounts · **F** class-0.

Skills are catalog ids (T8 / T0), linear 3D (slash / projectile / beam / nova / dash). No 2D sprites. `cleave` / `fireball` / `thunder` are **aliases**, not the bar.

### Crawl input

| Action | Bind |
| --- | --- |
| Move / sprint | WASD · Shift |
| Jump | Space |
| Dodge roll | X · **AA / DD** double-tap |
| Parry (stagger) | **Shift+RMB** (not focus toggle) |
| Block | **E** (combat) · hold E OOC = class radial |
| Loot body | **E** when LOOT BODY popup (skips block) · hold E on downed ally = lift |
| Slide | Ctrl |
| Weapon skills | 1–5 |
| Items / mounts | 6–7 / 8 |
| Class-0 | F |
| Weapon swap | Q |
| Focus | RMB |
| Soft lock | Tab |
| Leave | Esc |

Forge-only (orthographic, before ENTER): drag pan, `R` reforge, `T` theme, `G` graph, `H` heatmap, `P` post FX, Space skip build anim.

---

## Characters, clips, TPS

Race GLBs are **full wardrobes**. One body/head/arms/legs + class weapon. Never show every mesh.

| Piece | Source |
| --- | --- |
| Race | `assets.grudge-studio.com/asset-packs/toon-rts-characters/glb/characters/{race}.glb` |
| Clip donor | `combat.grudge-studio.com/models/toon-clips/wk-knight.glb` (55 names) |
| Classify | `src/play/clipRoles.js` — exact stems, skip unused, no misspell steal |
| Fallback | `anim_{idle,walk,attack,death}.glb` only if donor missing that role |
| Retarget | rotation-only alphanumeric `Bip001` — donor translation **crushes** rest pose |
| Kit | `assets.grudge-studio.com/models/dungeons/warlords-dungeon-kit.json` |

**Wired donor roles:** idle/walk/run/sprint, `gs_*` 2H loco, strafe, sneak/crouch, crawl, `sword_attack_a/_c/combo_finisher`, `sword_block`, `shield_bash` (parry), dodge, slide, jump, harvest, plant_seed, unarmed_uppercut, dash/run-attack.

**Not on donor (do not invent):** `hit`, `stun`, `parry` (name), `magic_cast`, `bow_shot`, `death`.

Runtime: `SkeletonUtils.clone` + per-instance mixer on `RootNode` / `Bip001`. Empty clips are a bug.

Do **not** vendor Unity FBX. Do **not** put API keys in this client.

---

## Instance contract

- Nav: `grid-8` + string-pull (`src/gen/navmesh.js`)
- Physics: `@dimforge/rapier3d-compat` CCT + cuboid proxies (`src/play/physics.js`)
- Cell: **2.15 m** (`DUNGEON_SI.cell`). Plant in cell units — never `wx * CELL` twice.
- Host: Three.js client + Rapier. No new Vercel project, no new asset bucket.
- Fire: instanced volumetric (`src/vfx/instancedFire.js`) — must have `update()`.

---

## Quick start

```bash
npm install
npm run dev              # http://localhost:5173
npm run smoke:mechanic   # Node, no WebGL
npm run build
npm run preview          # http://localhost:4173
npm run verify:cdn
```

Requires Node 18+.

### Production (existing hosts only)

```bash
npx vercel deploy --prod --yes --scope grudgenexus
```

- App: `grudgenexus/grudge-dungeons` → https://grudge-dungeons.vercel.app
- Kit: R2 `grudge-assets` → `models/dungeons/warlords-dungeon-kit.json`
- Characters / clips: CDN + Combat host (CORS `*`)

---

## Project structure

```
threejs-procedural-dungeon/
├── public/
│   ├── ssot.json                      # 1.2.6
│   ├── warlords-dungeon-kit.json      # 2.2.0
│   └── api/v1/dungeon-play-contract.json
├── scripts/smoke-mechanic.mjs
├── src/
│   ├── ssot.js                        # CDN, SI, PLAY.tps / dodge / parry / block
│   ├── main.js                        # forge pipeline + ENTER
│   ├── gen/                           # cells, nav, dressPlan, instance
│   └── play/
│       ├── clipRoles.js               # donor names + classify + hit windows
│       ├── characters.js              # wardrobe + one mixer + gait overlay
│       ├── tpsCamera.js               # indoor shoulder TPS
│       ├── index.js                   # crawl, hitQ, skills
│       ├── party.js                   # 3 AI allies
│       ├── weaponSkills.js            # T8 catalog
│       ├── physics.js                 # Rapier CCT
│       └── …
└── docs/GRUDGE_DUNGEON.md
```

---

# Upstream generator (not the game)

Credit: [Majid Manzarpour](https://x.com/majidmanzarpour) — [procedural-dungeon.netlify.app](https://procedural-dungeon.netlify.app) is a **watch-it-forge** showcase of the seeded pipeline. It is **not** Grudge Dungeons and it is **not** a playable Warlords crawl. Play lives only at [grudge-dungeons.vercel.app](https://grudge-dungeons.vercel.app).

**A deterministic procedural dungeon generator you can watch build itself, room by room.** Rooms
are scattered and shoved apart, triangulated, wired into a corridor graph, carved into a tile grid,
and dressed with theme-specific props, liquids, lights, and particles — **every stage seeded from a
single number, so any seed rebuilds the exact same dungeon.** Rendered live with
[Three.js](https://threejs.org/).

![Dungeon Forge — a procedurally generated molten dungeon seen from above](docs/preview.jpg)

> Type a seed, pick a theme, drag the sliders, and watch the pipeline light up stage by stage.
> Every forge is reproducible and every dungeon is guaranteed fully connected.

---

## Features

- **One seed, one dungeon.** A single `mulberry32` stream is threaded through *every* stage —
  scatter, separation, triangulation, room roles, carving, decoration. The same seed always yields
  the same map, down to the last torch. Change one digit and get an entirely new floor.
- **A real generation pipeline, visualized.** Watch it run: **scatter → separate → Delaunay →
  MST + loops → semantics → carve → rasterize + BFS → decorate.** Each step lights up in the HUD as
  it happens, and you can scrub the whole build animation or skip it.
- **Graph-based layouts.** Rooms are Delaunay-triangulated, reduced to a **minimum spanning tree**
  for guaranteed connectivity, then selectively re-looped so the dungeon has shortcuts and cycles
  instead of a boring spanning-tree spider.
- **Room semantics.** A BFS from the entrance assigns depth and difficulty, then tags rooms as
  **entrance, combat, elite, treasure, shrine, or boss** based on where they sit on the critical
  path — so the layout reads like a real level, not just connected boxes.
- **Five hand-tuned themes** (plus **AUTO**, which picks one from the seed): **Ancient, Molten,
  Frost, Grim, Verdant.** Each swaps the palette, lighting rig, liquids (lava / water / miasma),
  props, particle system (embers / snow / spores / wisps), and torch color.
- **Procedural everything.** Stone, cracks, runes, portals, and light shafts are all generated to
  canvas textures at load; geometry is built from primitives; nothing is loaded from disk.
- **Instanced rendering.** Thousands of floor tiles, walls, props, and decorations are drawn with
  `InstancedMesh`, so an 80-room dungeon with ~6,000 floor tiles still holds a high frame rate.
- **Custom post-processing.** A hand-written pipeline — bright-pass **bloom**, separable blur,
  **tilt-shift** focus band, cool-shadow / warm-highlight color grade, vignette, and film grain —
  gives the whole thing its painted-miniature look. Toggle it live for an A/B.
- **Live readouts.** Room count, links · loops, critical-path length, floor-tile count, light count,
  generation time, draw calls, triangles, and FPS — all updating as you forge.
- **Overlays.** Flip on the **graph overlay** to see the Delaunay edges, MST, and loops in world
  space, or the **difficulty heatmap** to see how the danger ramps from entrance to boss.
- **Object layers.** Toggle whole categories of the scene on and off live — **props, torches,
  particles, liquids, lights** — without re-forging. Strip it back to bare architecture, or kill the
  lights and watch it read by torchlight alone.
- **Responsive & touch-ready.** The control panel collapses to a slim bar (on desktop *and* mobile)
  so the dungeon has the whole screen, and every target is sized for a fingertip on phones/tablets.

---

## Controls

| Action | Input |
| --- | --- |
| Pan | drag |
| Zoom | scroll wheel |
| Orbit | shift-drag |
| Reforge | `R` or **FORGE DUNGEON** |
| Cycle theme | `T` |
| Toggle graph overlay | `G` |
| Toggle difficulty heatmap | `H` |
| Toggle post FX | `P` |
| Skip build animation | `space` (forge only — crawl Space is jump) |
| Enter dungeon | `E` or **ENTER DUNGEON** |
| Leave crawl | `Esc` |

The panel (top-left) drives everything: type a **seed** (or roll the dice), pick a **theme**, and
adjust **rooms**, **loopiness**, and **decor density**. Every change re-forges deterministically.

---

## How it works

Every forge runs the same deterministic pipeline. Nothing is random in the "different each run"
sense — the only entropy is the seed you give it.

1. **Scatter.** Room rectangles are sampled in a rough disc, sized from a distribution biased toward
   small rooms with a few large ones.
2. **Separate.** Overlapping rooms push each other apart over a few relaxation passes until the
   layout is non-overlapping but still compact.
3. **Delaunay.** Room centers are Delaunay-triangulated to get a natural, non-crossing candidate
   graph of "which rooms could plausibly connect."
4. **MST + loops.** A minimum spanning tree over that graph guarantees the dungeon is **fully
   connected**; then a tunable fraction of the leftover Delaunay edges are added back as **loops**
   for shortcuts and cycles.
5. **Semantics.** A breadth-first search from the entrance assigns each room a depth and difficulty,
   finds the critical path to the boss, and tags rooms as entrance / combat / elite / treasure /
   shrine / boss.
6. **Carve.** Rooms and their connecting corridors are stamped into a tile grid (floor / wall /
   doorway), with L-shaped corridors and the occasional sunken liquid pit.
7. **Rasterize + BFS.** The grid is walked to place walls, doorways, and edge trims, and to compute
   per-tile shading (ambient occlusion from neighboring walls, moss, pool glow).
8. **Decorate.** Props, torches, runes, portals, and a theme-appropriate particle field are
   scattered by density; point lights are budgeted and placed at the most important rooms and
   torches.
9. **Render.** Everything is batched into `InstancedMesh` draw calls and composited through the
   custom post-processing stack.

---

## The panel

| Control | What it does |
| --- | --- |
| **Seed** | the number every stage is derived from; the dice button rolls a random one |
| **Theme** | `AUTO` (seed-picked) or force **Ancient / Molten / Frost / Grim / Verdant** |
| **Objects** | toggle **props / torches / particles / liquids / lights** on or off, live |
| **Rooms** | how many rooms to scatter (12–80) |
| **Loopiness** | fraction of Delaunay edges added back as loops beyond the MST |
| **Decor density** | how heavily rooms are dressed with props and particles |
| **Graph overlay** | draw the Delaunay edges, MST, and loops over the world |
| **Difficulty heatmap** | tint rooms by their BFS difficulty, entrance → boss |
| **Animate build** | play the pipeline stage-by-stage (or forge instantly) |
| **Post FX** | toggle the bloom / tilt-shift / grade / grain stack |

The panel collapses with the button in its top-right corner — on desktop and mobile alike — to hand
the canvas back to the dungeon.

---

## Built with

- [Three.js](https://threejs.org/) — WebGL rendering
- [Vite](https://vitejs.dev/) — dev server & bundler
- [@dimforge/rapier3d-compat](https://rapier.rs/) — crawl physics

Characters and clip donors stay on the existing Grudge CDN / Combat host. The forge geometry,
textures, and post-processing are still generated in the browser.

> **A note on the Three.js version.** This started life as a single-file prototype pinned to
> Three.js **r128** (loaded from a CDN). It has since been migrated to the latest Three.js as an ES
> module: the color-management API (`outputColorSpace` / color-space constants), MSAA render targets
> (the `samples` option), and the physically-based lighting model (analytic light intensities scaled
> to match the old legacy look) were all updated so the render matches the original pixel-for-pixel.

---

## License

Generator pipeline: [MIT](LICENSE) © [Majid Manzarpour](https://x.com/majidmanzarpour).  
Warlords crawl / Toon play / this Vercel product: **Grudge Studio** — [https://grudge-dungeons.vercel.app](https://grudge-dungeons.vercel.app).
