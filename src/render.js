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
  for (const check of report.checks) lines.push(`| ${check.id} | ${check.pass ? "pass" : "missing"} | ${check.message} |`);
  lines.push("", "## Commands", "");
  for (const [name, command] of Object.entries(report.commands)) lines.push(`- npm run ${name}: \`${command}\``);
  if (!Object.keys(report.commands).length) lines.push("No required package scripts detected.");
  if (report.summary.blockers.length) lines.push("", "## Blockers", "", ...report.summary.blockers.map((item) => `- ${item}`));
  return lines.join("\n") + "\n";
}

export function renderReport(report, format = "markdown") {
  return format === "json" ? JSON.stringify(report, null, 2) + "\n" : renderMarkdown(report);
}
