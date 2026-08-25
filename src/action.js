import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { analyze, shouldFail } from "./analyzer.js";
import { compareLock, driftFails, loadLock, lockPayload, renderLock } from "./lock.js";
import { markdownSummary, render } from "./reporters.js";

function input(name, fallback = "") {
  return process.env[`INPUT_${name.toUpperCase()}`] ?? process.env[`INPUT_${name.toUpperCase().replaceAll("-", "_")}`] ?? fallback;
}

function commandEscape(value) {
  return String(value).replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

function propertyEscape(value) {
  return commandEscape(value).replaceAll(":", "%3A").replaceAll(",", "%2C");
}

function annotation(level, item) {
  const properties = `file=${propertyEscape(item.path)},line=${item.line},title=${propertyEscape(`${item.ruleId} ${item.title}`)}`;
  process.stdout.write(`::${level} ${properties}::${commandEscape(item.message)}\n`);
}

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${String(value).replaceAll("\n", "%0A")}\n`);
  else process.stdout.write(`::set-output name=${name}::${commandEscape(value)}\n`);
}

const scanPath = input("PATH", ".");
const config = input("CONFIG", "");
const failOn = input("FAIL-ON", "error");
const format = input("FORMAT", "sarif");
const destination = path.resolve(input("OUTPUT", "") || `harnessmark.${format}`);
const annotations = input("ANNOTATIONS", "true").toLowerCase() !== "false";
const compareLockPath = input("COMPARE-LOCK", "");
const lockOutputPath = input("LOCK-OUTPUT", "");
const failOnLockDrift = input("FAIL-ON-LOCK-DRIFT", "any");
const result = analyze(scanPath, { config });

let lockComparison = null;
try {
  if (compareLockPath) lockComparison = compareLock(loadLock(path.resolve(compareLockPath)), result);
  if (lockOutputPath) {
    const lockDestination = path.resolve(lockOutputPath);
    fs.mkdirSync(path.dirname(lockDestination), { recursive: true });
    fs.writeFileSync(lockDestination, renderLock(result));
  }
} catch (error) {
  process.stderr.write(`HarnessMark: ${error.message}\n`);
  process.exitCode = 2;
  process.exit();
}

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, render(result, format));

if (annotations) {
  for (const item of result.findings) annotation(item.severity === "notice" ? "notice" : item.severity, item);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  let summary = markdownSummary(result);
  if (lockComparison) {
    summary += `\n\n### Conformance lock\n\n**${lockComparison.changed ? "Changed" : "Stable"}** · ${lockComparison.events.length} drift event(s).`;
  }
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}

const lock = lockPayload(result);
const lockFailed = lockComparison ? driftFails(lockComparison, failOnLockDrift) : false;
setOutput("result", result.summary.result);
setOutput("errors", result.summary.errors);
setOutput("warnings", result.summary.warnings);
setOutput("report", destination);
setOutput("lock-digest", lock.contractDigest);
setOutput("lock-events", lockComparison?.events.length ?? 0);
setOutput("lock-drift", !lockComparison ? "not-configured" : lockFailed ? "failed" : lockComparison.changed ? "changed" : "stable");

process.stdout.write(`HarnessMark ${result.summary.result}: ${result.summary.errors} errors, ${result.summary.warnings} warnings\n`);
if (lockComparison) process.stdout.write(`Conformance lock ${lockComparison.changed ? "changed" : "stable"}: ${lockComparison.events.length} event(s)\n`);
if (shouldFail(result, failOn) || lockFailed) process.exitCode = 1;
