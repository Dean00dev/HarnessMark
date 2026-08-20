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

test("JavaScript Action writes outputs, summary, and report without dependencies", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "harnessmark-action-"));
  const outputFile = path.join(directory, "github-output.txt");
  const summaryFile = path.join(directory, "github-summary.md");
  const reportFile = path.join(directory, "passport.json");
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
      GITHUB_OUTPUT: outputFile,
      GITHUB_STEP_SUMMARY: summaryFile
    }
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(fs.readFileSync(outputFile, "utf8"), /^result=pass$/m);
  assert.match(fs.readFileSync(outputFile, "utf8"), /^errors=0$/m);
  assert.match(fs.readFileSync(summaryFile, "utf8"), /Documented conformance only/);
  assert.equal(JSON.parse(fs.readFileSync(reportFile, "utf8")).summary.result, "pass");
});
