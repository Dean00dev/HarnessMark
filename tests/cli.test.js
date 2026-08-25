import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const cli = path.resolve("src/cli.js");

test("CLI exits zero for the portable fixture", () => {
  const run = spawnSync(process.execPath, [cli, "check", "fixtures/portable-extension", "--config", "fixtures/portable-extension/harnessmark.yml"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /Result: PASS/);
});

test("CLI exits one at configured threshold and writes a report", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "harnessmark-report-"));
  const report = path.join(directory, "result.sarif");
  const run = spawnSync(process.execPath, [cli, "check", "fixtures/invalid/cursor-ignored-rule", "--fail-on", "warning", "--format", "sarif", "--output", report], { encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.equal(JSON.parse(fs.readFileSync(report, "utf8")).version, "2.1.0");
});

test("CLI rejects unknown options with usage exit code", () => {
  const run = spawnSync(process.execPath, [cli, "check", "--teleport"], { encoding: "utf8" });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /unknown option/);
});

test("CLI writes and reuses a stable conformance lock", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "harnessmark-lock-cli-"));
  const lock = path.join(directory, "harnessmark.lock.json");
  const write = spawnSync(process.execPath, [
    cli, "check", "fixtures/portable-extension",
    "--config", "fixtures/portable-extension/harnessmark.yml",
    "--write-lock", lock,
    "--fail-on", "none"
  ], { encoding: "utf8" });
  assert.equal(write.status, 0, write.stderr || write.stdout);
  assert.match(JSON.parse(fs.readFileSync(lock, "utf8")).contractDigest, /^sha256:[0-9a-f]{64}$/);

  const compare = spawnSync(process.execPath, [
    cli, "check", "fixtures/portable-extension",
    "--config", "fixtures/portable-extension/harnessmark.yml",
    "--compare-lock", lock,
    "--fail-on-lock-drift", "any"
  ], { encoding: "utf8" });
  assert.equal(compare.status, 0, compare.stderr || compare.stdout);
  assert.match(compare.stdout, /Conformance lock: STABLE · 0 event\(s\)/);
});

test("CLI rejects tampered conformance locks as invalid input", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "harnessmark-lock-tamper-"));
  const lock = path.join(directory, "harnessmark.lock.json");
  const write = spawnSync(process.execPath, [cli, "check", "fixtures/portable-extension", "--config", "fixtures/portable-extension/harnessmark.yml", "--write-lock", lock], { encoding: "utf8" });
  assert.equal(write.status, 0, write.stderr || write.stdout);
  const payload = JSON.parse(fs.readFileSync(lock, "utf8"));
  payload.targets.push("invented-host");
  fs.writeFileSync(lock, JSON.stringify(payload));
  const compare = spawnSync(process.execPath, [cli, "check", "fixtures/portable-extension", "--config", "fixtures/portable-extension/harnessmark.yml", "--compare-lock", lock], { encoding: "utf8" });
  assert.equal(compare.status, 2);
  assert.match(compare.stderr, /contractDigest does not match/);
});

test("JavaScript Action writes outputs, summary, report, and lock state without dependencies", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "harnessmark-action-"));
  const outputFile = path.join(directory, "github-output.txt");
  const summaryFile = path.join(directory, "github-summary.md");
  const reportFile = path.join(directory, "passport.json");
  const lockFile = path.join(directory, "current.lock.json");
  fs.writeFileSync(outputFile, "");
  fs.writeFileSync(summaryFile, "");
  const run = spawnSync(process.execPath, [path.resolve("src/action.js")], {
    encoding: "utf8",
    env: {
      ...process.env,
      INPUT_PATH: "fixtures/portable-extension",
      INPUT_CONFIG: "fixtures/portable-extension/harnessmark.yml",
      "INPUT_FAIL-ON": "error",
      INPUT_FORMAT: "json",
      INPUT_OUTPUT: reportFile,
      INPUT_ANNOTATIONS: "false",
      "INPUT_LOCK-OUTPUT": lockFile,
      GITHUB_OUTPUT: outputFile,
      GITHUB_STEP_SUMMARY: summaryFile
    }
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const outputs = fs.readFileSync(outputFile, "utf8");
  assert.match(outputs, /^result=pass$/m);
  assert.match(outputs, /^errors=0$/m);
  assert.match(outputs, /^lock-drift=not-configured$/m);
  assert.match(outputs, /^lock-digest=sha256:[0-9a-f]{64}$/m);
  assert.match(fs.readFileSync(summaryFile, "utf8"), /Documented conformance only/);
  assert.equal(JSON.parse(fs.readFileSync(reportFile, "utf8")).summary.result, "pass");
  assert.match(JSON.parse(fs.readFileSync(lockFile, "utf8")).contractDigest, /^sha256:[0-9a-f]{64}$/);
});
