# CustomGrudge — playable Three.js dungeon slice

**Host:** https://grudge-dungeons.vercel.app/  
**Payload:** `src/gen/customGrudge.js` → wraps `dungeonToInstance`  
**Do not invent a second generator.** One `generateDungeon`. CustomGrudge is the **export + socket** contract.

## Defaults (do not open at 42)

| Knob | Default | SSOT |
|------|---------|------|
| Linear crawl | **ON** | `#tLinear` checked |
| Rooms | **7** | `DUNGEON_LAYOUT.linearRooms` |
| Loops | **0** | `loopLinear` |
| Graph (linear off) | 8 rooms, 12% loops | `graphRooms` / `loopGraph` |
| Slider | min 7 · max 20 | not 12–80 / 42 |
| Cell | 2.15 m | `DUNGEON_SI.cell` |
| Wall | 3.85 m | `DUNGEON_SI.wallH` |
| Human | 1.82 m | play capsule |

Linear path: **entrance → combat → elite/mini-boss → treasure/shrine → boss**. ENTER / `E` reforges to 7/0 **only if Linear crawl is on**.

**Standard modeled rooms stay.** Uncheck Linear → slider **42 rooms / 15% loops** (min 12, max 80). Same generateDungeon: scatter, Delaunay, MST, entrance/combat/elite/treasure/shrine/boss — CustomGrudge **fits into** those rooms; it does not replace them.

**Feet on terrain:** one sampler (`attachDungeonTerrain` → `dungeon.terrain.sample`). Player, allies, monsters, enemy-faction Toons, chests, torches, cover/barriers plant on it (`groundRoot` + `plantFeet` after mixer). Turrets use the same plant when a kit piece is named turret.

**Cover / destroyable colliders (WoW / Albion):** `CELL_FLAG.BLOCK` pillars and `BARRIER` fences block walk + LOS. Charge **smashes** barriers (`damageBarrier` stages 0–3). Shockwave / line / cone **do not hit** if a pillar sits between you and the origin (`coveredFrom`). Casters and rangers **duck behind cover** when a tell is on the floor; tanks soak (Fortitude). Passives: `src/play/passives.js`.

## What a CustomGrudge is

A **Three.js scene** with:

- **entrance** socket (world metres, room id)  
- **exit** socket (usually the boss room)  
- **pass** rule (`traverse` · `event-complete` · `boss-slain` · `party-ready` · `dungeon-complete`)

Kinds (plug into a parent dungeon or deploy alone):

| kind | Use |
|------|-----|
| `walkway` | Corridor connector |
| `bridge` | Span / water crossing |
| `event` | Scripted beat / **platform box** (random-boxes) |
| `boss` | Single arena |
| `lobby` | Party ready → play |
| `instance` | Full 7-room crawl (default export) |

**Exports**

| Form | What |
|------|------|
| **JSON / script** | `EXPORT CUSTOMGRUDGE` → `dng_{seed}_{theme}.json` for Node (Colyseus / mechanic) |
| **Playable Three** | Same SPA ENTER — Rapier CCT, Toon kits |
| **GLB** | Socket stub for now (`export.glb = socket-stub`). Full instanced bake = GLTFExporter later — isolate pieces, Draco, not fused 100 MB |

Handoff: enter at `sockets.entrance`, leave at `sockets.exit` when `pass.completeOn` fires. Parent dungeon does **not** rebuild Controller / mixer.

## Event platform box (random-boxes)

One combat room on the critical path becomes `type: event`. Same `generateDungeon` grid — `stampEventPlatformRoom` carves it.

| Piece | System |
|-------|--------|
| Pit | `carveRoleRect` → `CELL_ROLE.LAVA` (POOL + existing liquid) or `VOID` (interior kill sensor, no tall void_shell) |
| Entrance / exit | 2×2 `SAFE` pads + ring meshes + `room.sockets` |
| Platforms | `d.platforms[]` SI boxes (Rapier cuboids). Pattern: [random-boxes](https://threejs-games.github.io/examples/80-scenes/random-boxes/) |
| Pong | Bounce pads (`restitution` 1.15) in the same box |
| Vendor / treasure | Corner rects via `carveRoleRect` |
| Enemies | Play spawns on platform tops |
| Instance | `map.platforms` + `graph.eventRoom` + `sockets.event` |

Generic grid removal (do **not** invent tiles):

```js
carveRoleRect(d, { x0, y0, x1, y1, role: 'lava' | 'void' | 'pong' | 'vendor' | 'treasure' })
```

Rapier uses greedy floor boxes + platform cuboids — not one mega-floor over the pit.

## Enemy groups (Warlords)

Play **bodies** stay Toon `{race}.glb` (one mixer). Authored `models/creatures/*.glb` fill elite/miniboss when `prefabFor` rolls even salt.

### By theme (`THEME_CAST` + `THEME_ENEMY`)

| Theme | Trash (Toon) | Elite | Boss warlord | Authored GLB (local) |
|-------|----------------|-------|--------------|----------------------|
| **ancient** | Undead warrior + ranger | Barrow mage / brute | **Lich Warlord** | cave_dino, desert_dragon, spider, rock_elemental |
| **molten** | Orc warrior + ranger | Cinder shaman / slag brute | **Slag Warlord** | rock_monster, lava_elemental, mutant_mantis |
| **frost** | Dwarf warrior + ranger | Hoar runecaster / ice warden | **Glacier Warlord** | ice_elemental, troll |
| **grim** | Undead ranger + warrior | Ossuary blade / plague chanter | **Death Warlord** | berserk, spider, spiderlit, fat_brute, ogre, shadow_flame_mantis |
| **verdant** | Orc ranger + warrior | Root brute / spore mage | **Bloom Warlord** | forest_beetle, frog, goblin_shaman, troll |

Dungeon **kinds** (`content/kinds.js`) only change the **roster plan**, not the carve:

- `biome` — table above  
- `faction` — enemy-faction Toon at 1.5×  
- `boss` — empty halls, warlord arena only  

## Warlords assets for each dungeon type

| Slot | CDN / kit |
|------|-----------|
| Play hero | `assets.grudge-studio.com/asset-packs/toon-rts-characters/glb/characters/{race}.glb` |
| Clips | Combat `wk-knight.glb` donor + `anim_{idle,walk,attack,death}` |
| Tiles / props | `warlords-dungeon-kit.json` KayKit floor/wall/door/chest/barrel/torch |
| Interior isolate | `PROP_KITS` brick · lp-dungeon · halloween |
| World names | Pirate's Crypt, Glacial Depths, Thornwood, Magma Core, Drowned Cathedral, Sunken Tomb |
| Compress | Draco + WebP; InstancedMesh walls; no fused Sketchfab |

Library of **selectable pieces** = kit `pieces[]` + `PROP_KITS` ids. Custom dungeon UI later reads that list — not a new pack folder.

## Verify

1. Load SPA — slider **7 rooms / 0% loops**, not 42.  
2. FORGE → ENTER — 7-room linear crawl.  
3. EXPORT CUSTOMGRUDGE — JSON has `sockets.entrance` + `sockets.exit` + `instance.graph`.  
4. Uncheck Linear — **42 rooms / 15% loops**; modeled rooms still run.  
5. ENTER — units sit on the floor; IK feet after mixer; chests/barriers not floating.
