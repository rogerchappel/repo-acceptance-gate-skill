import { mergePolicy } from "./policy.js";

export function evaluate(scan, policyInput = {}) {
  const policy = mergePolicy(policyInput);
  const missingRequiredDocs = policy.requiredDocs.filter((file) => !scan.docs[file]);
  const missingRecommendedDocs = policy.recommendedDocs.filter((file) => !scan.docs[file]);
  const missingScripts = policy.requiredScripts.filter((script) => !scan.scripts[script]);
  const hasFixtures = policy.fixtureDirs.some((dir) => scan.fixtureDirs[dir]);
  const checks = [
    ...policy.requiredDocs.map((file) => check(`doc:${file}`, scan.docs[file], `${file} exists`)),
    ...policy.requiredScripts.map((script) => check(`script:${script}`, Boolean(scan.scripts[script]), `package script ${script} exists`)),
    check("fixtures", hasFixtures, "fixture or test directory exists"),
    check("validation-script", scan.validationScripts.length > 0, "scripts/*.sh validation helper exists")
  ];
  const blockers = [];
  if (policy.blockOnMissingRequiredDocs && missingRequiredDocs.length) blockers.push(`missing required docs: ${missingRequiredDocs.join(", ")}`);
  if (policy.blockOnMissingRequiredScripts && missingScripts.length) blockers.push(`missing required scripts: ${missingScripts.join(", ")}`);
  const passCount = checks.filter((item) => item.pass).length;
  const recommendation = blockers.length ? "block" : passCount >= checks.length - 2 && missingScripts.length === 0 ? "ship" : "incubate";
  return {
    generatedAt: new Date().toISOString(),
    root: scan.root,
    packageName: scan.package?.name || null,
    recommendation,
    summary: { passCount, totalChecks: checks.length, missingRequiredDocs, missingRecommendedDocs, missingScripts, blockers },
    checks,
    commands: Object.fromEntries(Object.entries(scan.scripts).filter(([name]) => policy.requiredScripts.includes(name)))
  };
}

function check(id, pass, message) {
  return { id, pass: Boolean(pass), message };
}
