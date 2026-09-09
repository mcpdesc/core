---
name: package-release
description: >-
  Prepare, check, tag, publish, and verify a maintainer-approved release of
  @mcpdesc/core, @mcpdesc/validator, or both. Use when executing a core or
  validator npm release after versions and scope are approved.
license: Apache-2.0
---

# Package Release

## Preconditions

- Read `AGENTS.md`, `RELEASING.md`, and the applicable package guidance.
- Require explicit maintainer approval for package names and versions.
- Require authenticated GitHub CLI access to `mcpdesc/core`.
- Release only from a clean `main` at the current `origin/main` tip after its
  required checks pass.
- Confirm release preparation, changelogs, and AI disclosure were reviewed and
  merged.

## Readiness

Fetch current refs, then run the guarded check:

```bash
git fetch origin main --tags
npm run release:check -- --package validator --version <version> --run-validation
npm run release:check -- --package core --version <version> --run-validation
```

Use `--package both` for a combined readiness report. The script checks the
worktree, branch and remote tip, required GitHub checks, tool versions, unused
npm version and Git tag, dated changelog section, exact core validator
dependency, validation suite, and dry-run package contents. Core readiness
requires its validator dependency to already exist on npm.

## Publish

Preview and run the resumable validator-first workflow:

```bash
npm run release:plan -- --package both --channel <next|latest>
npm run release:run -- --package both --channel <next|latest> --confirm-publish-via-tag
```

For a stable specification adoption, also pass
`--require-specification-tag v<specification-version>`. The runner waits for
each workflow and npm propagation, verifies integrity, provenance, signatures,
dependency pins, and clean installation, and creates GitHub releases. Rerun the
same command to resume after an interruption.

Use the lower-level commands only for recovery or a single manual stage:

```bash
npm run release:tag -- --package validator --version <version> --confirm-publish-via-tag
npm run release:check -- --package core --version <version> --run-validation
npm run release:tag -- --package core --version <version> --confirm-publish-via-tag
```

Watch `publish.yml` and perform the same npm and GitHub release verification.

## Failure Handling

- Stop on any readiness, workflow, npm, provenance, or signature failure.
- Never move, replace, or reuse a release tag.
- Never publish core before its exact validator dependency is available.
- If published behavior differs from preparation, document the outcome rather
  than rewriting the released tag or immutable snapshot.
