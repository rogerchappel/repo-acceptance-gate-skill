import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export async function scanRepo(root) {
  const absolute = path.resolve(root);
  const packageJson = await readJson(path.join(absolute, "package.json"));
  return {
    root: absolute,
    package: packageJson,
    scripts: packageJson?.scripts || {},
    docs: await detectFiles(absolute, ["README.md", "SKILL.md", "LICENSE", "SECURITY.md", "CHANGELOG.md", "docs/PRD.md", "docs/TASKS.md", "docs/ORCHESTRATION.md", "docs/RELEASE_CANDIDATE.md", "docs/PR_EVIDENCE.md"]),
    fixtureDirs: await detectDirs(absolute, ["fixtures", "test", "tests"]),
    validationScripts: await listScripts(path.join(absolute, "scripts"))
  };
}

async function readJson(file) {
  try { return JSON.parse(await readFile(file, "utf8")); } catch { return null; }
}

async function detectFiles(root, files) {
  const result = {};
  for (const file of files) result[file] = await exists(path.join(root, file));
  return result;
}

async function detectDirs(root, dirs) {
  const result = {};
  for (const dir of dirs) result[dir] = await isDir(path.join(root, dir));
  return result;
}

async function listScripts(dir) {
  try { return (await readdir(dir)).filter((file) => file.endsWith(".sh")); } catch { return []; }
}

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function isDir(file) {
  try { return (await stat(file)).isDirectory(); } catch { return false; }
}
