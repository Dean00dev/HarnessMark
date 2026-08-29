# Conformance Lock

HarnessMark 1.0 adds a deterministic compatibility baseline for AI-agent extension packages.

A normal scan answers **“does this package match the documented harness contracts now?”** A conformance lock adds a second question: **“did the declared compatibility contract change since the baseline I reviewed?”**

## Write a lock

```console
harnessmark check . --write-lock harnessmark.lock.json
```

The lock records the declared targets, discovered host artifacts, host pass/warn/fail state, core portable artifacts, and deterministic findings. It also carries a SHA-256 `contractDigest` over that compatibility state.

HarnessMark's own version is recorded as provenance but is deliberately excluded from the digest. Upgrading HarnessMark does not create drift unless the resulting compatibility contract changes.

## Compare a lock

```console
harnessmark check . \
  --compare-lock harnessmark.lock.json \
  --fail-on-lock-drift any
```

Available gates:

- `any` — fail when any locked compatibility state changes;
- `warning` — fail when a new warning or error finding appears;
- `error` — fail only when a new error finding appears;
- `none` — report drift without failing.

A changed host artifact inventory, target set, core-artifact set, or finding inventory is emitted as a deterministic drift event.

## GitHub Action

```yaml
- uses: Dean00dev/HarnessMark@v1.1.0
  with:
    path: .
    compare-lock: harnessmark.lock.json
    lock-output: current-harnessmark.lock.json
    fail-on-lock-drift: any
```

The Action exposes `lock-digest`, `lock-events`, and `lock-drift` (`not-configured`, `stable`, `changed`, or `failed`).

## Integrity boundary

The lock is tamper-evident, not authenticated. HarnessMark recomputes `contractDigest` and rejects a lock whose contents do not match its digest, but an attacker able to replace both the lock contents and digest can construct a new valid lock.

Keep a gating lock on a protected revision, review changes to it as code, or bind it to an artifact/signature mechanism appropriate to your repository.

A stable lock does not prove host execution, model compliance, evidence quality, or future host behavior. It establishes only that HarnessMark's documented compatibility state is unchanged under the current ruleset.
