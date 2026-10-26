# AGENTS.md

Shared Game-Development instructions for Antigravity, Claude Code, Cursor, Codex, OpenCode, Grok, and other coding agents.

<!-- BEGIN: vibe-gamedev-kit -->
## Vibe Game-Dev Kit (VGDK)

### Source of truth

- Read `backbone.yml` before changing game code, shaders, HUD layouts, or assets.
- If `meta.template_status` is `uninitialized`, follow `.vibekit/skills/vgdk-init/SKILL.md` to inspect the game's engine, controls, art style, and performance targets, then wait for user approval before writing.
- Follow the `gamedev` and `conventions` rules in `backbone.yml`; ask before changing core rendering pipelines, camera systems, or save schemas.

### The 9 Game-Dev Village Helpers

1. **The Game Rule Learner (`vgdk-init`)**: Inspects the game's engine (`Three.js`, `Canvas2D`, `PixiJS`), viewport, controls, and art style, then proposes `backbone.yml`.
2. **The Multi-Agent Translator (`vgdk install`)**: Mirrors your game-dev rulebook and skills across Antigravity (`.agent/`), Claude Code (`.claude/`), Cursor (`.cursor/`), Codex (`.agents/`), OpenCode, and Grok.
3. **The Plain-Talk Designer (`wait-what`)**: Re-explains complex shader math, frame-time bottlenecks, or ECS state transitions in clear, jargon-free language at your chosen explanation level (`0–5`).
4. **The Playtest Promise Keeper (`closed-loop-playtest`)**: Splits large game features into playable vertical slices and requires headless screenshot + console/runtime proof before marking any slice "done".
5. **The 60FPS Forgemaster (`playable-loop-60fps-gate`)**: Enforces 60FPS hot-loop discipline (zero per-frame allocations, instanced rendering, delta clamping), solid collision, and `WASD` keyboard fallbacks when PointerLock is inactive.
6. **The Lore & Mechanics Archaeologist (`rea-mechanics-decompiler`)**: Extracts reference game mechanics, XP curves, and combat/building systems via REA into structured JSON specs (`docs/rea_*_report.json`) and clean milestone commits.
7. **The HUD & Visual Sentinel (`visual-hud-qa-loop`)**: Runs automated Playwright visual loops, verifies non-black canvas rendering, and checks DOM bounding boxes so HUD panels never overlap the crosshair or playfield.
8. **The Asset & Shader Warden (`asset-shader-pipeline-guard`)**: Validates `.glb`/`.gltf` bounds, sprite-sheet frame dimensions (`frameW * frames === width`), and analytical shader anti-aliasing (`fwidth`/`aaStep`), while enforcing recoverable `trash`-first asset deletion.
9. **The Playtest Reviewer (`reviewing-4p-priorities`)**: Audits gameplay and rendering diffs and sorts findings from `P0` (boot crash / black screen / broken loop) to `P4` (juice / polish).

### Game-Dev Work Style & Proportional Effort

- Triage every game task as `trivial` (tuning constants/copy), `small` (single UI/entity tweak), `medium` (new gameplay mechanic/shader), or `large` (new biome, boss raid, or multi-system overhaul).
- Score the **Visual & Playtest Gate (`0–6`)** before running multi-iteration visual loops:
  1. Did the change alter visible 2D/3D rendering, shaders, or HUD layout? (`0–2`)
  2. Does playability depend on spatial layout, readability, or frame pacing? (`0–2`)
  3. Could a HUD overlap, broken animation strip, or input lock reach the player unnoticed? (`0–2`)
- Always run the verification command listed in `backbone.yml` after gameplay, HUD, or rendering changes and report:
  - **Done**: Playable behavior delivered and verified.
  - **Proof**: Headless QA metrics (FPS, zero console/page errors, HUD overlap count `0`, canvas luminance check).
  - **Next**: Follow-up slice or user decision needed.
<!-- END: vibe-gamedev-kit -->
