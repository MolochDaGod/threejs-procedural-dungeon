# Skill map — which threejs-game-skills to load

User pack: `~/.grok/skills/` (synced from https://github.com/MolochDaGod/threejs-game-skills.git).

| User ask | Load |
|----------|------|
| Broad dungeon / polish / “make it a game” | `threejs-game-director` then all five phase skills |
| Combat, cast, crawl, movement, feel | `threejs-gameplay-systems` + `references/game-feel.md` + `references/gameplay-workflows.md` |
| HUD, 6-slot bar, win/lose, mobile | `threejs-game-ui-designer` + `references/ui-patterns.md` |
| Looks cheap, lighting, VFX read | `threejs-aaa-graphics-builder` + visual-scorecard |
| T-pose, mixer, hitch, black screen | `threejs-debug-profiler` + `deploy-animated-character` |
| Ship / deploy / QA | `threejs-qa-release` |
| Concept sheets / icons | `threejs-image-generator` (probe first; this region is blocked) |
| New GLB from image | `threejs-3d-generator` (needs `TRIPO_API_KEY`) |
| SFX / cast VO | `threejs-audio-generator` (needs `ELEVENLABS_API_KEY`) |
| Any skinned spawn | `deploy-animated-character` — non-negotiable |

## Code homes (one fact each)

| Fact | File |
|------|------|
| CDN races / spells / play numbers | `src/ssot.js` |
| Clone + mixer | `src/play/characters.js` |
| Linear VFX | `src/play/vfx.js` |
| Crawl + cast + feel | `src/play/index.js` |
| HUD | `src/play/hud.js` + `src/ui/styles.css` |
| Forge pipeline | `src/main.js` |

Do not duplicate those tables into other skills. Point here.
