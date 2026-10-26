---
name: multi-agent-translator
description: Sync one canonical game-development rulebook (backbone.yml + .vibekit/skills) across Antigravity (.agent/), Claude Code (.claude/), Cursor (.cursor/), Codex (.agents/), OpenCode, and Grok (.grok/).
---

# The Multi-Agent Translator (Helper #2 — `vgdk install`)

Keep one source of truth in `backbone.yml` and `AGENTS.md` while exporting compatible skill and rule surfaces for every AI coding assistant you use.

## Supported Agent Surfaces

- **Antigravity**: `AGENTS.md` + `.agent/skills/`
- **Claude Code**: `CLAUDE.md` + `.claude/skills/`
- **Cursor**: `AGENTS.md` + `.cursor/skills/`
- **Codex & OpenCode**: `AGENTS.md` + `.agents/skills/`
- **Grok**: `AGENTS.md` + `.grok/skills/`

## Invariants

- Never overwrite user-authored sections outside `<!-- BEGIN: vibe-gamedev-kit --> ... <!-- END: vibe-gamedev-kit -->`.
- Validate all mirrored skills against `.vibekit/skills/skills-manifest.json` using `vgdk doctor`.
