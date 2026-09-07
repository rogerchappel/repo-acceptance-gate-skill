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
must be arrays of non-empty strings; empty and whitespace-only entries are
rejected. `blockOnMissingRequiredDocs` and
`blockOnMissingRequiredScripts` must be booleans; use `false` to leave the
corresponding blocker disabled.

Document evidence must be a non-empty regular file; empty files and directories
whose names resemble documents do not satisfy the gate. Validation helpers must
be regular `.sh` files under `scripts/`. If `package.json` exists but cannot be
read or parsed, the CLI exits nonzero with a concise diagnostic instead of
treating the manifest as absent.

Required package scripts count only when their values are non-empty strings
after trimming; missing, empty or whitespace-only, and non-string values are
reported separately. A configured fixture directory counts only when it exists
as a directory and contains at least one regular file (including in a nested
directory). Reports distinguish missing fixture paths, empty directories, and
paths that exist but are not directories.

Markdown reports escape table delimiters in check identifiers and evidence so
custom policy paths remain inside the three-column checks table. Package script
names and commands use code-span delimiters longer than any backtick sequence
in their content, preserving commands that themselves contain inline code.

```json
{
  "requiredDocs": ["README.md", "architecture/DECISIONS.md"],
  "recommendedDocs": ["guides/OPERATIONS.md"],
  "fixtureDirs": ["examples/integration"],
  "blockOnMissingRequiredDocs": true,
  "blockOnMissingRequiredScripts": false
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
