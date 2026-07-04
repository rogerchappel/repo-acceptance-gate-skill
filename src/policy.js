export const defaultPolicy = {
  requiredDocs: ["README.md", "docs/PRD.md", "docs/TASKS.md", "docs/ORCHESTRATION.md", "SKILL.md"],
  recommendedDocs: ["LICENSE", "docs/RELEASE_CANDIDATE.md", "docs/PR_EVIDENCE.md"],
  requiredScripts: ["test", "check", "build", "smoke"],
  fixtureDirs: ["fixtures", "test", "tests"],
  blockOnMissingRequiredDocs: true,
  blockOnMissingRequiredScripts: false
};

export function mergePolicy(policy = {}) {
  return { ...defaultPolicy, ...policy };
}

export function initialPolicyJson() {
  return JSON.stringify(defaultPolicy, null, 2) + "\n";
}
