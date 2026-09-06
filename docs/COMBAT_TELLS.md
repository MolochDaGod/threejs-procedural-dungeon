# Combat tells — arrows, AoE, anim FX

Review of **combat.*** sources vs dungeon play. One `TelegraphField` in `src/play/telegraph.js` (Flare shader). Hit resolve stays `pointInCone/Line/Aoe`. Impact FX stay `vfx.js` / `linearCast.js`.

## Sources (do not collapse)

| Host / repo | Role |
|-------------|------|
| https://combat.grudge-studio.com · Gladiators `SaberGame` | Weapon clips, one mixer, F/R skills |
| https://casting.grudge-studio.com | Effect primitives, GroundDecals, dummy **cone / AoE / incoming** |
| Flare `combat/telegraphs.ts` | Shader mask + **fill sweep** + hollow ring + cardinal ticks |
| Dungeon `combat/attacks.js` | Catalog: swipe/slash cone, linear/fire_fan line, circle/column/mist AoE |
| Dungeon `play/linearCast.js` | Travel bolt (shader shaft) after the tell |

## Design (what “arrow” and “AoE” mean)

| Tell | Visual | Anim | Resolve |
|------|--------|------|---------|
| **Cone** (swipe/slash) | Shader wedge + edge; fill grows from caster | `attack` one-shot | `pointInCone` |
| **Line / arrow** (linear, fire_fan) | Corridor + **chevron fill** along forward (skillshot arrow) | `cast` | `pointInLine` then `vfx.beam` / `linearCast.line` |
| **AoE / incoming** (circle, column, mist) | Hollow **danger ring** + ticks on the landing cell | `cast` | `pointInAoe` then nova / gridFire |
| **Impact** | Casting decals (scorch/ripple/crack) + dungeon nova/slash | After windup | Damage + shake |

Windup **fills 0→1**; pulse hardens near impact (Flare `uPulse`). No instant hits (`ENEMY_ATTACKS`).

## Anim FX (combat.* law)

- One mixer; rotation-only retarget; plantFeet **after** `mixer.update`
- Cast tell on attack/cast clip, not a second anim stack
- Melee residual from weapon tip (Casting F) — dungeon uses cone + slash torus
- Travel = linearCast bolt shader, **not** PNG arrows
- Ground decal = tell shader here; Casting `GroundDecals` for scorched aftermath (optional later)

## Gaps (do not invent a third field)

- Casting dummy still uses mesh opacity, not the Flare shader — lab only
- `vfx.cone` / `vfx.linear` are **3D volumes** for player skills; enemy **floor tells** are `TelegraphField`
- fire_fan still one line tell (multi-shot is the projectile, not 5 floor arrows)
