# repo-acceptance-gate-skill

A deterministic local CLI that turns repository evidence into a release-candidate acceptance packet. It inspects docs, scripts, fixtures, validation helpers, and local policy rules, then recommends `ship`, `incubate`, or `block`.

## Quickstart

```bash
npm ci
npm run release:check
npm run smoke
node src/cli.js check . --format markdown
node src/cli.js check . --format json
node src/cli.js init-policy --out gate.policy.json
node src/cli.js check . --policy gate.policy.json --fail-on block
```

`check` and `explain` accept one optional repository root (default: `.`). Their
`--policy`, `--format`, and `--fail-on` options may appear before or after that
root. `--format` accepts `markdown` or `json`; `--fail-on` accepts `ship`,
`incubate`, or `block`. `init-policy` accepts `--out <path>`.

Unknown options, extra positional arguments, unsupported values, and options
without values print a concise diagnostic to stderr and exit with status 1.
A successful gate exits with status 0; a recommendation matched by `--fail-on`
exits with the gate-specific status 2.

Policy lists may name repository-relative custom paths. `requiredDocs` and
`recommendedDocs` accept file paths such as `architecture/DECISIONS.md`, while
`fixtureDirs` accepts directory paths such as `examples/integration`. Both
`check` and `explain` scan every path in the merged active policy; list values
must be arrays of strings.

```json
{
  "requiredDocs": ["README.md", "architecture/DECISIONS.md"],
  "recommendedDocs": ["guides/OPERATIONS.md"],
  "fixtureDirs": ["examples/integration"]
}
```

`npm run release:check` runs syntax checks, tests, the fixture smoke, and a package smoke that packs the release artifact, installs it in a disposable consumer, and exercises the installed CLI.

## Safety Notes

The CLI does not publish packages, create tags, modify branch protection, call LLMs, or access the network. It only reads local repository files and writes a policy file when explicitly asked.

## Limitations

The V1 detector is strongest for Node-style agent-skill repos. Non-Node repositories still get docs and fixture checks but fewer command hints.

## Verification

```sh
npm test
npm run check --if-present
npm run smoke --if-present
```

## Usage

Start from the checked-out package scripts so examples stay aligned with the current version:

```sh
npm ci
npm run smoke
```
