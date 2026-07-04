# repo-acceptance-gate-skill

A deterministic local CLI that turns repository evidence into a release-candidate acceptance packet. It inspects docs, scripts, fixtures, validation helpers, and local policy rules, then recommends `ship`, `incubate`, or `block`.

## Quickstart

```bash
npm install
npm run smoke
node src/cli.js check . --format markdown
node src/cli.js check . --format json
node src/cli.js init-policy --out gate.policy.json
node src/cli.js check . --policy gate.policy.json --fail-on block
```

## Safety Notes

The CLI does not publish packages, create tags, modify branch protection, call LLMs, or access the network. It only reads local repository files and writes a policy file when explicitly asked.

## Limitations

The V1 detector is strongest for Node-style agent-skill repos. Non-Node repositories still get docs and fixture checks but fewer command hints.
