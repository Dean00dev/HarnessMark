function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return trimmed;
}

export function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { attributes: null, body: normalized, error: "missing opening frontmatter delimiter" };
  }
  const end = normalized.indexOf("\n---", 4);
  if (end < 0) return { attributes: null, body: normalized, error: "missing closing frontmatter delimiter" };

  const block = normalized.slice(4, end);
  const bodyStart = normalized.indexOf("\n", end + 4);
  const body = bodyStart < 0 ? "" : normalized.slice(bodyStart + 1);
  const attributes = {};
  const lines = block.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (/^\s+/.test(line)) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
    if (!match) return { attributes: null, body, error: `cannot parse frontmatter line ${index + 1}` };
    const key = match[1];
    let value = match[2] ?? "";
    if ([">", ">-", "|", "|-"].includes(value.trim())) {
      const chunks = [];
      while (index + 1 < lines.length && (/^\s+/.test(lines[index + 1]) || !lines[index + 1].trim())) {
        index += 1;
        chunks.push(lines[index].replace(/^\s{1,4}/, ""));
      }
      value = value.trim().startsWith(">") ? chunks.join(" ").replace(/\s+/g, " ").trim() : chunks.join("\n").trim();
    } else if (!value.trim() && index + 1 < lines.length && /^\s+-\s+/.test(lines[index + 1])) {
      const items = [];
      while (index + 1 < lines.length && /^\s+-\s+/.test(lines[index + 1])) {
        index += 1;
        items.push(unquote(lines[index].replace(/^\s+-\s+/, "")));
      }
      value = items;
    } else {
      value = unquote(value);
    }
    attributes[key] = value;
  }
  return { attributes, body, error: null };
}
