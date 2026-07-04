# Orchestration

1. Run `repo-acceptance-gate check .` from a release-candidate branch.
2. Review missing evidence before opening or updating a release-candidate PR.
3. Include the Markdown packet in the PR body and keep the JSON output as a run artifact when useful.
4. Use `init-policy` to document local acceptance rules for a repo family.
5. Treat `block` as a handoff stop, `incubate` as usable with known gaps, and `ship` as ready for maintainer review.
