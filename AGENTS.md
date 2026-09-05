# Grudge Dungeons

Warlords Era playable dungeon on the Dungeon Forge pipeline.

## Skills (load these)

Project router: `.grok/skills/grudge-dungeon/SKILL.md`  
Pack: `~/.grok/skills/` from https://github.com/MolochDaGod/threejs-game-skills.git

| Ask | Load |
|-----|------|
| Broad / polish | `threejs-game-director` then siblings |
| Feel / cast / crawl | `threejs-gameplay-systems` + `references/game-feel.md` |
| HUD / 6-slot | `threejs-game-ui-designer` + `references/ui-patterns.md` |
| Any skinned mesh | `deploy-animated-character` |
| Ship | `threejs-qa-release` |

Map: `.grok/skills/grudge-dungeon/references/skill-map.md`

## Hard rules

- Characters: CDN Toon-RTS / uMMORPG only (`src/character/entry.js` + `src/content/era/warlords.js`). Never vendor Unity FBX.
- Deploy with `SkeletonUtils.clone` + per-instance mixer (`src/play/characters.js`).
- Spells are linear. 6-slot bar is chosen **before** the crawl.
- Linear crawl = critical path (cave/door entrance → mini-boss → boss arena). 7 wide rooms.
- Colliders / env layers / ruleset / mechanic worker live in `src/physics`, `src/env`, `src/ruleset.js`, `src/mechanic`, `api/mechanic.js`, `server/`. Extend those — do not add Rapier WASM or a second generator unless asked.
- Crawl completes on **boss slain**. Node `npm start` is the same SPA + `/api`. Railway `dungeon_runs` stays on GrudgeBuilder.
- Loaders / skeleton / helpers / AI: `docs/PLAY_PRACTICE.md`. Flare bosses + KayKit skeletons + shrine wisps from `src/content/flare.js` (live converted GLB). Rapier here is `rapier3d-compat`; R3F Rapier is Forge-only.
- Do not put `GEMINI_API_KEY` or any secret in this client.
- Gemini image gen is location-blocked here — use CDN + procedural VFX.
