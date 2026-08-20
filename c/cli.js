#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { analyze, shouldFail } from "./analyzer.js";
import { render } from "./reporters.js";
import { TOOL_VERSION } from "./evidence.js";

const HELP = `HarnessMark ${TOOL_VERSION}

Cross-harness conformance tests for AI-agent extension packs.

Usage:
  harnessmark check [path] [options]

Options:
  --config <file>      Manifest path (harnessmark.yml by default)
  --format <format>    table, json, junit, sarif, or html (default: table)
  --output <file>      Write the report to a file
  --fail-on <level>    error, warning, or none (default: manifest or error)
  --version            Print the version
  --help               Show this help

HarnessMark performs static validation and never executes inspected extension code.`;

function parseArgs(argv) {
  const args = [...argv];
  if (["--help", "-h"].includes(args[0])) return { help: true };
  if (["--version", "-v"].includes(args[0])) return { version: true };
  const command = args.shift() ?? "check";
  if (command !== "check") throw new Error(`unknown command '${command}'`);
  const options = { path: ".", config: "", format: "table", output: "", failOn: "" };
  if (args[0] && !args[0].startsWith("-")) options.path = args.shift();
  while (args.length) {
    const flag = args.shift();
    if (flag === "--help" || flag === "-h") options.help = true;
    else if (flag === "--config") options.config = required(args, flag);
    else if (flag === "--format") options.format = required(args, flag);
    else if (flag === "--output") options.output = required(args, flag);
    else if (flag === "--fail-on") options.failOn = required(args, flag);
    else throw new Error(`unknown option '${flag}'`);
  }
  if (!["table", "json", "junit", "sarif", "html"].includes(options.format)) throw new Error(`unsupported format '${options.format}'`);
  if (options.failOn && !["error", "warning", "none"].includes(options.failOn)) throw new Error("--fail-on must be error, warning, or none");
  return options;
}

function required(args, flag) {
  const value = args.shift();
  if (!value || value.startsWith("--")) throw new Error(`${flag} needs a value`);
  return value;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`HarnessMark: ${error.message}\nTry 'harnessmark --help'.\n`);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    process.stdout.write(`${HELP}\n`);
    return;
  }
  if (options.version) {
    process.stdout.write(`${TOOL_VERSION}\n`);
    return;
  }
  const result = analyze(options.path, { config: options.config });
  let output;
  try {
    output = render(result, options.format);
  } catch (error) {
    process.stderr.write(`HarnessMark: ${error.message}\n`);
    process.exitCode = 2;
    return;
  }
  if (options.output) {
    const destination = path.resolve(options.output);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, output);
    process.stdout.write(`HarnessMark wrote ${options.format} report to ${options.output}\n`);
    if (options.format !== "table") process.stdout.write(render(result, "table"));
  } else {
    process.stdout.write(output);
  }
  const failOn = options.failOn || result.policy.failOn || "error";
  if (shouldFail(result, failOn)) process.exitCode = 1;
}

main();
