import assert from "node:assert/strict";
import path from "node:path";
import { analyze } from "../src/analyzer.js";

const campaign = [
  { fixture: "portable-extension", result: "pass", codes: [] },
  { fixture: "invalid/skill-name", result: "fail", codes: ["HM011"] },
  { fixture: "invalid/mirror-drift", result: "fail", codes: ["HM015"] },
  { fixture: "invalid/plugin-path-escape", result: "fail", codes: ["HM021"] },
  { fixture: "invalid/unsupported-hook", result: "fail", codes: ["HM031"] },
  { fixture: "invalid/cursor-ignored-rule", result: "warn", codes: ["HM041"] },
  { fixture: "invalid/copilot-applyto", result: "fail", codes: ["HM050", "HM051"] }
];

for (const expected of campaign) {
  const root = path.resolve("fixtures", expected.fixture);
  const config = expected.fixture === "portable-extension" ? path.join(root, "harnessmark.yml") : "";
  const result = analyze(root, { config });
  const codes = [...new Set(result.findings.map(({ ruleId }) => ruleId))];
  assert.equal(result.summary.result, expected.result, expected.fixture);
  assert.deepEqual(codes, expected.codes, expected.fixture);
  process.stdout.write(`${expected.result.toUpperCase().padEnd(4)} ${expected.fixture.padEnd(35)} ${codes.join(", ") || "clean"}\n`);
}

process.stdout.write(`\nCampaign passed: ${campaign.length} fixtures, ${campaign.length - 1} negative paths, zero inspected scripts executed.\n`);

