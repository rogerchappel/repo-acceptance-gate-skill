#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { scanRepo } from "./scan.js";
import { evaluate } from "./evaluate.js";
import { renderReport } from "./render.js";
import { initialPolicyJson } from "./policy.js";

const [command, ...args] = process.argv.slice(2);

try {
  if (!command || command === "--help") help();
  else if (command === "check" || command === "explain") await check(args, command);
  else if (command === "init-policy") await initPolicy(args);
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

async function check(args, command) {
  const { positional, options } = parseArgs(args, {
    command,
    options: ["policy", "format", "fail-on"],
    maxPositionals: 1,
  });
  const root = positional[0] || ".";
  if (options.format && !["markdown", "json"].includes(options.format)) {
    throw new Error(`Unsupported value for --format: ${options.format} (expected markdown or json)`);
  }
  if (options["fail-on"] && !["ship", "incubate", "block"].includes(options["fail-on"])) {
    throw new Error(`Unsupported value for --fail-on: ${options["fail-on"]} (expected ship, incubate, or block)`);
  }
  const policy = options.policy ? JSON.parse(await readFile(options.policy, "utf8")) : {};
  const report = evaluate(await scanRepo(root), policy);
  process.stdout.write(renderReport(report, options.format || "markdown"));
  if (options["fail-on"] && report.recommendation === options["fail-on"]) process.exitCode = 2;
}

async function initPolicy(args) {
  const { options } = parseArgs(args, {
    command: "init-policy",
    options: ["out"],
    maxPositionals: 0,
  });
  if (options.out) await writeFile(options.out, initialPolicyJson());
  else process.stdout.write(initialPolicyJson());
}

function parseArgs(args, { command, options: supportedOptions, maxPositionals }) {
  const options = {};
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      if (positional.length === maxPositionals) {
        throw new Error(`Unexpected argument for ${command}: ${arg}`);
      }
      positional.push(arg);
      continue;
    }

    const key = arg.slice(2);
    if (!supportedOptions.includes(key)) {
      throw new Error(`Unknown option for ${command}: ${arg}`);
    }
    if (Object.hasOwn(options, key)) {
      throw new Error(`Duplicate option for ${command}: ${arg}`);
    }

    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }
    options[key] = args[++index];
  }
  return { positional, options };
}

function help() {
  process.stdout.write("repo-acceptance-gate <check|explain|init-policy>\n");
}
