# repo-acceptance-gate-skill

Use this skill when an agent needs a deterministic release-candidate packet for a local repository before handoff, PR update, or public release review.

## Inputs

- A local repository path.
- Optional `gate.policy.json` created by `init-policy`.

Policy `requiredDocs` and `recommendedDocs` arrays may contain custom
repository-relative file paths. `fixtureDirs` may likewise contain custom
repository-relative directory paths. `check` and `explain` scan every path in
the merged active policy. Every policy-list entry must be a non-empty string;
empty and whitespace-only entries are invalid.

Policy controls `blockOnMissingRequiredDocs` and
`blockOnMissingRequiredScripts` must be booleans. Set either control to `false`
to keep that missing-evidence category from becoming a blocker.

Count documentation only when the path is a non-empty regular file, and count
validation helpers only when they are regular `.sh` files in `scripts/`.
Malformed or unreadable `package.json` input is a blocking scan error, not
evidence that the repository simply has no package scripts.

Count a required package script only when its value is a non-empty string after
trimming. Count a configured fixture directory only when it contains at least
one regular file, including in nested directories. Evidence messages distinguish
missing inputs, empty or whitespace-only inputs, and invalid input shapes.

## Boundaries

- No publishing, tagging, package release, or branch-protection changes.
- No network calls by default.
- The tool inspects local files and package metadata only.

## Workflow

```bash
repo-acceptance-gate check . --format markdown
repo-acceptance-gate check . --format json
repo-acceptance-gate init-policy --out gate.policy.json
repo-acceptance-gate explain fixtures/node-package --format markdown
```

Validate with `npm test`, `npm run check`, `npm run build`, and `npm run smoke`.
