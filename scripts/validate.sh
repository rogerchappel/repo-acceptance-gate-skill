#!/usr/bin/env bash
set -euo pipefail
npm test
npm run check
npm run build
npm run smoke
node src/cli.js check . --format json >/dev/null
policy="${TMPDIR:-/tmp}/repo-acceptance-gate.policy.json"
node src/cli.js init-policy --out "$policy"
node src/cli.js check fixtures/node-package --policy "$policy" --format json >/dev/null
