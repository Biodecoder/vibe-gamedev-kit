---
name: playable-loop-60fps-gate
description: Enforce 60FPS frame-time budgets, zero hot-loop allocations, GPU instancing, solid collision, and keyboard-only camera/movement fallbacks across 6 game-delivery quality gates.
---

# Playable Loop & 60FPS Gatekeeper (Helper #5 — The 60FPS Forgemaster)

Deliver every gameplay slice through **6 Game Quality Gates** (`Specify -> Build Loop -> Hot-Loop Optimize -> Input & Collision Harden -> HUD Deconflict -> Playtest Prove`).

## 1. The 6 Game Quality Gates

1. **Gate 1 — Specify Slice**: Freeze the player verb, inputs, state transitions, and measurable proof criteria.
2. **Gate 2 — Build Core Loop**: Implement the entity/system update and state transitions (`Title -> Active Play -> Pause/Modal -> Victory/Game Over -> Restart`).
3. **Gate 3 — 60FPS Hot-Loop Audit**:
   - Clamp `dt = Math.min(rawDeltaSeconds, 0.05)` in `requestAnimationFrame` so tab switching never teleports entities through walls.
   - **Forbid allocations inside `update(dt)` / `render()`**: pre-allocate scratch `THREE.Vector3`, `THREE.Matrix4`, `THREE.Quaternion`, and `THREE.Color` instances at module/class scope.
   - Use `THREE.InstancedMesh` (or batched sprite buffers in 2D) whenever rendering `>= 32` repeated props (foliage, grass, particles, projectiles, foam tiles).
4. **Gate 4 — Input Fallback & Collision Hardening**:
   - When `PointerLock` is used for 3D camera look, always provide a `[WASD]` / Arrow-key look/move fallback when `document.pointerLockElement === null` so headless playtests and windowed users never get stuck.
   - Verify solid collision resolution against world bounds, walls, trees, boulders, and workstations.
5. **Gate 5 — HUD & Feedback Sync**: Ensure floating numbers, XP tickers, and audio cues clean up deterministically with object pooling.
6. **Gate 6 — Playable Proof**: Run headless Playwright smoke + FPS sampling before reporting completion.
