# Security

repo-acceptance-gate-skill is a local-first audit helper. It reads repository files and only writes a policy file when `init-policy --out` is used.

## Reporting

Please report suspected security issues privately to the repository maintainer rather than opening a public issue.

## Handling Sensitive Data

- Do not add real credentials, tokens, customer data, or private repository contents to fixtures.
- Prefer synthetic fixtures that preserve structure without preserving secrets.
- Run `npm run release:check` before release or promotion work.
