---
name: rea-mechanics-decompiler
description: Extract reference game mechanics, state machines, progression curves, and combat/building loops using Reverse Engineer Anything (REA) evidence and translate them into structured JSON/Markdown game specs.
---

# REA Game Mechanics Decompiler & Spec Builder (Helper #6 — The Lore & Mechanics Archaeologist)

Ground new game mechanics in concrete decompiled or reference evidence (`docs/rea_<feature>_report.json`) rather than guesswork.

## 1. Evidence-to-Spec Workflow

1. **Identify Target Mechanics**: List the exact systems to extract (e.g., `WearNTear` structural tiers, `Container` inventory transfers, `Tameable`/`Procreation` breeding loops, `Skills` exponential XP tables, or wave/card draft formulas).
2. **Extract & Record Structured Evidence**:
   - Save a clean, deterministic report in `docs/rea_<version>_<topic>_report.json` containing:
     - `source_artifact`: binary, bundle, or reference system analyzed.
     - `systems`: array of extracted classes/modules, state fields, numeric constants, and formulas.
     - `gameplay_mapping`: how each extracted rule maps to the target game's ECS/system classes.
3. **Verify Implementation Parity**:
   - Cross-check implemented constants (HP tiers, XP curves, harvest multipliers, cooldowns) against the JSON spec.
   - Commit the REA report alongside the gameplay vertical slice with a clear summary of what was verified.
