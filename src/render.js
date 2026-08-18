export function renderMarkdown(report) {
  const lines = [
    "# Repository Acceptance Gate",
    "",
    `Repository: ${report.root}`,
    `Package: ${report.packageName || "n/a"}`,
    `Generated: ${report.generatedAt}`,
    `Recommendation: ${report.recommendation}`,
    "",
    "## Checks",
    "",
    "| Check | Result | Evidence |",
    "| --- | --- | --- |"
  ];
  for (const check of report.checks) {
    lines.push(`| ${escapeTableCell(check.id)} | ${check.pass ? "pass" : "missing"} | ${escapeTableCell(check.message)} |`);
  }
  lines.push("", "## Commands", "");
  for (const [name, command] of Object.entries(report.commands)) {
    lines.push(`- npm run ${renderCodeSpan(name)}: ${renderCodeSpan(command)}`);
  }
  if (!Object.keys(report.commands).length) lines.push("No required package scripts detected.");
  if (report.summary.blockers.length) lines.push("", "## Blockers", "", ...report.summary.blockers.map((item) => `- ${item}`));
  return lines.join("\n") + "\n";
}

function escapeTableCell(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("|", "\\|").replaceAll(/\r?\n/g, "<br>");
}

function renderCodeSpan(value) {
  const text = String(value);
  const longestDelimiter = Math.max(0, ...Array.from(text.matchAll(/`+/g), (match) => match[0].length));
  const delimiter = "`".repeat(longestDelimiter + 1);
  const padding = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${delimiter}${padding}${text}${padding}${delimiter}`;
}

export function renderReport(report, format = "markdown") {
  return format === "json" ? JSON.stringify(report, null, 2) + "\n" : renderMarkdown(report);
}
