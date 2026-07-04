# PRD: repo-acceptance-gate-skill

Status: ready
Decision: build now
Created: 2026-07-04

## Pitch

`repo-acceptance-gate-skill` turns a repository's own evidence into a deterministic release-candidate acceptance packet: required commands, docs, tests, safety notes, open risks, and a pass/fail checklist another agent can run before handoff.

## Why It Matters

Agent-built repos often have tests and docs, but the final readiness judgment is scattered across README notes, package scripts, PR bodies, and ad hoc run logs. A small local skill can standardize "is this repo ready for the next agent or maintainer?" without requiring a hosted service or LLM call.

## Qualification

### Pub Test

"Run `repo-acceptance-gate check .` and get a Markdown plus JSON release-candidate gate with exact commands, missing evidence, and a recommended classification."

### Source / Inspiration

Inspired by Roger's OSS factory release-candidate loops, local agent handoff checklists, and common open-source release hygiene patterns. This is an original local-first utility idea, not a copy of an external project.

## V1 Scope

- TypeScript CLI package.
- Commands: `check`, `explain`, and `init-policy`.
- Detect package scripts, validation shell scripts, docs files, changelog/security/license presence, test fixtures, and release notes.
- Emit Markdown and JSON reports with `ship`, `incubate`, or `block` recommendations.
- Support a tiny local policy file for required docs and commands.
- Fixture-backed tests for Node package, docs-only repo, sparse repo, and failing policy cases.
- Include `SKILL.md` with side-effect boundaries and approval guidance.

## Out of Scope

- Publishing releases, tags, or packages.
- Calling LLM APIs.
- Enforcing repository branch protection.
- Claiming security certification.

## CLI Sketch

```bash
repo-acceptance-gate check . --format markdown
repo-acceptance-gate check . --policy gate.policy.json --fail-on block
repo-acceptance-gate explain fixtures/node-package --format json
repo-acceptance-gate init-policy --out gate.policy.json
```

## Verification

Run `npm test`, `npm run check`, `npm run build`, `npm run smoke`, package/import smoke, and fixture CLI checks.

## Agent Prompt

Build `repo-acceptance-gate-skill` as a local-first deterministic release-candidate gate for agent-built repos. Keep all evidence file-linked, avoid network calls by default, and make the output useful in PR bodies and run logs.
