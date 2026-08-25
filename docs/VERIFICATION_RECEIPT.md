# Verification receipt

Receipt scope: executable HarnessMark `1.0.0` candidate at commit
[`8a11df0`](https://github.com/Dean00dev/HarnessMark/commit/8a11df06456fbcbcfd5e922caf1803dae27acb40),
verified on 2026-08-25 by GitHub-hosted CI run #10.

The receipt documents the executed candidate before this receipt-only commit. The final pull-request and post-merge matrices must still pass before the stable tag is created.

## Executed test contract

| Check | Result | Evidence |
|---|---|---|
| Node test suite | Pass | 30 tests, zero failures |
| Conformance Lock determinism | Pass | identical compatibility state produces identical lock bytes and digest |
| Tool-version independence | Pass | simulated patch-version change preserves the compatibility digest |
| Lock tamper rejection | Pass | content mutation without digest recomputation is rejected as invalid input |
| Lock drift gates | Pass | `any`, `warning`, `error`, and `none` thresholds exercised |
| CLI lock round-trip | Pass | write baseline → compare baseline → zero drift |
| GitHub Action lock outputs | Pass | digest, event count, drift state, report and lock artifact exercised |
| Current Cursor hook contract | Pass | `beforeSubmitPrompt`, `afterAgentResponse`, and `afterAgentThought` accepted |
| Adversarial fixture campaign | Pass | existing isolated negative fixtures retained |
| Four-host portable fixture | Pass | Codex, Claude Code, Cursor and GitHub Copilot all reported pass |
| Reporter smoke tests | Pass | table, JSON, JUnit, SARIF and escaped standalone HTML |
| Package inspection | Pass | npm package dry-run succeeds with zero runtime dependencies |
| Inspected extension execution | None | scanner reads metadata and content; no inspected command is spawned |

## Executed on GitHub-hosted runners

GitHub reported CI run #10 successful for the scoped executable candidate. The workflow has no conditional job skips and expands to 13 jobs:

| Check | Result | Evidence |
|---|---|---|
| Node test matrix | Pass | Node 20, 22 and 24 on Ubuntu, Windows and macOS (9 jobs) |
| Action-as-an-Action smoke matrix | Pass | `uses: ./` on Ubuntu, Windows and macOS (3 jobs) |
| Conformance Lock Action round-trip | Pass | all three Action jobs generate, compare and verify a stable lock |
| Adversarial campaign and package inspection | Pass | Ubuntu hosted runner (1 job) |
| Stable Action runtime metadata | Pass | HarnessMark Action declares Node 24 |

The run proves that the checked-in executable candidate completed successfully on those runners. It does not prove correctness beyond the assertions implemented by the tests and smoke jobs.

## Documentation evidence refresh

First-party documentation sources were rechecked on 2026-08-25. In particular, current Cursor documentation lists `beforeSubmitPrompt`, `afterAgentResponse`, and `afterAgentThought`; v1 updates the adapter accordingly. Codex, Claude Code and GitHub Copilot source locations were also revisited as part of the release review.

## Not yet demonstrated

- acceptance into GitHub Marketplace;
- install behavior from the final immutable `v1.0.0` public tag;
- npm registry publication or installation;
- false-positive rate on unrelated public repositories;
- performance near hostile input-size limits;
- independent SARIF schema validation;
- authenticated provenance for a saved Conformance Lock.

A Conformance Lock is tamper-evident, not authenticated. A stable lock establishes unchanged documented compatibility state under the current ruleset; it does not prove that a host loaded or followed an artifact, that a model complied with instructions, or that the baseline came from a trusted reviewer.
