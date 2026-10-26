---
name: visual-hud-qa-loop
description: Run an automated Playwright visual & HUD deconfliction QA loop for 2D/3D web games. Verifies non-black canvas rendering, zero HUD bounding-box overlaps, center crosshair clearance, and responsive viewport legibility.
---

# Visual & HUD QA Loop (Helper #7 — The HUD & Visual Sentinel)

Use this skill whenever a change modifies a game's HUD, UI cards, shaders, post-processing, camera framing, or 2D/3D rendering pipeline.

## 1. Visual & Playtest Gate Scoring (`0–6`)

Score the change before launching a multi-iteration visual loop (`0–2` per question):
1. Did the change modify visible 2D/3D rendering, shaders, lighting, or HUD DOM/Canvas overlays?
2. Does playability or aesthetic quality depend on spatial layout, silhouette contrast, or HUD legibility?
3. Could an overlapping HUD panel, obstructed crosshair, or blank WebGL frame reach the player unnoticed?

- **Score `0–2`**: Run standard boot smoke check only.
- **Score `3–4`**: Run 1 headless Playwright capture + HUD bounding-box audit.
- **Score `5–6`**: Run a full multi-scenario Visual & HUD QA Loop (up to 3 render-review-fix iterations).

## 2. Automated Verification Contract

Every Visual & HUD QA run must verify:

1. **Zero Runtime & Asset Errors**:
   - `pageerror` count === `0`
   - `console.error` count === `0`
   - All `.glb`, `.png`, `.svg`, `.mp3/.wav`, and shader requests return `HTTP 200`.
2. **Canvas / WebGL Luminance & Variance Check**:
   - Sample center, upper-sky, and lower-ground regions of the `<canvas>` (or capture buffer) to confirm non-zero pixel variance and avoid all-black (`#000000`) or NaN-washed frames.
3. **HUD Bounding-Box Deconfliction (`overlapCount === 0`)**:
   - Query all visible (`display !== 'none'`, `visibility !== 'hidden'`, `opacity > 0.05`) interactive HUD panels (e.g., `#top-hud`, `#bottom-hud`, `#sp-resource-strip`, `#sp-compass-bar`, `#sp-quest-tracker`, `#sp-target-card`).
   - Compute pairwise Axis-Aligned Bounding Box (AABB) intersections:
     ```js
     const intersects = (a, b, pad = 2) =>
       a.left + pad < b.right - pad &&
       a.right - pad > b.left + pad &&
       a.top + pad < b.bottom - pad &&
       a.bottom - pad > b.top + pad;
     ```
   - Assert zero unintended overlaps and verify that target/inspection cards never cover the center aiming reticle (`center_crosshair_clearance_px >= 120`).
