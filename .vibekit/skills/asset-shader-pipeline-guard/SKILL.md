---
name: asset-shader-pipeline-guard
description: Validate 3D (.glb/.gltf) and 2D sprite-sheet assets, enforce analytical anti-aliasing in custom GLSL shaders, and guard project assets with recoverable trash-first deletion.
---

# 3D/2D Asset & Shader Pipeline Guard (Helper #8 — The Asset & Shader Warden)

Protect art, 3D models, sprite strips, and custom shaders from corruption, swimming artifacts, or accidental deletion.

## 1. 2D Sprite-Sheet & Atlas Integrity

- Every horizontal sprite strip must satisfy `frameW * frames === naturalWidth` and `frameH === naturalHeight`.
- Pixel-art canvases and `<img>` elements must enforce crisp nearest-neighbor sampling (`image-rendering: pixelated` and `ctx.imageSmoothingEnabled = false`).
- Verify anchor coordinates (`anchor: [ax, ay]`) and foot placement points so characters ground cleanly on islands and terrain tiles.

## 2. 3D `.glb` / Procedural Mesh & Shader Guardrails

- **Analytical Anti-Aliasing (`fwidth` / `aaStep`)**: In custom cel, outline, or procedural terrain shaders, replace hard `step(edge, x)` calls with analytical 1-pixel anti-aliased steps:
  ```glsl
  float aaStep(float threshold, float val) {
    float afwidth = max(length(vec2(dFdx(val), dFdy(val))), 1e-4);
    return smoothstep(threshold - 0.65 * afwidth, threshold + 0.65 * afwidth, val);
  }
  ```
- **Object/World-Locked Hatching**: Never anchor cross-hatching or surface grain to raw screen-space `gl_FragCoord.xy` on moving 3D meshes (causes "shower-door" swimming); use triplanar object-space or world-space coordinates.
- **Mesh Sanitization**: Verify zero `NaN` vertices and valid bounding spheres after procedural lofting or spline subdivision.

## 3. Safe Asset Deletion (`trash`-First Policy)

- Never run irreversible `rm -rf` or overwrite binary art assets (`.glb`, `.png`, `.ogg`, `.wav`) without user confirmation.
- Move superseded assets into a recoverable `.trash/` folder (or OS Trash) and log the backup path.
