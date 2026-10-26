# Repository changelog

This changelog records repository structure, maintainer workflows, development
scripts, and release infrastructure.

> Published package behavior and contents remain in the independently versioned
> package changelogs:
>
> - [`@mcpdesc/core`](packages/core/CHANGELOG.md)
> - [`@mcpdesc/validator`](packages/validator/CHANGELOG.md)

## 2026-10-26

### Changed

- Rewrote the root README as a user entry point with package selection, a quick
  start, key concepts, compatibility, and an `mcpdesc: 0.8` badge, separating
  contributor and maintainer links.
- Moved development checks to `CONTRIBUTING.md` and the validator snapshot
  lifecycle to the validator maintainer guide.

### Security

- Updated locked dependencies to resolve npm audit advisories in `vite`,
  `vitest`, `@vitest/mocker`, `source-map-js`, and `fast-uri` (via `ajv`).
  Package dependency ranges are unchanged.

## 2026-10-22

### Added

- Added a consumer migration guide for `@mcpdesc/validator` 0.13.0 covering
  maintained defaults, exact selector pins, result-shape changes, unsupported
  formats, component resolution, and regression testing.

### Changed

- Updated GitHub Actions to v7 and run full validation on Node.js 22 and 24,
  while preserving stable release-gate check names and Node.js 20 validator
  compatibility coverage.
- Centralized validator selector declarations, component resolvers, schema
  digests, package expectations, and generic test matrices in generated
  YAML-backed configuration. Snapshot intake now reports the verified schema
  identity used by that configuration.
- Pruned retired validator runtime and fixture directories from `HEAD` while
  retaining them in repository history; selector configuration preserves their
  lifecycle, tag, schema URI, and digest tombstones.

## 2026-10-21

### Added

- Added a validator maintainer guide and a design record for validator
  revisions, selector naming, and planned default selectors, using issue #24 as
  the worked example.
- Added a maintainer decision flow covering specification, conformance, fixture,
  tooling-metadata, default, lifecycle, and API changes.
- Extended validator snapshot intake to accept date-based `rev` selectors.
- Updated validator maintenance rules for explicit per-format defaults and
  unsupported-version failures without fallback.
- Added a shared terminology guide and a selector configuration design for
  authoring YAML metadata and generating static runtime configuration.
- Implemented YAML-backed validator selector configuration with generated,
  freshness-checked runtime data, component resolvers, TypeScript selector
  declarations, and config-derived package and test matrices.
- Imported the reviewed `0.8.0-rev.20261021` validator snapshot and frozen
  fixtures for issue #24, made it the `0.8.0` format default in
  `@mcpdesc/validator@0.13.0-rc.1`, and retained stable `0.8.0` and RC.4 as
  deprecated explicit pins.

## 2026-09-09

### Added

- Added a side-effect-free release planner and a resumable release runner with
  explicit `next` and `latest` channels, validator-first ordering, npm
  propagation waits, provenance and signature verification, clean-install
  checks, and GitHub release creation.
- Added a stable-release guard that can require an exact specification tag
  before publication.

### Changed

- Reduced duplicated publication work by requiring the successful validation
  check for the exact tagged commit and limiting publish jobs to package and
  integrity checks before trusted npm publication.
- Updated maintainer release and snapshot-intake skills for channel-aware
  candidate releases, stable selectors, local integration tags, and explicit
  comparison of imported helper result contracts with the previous selector.
- Extended the snapshot-import development script to accept exact stable
  selectors while preserving immutable bundle verification.

## 2026-09-08

### Changed

- Documented the narrow maintainer-approved integrity exception for additive
  tooling metadata corrections that do not change schemas, conformance,
  diagnostics, or frozen fixtures.

## 2026-09-07

### Changed

- Made validator snapshot integrity package-owned and treated specification
  repository tags and commits as informational provenance.
- Removed retained snapshot-intake bundles and manifests from the validator
  workspace; imported runtime and fixture bytes remain protected by the snapshot
  integrity manifest.
- Documented active-selector retirement as removal from current registries,
  declarations, bundles, and tarballs without deleting historical source or
  fixtures from Git.

## 2026-09-05

### Added

- Added the repository skill for validating MCP Description YAML and JSON with
  the workspace packages.

### Fixed

- Corrected trusted npm publication workflows to avoid token-oriented registry
  configuration and prevented validator tags from triggering core publication.

## 2026-09-04

### Added

- Added deterministic release assessment and guarded package, version, tag,
  changelog, tarball, and registry checks.

### Changed

- Split core and validator publication into package-specific tag workflows and
  standardized trusted npm publication through GitHub OIDC.

## 2026-09-02

### Changed

- Added `@mcpdesc/validator` as an independently versioned workspace package and
  moved its maintenance and publication from the specification repository into
  this tooling repository.
- Added package-specific repository guidance for immutable snapshot intake,
  lifecycle, browser compatibility, and publication.

## 2026-08-31

### Added

- Initialized the TypeScript workspace, shared validation commands, repository
  contribution guidance, and coding-assistant instructions.
- Added the maintainer-controlled release procedure and tag-triggered trusted
  npm publication workflow with provenance.
- Added the required `Validate` workflow for the default branch.
