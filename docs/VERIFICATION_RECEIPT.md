# Verification receipt

Receipt scope: source tree for `0.1.0-alpha.1` at commit
[`6696c01`](https://github.com/Dean00dev/HarnessMark/commit/6696c0139dcfc646b96180ad48e9d5539b2e2072),
verified on 2026-08-20.

## Executed locally

| Check | Result | Evidence |
|---|---|---|
| Node test suite | Pass | 21 tests, zero failures |
| Adversarial fixture campaign | Pass | 7 fixtures; 6 isolated negative paths |
| Four-host portable fixture | Pass | Codex, Claude Code, Cursor and GitHub Copilot all reported pass |
| Reporter smoke tests | Pass | table, JSON, JUnit, SARIF and escaped standalone HTML |
| Package inspection | Pass | 20 files; 24.3 kB tarball; zero runtime dependencies |
| Inspected extension execution | None | scanner reads metadata and content; no inspected command is spawned |

## Executed on GitHub-hosted runners

GitHub reported the `CI 3` push workflow successful in 29 seconds for the scoped
commit. The workflow has no conditional job skips and expands to 13 jobs:

| Check | Result | Evidence |
|---|---|---|
| Node test matrix | Pass | Node 20, 22 and 24 on Ubuntu, Windows and macOS (9 jobs) |
| Action-as-an-Action smoke matrix | Pass | `uses: ./` on Ubuntu, Windows and macOS (3 jobs) |
| Adversarial campaign and package inspection | Pass | Ubuntu hosted runner (1 job) |

The run proves that the checked-in workflow completed successfully on those
runners. It does not prove correctness beyond the assertions implemented by the
tests and smoke jobs.

## Not yet demonstrated

- acceptance into GitHub Marketplace;
- install behavior from an immutable public tag;
- npm registry packaging or installation;
- false-positive rate on unrelated public repositories;
- performance near hostile input-size limits;
- independent SARIF schema validation.

This receipt does not convert static documented conformance into behavioral
proof: HarnessMark still cannot establish that a host loaded or followed an
artifact.
