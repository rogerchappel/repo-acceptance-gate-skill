# Release Candidate Review

This branch is the initial public release-candidate review surface for `repo-acceptance-gate-skill`.

## Reviewer Checklist

- Confirm checks are derived from local repository evidence.
- Confirm `check` and `explain` do not publish, tag, or modify remotes.
- Confirm `ship`, `incubate`, and `block` recommendations are deterministic.
- Confirm verification commands in `docs/RELEASE_CANDIDATE.md` pass locally.
