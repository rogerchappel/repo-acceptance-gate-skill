import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { test } from "node:test";
import { scanRepo } from "../src/scan.js";
import { evaluate } from "../src/evaluate.js";
import { renderMarkdown } from "../src/render.js";

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

test("renders markdown acceptance packet", async () => {
  const report = evaluate(await scanRepo("fixtures/node-package"));
  assert.match(renderMarkdown(report), /Repository Acceptance Gate/);
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
