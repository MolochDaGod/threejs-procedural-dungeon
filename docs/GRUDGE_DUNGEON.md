# Grudge Dungeons — Warlords Era

Playable layer on [Dungeon Forge](https://procedural-dungeon.netlify.app): the same seeded pipeline, plus a **linear crawl** using production Warlords / uMMORPG (Toon RTS) characters and Grudge spell VFX.

## Source of truth

| What | Where |
|------|--------|
| Characters | `https://assets.grudge-studio.com/asset-packs/toon-rts-characters/glb/characters/{race}.glb` |
| Loco / combat clips | `…/glb/anim_{idle,walk,attack,death}.glb` |
| Race list | human, barbarian, elf, dwarf, orc, undead |
| Spell catalog | `src/ssot.js` (aligned with `warlord-genesis/data/vfx/vfx-skill-types.json`) |
| Manifest | `public/ssot.json` |

Do **not** vendor Unity FBX into this repo. Do **not** put API keys in the client.

## Play contract

1. Forge a dungeon (or check **Linear crawl** — 16 rooms, 0 loops).
2. Pick a Warlords Era race.
3. **ENTER DUNGEON** / `E`.
4. Walk the **critical path** (entrance → combat/elite → boss).
5. Cast from the **6-slot bar** (keys `1–6`). Loadout is selected before the crawl.

### Linear spells

| Slot | Spell | Motion |
|------|--------|--------|
| 1 | Cleave | Front cone slash |
| 2 | Fireball | Linear projectile |
| 3 | Frost Lance | Linear pierce projectile |
| 4 | Thunder | Instant line / beam |
| 5 | Holy Nova | Expanding ring |
| 6 | Void Step | Linear dash + burst |

## Character deploy

`SkeletonUtils.clone` + per-instance `AnimationMixer`. Native GLB clips first, shared Toon-RTS clips as fill. Empty clips are rejected.

## Deploy

```bash
npm install
npm run build
# Netlify: publish dist/  (netlify.toml)
# or: npx netlify deploy --prod --dir=dist
```
