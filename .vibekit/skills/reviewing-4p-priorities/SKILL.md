---
name: reviewing-4p-priorities
description: Review game code, shaders, HUD layouts, and gameplay loops and rank findings by urgency from P0 (boot crash / black screen / game-breaking lock) to P4 (visual juice & polish).
---

# The Playtest Reviewer (Helper #9 — `reviewing-4p-priorities`)

Audit game changes twice and classify every finding by player impact:

- **P0 — Blocker (Unplayable)**: Boot crash, WebGL context loss, black/blank canvas, soft-locked game loop, or irreversible asset deletion.
- **P1 — Critical Gameplay / HUD Bug**: Overlapping HUD panels obscuring controls/crosshair, broken collision letting players fall through the world, missing keyboard fallback when PointerLock is inactive, or `<30 FPS` frame spikes.
- **P2 — Major Visual / Mechanics Defect**: Missing sprite-sheet frames, swimming screen-space shader hatching, broken audio synthesizer unlock, or inaccurate XP/damage math vs. spec.
- **P3 — Minor UX / Edge Case**: Mobile viewport clipping, abrupt animation transitions, or missing tooltip hints.
- **P4 — Juice & Polish**: Extra hit-stop frames, particle burst tuning, or micro-animations.
