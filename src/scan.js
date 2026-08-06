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
    fixtureDirs: await detectDirs(absolute, unique(policy.fixtureDirs)),
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

async function detectDirs(root, dirs) {
  const result = {};
  for (const dir of dirs) result[dir] = await isDir(path.join(root, dir));
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

async function isDir(file) {
  try { return (await stat(file)).isDirectory(); } catch { return false; }
}

async function isNonEmptyFile(file) {
  try {
    const metadata = await stat(file);
    return metadata.isFile() && metadata.size > 0;
  } catch {
    return false;
  }
}
