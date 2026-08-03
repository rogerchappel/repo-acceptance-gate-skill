import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temporaryRoot = mkdtempSync(join(tmpdir(), "repo-acceptance-gate-package-smoke-"));
const packDirectory = join(temporaryRoot, "pack");
const consumerDirectory = join(temporaryRoot, "consumer");
let failure;

try {
  mkdirSync(packDirectory);
  mkdirSync(consumerDirectory);

  const output = execFileSync("npm", ["pack", "--json", "--pack-destination", packDirectory], {
    encoding: "utf8",
  });
  const [{ filename, files }] = JSON.parse(output);
  const names = new Set(files.map((file) => file.path));

  for (const expected of [
    "package.json",
    "README.md",
    "LICENSE",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "SKILL.md",
    "src/cli.js",
    "src/evaluate.js",
    "scripts/package-smoke.mjs",
    "fixtures/node-package/package.json",
    "docs/PRD.md",
  ]) {
    assert.ok(names.has(expected), `Missing expected package file: ${expected}`);
  }

  const tarball = join(packDirectory, filename);
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], {
    cwd: consumerDirectory,
    stdio: "pipe",
  });

  const installedPackage = join(consumerDirectory, "node_modules", "repo-acceptance-gate-skill");
  const installedBin = join(consumerDirectory, "node_modules", ".bin", "repo-acceptance-gate");
  assert.ok(existsSync(installedBin), "Packed package did not install the declared repo-acceptance-gate bin");

  const help = execFileSync(installedBin, ["--help"], { encoding: "utf8" });
  assert.match(help, /repo-acceptance-gate <check\|explain\|init-policy>/);

  const fixture = join(installedPackage, "fixtures", "node-package");
  const result = JSON.parse(execFileSync(installedBin, ["check", fixture, "--format", "json"], {
    encoding: "utf8",
  }));
  assert.equal(result.packageName, "fixture-node-package");
  assert.equal(result.recommendation, "ship");
} catch (error) {
  failure = error;
} finally {
  rmSync(temporaryRoot, { force: true, recursive: true });
}

assert.equal(existsSync(temporaryRoot), false, "Package smoke temporary directory was not cleaned up");
if (failure) throw failure;
