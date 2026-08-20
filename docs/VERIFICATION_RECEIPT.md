# Verification receipt

Receipt scope: source tree for `0.1.0-alpha.1` before its first public GitHub run.

## Executed locally

| Check | Result | Evidence |
|---|---|---|
| Node test suite | Pass | 21 tests, zero failures |
| Adversarial fixture campaign | Pass | 7 fixtures; 6 isolated negative paths |
| Four-host portable fixture | Pass | Codex, Claude Code, Cursor and GitHub Copilot all reported pass |
| Reporter smoke tests | Pass | table, JSON, JUnit, SARIF and escaped standalone HTML |
| Inspected extension execution | None | scanner reads metadata and content; no inspected command is spawned |

## Not yet demonstrated

- execution on GitHub-hosted runners;
- Action execution on Windows and macOS;
- acceptance into GitHub Marketplace;
- install behavior from an immutable public tag;
- npm registry packaging or installation;
- false-positive rate on unrelated public repositories;
- performance near hostile input-size limits;
- independent SARIF schema validation.

The CI workflow is designed to test Node 20, 22 and 24 across Ubuntu, Windows and macOS, plus execute the Action itself on all three operating systems. This receipt must not be amended until those jobs actually run.
