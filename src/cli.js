#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { scanRepo } from "./scan.js";
import { evaluate } from "./evaluate.js";
import { renderReport } from "./render.js";
import { initialPolicyJson } from "./policy.js";

const [command, ...args] = process.argv.slice(2);

try {
  if (!command || command === "--help") help();
  else if (command === "check" || command === "explain") await check(args);
  else if (command === "init-policy") await initPolicy(args);
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

async function check(args) {
  const root = args[0] || ".";
  const options = parseOptions(args.slice(1));
  const policy = options.policy ? JSON.parse(await readFile(options.policy, "utf8")) : {};
  const report = evaluate(await scanRepo(root), policy);
  process.stdout.write(renderReport(report, options.format || "markdown"));
  if (options["fail-on"] && report.recommendation === options["fail-on"]) process.exitCode = 2;
}

async function initPolicy(args) {
  const options = parseOptions(args);
  if (options.out) await writeFile(options.out, initialPolicyJson());
  else process.stdout.write(initialPolicyJson());
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[index + 1];
    options[key] = next && !next.startsWith("--") ? args[++index] : true;
  }
  return options;
}

function help() {
  process.stdout.write("repo-acceptance-gate <check|explain|init-policy>\n");
}
