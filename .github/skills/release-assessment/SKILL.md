---
name: release-assessment
description: >-
  Determine whether @mcpdesc/core, @mcpdesc/validator, or both need a release,
  and identify the required release order and unresolved version decisions. Use
  when evaluating package changes, release necessity, or release scope.
license: Apache-2.0
---

# Release Assessment

## Workflow

1. Read `AGENTS.md`, `CHANGELOG.md`, `ROADMAP.md`, and `RELEASING.md`.
2. Fetch tags and the current main branch without changing the worktree:

   ```bash
   git fetch origin main --tags
   ```

3. Run the deterministic assessment:

   ```bash
   npm run release:assess
   ```

   Use `npm run release:assess -- --json` when structured output is useful.

4. Review package-affecting files, public API changes, changelogs, consumer
   impact, and compatibility. The script identifies release scope but does not
   choose SemVer.
5. Recommend one of: no package release, validator only, core only, or validator
   then core. Explain the SemVer recommendation separately for each package.
6. Obtain explicit maintainer approval before changing versions or preparing a
   publication.

## Decision Rules

- Runtime, declarations, packaged metadata, public documentation, snapshots, or
  generated standalone changes require a release of their owning package.
- Tests and development scripts alone do not require a package release, but may
  support one.
- A validator change requires a core release only when core changes or must pin
  the new validator version for its behavior.
- When both packages release and core depends on the new validator, publish and
  verify validator first.
- Never infer an MCP Description selector from an npm package version.

## Boundaries

- Do not modify package versions during assessment.
- Do not treat successful validation as authorization to publish.
- Do not modify an immutable validator snapshot to avoid a new selector or
  release.
