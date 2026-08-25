import crypto from "node:crypto";
import fs from "node:fs";

const LOCK_SCHEMA = 1;

function stableHost(host) {
  return {
    id: host.id,
    claimed: Boolean(host.claimed),
    status: host.status,
    artifacts: [...host.artifacts].sort()
  };
}

function stableFinding(item) {
  return {
    ruleId: item.ruleId,
    severity: item.severity,
    host: item.host ?? null,
    path: item.path,
    line: item.line,
    message: item.message
  };
}

function contractState(value) {
  return {
    assurance: value.assurance,
    project: value.project,
    targets: value.targets,
    coreArtifacts: value.coreArtifacts,
    hosts: value.hosts,
    findings: value.findings
  };
}

function digestContract(value) {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(contractState(value))).digest("hex")}`;
}

export function lockPayload(result) {
  const payload = {
    schema: LOCK_SCHEMA,
    tool: { name: "HarnessMark", version: result.tool.version },
    assurance: result.assurance.level,
    project: { name: result.project.name },
    targets: [...result.targets].sort(),
    coreArtifacts: [...result.coreArtifacts].sort(),
    hosts: result.hosts.map(stableHost),
    findings: result.findings.map(stableFinding)
  };
  return { ...payload, contractDigest: digestContract(payload) };
}

export function renderLock(result) {
  return `${JSON.stringify(lockPayload(result), null, 2)}\n`;
}

export function loadLock(file) {
  const raw = fs.readFileSync(file, "utf8");
  let value;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new Error(`invalid conformance lock JSON: ${error.message}`);
  }
  validateLock(value);
  return value;
}

export function validateLock(value) {
  if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("conformance lock must be a JSON object");
  if (value.schema !== LOCK_SCHEMA) throw new Error(`unsupported conformance lock schema '${value.schema}'`);
  if (value.tool?.name !== "HarnessMark" || typeof value.tool.version !== "string") throw new Error("conformance lock has invalid tool metadata");
  if (typeof value.assurance !== "string" || !value.project || typeof value.project.name !== "string") throw new Error("conformance lock has invalid project metadata");
  if (!Array.isArray(value.targets) || !Array.isArray(value.coreArtifacts) || !Array.isArray(value.hosts) || !Array.isArray(value.findings)) {
    throw new Error("conformance lock is missing required arrays");
  }
  if (typeof value.contractDigest !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value.contractDigest)) {
    throw new Error("conformance lock has invalid contractDigest");
  }
  if (value.contractDigest !== digestContract(value)) throw new Error("conformance lock contractDigest does not match its contents");
}

export function compareLock(previous, result) {
  validateLock(previous);
  const current = lockPayload(result);
  const events = [];

  const previousHosts = new Map(previous.hosts.map((host) => [host.id, host]));
  const currentHosts = new Map(current.hosts.map((host) => [host.id, host]));
  for (const id of [...new Set([...previousHosts.keys(), ...currentHosts.keys()])].sort()) {
    const before = previousHosts.get(id) ?? null;
    const after = currentHosts.get(id) ?? null;
    if (JSON.stringify(before) !== JSON.stringify(after)) events.push({ kind: "host-contract-changed", host: id, before, after });
  }

  if (JSON.stringify(previous.targets) !== JSON.stringify(current.targets)) {
    events.push({ kind: "targets-changed", before: previous.targets, after: current.targets });
  }
  if (JSON.stringify(previous.coreArtifacts) !== JSON.stringify(current.coreArtifacts)) {
    events.push({ kind: "core-artifacts-changed", before: previous.coreArtifacts, after: current.coreArtifacts });
  }

  const key = (item) => JSON.stringify(item);
  const beforeFindings = new Map(previous.findings.map((item) => [key(item), item]));
  const afterFindings = new Map(current.findings.map((item) => [key(item), item]));
  for (const [identity, item] of beforeFindings) {
    if (!afterFindings.has(identity)) events.push({ kind: "finding-removed", finding: item });
  }
  for (const [identity, item] of afterFindings) {
    if (!beforeFindings.has(identity)) events.push({ kind: "finding-added", finding: item });
  }

  events.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return {
    schema: 1,
    previousDigest: previous.contractDigest,
    currentDigest: current.contractDigest,
    changed: previous.contractDigest !== current.contractDigest,
    events
  };
}

export function driftFails(comparison, mode = "any") {
  if (mode === "none") return false;
  if (mode === "error") return comparison.events.some((event) => event.kind === "finding-added" && event.finding?.severity === "error");
  if (mode === "warning") return comparison.events.some((event) => event.kind === "finding-added" && ["error", "warning"].includes(event.finding?.severity));
  if (mode === "any") return comparison.changed;
  throw new Error(`unknown lock drift threshold '${mode}'`);
}
