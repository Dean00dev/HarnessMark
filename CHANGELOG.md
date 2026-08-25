# Changelog

All notable changes are recorded here.

## 1.0.0 - 2026-08-25

- Graduate HarnessMark from the first public alpha to the stable v1 contract.
- Add deterministic Conformance Locks for longitudinal compatibility review.
- Add CLI `--write-lock`, `--compare-lock`, and `--fail-on-lock-drift` gates.
- Add GitHub Action lock inputs plus `lock-digest`, `lock-events`, and `lock-drift` outputs.
- Reject malformed and digest-tampered locks as invalid input.
- Keep HarnessMark's own version outside the compatibility digest so a tool-only patch upgrade does not create false drift.
- Add deterministic host-contract, target, core-artifact, and finding drift events.
- Move the GitHub Action runtime from deprecated Node 20 metadata to Node 24 while retaining Node 20+ CLI support.
- Refresh first-party documentation evidence on 2026-08-25.
- Accept currently documented Cursor hooks `beforeSubmitPrompt`, `afterAgentResponse`, and `afterAgentThought`.
- Expand tests for stable locks, tampering, severity gates, CLI round-trips, Action outputs, and current Cursor hook events.

## 0.1.0-alpha.1 - 2026-08-20

- Initial documented-conformance engine for Codex, Claude Code, Cursor, and GitHub Copilot.
- Agent Skills validation, mirrored-skill drift detection, plugin path integrity, hook-event validation, instruction-file validation, and portability warnings.
- Table, JSON, JUnit, SARIF, and single-file HTML compatibility-passport outputs.
- Zero-runtime-dependency CLI and JavaScript GitHub Action.
- Reproducible negative-fixture campaign.
