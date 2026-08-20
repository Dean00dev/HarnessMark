import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { analyze, shouldFail } from "../src/analyzer.js";

const fixture = (name) => path.resolve("fixtures", name);

test("portable extension passes every claimed host", () => {
  const result = analyze(fixture("portable-extension"), { config: fixture("portable-extension/harnessmark.yml") });
  assert.equal(result.summary.result, "pass");
  assert.equal(result.findings.length, 0);
  assert.deepEqual(result.hosts.map(({ status }) => status), ["pass", "pass", "pass", "pass"]);
  assert.equal(result.assurance.level, "documented-conformance");
  assert.match(result.project.fingerprint, /^sha256:[a-f0-9]{64}$/);
});

test("fingerprint and finding order are deterministic", () => {
  const first = analyze(fixture("invalid/mirror-drift"));
  const second = analyze(fixture("invalid/mirror-drift"));
  assert.equal(first.project.fingerprint, second.project.fingerprint);
  assert.deepEqual(first.findings, second.findings);
});

const cases = [
  ["invalid/skill-name", ["HM011"]],
  ["invalid/mirror-drift", ["HM015"]],
  ["invalid/plugin-path-escape", ["HM021"]],
  ["invalid/unsupported-hook", ["HM031"]],
  ["invalid/cursor-ignored-rule", ["HM041"]],
  ["invalid/copilot-applyto", ["HM050", "HM051"]]
];

for (const [name, expected] of cases) {
  test(`${name} reports its isolated rejection path`, () => {
    const result = analyze(fixture(name));
    const codes = [...new Set(result.findings.map(({ ruleId }) => ruleId))];
    assert.deepEqual(codes, expected);
  });
}

test("a finding on a shared skill affects every host that loads the path", () => {
  const result = analyze(fixture("invalid/mirror-drift"));
  assert.deepEqual(result.hosts.map(({ status }) => status), ["fail", "fail", "fail", "fail"]);
});

test("fail policy distinguishes warnings", () => {
  const result = analyze(fixture("invalid/cursor-ignored-rule"));
  assert.equal(shouldFail(result, "error"), false);
  assert.equal(shouldFail(result, "warning"), true);
  assert.equal(shouldFail(result, "none"), false);
});

test("claimed host without an artifact fails HM003", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "harnessmark-empty-"));
  fs.writeFileSync(path.join(root, "harnessmark.json"), JSON.stringify({ schema: 1, targets: ["codex"] }));
  const result = analyze(root);
  assert.equal(result.summary.result, "fail");
  assert.equal(result.findings[0].ruleId, "HM003");
});

test("invalid manifest becomes a deterministic finding", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "harnessmark-config-"));
  fs.writeFileSync(path.join(root, "harnessmark.yml"), "schema: 2\nunknown: nope\n");
  const result = analyze(root);
  assert.equal(result.findings[0].ruleId, "HM001");
  assert.equal(result.project.fingerprint, "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

