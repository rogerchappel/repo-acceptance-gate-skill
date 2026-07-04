# repo-acceptance-gate-skill

Use this skill when an agent needs a deterministic release-candidate packet for a local repository before handoff, PR update, or public release review.

## Inputs

- A local repository path.
- Optional `gate.policy.json` created by `init-policy`.

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
