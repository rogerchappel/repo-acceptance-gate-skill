# Contributing

Thanks for helping improve repo-acceptance-gate-skill.

## Development

```bash
npm install
npm run release:check
```

Keep checks deterministic and local-first. New rules should include a small fixture or test case that explains the expected recommendation.

## Pull Requests

- Update README examples when CLI behavior changes.
- Keep package contents aligned with `scripts/package-smoke.mjs`.
- Do not add publishing, tagging, or remote-write behavior without a separate review.
