export const defaultPolicy = {
  requiredDocs: ["README.md", "docs/PRD.md", "docs/TASKS.md", "docs/ORCHESTRATION.md", "SKILL.md"],
  recommendedDocs: ["LICENSE", "docs/RELEASE_CANDIDATE.md", "docs/PR_EVIDENCE.md"],
  requiredScripts: ["test", "check", "build", "smoke"],
  fixtureDirs: ["fixtures", "test", "tests"],
  blockOnMissingRequiredDocs: true,
  blockOnMissingRequiredScripts: false
};

export function mergePolicy(policy = {}) {
  const merged = { ...defaultPolicy, ...policy };
  for (const field of ["requiredDocs", "recommendedDocs", "requiredScripts", "fixtureDirs"]) {
    if (!Array.isArray(merged[field]) || merged[field].some((value) => typeof value !== "string" || !value.trim())) {
      throw new Error(`Policy ${field} must be an array of non-empty strings`);
    }
  }
  for (const field of ["blockOnMissingRequiredDocs", "blockOnMissingRequiredScripts"]) {
    if (typeof merged[field] !== "boolean") {
      throw new Error(`Policy ${field} must be a boolean`);
    }
  }
  return merged;
}

export function initialPolicyJson() {
  return JSON.stringify(defaultPolicy, null, 2) + "\n";
}
