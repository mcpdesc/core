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

Tag one package at a time. The explicit confirmation flag acknowledges that
pushing the tag starts trusted npm publication:

```bash
npm run release:tag -- --package validator --version <version> --confirm-publish-via-tag
```

Watch `publish-validator.yml`, verify the npm version, integrity, provenance,
and signatures, and create the GitHub release. Only then release core:

```bash
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
