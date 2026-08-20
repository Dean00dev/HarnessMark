import { RULES } from "./evidence.js";

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function escapeHtml(value) {
  return escapeXml(value);
}

function statusIcon(status) {
  return ({ pass: "PASS", warn: "WARN", fail: "FAIL", absent: "—" })[status] ?? status.toUpperCase();
}

export function tableReport(result) {
  const lines = [
    `HarnessMark ${result.tool.version} · documented conformance`,
    `Project: ${result.project.name}`,
    `Fingerprint: ${result.project.fingerprint}`,
    "",
    "HOST              STATUS  ARTIFACTS  CLAIMED",
    "----------------  ------  ---------  -------"
  ];
  for (const host of result.hosts) {
    lines.push(`${host.label.padEnd(16)}  ${statusIcon(host.status).padEnd(6)}  ${String(host.artifactCount).padStart(9)}  ${host.claimed ? "yes" : "no"}`);
  }
  lines.push("", `Result: ${result.summary.result.toUpperCase()} · ${result.summary.errors} errors · ${result.summary.warnings} warnings`);
  if (result.findings.length) {
    lines.push("");
    for (const item of result.findings) {
      lines.push(`${item.severity.toUpperCase().padEnd(7)} ${item.ruleId} ${item.host ? `[${item.host}] ` : ""}${item.path}:${item.line}`);
      lines.push(`        ${item.message}`);
    }
  }
  lines.push("", result.assurance.statement);
  return `${lines.join("\n")}\n`;
}

export function junitReport(result) {
  const tests = result.hosts.filter(({ claimed, artifactCount }) => claimed || artifactCount > 0);
  const failures = tests.filter(({ status }) => status === "fail").length;
  const cases = tests.map((host) => {
    const hostFindings = result.findings.filter(({ host: id }) => id === host.id);
    const failure = host.status === "fail"
      ? `<failure message="${escapeXml(`${hostFindings.length} conformance finding(s)`)}">${escapeXml(hostFindings.map((item) => `${item.ruleId} ${item.path}:${item.line} ${item.message}`).join("\n"))}</failure>`
      : "";
    const output = escapeXml(hostFindings.map((item) => `${item.severity} ${item.ruleId}: ${item.message}`).join("\n"));
    return `  <testcase classname="HarnessMark" name="${escapeXml(host.label)}">${failure}<system-out>${output}</system-out></testcase>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="HarnessMark documented conformance" tests="${tests.length}" failures="${failures}" errors="0">\n${cases.join("\n")}\n</testsuite>\n`;
}

export function sarifReport(result) {
  const rules = Object.entries(RULES).map(([id, name]) => ({ id, shortDescription: { text: name } }));
  const level = { error: "error", warning: "warning", notice: "note" };
  return `${JSON.stringify({
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: { driver: { name: "HarnessMark", version: result.tool.version, informationUri: "https://github.com/Dean00dev/HarnessMark", rules } },
      automationDetails: { description: { text: result.assurance.statement } },
      results: result.findings.map((item) => ({
        ruleId: item.ruleId,
        level: level[item.severity],
        message: { text: `${item.host ? `[${item.host}] ` : ""}${item.message}` },
        locations: [{ physicalLocation: { artifactLocation: { uri: item.path }, region: { startLine: item.line } } }],
        properties: { certainty: item.certainty, sourceUrl: item.sourceUrl }
      }))
    }]
  }, null, 2)}\n`;
}

export function htmlReport(result) {
  const color = { pass: "#35d07f", warn: "#ffbf47", fail: "#ff5f6d", absent: "#7d8799" };
  const hosts = result.hosts.map((host) => `<article class="host ${host.status}"><div><span class="dot"></span><strong>${escapeHtml(host.label)}</strong></div><b>${statusIcon(host.status)}</b><small>${host.artifactCount} artifact${host.artifactCount === 1 ? "" : "s"}</small></article>`).join("");
  const findings = result.findings.length ? result.findings.map((item) => `<li class="finding ${item.severity}"><span>${escapeHtml(item.severity)}</span><div><strong>${escapeHtml(item.ruleId)} · ${escapeHtml(item.title)}</strong><p>${escapeHtml(item.message)}</p><code>${escapeHtml(item.path)}:${item.line}</code><a href="${escapeHtml(item.sourceUrl)}">source</a></div></li>`).join("") : `<li class="empty">No documented-conformance findings.</li>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>HarnessMark Passport · ${escapeHtml(result.project.name)}</title>
<style>
:root{color-scheme:dark;--bg:#070b17;--card:#11182b;--ink:#eff4ff;--muted:#98a5c0;--line:#263250;--accent:#9f7aea;--result:${color[result.summary.result]}}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 0,#22164b 0,transparent 35%),var(--bg);color:var(--ink);font:16px/1.5 Inter,ui-sans-serif,system-ui,sans-serif}main{width:min(1080px,calc(100% - 32px));margin:48px auto}.eyebrow{color:#bba6ff;text-transform:uppercase;letter-spacing:.18em;font-weight:800;font-size:.75rem}h1{font-size:clamp(2.4rem,8vw,5rem);line-height:.95;margin:.3em 0}.result{color:var(--result)}.boundary{padding:16px 18px;border:1px solid #5b4b8c;border-radius:14px;background:#17132b;color:#d9d0ff}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:28px 0}.host{padding:18px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,#141d34,#0d1324);display:grid;gap:12px}.host>div{display:flex;align-items:center;gap:9px}.host>b{font-size:1.35rem}.host small{color:var(--muted)}.dot{width:10px;height:10px;border-radius:50%;background:#7d8799}.host.pass .dot{background:#35d07f}.host.warn .dot{background:#ffbf47}.host.fail .dot{background:#ff5f6d}.meta{display:flex;gap:24px;flex-wrap:wrap;color:var(--muted)}.meta code{color:#d9d0ff;overflow-wrap:anywhere}.panel{margin-top:28px;padding:24px;border:1px solid var(--line);border-radius:18px;background:rgba(17,24,43,.9)}ul{padding:0;margin:0;list-style:none}.finding{display:grid;grid-template-columns:78px 1fr;gap:16px;padding:18px 0;border-top:1px solid var(--line)}.finding:first-child{border-top:0}.finding>span{text-transform:uppercase;font-size:.7rem;font-weight:900;letter-spacing:.08em}.finding.error>span{color:#ff7b86}.finding.warning>span{color:#ffd070}.finding p{margin:.35em 0;color:#c9d2e7}.finding code{color:#9fb5e8}.finding a{margin-left:12px;color:#bba6ff}.empty{color:#35d07f}footer{margin:28px 0;color:var(--muted)}@media(max-width:760px){.grid{grid-template-columns:1fr 1fr}.finding{grid-template-columns:1fr}}@media(max-width:420px){.grid{grid-template-columns:1fr}}
</style></head><body><main>
<p class="eyebrow">AI-agent extension compatibility passport</p><h1>${escapeHtml(result.project.name)}<br><span class="result">${escapeHtml(result.summary.result.toUpperCase())}</span></h1>
<p class="boundary"><strong>Documented conformance.</strong> ${escapeHtml(result.assurance.statement)}</p>
<section class="grid">${hosts}</section>
<div class="meta"><span>Evidence checked <strong>${escapeHtml(result.tool.evidenceCheckedAt)}</strong></span><span>Errors <strong>${result.summary.errors}</strong></span><span>Warnings <strong>${result.summary.warnings}</strong></span><code>${escapeHtml(result.project.fingerprint)}</code></div>
<section class="panel"><h2>Findings</h2><ul>${findings}</ul></section>
<footer>Generated deterministically by HarnessMark ${escapeHtml(result.tool.version)}. No extension code was executed.</footer>
</main></body></html>\n`;
}

export function markdownSummary(result) {
  const rows = result.hosts.filter(({ claimed, artifactCount }) => claimed || artifactCount).map((host) => `| ${host.label} | ${statusIcon(host.status)} | ${host.artifactCount} | ${host.claimed ? "yes" : "no"} |`);
  return [
    `## HarnessMark: ${result.summary.result.toUpperCase()}`,
    "",
    "> **Documented conformance only.** Static checks do not prove a host loaded or followed an artifact.",
    "",
    "| Host | Status | Artifacts | Claimed |",
    "|---|---:|---:|---:|",
    ...rows,
    "",
    `**${result.summary.errors} errors · ${result.summary.warnings} warnings**`,
    "",
    `<details><summary>Input fingerprint</summary><code>${result.project.fingerprint}</code></details>`
  ].join("\n");
}

export function render(result, format = "table") {
  if (format === "json") return `${JSON.stringify(result, null, 2)}\n`;
  if (format === "junit") return junitReport(result);
  if (format === "sarif") return sarifReport(result);
  if (format === "html") return htmlReport(result);
  if (format === "table") return tableReport(result);
  throw new Error(`unsupported format '${format}'`);
}

