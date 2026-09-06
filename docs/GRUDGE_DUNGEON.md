# Grudge Dungeons — Warlords Era

**Playable product:** https://grudge-dungeons.vercel.app — Grudge Warlords Era linear crawl (Toon RTS / uMMORPG characters, same bind as [Grudge Gladiators](https://combat.grudge-studio.com/)).

[procedural-dungeon.netlify.app](https://procedural-dungeon.netlify.app) is the **upstream generator demo only** (Majid Manzarpour). Not Grudge, not a game, not this deploy. This repo uses that seeded `generateDungeon` in-process — no second generator, no Netlify host.

## Source of truth

| What | Where |
|------|--------|
| Manifest | `public/ssot.json` (1.2.6) |
| Fleet kit | `public/warlords-dungeon-kit.json` **2.2.0** → R2 `models/dungeons/warlords-dungeon-kit.json` |
| Characters | `https://assets.grudge-studio.com/asset-packs/toon-rts-characters/glb/characters/{race}.glb` |
| Clip donor | `https://combat.grudge-studio.com/models/toon-clips/wk-knight.glb` (55 names) |
| Clip classify | `src/play/clipRoles.js` — exact stems, skip unused, `hit` never aliases `attack` |
| Fallback clips | `…/glb/anim_{idle,walk,attack,death}.glb` if donor missing that role |
| Race list | human, barbarian, elf, dwarf, orc, undead |
| Classes | 8: warrior, raider, mage, priest, ranger, thief, worge, verduror |
| Combat math | `https://info.grudge-studio.com/api/v1/master-attributes.json` |
| Spell catalog | `src/play/weaponSkills.js` T8 ids (aliases `cleave`/`fireball` only) |
| Camera | `src/play/tpsCamera.js` indoor boom 4.6 m — no OrbitControls in crawl |

Do **not** vendor Unity FBX into this repo. Do **not** put API keys in the client.

## Info catalogs (AI workers)

Start: `https://info.grudge-studio.com/api/v1/uuid-law.json` then `game-data-manifest.json` (also `canonical-manifest.json`).

| Need | File | Not this |
|------|------|----------|
| Play skills | `master-weaponSkills.json` (300, `sword_*`) | `weaponSkills.json` stub · `skills.json` kebab · SkillAPI bundle |
| T8 kits | `master-weapon-prefabs.json` (`ITEM-*`) | `weapons.json` design |
| Class trees | `master-skillTrees.json` | invent F ids |
| Combat math | `master-attributes.json` | `attributes.json` archive |
| Items | `master-items.json` | `items-database.json` |
| Materials | `master-materials.json` | flatten `materials.json` as `items[]` |
| Consumables | `consumables.json` → `categories.*.items` + `slug` / `iconPath` | `items[]` |
| Icons | relative `/icons/…` → `assets.grudge-studio.com` + path | emoji · `/ui/craftpix/icons` |
| Play mesh | Toon `{race}.glb` | sprites, FBX, Meshy |
| 3D VFX overlay | `stylized-projectiles.json` (`VFX-STY-*` trail/hit) + orbs `orb-*.glb` | `GRDG-3DFX-*` as new ids · whole `fireball.glb` |
| JSON host | `info.grudge-studio.com` (objectstore Worker proxies) | `github.io/ObjectStore` · `api.grudge-studio.com` |

## Play contract

1. Forge a dungeon (or check **Linear crawl** — **7 rooms**, 0 loops). See `docs/CUSTOM_GRUDGE.md`.
2. Pick a Warlords Era race.
3. **ENTER DUNGEON** / `E`.
4. Walk the **critical path** (entrance → combat/elite → boss).
5. Combat bar: **1–5** weapon catalog · **6–7** items · **8** mounts · **F** class-0. `Q` weapon set.

### Linear skills

Loadouts live in `src/play/weaponSkills.js` (T8 / T0 catalog ids). Example warrior `sword_shield`: `sword_vengeful_slash` … not `cleave`. Mage `fire_staff`: `staff_fire_bolt` (alias `fireball`).

No 2D sprites. Aim: camera look / Tab soft-lock. Indoor TPS owns the lens.

Hit windows: slash **0.32 × clip duration**, projectile spawn **0.22 ×**. `src/play/clipRoles.js`.

## Character deploy

Race GLBs are full wardrobes. Apply Gladiators class visibility (one body / head / arms / legs + class weapon). Never show every mesh.

`SkeletonUtils.clone` + per-instance `AnimationMixer`. Bind clips from the Combat `wk-knight.glb` donor with **rotation-only** retarget (`Bip001_Pelvis` → `Bip001 Pelvis`). Donor translation/scale tracks crush the race rest pose. Empty clips are rejected.

Gait overlay (idle/walk/run/sprint, `gs_*` on 2H, sneak/crawl/strafe) stays under overlay one-shots (attack combo, dodge, parry=`shield_bash`, block hold=`sword_block`, jump, slide). Missing `hit`/`stun` **no-ops** — do not play `attack` as flinch. Do not add `three-player-controller`.

## Instance

- Nav: `grid-8` + string-pull (`src/gen/navmesh.js`)
- Physics: `@dimforge/rapier3d-compat` (`src/play/physics.js`)
- Cell size: **2.15 m** (`DUNGEON_SI.cell`). Forge `group.scale = CELL_M`; plant in **cell units**, never `wx * CELL` again (that was 2.15²).
- Fire: instanced volumetric THREE.Fire (`src/vfx/instancedFire.js`, tex `/textures/firetex.png`). Torches = ~0.55 m volumes. Boss/molten = **grid-cell AoE** (`gridFireCells`, ~2.15 m each). One InstancedMesh, frustum LOD, no PointLight per flame.

## Deploy

```bash
npm install
npm run build
npm run verify:cdn
npm run deploy     # existing Vercel project + existing R2 kit only
```

No new hosts. Play stays on `grudgenexus/grudge-dungeons`. Assets stay on `assets.grudge-studio.com` and `combat.grudge-studio.com`.

### Node (same app)

```bash
npm run build
npm start          # PORT=8788 — dist + /api/mechanic + /api/dungeon/script + /api/dungeon/complete
```

Completion rule: **boss slain** (`dungeon-complete`). Gated rooms awaken on enter; deeper halls stay shut until the current hall is cleared. Script compile is isomorphic (browser + Node). Warlords `/home` records the run on Railway `dungeon_runs` after return (`?dungeonComplete=1&characterId=`).
