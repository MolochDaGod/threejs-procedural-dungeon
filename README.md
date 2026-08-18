# Grudge Dungeons — Warlords Era

Playable crawl on top of [Dungeon Forge](https://procedural-dungeon.netlify.app). Same seeded pipeline. Production characters come from the Grudge Toon-RTS / uMMORPG CDN and bind like [Grudge Gladiators](https://combat.grudge-studio.com/) — not from vendored Unity FBX.

**Live:** [https://grudge-dungeons.vercel.app](https://grudge-dungeons.vercel.app)  
Also: [https://grudge-dungeons-grudgenexus.vercel.app](https://grudge-dungeons-grudgenexus.vercel.app)

**Enter dungeon (`E`)** after a forge. **WASD** move, **1–6** linear spells, **Esc** leave. Full play contract: [`docs/GRUDGE_DUNGEON.md`](docs/GRUDGE_DUNGEON.md).

Current SSOT: **1.2.2** (`public/ssot.json`) · kit **2.1.1** · nav `grid-8` · `cellM` 2.

---

## Play

1. Forge a dungeon (or check **Linear crawl** — 16 rooms, 0 loops).
2. Pick a Warlords Era race: human, barbarian, elf, dwarf, orc, undead.
3. **ENTER DUNGEON** / `E`.
4. Walk the critical path (entrance → combat/elite → boss).
5. Cast from the 6-slot bar (`1–6`). Loadout is picked before the crawl.

| Slot | Spell | Motion |
| --- | --- | --- |
| 1 | Cleave | Front cone slash |
| 2 | Fireball | Linear projectile |
| 3 | Frost Lance | Linear pierce projectile |
| 4 | Thunder | Instant line / beam |
| 5 | Holy Nova | Expanding ring |
| 6 | Void Step | Linear dash + burst |

---

## Characters and assets

Race GLBs are **full Toon-RTS wardrobes** on one `Bip001` skeleton. Showing every mesh at once is a spiked blob. The dungeon uses the same Gladiators deploy path:

| Piece | Source |
| --- | --- |
| Race wardrobe | `https://assets.grudge-studio.com/asset-packs/toon-rts-characters/glb/characters/{race}.glb` |
| Clip donor | `https://combat.grudge-studio.com/models/toon-clips/wk-knight.glb` (55 named clips) |
| Class kits | knight A / mage D / ranger C + one weapon (never the full wardrobe) |
| Retarget | rotation-only, alphanumeric `Bip001` match — **do not** apply donor translation/scale |
| Fallback clips | `…/glb/anim_{idle,walk,attack,death}.glb` |
| Dungeon kit | `https://assets.grudge-studio.com/models/dungeons/warlords-dungeon-kit.json` |

Runtime: `SkeletonUtils.clone` + per-instance `AnimationMixer` on `RootNode` / `Bip001`. Empty clips are a bug.

Do **not** vendor Unity FBX. Do **not** put API keys in this client.

---

## Instance contract

- Nav: generated `grid-8` walkable cells + string-pull (`src/gen/navmesh.js`)
- Physics: `@dimforge/rapier3d-compat` kinematic character + cuboid proxies (`src/play/physics.js`)
- Cell size: 2 m (`CELL_M`)
- Host: Three.js client + Rapier. No new Vercel project, no new asset bucket.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build
npm run preview    # http://localhost:4173
npm run verify:cdn
```

Requires Node 18+.

### Production deploy (existing hosts only)

```bash
npm run deploy     # vite build → HEAD-check CDN → upload kit to R2 → vercel --prod
```

- App: existing Vercel project `grudgenexus/grudge-dungeons`
- Kit: existing R2 bucket `grudge-assets` → `models/dungeons/warlords-dungeon-kit.json`
- Characters / clips: existing CDN + Combat host (CORS `*`)

---

## Project structure

```
threejs-procedural-dungeon/
├── index.html
├── public/
│   ├── ssot.json                 # production SSOT 1.2.2
│   └── warlords-dungeon-kit.json # fleet kit 2.1.1
├── scripts/
│   ├── deploy.mjs
│   ├── upload-kit.mjs
│   └── verify-cdn.mjs
├── src/
│   ├── ssot.js                   # CDN + Combat donor + spells + kits
│   ├── main.js                   # Dungeon Forge pipeline + forge cast
│   ├── gen/                      # cells, navmesh, instance payload
│   ├── play/
│   │   ├── characters.js         # wardrobe + rotation-only mixer
│   │   ├── index.js              # crawl, casts, feel
│   │   ├── prefabs.js            # theme monster / boss kits
│   │   ├── physics.js            # Rapier
│   │   ├── telegraph.js          # cone / line / aoe windup
│   │   └── …
│   └── ui/styles.css
└── docs/GRUDGE_DUNGEON.md
```

---

# Dungeon Forge (upstream generator)

### ▶ [Play the live demo](https://procedural-dungeon.netlify.app)  ·  by [@majidmanzarpour](https://x.com/majidmanzarpour)

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
| Skip build animation | `space` |
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

[MIT](LICENSE) © 2026 [Majid Manzarpour](https://x.com/majidmanzarpour).
