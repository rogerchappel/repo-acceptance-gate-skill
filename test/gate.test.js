import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { test } from "node:test";
import { scanRepo } from "../src/scan.js";
import { evaluate } from "../src/evaluate.js";
import { renderMarkdown } from "../src/render.js";

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
