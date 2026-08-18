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

- Characters: CDN Toon-RTS / uMMORPG only (`src/ssot.js`). Never vendor Unity FBX.
- Deploy with `SkeletonUtils.clone` + per-instance mixer (`src/play/characters.js`).
- Spells are linear. 6-slot bar is chosen **before** the crawl.
- Linear crawl = critical path (entrance → boss).
- Do not put `GEMINI_API_KEY` or any secret in this client.
- Gemini image gen is location-blocked here — use CDN + procedural VFX.
