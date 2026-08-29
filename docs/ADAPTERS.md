# Adapter contract

Each host adapter has three jobs:

1. Discover only locations documented by the host.
2. Validate rules traceable to first-party documentation.
3. Report uncertainty rather than filling gaps with assumptions.

The current adapters cover:

| Host | Artifact families |
|---|---|
| Codex | `AGENTS.md`, `.agents/skills`, `.codex-plugin/plugin.json`, `.codex/hooks.json` |
| Claude Code | `CLAUDE.md`, `.claude/skills`, `.claude-plugin/plugin.json`, `.claude/settings.json` hooks |
| Cursor | `.cursor/rules`, skills roots, `.cursor-plugin/plugin.json`, `.cursor/hooks.json` |
| Gemini CLI | `GEMINI.md`, `.agents/skills`, `.gemini/skills`, extension `skills/`, `gemini-extension.json`, project and extension hooks |
| GitHub Copilot | repository instructions, path instructions, skills and root agent instruction files |
| Shared specifications | Agent Skills and Agent Plugins manifests, fixed directories and MCP metadata |

## Adding a host

A pull request needs:

- a stable first-party documentation URL;
- an entry in `src/evidence.js` with the evidence review date;
- valid and invalid isolated fixtures;
- exact rule text that does not imply execution;
- tests for path separators where the format is portable;
- an update to `docs/EVIDENCE.md`.

Documentation screenshots, blog posts and another validator's behavior are useful leads, but they are not sufficient normative evidence.
