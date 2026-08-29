# Verification receipt

Receipt scope: executable HarnessMark `1.1.0` candidate at commit
[`b9a79d4`](https://github.com/Dean00dev/HarnessMark/commit/b9a79d45ffc3eb18dca18affa89a2fdc437b4c0a),
verified on 2026-08-29 by post-merge GitHub-hosted CI run
[#15](https://github.com/Dean00dev/HarnessMark/actions/runs/33255480826).

The receipt documents the executable candidate before this receipt-only commit. The final tag must target a descendant that changes documentation only, or the executable checks must be repeated.

## Executed test contract

| Check | Result | Evidence |
|---|---|---|
| Node test suite | Pass | 36 tests, zero failures |
| Gemini CLI adapter | Pass | documented context, skills, extension manifest, MCP and hook paths exercised |
| Current Gemini hook contract | Pass | `BeforeTool`, `AfterAgent`, and `PreCompress` accepted; wrong-host `PreToolUse` rejected |
| Gemini context containment | Pass | escaping and missing context paths rejected deterministically |
| Nested instruction validation | Pass | empty nested `AGENTS.md` rejected instead of counted as conforming |
| Conformance Lock determinism | Pass | identical compatibility state produces identical lock bytes and digest |
| Tool-version independence | Pass | simulated patch-version change preserves the compatibility digest |
| Lock tamper rejection | Pass | content mutation without digest recomputation is rejected as invalid input |
| Lock drift gates | Pass | `any`, `warning`, `error`, and `none` thresholds exercised |
| CLI lock round-trip | Pass | write baseline → compare baseline → zero drift |
| GitHub Action lock outputs | Pass | digest, event count, drift state, report and lock artifact exercised |
| Adversarial fixture campaign | Pass | 12 fixtures, 11 isolated negative paths |
| Five-host portable fixture | Pass | Codex, Claude Code, Cursor, Gemini CLI and GitHub Copilot all reported pass |
| Reporter smoke tests | Pass | table, JSON, JUnit, SARIF and escaped standalone HTML |
| Package inspection | Pass | npm package dry-run succeeds with zero runtime dependencies |
| Inspected extension execution | None | scanner reads metadata and content; no inspected command is spawned |

## Executed on GitHub-hosted runners

Pull-request CI run #14 and post-merge `main` CI run #15 both completed successfully. Each workflow has no conditional job skips and expands to 13 jobs:

| Check | Result | Evidence |
|---|---|---|
| Node test matrix | Pass | Node 20, 22 and 24 on Ubuntu, Windows and macOS (9 jobs) |
| Action-as-an-Action smoke matrix | Pass | `uses: ./` on Ubuntu, Windows and macOS (3 jobs) |
| Conformance Lock Action round-trip | Pass | all three Action jobs generate, compare and verify a stable lock |
| Adversarial campaign and package inspection | Pass | Ubuntu hosted runner (1 job) |
| Stable Action runtime metadata | Pass | HarnessMark Action declares Node 24 |

These runs prove that the checked-in executable candidate completed successfully on those runners. They do not prove correctness beyond the assertions implemented by the tests and smoke jobs.

## Documentation evidence refresh

Gemini CLI first-party documentation was reviewed on 2026-08-29 for Agent Skills discovery, hierarchical `GEMINI.md` context, extension manifests and hook events. Existing Codex, Claude Code, Cursor and GitHub Copilot evidence remains frozen into the ruleset; scans do not fetch documentation dynamically.

## Not yet demonstrated

- npm registry publication or installation;
- false-positive rate on unrelated public repositories;
- performance near hostile input-size limits;
- independent SARIF schema validation;
- authenticated provenance for a saved Conformance Lock;
- host execution or model compliance with inspected instructions.

A Conformance Lock is tamper-evident, not authenticated. A stable lock establishes unchanged documented compatibility state under the current ruleset; it does not prove that a host loaded or followed an artifact, that a model complied with instructions, or that the baseline came from a trusted reviewer.
