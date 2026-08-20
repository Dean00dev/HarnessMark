import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";
import { HOST_ORDER, HOSTS, RULES, SKILL_SOURCE, TOOL_VERSION, EVIDENCE_CHECKED_AT } from "./evidence.js";
import { lineOf, safeRelative, toPosix, walk } from "./filesystem.js";
import { parseFrontmatter } from "./frontmatter.js";

const SEVERITY_ORDER = Object.freeze({ error: 0, warning: 1, notice: 2 });
const SKILL_NAME = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const PLUGIN_NAME = /^[a-z0-9](?:[a-z0-9.-]{0,62}[a-z0-9])?$/;
const AGENT_PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const AGENT_PLUGIN_MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
const AGENT_PLUGIN_KEYS = new Set([
  "$schema", "name", "version", "description", "author", "homepage", "repository",
  "license", "keywords", "extensions"
]);

const SKILL_ROOTS = Object.freeze([
  { prefix: ".agents/skills/", hosts: ["codex", "cursor", "github-copilot"] },
  { prefix: ".claude/skills/", hosts: ["claude-code", "cursor", "github-copilot"] },
  { prefix: ".cursor/skills/", hosts: ["cursor"] },
  { prefix: ".codex/skills/", hosts: ["cursor"] },
  { prefix: ".github/skills/", hosts: ["github-copilot"] },
  { prefix: "skills/", hosts: [] }
]);

const HOST_SOURCE = Object.freeze(Object.fromEntries(
  HOST_ORDER.map((host) => [host, HOSTS[host].sources[0]])
));

function read(file) {
  return fs.readFileSync(file.absolute, "utf8");
}

function parseJson(file, findings, host, rule = "HM020") {
  try {
    const value = JSON.parse(read(file));
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("expected a JSON object");
    return value;
  } catch (error) {
    findings.push(finding(rule, "error", host, file.path, 1, `Invalid JSON: ${error.message}`));
    return null;
  }
}

function finding(ruleId, severity, host, filePath, line, message, extra = {}) {
  return {
    ruleId,
    title: RULES[ruleId],
    severity,
    host,
    path: filePath,
    line: Math.max(1, Number(line) || 1),
    message,
    certainty: extra.certainty ?? "documented",
    sourceUrl: extra.sourceUrl ?? (host && HOST_SOURCE[host]) ?? "https://agent-plugins.org/specification",
    evidence: extra.evidence ?? "",
    ...extra
  };
}

function pathIn(relative, prefix) {
  return relative === prefix.replace(/\/$/, "") || relative.startsWith(prefix);
}

function hostsForSkill(relative) {
  const match = SKILL_ROOTS.find(({ prefix }) => pathIn(relative, prefix));
  return match?.hosts ?? [];
}

function isSkill(relative) {
  return relative.endsWith("/SKILL.md") && SKILL_ROOTS.some(({ prefix }) => pathIn(relative, prefix));
}

function artifactHosts(relative) {
  const hosts = new Set();
  if (relative === "AGENTS.md" || relative.endsWith("/AGENTS.md")) {
    hosts.add("codex");
    hosts.add("github-copilot");
  }
  if (relative === "CLAUDE.md") {
    hosts.add("claude-code");
    hosts.add("github-copilot");
  }
  if (relative === "GEMINI.md") hosts.add("github-copilot");
  for (const host of hostsForSkill(relative)) hosts.add(host);
  if (pathIn(relative, ".codex-plugin/") || pathIn(relative, ".codex/")) hosts.add("codex");
  if (pathIn(relative, ".claude-plugin/") || pathIn(relative, ".claude/")) hosts.add("claude-code");
  if (pathIn(relative, ".cursor-plugin/") || pathIn(relative, ".cursor/")) hosts.add("cursor");
  if (relative === ".github/copilot-instructions.md" || pathIn(relative, ".github/instructions/") || pathIn(relative, ".github/skills/")) {
    hosts.add("github-copilot");
  }
  return [...hosts];
}

function validateSkill(file, text, findings) {
  const hosts = hostsForSkill(file.path);
  const host = hosts[0] ?? null;
  const parsed = parseFrontmatter(text);
  if (parsed.error) {
    findings.push(finding("HM010", "error", host, file.path, 1, parsed.error, { sourceUrl: SKILL_SOURCE }));
    return;
  }
  const name = parsed.attributes.name;
  const description = parsed.attributes.description;
  const directory = file.path.split("/").at(-2);
  if (typeof name !== "string" || !SKILL_NAME.test(name) || name.includes("--")) {
    findings.push(finding("HM011", "error", host, file.path, lineOf(text, "name:"),
      "name must be 1–64 lowercase letters, digits, or single hyphens", { sourceUrl: SKILL_SOURCE }));
  } else if (name !== directory) {
    findings.push(finding("HM012", "error", host, file.path, lineOf(text, "name:"),
      `frontmatter name '${name}' does not match directory '${directory}'`, { sourceUrl: SKILL_SOURCE }));
  }
  if (typeof description !== "string" || !description.trim() || description.length > 1024) {
    findings.push(finding("HM013", "error", host, file.path, lineOf(text, "description:"),
      "description must be a non-empty string no longer than 1024 characters", { sourceUrl: SKILL_SOURCE }));
  }
  const lines = text.replace(/\r\n?/g, "\n").split("\n").length;
  if (lines > 500) {
    findings.push(finding("HM014", "warning", host, file.path, 1,
      `SKILL.md has ${lines} lines; the specification recommends progressive disclosure below 500 lines`,
      { sourceUrl: SKILL_SOURCE }));
  }
  if (!parsed.body.trim()) {
    findings.push(finding("HM060", "error", host, file.path, lines, "Agent Skill body is empty"));
  }
}

function validateMirrors(skillFiles, findings) {
  const groups = new Map();
  for (const file of skillFiles) {
    const skillName = file.path.split("/").at(-2);
    const digest = crypto.createHash("sha256").update(read(file).replace(/\r\n?/g, "\n")).digest("hex");
    if (!groups.has(skillName)) groups.set(skillName, []);
    groups.get(skillName).push({ file, digest });
  }
  for (const [name, copies] of groups) {
    if (copies.length < 2 || new Set(copies.map(({ digest }) => digest)).size === 1) continue;
    const paths = copies.map(({ file }) => file.path).join(", ");
    for (const { file } of copies) {
      findings.push(finding("HM015", "error", hostsForSkill(file.path)[0] ?? null, file.path, 1,
        `mirrored skill '${name}' differs across: ${paths}`, { sourceUrl: SKILL_SOURCE }));
    }
  }
}

function validatePluginName(name, file, findings, host, sourceUrl) {
  if (typeof name !== "string" || !PLUGIN_NAME.test(name) || name.includes("--") || name.includes("..")) {
    findings.push(finding("HM023", "error", host, file.path, 1,
      "plugin name must be 1–64 lowercase letters, digits, dots, or single hyphens", { sourceUrl }));
  }
}

function pathValues(value, prefix = "") {
  const values = [];
  if (typeof value === "string") values.push({ key: prefix, value });
  else if (Array.isArray(value)) {
    value.forEach((item, index) => values.push(...pathValues(item, `${prefix}[${index}]`)));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) values.push(...pathValues(item, prefix ? `${prefix}.${key}` : key));
  }
  return values;
}

function validateComponentPaths(manifest, file, root, findings, host) {
  const pathFields = ["skills", "rules", "agents", "commands", "hooks", "mcpServers"];
  for (const field of pathFields) {
    if (!(field in manifest)) continue;
    for (const item of pathValues(manifest[field], field)) {
      if (/^(?:https?:|stdio:)/.test(item.value) || item.value.includes("${")) continue;
      const checked = safeRelative(root, item.value);
      if (!checked.ok) {
        findings.push(finding("HM021", "error", host, file.path, 1,
          `${item.key} ${checked.reason}: '${item.value}'`));
      } else if (!fs.existsSync(checked.absolute)) {
        findings.push(finding("HM022", "error", host, file.path, 1,
          `${item.key} references missing path '${item.value}'`));
      }
    }
  }
}

function validatePlugin(file, root, findings) {
  const host = file.path === ".codex-plugin/plugin.json" ? "codex"
    : file.path === ".claude-plugin/plugin.json" ? "claude-code"
      : file.path === ".cursor-plugin/plugin.json" ? "cursor" : null;
  const manifest = parseJson(file, findings, host);
  if (!manifest) return;
  const sourceUrl = host ? HOST_SOURCE[host] : "https://agent-plugins.org/plugin-authors/manifest";
  if (file.path === "plugin.json") {
    if (manifest.$schema !== AGENT_PLUGIN_SCHEMA) {
      findings.push(finding("HM020", "error", null, file.path, 1,
        `Agent Plugin $schema must be '${AGENT_PLUGIN_SCHEMA}'`, { sourceUrl }));
    }
    for (const required of ["$schema", "name"]) {
      if (!(required in manifest)) findings.push(finding("HM020", "error", null, file.path, 1,
        `Agent Plugin manifest is missing '${required}'`, { sourceUrl }));
    }
    for (const key of Object.keys(manifest)) {
      if (!AGENT_PLUGIN_KEYS.has(key)) findings.push(finding("HM020", "error", null, file.path, 1,
        `Agent Plugin manifest contains unsupported top-level field '${key}'`, { sourceUrl }));
    }
  } else if (!("name" in manifest)) {
    findings.push(finding("HM020", "error", host, file.path, 1, "plugin manifest is missing 'name'", { sourceUrl }));
  }
  validatePluginName(manifest.name, file, findings, host, sourceUrl);
  validateComponentPaths(manifest, file, root, findings, host);
  if ((host === "codex" || host === "claude-code") && (!manifest.version || !manifest.description)) {
    findings.push(finding("HM020", "warning", host, file.path, 1,
      "version and description improve portable plugin metadata and discovery", { sourceUrl }));
  }
}

function validateMcp(file, findings) {
  const data = parseJson(file, findings, null, "HM020");
  if (!data) return;
  const sourceUrl = "https://agent-plugins.org/plugin-authors/mcp-servers";
  if (data.$schema !== AGENT_PLUGIN_MCP_SCHEMA) {
    findings.push(finding("HM020", "error", null, file.path, 1,
      `mcp.json $schema must be '${AGENT_PLUGIN_MCP_SCHEMA}'`, { sourceUrl }));
  }
  for (const key of Object.keys(data)) {
    if (!["$schema", "mcpServers"].includes(key)) findings.push(finding("HM020", "error", null, file.path, 1,
      `mcp.json contains unsupported top-level field '${key}'`, { sourceUrl }));
  }
  if (!data.mcpServers || Array.isArray(data.mcpServers) || typeof data.mcpServers !== "object") {
    findings.push(finding("HM020", "error", null, file.path, 1, "mcpServers must be an object", { sourceUrl }));
    return;
  }
  for (const [name, server] of Object.entries(data.mcpServers)) {
    if (!server || Array.isArray(server) || typeof server !== "object") {
      findings.push(finding("HM020", "error", null, file.path, 1, `MCP server '${name}' must be an object`, { sourceUrl }));
      continue;
    }
    if (!server.command && !server.url) {
      findings.push(finding("HM020", "error", null, file.path, 1, `MCP server '${name}' needs command or url`, { sourceUrl }));
    }
    if (typeof server.command === "string" && /\s/.test(server.command.trim())) {
      findings.push(finding("HM020", "error", null, file.path, 1,
        `MCP server '${name}' command must be one executable token; put arguments in args`, { sourceUrl }));
    }
  }
}

function hookCommands(value, found = []) {
  if (Array.isArray(value)) value.forEach((item) => hookCommands(item, found));
  else if (value && typeof value === "object") {
    if (typeof value.command === "string") found.push(value);
    for (const child of Object.values(value)) hookCommands(child, found);
  }
  return found;
}

function validateHookCommand(command, entry, file, root, findings, host) {
  const commandWindows = typeof entry.commandWindows === "string" || typeof entry.command_windows === "string";
  if (!commandWindows && /(?:^|\s)(?:bash|sh|zsh|\.\/|\/bin\/|\$PWD\b)|\.sh(?:\s|$)/.test(command)) {
    findings.push(finding("HM033", "warning", host, file.path, 1,
      `command may not be portable to Windows: '${command}'`));
  }
  const tokens = command.match(/(?:^|\s)(\.?\/?(?:\.codex|\.claude|\.cursor|hooks|scripts)\/[A-Za-z0-9_./-]+)/g) ?? [];
  for (const raw of tokens) {
    const candidate = raw.trim().replace(/^\.\//, "").replace(/[),;]+$/, "");
    if (candidate.includes("${")) continue;
    const absolute = path.resolve(root, candidate);
    if (!fs.existsSync(absolute)) findings.push(finding("HM032", "error", host, file.path, 1,
      `command references missing project file '${candidate}'`));
  }
}

function validateHooks(file, root, findings, host) {
  const data = parseJson(file, findings, host, "HM030");
  if (!data) return;
  if (host === "cursor" && data.version !== 1) {
    findings.push(finding("HM030", "error", host, file.path, 1, "Cursor hooks.json version must be 1"));
  }
  const hooks = data.hooks;
  if (!hooks || Array.isArray(hooks) || typeof hooks !== "object") {
    findings.push(finding("HM030", "error", host, file.path, 1, "hook configuration needs a hooks object"));
    return;
  }
  for (const [event, entries] of Object.entries(hooks)) {
    if (!HOSTS[host].hookEvents.has(event)) {
      findings.push(finding("HM031", "error", host, file.path, 1, `event '${event}' is not documented for ${HOSTS[host].label}`));
    }
    const commands = hookCommands(entries);
    if (!commands.length) findings.push(finding("HM030", "warning", host, file.path, 1,
      `event '${event}' contains no command hook`));
    for (const entry of commands) validateHookCommand(entry.command, entry, file, root, findings, host);
  }
}

function validateCursorRule(file, findings) {
  const text = read(file);
  if (file.path.endsWith(".md")) {
    findings.push(finding("HM041", "warning", "cursor", file.path, 1,
      "Cursor project rules use .mdc; this .md file is not loaded as a project rule"));
    return;
  }
  const parsed = parseFrontmatter(text);
  if (parsed.error) {
    findings.push(finding("HM040", "error", "cursor", file.path, 1, parsed.error));
    return;
  }
  if (parsed.attributes.alwaysApply !== undefined && typeof parsed.attributes.alwaysApply !== "boolean") {
    findings.push(finding("HM040", "error", "cursor", file.path, lineOf(text, "alwaysApply:"),
      "alwaysApply must be true or false"));
  }
  if (!parsed.body.trim()) findings.push(finding("HM060", "error", "cursor", file.path, 1, "Cursor rule body is empty"));
}

function validateCopilotInstruction(file, findings) {
  const text = read(file);
  const parsed = parseFrontmatter(text);
  if (parsed.error) {
    findings.push(finding("HM050", "error", "github-copilot", file.path, 1, parsed.error));
    return;
  }
  if (typeof parsed.attributes.applyTo !== "string" || !parsed.attributes.applyTo.trim()) {
    findings.push(finding("HM050", "error", "github-copilot", file.path, 1,
      "path-specific Copilot instructions require a non-empty applyTo glob"));
  }
  if (parsed.attributes.excludeAgent !== undefined && !["code-review", "cloud-agent"].includes(parsed.attributes.excludeAgent)) {
    findings.push(finding("HM051", "error", "github-copilot", file.path, lineOf(text, "excludeAgent:"),
      "excludeAgent must be code-review or cloud-agent"));
  }
  if (!parsed.body.trim()) findings.push(finding("HM060", "error", "github-copilot", file.path, 1,
    "Copilot instruction body is empty"));
}

function validateInstruction(file, findings) {
  if (!read(file).trim()) {
    const host = artifactHosts(file.path)[0] ?? null;
    findings.push(finding("HM060", "error", host, file.path, 1, "instruction file is empty"));
  }
}

function fingerprint(files, symlinks) {
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(`file\0${file.path}\0`);
    hash.update(fs.readFileSync(file.absolute));
    hash.update("\0");
  }
  for (const link of symlinks) hash.update(`symlink\0${link.path}\0${fs.readlinkSync(link.absolute)}\0`);
  return `sha256:${hash.digest("hex")}`;
}

function compareFindings(a, b) {
  return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    || compareText(a.host ?? "", b.host ?? "")
    || compareText(a.path, b.path)
    || a.line - b.line
    || compareText(a.ruleId, b.ruleId)
    || compareText(a.message, b.message);
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function shouldFail(result, failOn = "error") {
  if (failOn === "none") return false;
  if (failOn === "warning") return result.summary.errors + result.summary.warnings > 0;
  return result.summary.errors > 0;
}

export function analyze(scanPath = ".", options = {}) {
  let loaded;
  try {
    loaded = loadConfig(scanPath, options.config ?? "");
  } catch (error) {
    const failed = finding("HM001", "error", null, options.config || "harnessmark.yml", 1, error.message);
    return finalize(path.resolve(scanPath), { name: path.basename(path.resolve(scanPath)), targets: null, fail_on: "error" }, [], [], [failed]);
  }
  const { root, config } = loaded;
  const { files, symlinks } = walk(root, config.exclude);
  const findings = [];
  const byPath = new Map(files.map((file) => [file.path, file]));
  const artifacts = Object.fromEntries(HOST_ORDER.map((host) => [host, new Set()]));
  const coreArtifacts = new Set();

  for (const file of files) {
    for (const host of artifactHosts(file.path)) artifacts[host].add(file.path);
    if (isSkill(file.path)) validateSkill(file, read(file), findings);
    if (["plugin.json", ".codex-plugin/plugin.json", ".claude-plugin/plugin.json", ".cursor-plugin/plugin.json"].includes(file.path)) {
      validatePlugin(file, root, findings);
      if (file.path === "plugin.json") coreArtifacts.add(file.path);
    }
    if (file.path === "mcp.json" && byPath.has("plugin.json")) {
      validateMcp(file, findings);
      coreArtifacts.add(file.path);
    }
    if (file.path === ".codex/hooks.json") validateHooks(file, root, findings, "codex");
    if (file.path === ".claude/settings.json") {
      const probe = parseJson(file, findings, "claude-code", "HM030");
      if (probe?.hooks) validateHooks(file, root, findings, "claude-code");
    }
    if (file.path === ".cursor/hooks.json") validateHooks(file, root, findings, "cursor");
    if (pathIn(file.path, ".cursor/rules/") && (file.path.endsWith(".mdc") || file.path.endsWith(".md"))) validateCursorRule(file, findings);
    if (pathIn(file.path, ".github/instructions/") && file.path.endsWith(".instructions.md")) validateCopilotInstruction(file, findings);
    if (["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".github/copilot-instructions.md"].includes(file.path)) validateInstruction(file, findings);
  }

  validateMirrors(files.filter((file) => isSkill(file.path)), findings);

  for (const link of symlinks) {
    const hosts = artifactHosts(link.path);
    if (hosts.length || isSkill(link.path)) findings.push(finding("HM016", "warning", hosts[0] ?? null, link.path, 1,
      "symbolic links are recorded but not followed; verify package behavior after checkout", { sourceUrl: SKILL_SOURCE }));
  }

  const targets = config.targets ?? HOST_ORDER.filter((host) => artifacts[host].size > 0);
  for (const target of targets) {
    if (artifacts[target].size === 0) findings.push(finding("HM003", "error", target, loaded.configPath ? toPosix(path.relative(root, loaded.configPath)) : "harnessmark.yml", 1,
      `${HOSTS[target].label} is claimed but no documented artifact location was found`));
  }

  return finalize(root, config, files, symlinks, findings, artifacts, coreArtifacts, targets);
}

function finalize(root, config, files, symlinks, findings, artifactSets = null, coreArtifacts = new Set(), targets = []) {
  findings.sort(compareFindings);
  const summary = {
    errors: findings.filter(({ severity }) => severity === "error").length,
    warnings: findings.filter(({ severity }) => severity === "warning").length,
    notices: findings.filter(({ severity }) => severity === "notice").length
  };
  summary.result = summary.errors ? "fail" : summary.warnings ? "warn" : "pass";
  const hosts = HOST_ORDER.map((id) => {
    const paths = artifactSets ? [...artifactSets[id]].sort() : [];
    const hostFindings = findings.filter((item) => item.host === id || paths.includes(item.path));
    const claimed = targets.includes(id);
    const status = hostFindings.some(({ severity }) => severity === "error") ? "fail"
      : hostFindings.some(({ severity }) => severity === "warning") ? "warn"
        : paths.length ? "pass" : claimed ? "fail" : "absent";
    return { id, label: HOSTS[id].label, claimed, status, artifactCount: paths.length, artifacts: paths, sources: HOSTS[id].sources };
  });
  return {
    schema: 1,
    tool: { name: "HarnessMark", version: TOOL_VERSION, evidenceCheckedAt: EVIDENCE_CHECKED_AT },
    assurance: {
      level: "documented-conformance",
      statement: "Static evidence only: this result does not prove that a host loaded or followed an artifact."
    },
    project: { name: config.name || path.basename(root), root: ".", fingerprint: fingerprint(files, symlinks) },
    targets,
    coreArtifacts: [...coreArtifacts].sort(),
    hosts,
    summary,
    policy: { failOn: config.fail_on ?? "error" },
    findings
  };
}
