import assert from "node:assert/strict";
import test from "node:test";
import { analyze } from "../src/analyzer.js";
import { htmlReport, junitReport, render, sarifReport, tableReport } from "../src/reporters.js";

const result = analyze("fixtures/invalid/copilot-applyto");

test("JSON reporter is parseable and retains assurance boundary", () => {
  const parsed = JSON.parse(render(result, "json"));
  assert.equal(parsed.assurance.level, "documented-conformance");
  assert.equal(parsed.summary.errors, 2);
});

test("SARIF reporter is SARIF 2.1 and carries findings", () => {
  const parsed = JSON.parse(sarifReport(result));
  assert.equal(parsed.version, "2.1.0");
  assert.equal(parsed.runs[0].results.length, 2);
  assert.equal(parsed.runs[0].results[0].locations[0].physicalLocation.region.startLine, 1);
});

test("JUnit reporter creates a failing host case", () => {
  const xml = junitReport(result);
  assert.match(xml, /testsuite name="HarnessMark documented conformance"/);
  assert.match(xml, /<failure /);
  assert.match(xml, /HM050/);
});

test("HTML reporter escapes project-controlled strings", () => {
  const malicious = structuredClone(result);
  malicious.project.name = "<script>alert(1)</script>";
  malicious.findings[0].message = "<img src=x onerror=alert(1)>";
  const html = htmlReport(malicious);
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img/);
});

test("table report exposes fingerprint and static boundary", () => {
  const output = tableReport(result);
  assert.match(output, /Fingerprint: sha256:/);
  assert.match(output, /does not prove that a host loaded or followed/);
});

