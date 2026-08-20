import fs from "node:fs";
import path from "node:path";
import { HOST_ORDER } from "./evidence.js";

const CONFIG_NAMES = ["harnessmark.yml", "harnessmark.yaml", "harnessmark.json"];
const ALLOWED_KEYS = new Set(["schema", "name", "root", "targets", "exclude", "fail_on"]);

function scalar(raw) {
  const value = raw.trim();
  if (!value) return "";
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}

export function parseManifestText(text, extension = ".yml") {
  if (extension === ".json") {
    const parsed = JSON.parse(text);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("manifest must be an object");
    }
    return parsed;
  }

  const result = {};
  let listKey = null;
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (line.includes("\t")) throw new Error(`tabs are not supported (line ${index + 1})`);

    const list = line.match(/^\s{2,}-\s+(.+)$/);
    if (list) {
      if (!listKey) throw new Error(`list item has no parent key (line ${index + 1})`);
      result[listKey].push(scalar(list[1]));
      continue;
    }

    if (/^\s/.test(line)) {
      throw new Error(`nested mappings are not supported (line ${index + 1})`);
    }
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
    if (!match) throw new Error(`cannot parse line ${index + 1}`);
    const key = match[1].replaceAll("-", "_");
    if (!ALLOWED_KEYS.has(key)) throw new Error(`unknown manifest key '${match[1]}'`);
    const raw = match[2] ?? "";
    if (!raw.trim()) {
      result[key] = [];
      listKey = key;
    } else {
      result[key] = scalar(raw);
      listKey = null;
    }
  }
  return result;
}

export function validateConfig(config) {
  const errors = [];
  if (config.schema !== undefined && config.schema !== 1) errors.push("schema must be 1");
  if (config.name !== undefined && (typeof config.name !== "string" || !config.name.trim())) {
    errors.push("name must be a non-empty string");
  }
  if (config.targets !== undefined && !Array.isArray(config.targets)) errors.push("targets must be a list");
  for (const target of config.targets ?? []) {
    if (!HOST_ORDER.includes(target)) errors.push(`unsupported target '${target}'`);
  }
  if (config.exclude !== undefined && !Array.isArray(config.exclude)) errors.push("exclude must be a list");
  if (config.fail_on !== undefined && !["error", "warning", "none"].includes(config.fail_on)) {
    errors.push("fail_on must be error, warning, or none");
  }
  return errors;
}

export function loadConfig(scanPath = ".", explicitConfig = "") {
  const requestedRoot = path.resolve(scanPath);
  let configPath = explicitConfig ? path.resolve(explicitConfig) : null;
  if (!configPath) {
    configPath = CONFIG_NAMES.map((name) => path.join(requestedRoot, name)).find((candidate) => fs.existsSync(candidate)) ?? null;
  }

  let config = {};
  if (configPath) {
    const text = fs.readFileSync(configPath, "utf8");
    config = parseManifestText(text, path.extname(configPath).toLowerCase());
  }
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors.join("; "));

  const base = configPath ? path.dirname(configPath) : requestedRoot;
  const root = path.resolve(base, config.root || (configPath ? "." : requestedRoot));
  return {
    configPath,
    root,
    config: {
      schema: 1,
      name: config.name || path.basename(root),
      targets: config.targets ?? null,
      exclude: config.exclude ?? [],
      fail_on: config.fail_on ?? "error"
    }
  };
}
