---
name: vgdk-init
description: Scan a game project's engine (Three.js, Canvas2D, PixiJS, Phaser, or custom), controls, shaders, and QA setup, then generate a tailored backbone.yml and managed AGENTS.md rulebook after user approval.
---

# The Game Rule Learner (Helper #1 — `vgdk-init`)

Use this skill when initializing the Vibe Game-Dev Kit in a new or existing game project.

## Procedure

1. **Inspect Game Project Read-Only**:
   - Check `package.json`, `index.html`, `server.mjs`, `src/`, and `scripts/` to detect:
     - **Engine**: `threejs` (Three.js / WebGL), `canvas2d` (HTML5 2D Canvas), `pixijs`, or `custom`.
     - **Art Style**: `cel-shaded-3d`, `pixel-art-2d`, `vector-2.5d`, or `stylized-pbr`.
     - **Controls**: PointerLock + WASD, mouse/touch hotspots, or keyboard-only.
     - **Existing QA**: `scripts/qa*`, Playwright tests, or headless screenshot suites.
2. **Ask 2 Quick Preferences**:
   - Prefer recoverable `.trash/` / OS Trash over `rm` for assets and scenes? (Default: `true`)
   - Default explanation level (`0–5`, where `0` = plain designer language and `5` = deep graphics/engine architecture)? (Default: `3`)
3. **Present Proposed `backbone.yml` & `AGENTS.md` Block**:
   - Wait for explicit user approval before writing files, or run `node bin/vgdk.mjs install <game-dir>`.
