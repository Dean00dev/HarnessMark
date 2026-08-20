import fs from "node:fs";
import path from "node:path";

const DEFAULT_IGNORES = new Set([".git", "node_modules", "coverage", "dist", "build", ".harnessmark"]);

export function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function excluded(relativePath, custom) {
  const parts = toPosix(relativePath).split("/");
  if (parts.some((part) => DEFAULT_IGNORES.has(part))) return true;
  return custom.some((entry) => {
    const clean = String(entry).replace(/^\.\//, "").replace(/\/$/, "");
    const candidate = toPosix(relativePath);
    return candidate === clean || candidate.startsWith(`${clean}/`);
  });
}

export function walk(root, customExcludes = []) {
  const files = [];
  const symlinks = [];
  function visit(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute);
      if (excluded(relative, customExcludes)) continue;
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        symlinks.push({ absolute, path: toPosix(relative), size: stat.size, mode: stat.mode });
      } else if (stat.isDirectory()) {
        visit(absolute);
      } else if (stat.isFile()) {
        files.push({ absolute, path: toPosix(relative), size: stat.size, mode: stat.mode });
      }
    }
  }
  visit(root);
  return { files, symlinks };
}

export function safeRelative(packageRoot, candidate) {
  if (typeof candidate !== "string" || !candidate.trim()) return { ok: false, reason: "path is empty" };
  if (path.isAbsolute(candidate) || /^[A-Za-z]:[\\/]/.test(candidate)) return { ok: false, reason: "path is absolute" };
  const absolute = path.resolve(packageRoot, candidate);
  const rel = path.relative(packageRoot, absolute);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    return { ok: false, reason: "path escapes the package" };
  }
  return { ok: true, absolute, path: toPosix(rel) };
}

export function lineOf(text, needle) {
  const index = text.indexOf(needle);
  if (index < 0) return 1;
  return text.slice(0, index).split("\n").length;
}
