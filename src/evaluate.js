import { mergePolicy } from "./policy.js";

export function evaluate(scan, policyInput = {}) {
  const policy = mergePolicy(policyInput);
  const missingRequiredDocs = policy.requiredDocs.filter((file) => !scan.docs[file]);
  const missingRecommendedDocs = policy.recommendedDocs.filter((file) => !scan.docs[file]);
  const scriptStates = Object.fromEntries(policy.requiredScripts.map((script) => [script, scriptState(scan.scripts, script)]));
  const missingScripts = policy.requiredScripts.filter((script) => scriptStates[script] !== "present");
  const fixtureStates = policy.fixtureDirs.map((dir) => [dir, scan.fixtureDirs[dir] || "missing"]);
  const hasFixtures = fixtureStates.some(([, state]) => state === "present");
  const checks = [
    ...policy.requiredDocs.map((file) => check(`doc:${file}`, scan.docs[file], `${file} exists`)),
    ...policy.requiredScripts.map((script) => check(`script:${script}`, scriptStates[script] === "present", scriptMessage(script, scriptStates[script]))),
    check("fixtures", hasFixtures, fixtureMessage(fixtureStates)),
    check("validation-script", scan.validationScripts.length > 0, "scripts/*.sh validation helper exists")
  ];
  const blockers = [];
  if (policy.blockOnMissingRequiredDocs && missingRequiredDocs.length) blockers.push(`missing required docs: ${missingRequiredDocs.join(", ")}`);
  if (policy.blockOnMissingRequiredScripts && missingScripts.length) blockers.push(`missing required scripts: ${missingScripts.join(", ")}`);
  const passCount = checks.filter((item) => item.pass).length;
  const recommendation = blockers.length ? "block" : passCount >= checks.length - 2 && missingScripts.length === 0 && hasFixtures ? "ship" : "incubate";
  return {
    generatedAt: new Date().toISOString(),
    root: scan.root,
    packageName: scan.package?.name || null,
    recommendation,
    summary: { passCount, totalChecks: checks.length, missingRequiredDocs, missingRecommendedDocs, missingScripts, blockers },
    checks,
    commands: Object.fromEntries(Object.entries(scan.scripts).filter(([name, command]) => policy.requiredScripts.includes(name) && typeof command === "string" && command.trim()))
  };
}

function check(id, pass, message) {
  return { id, pass: Boolean(pass), message };
}

function scriptState(scripts, script) {
  if (!Object.hasOwn(scripts, script)) return "missing";
  if (typeof scripts[script] !== "string") return "invalid";
  return scripts[script].trim() ? "present" : "empty";
}

function scriptMessage(script, state) {
  if (state === "present") return `package script ${script} is a non-empty string`;
  if (state === "empty") return `package script ${script} is empty or whitespace-only`;
  if (state === "invalid") return `package script ${script} is not a string`;
  return `package script ${script} is missing`;
}

function fixtureMessage(states) {
  const present = states.find(([, state]) => state === "present");
  if (present) return `fixture directory ${present[0]} contains a regular file`;
  const details = states.map(([dir, state]) => `${dir} (${state})`).join(", ");
  return `no fixture evidence: ${details}`;
}
