import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { analyze } from "../src/analyzer.js";
import { compareLock, driftFails, loadLock, lockPayload, renderLock, validateLock } from "../src/lock.js";

const fixture = "fixtures/portable-extension";
const config = "fixtures/portable-extension/harnessmark.yml";

function result() {
  return analyze(fixture, { config });
}

test("conformance lock is deterministic for identical compatibility state", () => {
  const first = renderLock(result());
  const second = renderLock(result());
  assert.equal(first, second);
  const parsed = JSON.parse(first);
  assert.match(parsed.contractDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(parsed.tool.version, "1.1.0");
});

test("tool version metadata does not change the compatibility contract digest", () => {
  const current = result();
  const first = lockPayload(current);
  const simulated = structuredClone(current);
  simulated.tool.version = "1.0.1";
  const second = lockPayload(simulated);
  assert.equal(first.contractDigest, second.contractDigest);
  assert.notEqual(first.tool.version, second.tool.version);
});

test("conformance lock validation rejects content tampering", () => {
  const lock = lockPayload(result());
  lock.targets = [...lock.targets, "invented-host"];
  assert.throws(() => validateLock(lock), /contractDigest does not match/);
});

test("lock loader rejects malformed JSON", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "harnessmark-lock-"));
  const file = path.join(directory, "bad.json");
  fs.writeFileSync(file, "{not json");
  assert.throws(() => loadLock(file), /invalid conformance lock JSON/);
});

test("identical lock comparison is stable", () => {
  const current = result();
  const comparison = compareLock(lockPayload(current), current);
  assert.equal(comparison.changed, false);
  assert.deepEqual(comparison.events, []);
  assert.equal(driftFails(comparison, "any"), false);
});

test("host contract and new findings produce deterministic drift events", () => {
  const current = result();
  const previous = lockPayload(current);
  const changed = structuredClone(current);
  changed.hosts[0].artifacts = [...changed.hosts[0].artifacts, "AGENTS-extra.md"].sort();
  changed.findings.push({
    ruleId: "HM999",
    title: "Synthetic test",
    severity: "warning",
    host: "codex",
    path: "AGENTS-extra.md",
    line: 1,
    message: "synthetic compatibility regression"
  });
  const comparison = compareLock(previous, changed);
  assert.equal(comparison.changed, true);
  assert.ok(comparison.events.some((event) => event.kind === "host-contract-changed" && event.host === "codex"));
  assert.ok(comparison.events.some((event) => event.kind === "finding-added" && event.finding.ruleId === "HM999"));
  assert.equal(driftFails(comparison, "warning"), true);
  assert.equal(driftFails(comparison, "error"), false);
  assert.equal(driftFails(comparison, "none"), false);
  assert.equal(driftFails(comparison, "any"), true);
});
