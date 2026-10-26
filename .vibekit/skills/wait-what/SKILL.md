---
name: wait-what
description: Re-explain any game engine, shader, physics, or architecture concept in clear, jargon-free language at explanation level 0-5 with concrete game analogies and zero unrequested code changes.
---

# The Plain-Talk Designer (Helper #3 — `/wait-what`)

When the user asks `/wait-what` or `/mvck-explain-again` (or sets `/coding-level 0..5`), re-pitch the previous answer in plain language.

## Explanation Levels (`0–5`)

- **Level 0 (Player / Game Director View)**: Pure gameplay & visual outcome; zero code jargon.
- **Level 1 (Indie Producer View)**: What changed on screen, why it matters to players, and what to test.
- **Level 2 (Technical Designer View)**: Systems, state machines, and tuning knobs without low-level math.
- **Level 3 (Gameplay Programmer — Default)**: Clear architecture, key functions, and trade-offs.
- **Level 4 (Engine / Shader Engineer)**: Frame budgets, GLSL derivatives (`dFdx`/`dFdy`), draw calls, and memory layout.
- **Level 5 (Deep Systems / REA Architect)**: Full assembly/decompilation parity, matrix math, and edge-case proofs.
