# Dungeon play practice — loaders, skeleton, helpers, AI, Rapier

Dungeon SPA stays **vanilla Three r185 + `@dimforge/rapier3d-compat`**.  
**R3F / `@react-three/rapier`** is Forge / warcamp only — one physics lib per product.

## Skeleton

- Play heroes: Toon `{race}.glb`, **Bip001**, **one mixer**, `SkeletonUtils.clone`.
- Flare bosses / KayKit skeletons: **native clips** on that GLB, still one mixer.
- Rotation-only retarget from `combat.grudge-studio.com/models/toon-clips/wk-knight.glb`.
- Never `skeleton.pose()`, never a second mixer, never pelvis-as-feet.

## Loaders

`src/loaders/gltfPlay.js`

- `GLTFLoader` + Draco (`gstatic 1.5.7`)
- Albedo **SRGB**, data maps linear, `flipY: false` on embeds
- SkinnedMesh `frustumCulled = false`
- Fit to **SI target height** at spawn — **not** AABB-into-1-unit
- Converted GLB only (Flare live host, CDN Toon, local creatures). No Meshy play bodies.

## Helpers

`src/helpers/playHelpers.js` + `src/physics/colliderDebug.js`  
Gate: **`?physicsDebug=1`**. Axes on the hero, Rapier cuboid wires. Off in normal play.

## Rapier

`src/play/physics.js` — CCT capsule r=0.32 halfH=0.55, fixed **1/60**, cuboid walls/floors (not visual trimesh). Same pin as Island3D / Forge WASM, different wiring (no R3F `<Physics>` here).

## AI

| Layer | System |
|-------|--------|
| Wander | Yuka Vehicle (root only) |
| Chase / leash | navmesh + `AGGRO` |
| Cast | telegraph then hit (`ENEMY_ATTACKS`) |
| Boss phases | ruleset 66% / 33% + warlord brain |
| Shrine wisp | Flare cadence (beam + incoming AoE) |

Do not fork Flare `ArenaScene`. Roster + kits live in `src/content/flare.js`.

## Flare kits (live)

Host: `https://flare-boss-arena-src.vercel.app`

| Role | GLB |
|------|-----|
| Bosses | `/models/bosses/{fireworm,framis_necro,sora_cloud,sun_monkey_king}.glb` |
| Elites | `/models/monsters/{pincher,cultist_armed,dante_beast,medusa}.glb` |
| Grunts | `/models/kaykit/enemies/Skeleton_*.glb` |

Indoor height cap **2.55 m** (halls 3.85 m). Query `?theme=molten` for wyrmling, `ancient` for Framis, etc.
