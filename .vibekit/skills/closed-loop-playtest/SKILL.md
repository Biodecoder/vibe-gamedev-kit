---
name: closed-loop-playtest
description: Plan, implement, and prove multi-step game features through closed-loop vertical slices. No feature is marked done without automated boot, interaction, HUD non-overlap, and visual screenshot evidence.
---

# The Playtest Promise Keeper (Helper #4 — `closed-loop-playtest`)

For medium or large game features (new biomes, bosses, crafting workstations, UI overhauls, or wave systems), run a closed-loop engineering cycle.

## Closed-Loop Contract ("No Proof, No Done")

1. **Freeze the Vertical Slice**: Define the exact player-visible behavior, affected files, and verification scenarios.
2. **Build Incrementally**: Implement the slice while preserving existing gameplay loops and save compatibility.
3. **Execute Automated Playtest**:
   - Launch the game server and run headless Playwright scenarios (`npm run qa`).
   - Capture screenshots of every new state, modal, or entity.
   - Inspect every captured screenshot and assert `console.error === 0`, `pageerror === 0`, and `hudOverlap === 0`.
4. **Report Evidence**: Summarize changed files, screenshot paths, and verification metrics.
