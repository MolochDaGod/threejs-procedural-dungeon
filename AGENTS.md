# Grudge Dungeons

Warlords Era playable dungeon on the Dungeon Forge pipeline.

- Characters: CDN Toon-RTS / uMMORPG only (`src/ssot.js`). Never vendor Unity FBX.
- Deploy characters with `SkeletonUtils.clone` + per-instance mixer (`src/play/characters.js`).
- Spells are linear (projectile / beam / slash / nova / dash). 6-slot bar is chosen before the crawl.
- Linear crawl follows the generated critical path (entrance → boss).
- Do not put `GEMINI_API_KEY` or any secret in this client.
