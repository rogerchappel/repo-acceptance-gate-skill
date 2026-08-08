import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { mergePolicy } from "./policy.js";

const defaultDetectedDocs = ["README.md", "SKILL.md", "LICENSE", "SECURITY.md", "CHANGELOG.md", "docs/PRD.md", "docs/TASKS.md", "docs/ORCHESTRATION.md", "docs/RELEASE_CANDIDATE.md", "docs/PR_EVIDENCE.md"];

export async function scanRepo(root, policyInput = {}) {
  const absolute = path.resolve(root);
  const policy = mergePolicy(policyInput);
  const packageJson = await readJson(path.join(absolute, "package.json"));
  return {
    root: absolute,
    package: packageJson,
    scripts: packageJson?.scripts || {},
    docs: await detectFiles(absolute, unique([...defaultDetectedDocs, ...policy.requiredDocs, ...policy.recommendedDocs])),
    fixtureDirs: await detectFixtureDirs(absolute, unique(policy.fixtureDirs)),
    validationScripts: await listScripts(path.join(absolute, "scripts"))
  };
}

function unique(values) {
  return [...new Set(values)];
}

async function readJson(file) {
  let contents;
  try {
    contents = await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error(`Cannot read package.json: ${error.message}`);
  }

  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(`Cannot parse package.json: ${error.message}`);
  }
}

async function detectFiles(root, files) {
  const result = {};
  for (const file of files) result[file] = await isNonEmptyFile(path.join(root, file));
  return result;
}

async function detectFixtureDirs(root, dirs) {
  const result = {};
  for (const dir of dirs) result[dir] = await fixtureDirState(path.join(root, dir));
  return result;
}

async function listScripts(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".sh")).map((entry) => entry.name);
  } catch {
    return [];
  }
}

async function fixtureDirState(dir) {
  let metadata;
  try {
    metadata = await stat(dir);
  } catch (error) {
    if (error.code === "ENOENT") return "missing";
    return "invalid";
  }
  if (!metadata.isDirectory()) return "invalid";
  return await containsRegularFile(dir) ? "present" : "empty";
}

async function containsRegularFile(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (entry.isFile()) return true;
    if (entry.isDirectory() && await containsRegularFile(path.join(dir, entry.name))) return true;
  }
  return false;
}

async function isNonEmptyFile(file) {
  try {
    const metadata = await stat(file);
    return metadata.isFile() && metadata.size > 0;
  } catch {
    return false;
  }
}
