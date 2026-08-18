# Grudge Dungeons — Warlords Era

Playable layer on [Dungeon Forge](https://procedural-dungeon.netlify.app): the same seeded pipeline, plus a **linear crawl** using production Warlords / uMMORPG (Toon RTS) characters bound the same way as [Grudge Gladiators](https://combat.grudge-studio.com/).

**Live:** https://grudge-dungeons.vercel.app

## Source of truth

| What | Where |
|------|--------|
| Manifest | `public/ssot.json` (1.2.3) |
| Fleet kit | `public/warlords-dungeon-kit.json` → R2 `models/dungeons/warlords-dungeon-kit.json` |
| Characters | `https://assets.grudge-studio.com/asset-packs/toon-rts-characters/glb/characters/{race}.glb` |
| Clip donor | `https://combat.grudge-studio.com/models/toon-clips/wk-knight.glb` |
| Fallback clips | `…/glb/anim_{idle,walk,attack,death}.glb` |
| Race list | human, barbarian, elf, dwarf, orc, undead |
| Class kits | `ROLE_KITS` in `src/ssot.js` (worge / warrior / mage / ranger) |
| Combat math | `https://info.grudge-studio.com/api/v1/master-attributes.json` |
| Spell catalog | `src/ssot.js` (aligned with `warlord-genesis/data/vfx/vfx-skill-types.json`) |

Do **not** vendor Unity FBX into this repo. Do **not** put API keys in the client.

## Play contract

1. Forge a dungeon (or check **Linear crawl** — 16 rooms, 0 loops).
2. Pick a Warlords Era race.
3. **ENTER DUNGEON** / `E`.
4. Walk the **critical path** (entrance → combat/elite → boss).
5. Cast from the **6-slot bar** (keys `1–6`). Loadout is selected before the crawl.

### Linear spells

Worge is the knight class. Weapon two (forge chips): **1H+Tome**, **Nature Staff**, or **Arcane Staff**.

Class loadouts live in `src/play/weaponSkills.js`. Worge 1H+Tome default:

| Slot | Skill | Delivery |
|------|--------|----------|
| 1 | Twin Slash | 3D cone (samurai combo) |
| 2 | Shadow Step | Teleport strike |
| 3 | Slashing Dash | Line dash |
| 4 | Flame Sword | Forked 3D fissure |
| 5 | Storm Lance | Linear thunder + forks |
| 6 | Holy Nova | 3D zone cylinder |

No 2D sprites. Aim: mouse on ground plane, **Tab** soft-lock. Camera looks ahead along aim.

## Character deploy

Race GLBs are full wardrobes. Apply Gladiators class visibility (one body / head / arms / legs + class weapon). Never show every mesh.

`SkeletonUtils.clone` + per-instance `AnimationMixer`. Bind clips from the Combat `wk-knight.glb` donor with **rotation-only** retarget (`Bip001_Pelvis` → `Bip001 Pelvis`). Donor translation/scale tracks crush the race rest pose. Empty clips are rejected.

## Instance

- Nav: `grid-8` + string-pull (`src/gen/navmesh.js`)
- Physics: `@dimforge/rapier3d-compat` (`src/play/physics.js`)
- Cell size: 2 m

## Deploy

```bash
npm install
npm run build
npm run verify:cdn
npm run deploy     # existing Vercel project + existing R2 kit only
```

No new hosts. Play stays on `grudgenexus/grudge-dungeons`. Assets stay on `assets.grudge-studio.com` and `combat.grudge-studio.com`.
