# Repository changelog

This changelog records repository structure, maintainer workflows, development
scripts, and release infrastructure.

> Published package behavior and contents remain in the independently versioned
> package changelogs:
>
> - [`@mcpdesc/core`](packages/core/CHANGELOG.md)
> - [`@mcpdesc/validator`](packages/validator/CHANGELOG.md)

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
