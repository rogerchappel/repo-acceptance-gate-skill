import assert from "node:assert/strict";
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
