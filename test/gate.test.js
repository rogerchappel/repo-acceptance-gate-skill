import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { scanRepo } from "../src/scan.js";
import { evaluate } from "../src/evaluate.js";
import { renderMarkdown, renderReport } from "../src/render.js";

const repoRoot = new URL("..", import.meta.url);

function runCli(...args) {
  return spawnSync(process.execPath, ["src/cli.js", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("ships a complete node package fixture", async () => {
  const report = evaluate(await scanRepo("fixtures/node-package"));
  assert.equal(report.recommendation, "ship");
  assert.equal(report.summary.missingScripts.length, 0);
});

test("blocks sparse repositories missing required docs", async () => {
  const report = evaluate(await scanRepo("fixtures/sparse"));
  assert.equal(report.recommendation, "block");
});

test("supports stricter script policy", async () => {
  const report = evaluate(await scanRepo("fixtures/docs-only"), { blockOnMissingRequiredScripts: true });
  assert.equal(report.recommendation, "block");
});

test("API scans custom required, recommended, and fixture paths", async () => {
  const policy = {
    requiredDocs: ["CUSTOM_REQUIRED.md"],
    recommendedDocs: ["guides/CUSTOM_RECOMMENDED.md"],
    fixtureDirs: ["custom-fixtures"],
  };
  const report = evaluate(await scanRepo("fixtures/custom-policy", policy), policy);

  assert.deepEqual(report.summary.missingRequiredDocs, []);
  assert.deepEqual(report.summary.missingRecommendedDocs, []);
  assert.equal(report.checks.find(({ id }) => id === "fixtures").pass, true);
});

test("API reports missing custom policy paths", async () => {
  const policy = {
    requiredDocs: ["MISSING_REQUIRED.md"],
    recommendedDocs: ["guides/MISSING_RECOMMENDED.md"],
    fixtureDirs: ["missing-fixtures"],
  };
  const report = evaluate(await scanRepo("fixtures/custom-policy", policy), policy);

  assert.deepEqual(report.summary.missingRequiredDocs, ["MISSING_REQUIRED.md"]);
  assert.deepEqual(report.summary.missingRecommendedDocs, ["guides/MISSING_RECOMMENDED.md"]);
  assert.equal(report.checks.find(({ id }) => id === "fixtures").pass, false);
});

test("renders markdown acceptance packet", async () => {
  const report = evaluate(await scanRepo("fixtures/node-package"));
  assert.match(renderMarkdown(report), /Repository Acceptance Gate/);
});

test("escapes Markdown table cells and code-span delimiters", () => {
  const report = {
    root: "fixture",
    packageName: "markdown-edge-cases",
    generatedAt: "2026-08-18T00:00:00.000Z",
    recommendation: "block",
    checks: [{ id: "doc:README.md|extra", pass: false, message: "README.md|extra exists\\path\nsecond line" }],
    commands: {
      "test`unit": "node -e \"console.log(`one`, ``two``)\"",
      "`leading": "echo trailing`",
    },
    summary: { blockers: [] },
  };

  const markdown = renderMarkdown(report);
  const checkRow = markdown.split("\n").find((line) => line.startsWith("| doc:"));
  assert.equal(checkRow, "| doc:README.md\\|extra | missing | README.md\\|extra exists\\\\path<br>second line |");
  assert.equal(checkRow.split(/(?<!\\)\|/).length, 5);
  assert.match(markdown, /- npm run ``test`unit``: ```node -e "console\.log\(`one`, ``two``\)"```/);
  assert.match(markdown, /- npm run `` `leading ``: `` echo trailing` ``/);
  assert.equal(renderReport(report, "json"), JSON.stringify(report, null, 2) + "\n");
});

test("CLI prints help without scanning the current repo", () => {
  const result = spawnSync(process.execPath, ["src/cli.js", "--help"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /repo-acceptance-gate/);
  assert.match(result.stdout, /check\|explain\|init-policy/);
});

test("CLI emits JSON acceptance evidence for the complete fixture", () => {
  const result = spawnSync(process.execPath, ["src/cli.js", "check", "fixtures/node-package", "--format", "json"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  const report = JSON.parse(result.stdout);
  assert.equal(report.recommendation, "ship");
  assert.deepEqual(report.summary.missingScripts, []);
});

test("CLI scans custom paths from a policy file", () => {
  const result = runCli("check", "fixtures/custom-policy", "--policy", "fixtures/custom-policy/policy.json", "--format", "json");

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.summary.missingRequiredDocs, []);
  assert.deepEqual(report.summary.missingRecommendedDocs, []);
  assert.equal(report.checks.find(({ id }) => id === "fixtures").pass, true);
});

test("CLI reports missing custom paths from a policy file", () => {
  const result = runCli("explain", "fixtures/custom-policy", "--policy", "fixtures/custom-policy/missing-policy.json", "--format", "json");

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.summary.missingRequiredDocs, ["MISSING_REQUIRED.md"]);
  assert.deepEqual(report.summary.missingRecommendedDocs, ["guides/MISSING_RECOMMENDED.md"]);
  assert.equal(report.checks.find(({ id }) => id === "fixtures").pass, false);
});

test("CLI rejects malformed policy list types with concise diagnostics", () => {
  const result = runCli("check", "fixtures/custom-policy", "--policy", "fixtures/custom-policy/malformed-policy.json");

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Policy requiredDocs must be an array of strings/);
  assert.doesNotMatch(result.stderr, /TypeError|node:internal/);
});

test("CLI rejects a malformed package manifest with concise diagnostics", () => {
  const root = mkdtempSync(path.join(tmpdir(), "acceptance-gate-malformed-"));
  writeFileSync(path.join(root, "package.json"), "{broken");

  try {
    const result = runCli("check", root, "--format", "json");
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Cannot parse package\.json/);
    assert.doesNotMatch(result.stderr, /at .*src\/|node:internal/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("API rejects empty or directory-shaped document and helper evidence", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "acceptance-gate-shapes-"));
  for (const name of ["README.md", "SKILL.md"]) mkdirSync(path.join(root, name), { recursive: true });
  mkdirSync(path.join(root, "docs", "PRD.md"), { recursive: true });
  mkdirSync(path.join(root, "docs", "TASKS.md"), { recursive: true });
  mkdirSync(path.join(root, "docs", "ORCHESTRATION.md"), { recursive: true });
  mkdirSync(path.join(root, "scripts", "fake.sh"), { recursive: true });
  writeFileSync(path.join(root, "package.json"), "{}\n");
  writeFileSync(path.join(root, "LICENSE"), "");

  try {
    const report = evaluate(await scanRepo(root));
    assert.deepEqual(report.summary.missingRequiredDocs, [
      "README.md", "docs/PRD.md", "docs/TASKS.md", "docs/ORCHESTRATION.md", "SKILL.md",
    ]);
    assert.deepEqual(report.summary.missingRecommendedDocs, ["LICENSE", "docs/RELEASE_CANDIDATE.md", "docs/PR_EVIDENCE.md"]);
    assert.equal(report.checks.find(({ id }) => id === "validation-script").pass, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("API rejects empty, whitespace-only, and invalid required scripts", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "acceptance-gate-scripts-"));
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: { test: "", check: "   ", build: null } }));
  const policy = { requiredDocs: [], recommendedDocs: [] };

  try {
    const report = evaluate(await scanRepo(root, policy), policy);
    assert.deepEqual(report.summary.missingScripts, ["test", "check", "build", "smoke"]);
    assert.match(report.checks.find(({ id }) => id === "script:test").message, /empty or whitespace-only/);
    assert.match(report.checks.find(({ id }) => id === "script:build").message, /not a string/);
    assert.match(report.checks.find(({ id }) => id === "script:smoke").message, /missing/);
    assert.deepEqual(report.commands, {});
    assert.equal(report.recommendation, "incubate");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("API requires a regular file inside configured fixture directories", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "acceptance-gate-fixtures-"));
  mkdirSync(path.join(root, "empty"));
  mkdirSync(path.join(root, "nested", "directory-only"), { recursive: true });
  writeFileSync(path.join(root, "not-a-directory"), "fixture-shaped path\n");
  const policy = {
    requiredDocs: [],
    recommendedDocs: [],
    requiredScripts: [],
    fixtureDirs: ["missing", "empty", "nested", "not-a-directory"],
  };

  try {
    const report = evaluate(await scanRepo(root, policy), policy);
    const fixtures = report.checks.find(({ id }) => id === "fixtures");
    assert.equal(fixtures.pass, false);
    assert.match(fixtures.message, /missing \(missing\)/);
    assert.match(fixtures.message, /empty \(empty\)/);
    assert.match(fixtures.message, /nested \(empty\)/);
    assert.match(fixtures.message, /not-a-directory \(invalid\)/);
    assert.equal(report.recommendation, "incubate");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI incubates whitespace-only scripts and an empty fixture directory", () => {
  const root = mkdtempSync(path.join(tmpdir(), "acceptance-gate-cli-evidence-"));
  mkdirSync(path.join(root, "fixtures"));
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: {
    test: " ", check: "\t", build: "\n", smoke: "  ",
  } }));
  writeFileSync(path.join(root, "policy.json"), JSON.stringify({ requiredDocs: [], recommendedDocs: [] }));

  try {
    const result = runCli("check", root, "--policy", path.join(root, "policy.json"), "--format", "json");
    assert.equal(result.status, 0);
    const report = JSON.parse(result.stdout);
    assert.equal(report.recommendation, "incubate");
    assert.deepEqual(report.summary.missingScripts, ["test", "check", "build", "smoke"]);
    assert.match(report.checks.find(({ id }) => id === "fixtures").message, /fixtures \(empty\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI fail-on option returns a gate-specific exit code", () => {
  const result = spawnSync(process.execPath, ["src/cli.js", "check", "fixtures/sparse", "--fail-on", "block"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });

  assert.equal(result.status, 2);
  assert.match(result.stdout, /Repository Acceptance Gate/);
  assert.equal(result.stderr, "");
});

test("CLI init-policy writes a reusable local policy file", () => {
  const out = new URL("../.tmp-test-policy.json", import.meta.url);
  const result = spawnSync(process.execPath, ["src/cli.js", "init-policy", "--out", out.pathname], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  const policy = JSON.parse(readFileSync(out, "utf8"));
  assert.equal(policy.blockOnMissingRequiredScripts, false);
  rmSync(out, { force: true });
});

test("CLI accepts check options before the repository root", () => {
  const result = runCli("check", "--format", "json", "fixtures/node-package");

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.equal(JSON.parse(result.stdout).recommendation, "ship");
});

test("CLI rejects unsupported format values", () => {
  const result = runCli("check", "fixtures/node-package", "--format", "yaml");

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Unsupported value for --format: yaml/);
});

test("CLI rejects missing option values with CLI diagnostics", () => {
  for (const [command, ...args] of [
    ["check", "fixtures/node-package", "--policy"],
    ["check", "fixtures/node-package", "--format"],
    ["check", "fixtures/node-package", "--fail-on"],
    ["init-policy", "--out"],
  ]) {
    const result = runCli(command, ...args);
    const option = args.at(-1);
    assert.equal(result.status, 1, `${command} ${args.join(" ")}`);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, new RegExp(`Missing value for ${option}`));
    assert.doesNotMatch(result.stderr, /TypeError|node:internal/);
  }
});

test("CLI rejects unknown options", () => {
  const result = runCli("check", "fixtures/node-package", "--unknown", "value");

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Unknown option for check: --unknown/);
});

test("CLI rejects extra positional arguments", () => {
  const result = runCli("explain", "fixtures/node-package", "fixtures/sparse");

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Unexpected argument for explain: fixtures\/sparse/);
});
