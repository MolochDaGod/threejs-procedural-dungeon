---
name: grudge-dungeon
description: >
  Orchestrate Grudge Warlords Era dungeon work on threejs-procedural-dungeon.
  Loads the threejs-game-skills pack (director, gameplay, UI, debug, QA) plus
  deploy-animated-character. Use for dungeon play, forge, linear crawl, 6-slot
  casting, VFX, Warlords/uMMORPG characters, Toon-RTS CDN, feel/HUD tune,
  or /grudge-dungeon.
---

# Grudge Dungeon — skill router

This repo is **Dungeon Forge + playable Warlords crawl**. Do not treat it as a greenfield Three.js toy.

## Always load first

1. `threejs-game-director/SKILL.md`
2. This file’s `references/skill-map.md`
3. `src/ssot.js` (production CDN SSOT — never vendor Unity FBX)

Then load siblings from the map. **Loaded** = you actually read the file.

## Hard rules

- Characters: `raceCharacterUrl(race)` + `SkeletonUtils.clone` + per-instance mixer. Empty clips are a bug.
- Loadout is **pre-crawl** (keys 1–6). Do not invent mid-match skill trees.
- Spells are **linear** (projectile / beam / slash / nova / dash) per `SPELLS` in `src/ssot.js`.
- Linear crawl = critical path, 16 rooms, 0 loops unless the user asks for the full graph.
- Secrets stay out of the client. `GEMINI_API_KEY` is agent-only.

## When the user says “tune / polish / feel / HUD / AI skills”

Load and apply, in order:

1. `threejs-gameplay-systems` + `references/game-feel.md` — hitstop, trauma² shake, input <100ms
2. `threejs-game-ui-designer` + `references/ui-patterns.md` — cooldown rings, meters, fail/win, no stat cards
3. `deploy-animated-character` — if any skinned mesh is touched
4. `threejs-debug-profiler` — if T-pose, hitch, or black canvas
5. `threejs-qa-release` — before calling it shipped

Gemini image gen is **blocked in this region** (`location_unsupported`). Use CDN + procedural VFX; do not fake a successful generate.

## Verify

`npm run build`. Play path: Forge → ENTER / `E` → WASD → 1–6 → Esc. Characters must idle, not T-pose.
