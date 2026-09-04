# Changelog

All notable changes to this repository are documented here.

## [Unreleased]

### Fixed

- npm publishing workflows use OIDC trusted publishing without token-oriented
  registry configuration, and validator tags no longer trigger the core publish
  workflow.

## [0.8.0] - 2026-09-04

### Added

- Immutable MCP Description `0.8.0-rc.2` validator and core selector support,
  with pinned extension catalogue metadata and manifest-verified provenance.
- `mergeEffectiveProtocolViews` and semantic-equivalence support for validated
  protocol views, including pre-standard extension-map round trips.

### Changed

- RC.2 Effective Protocol View projection preserves structurally valid server
  extension maps for pre-2026 revisions. Validator handling is compatibly
  relaxed from an error to `extensions-not-supported-by-version` warnings;
  client requirements remain strict and earlier selectors remain immutable.

## [0.7.0] - 2026-09-03

### Added

- `resolveMcpDescriptionComponentReferences` in the root and CSP-safe
  `@mcpdesc/core/components` entry points for validated RC.1 component
  resolution, with deterministic authored-to-terminal provenance and typed
  component references and registries.

### Changed

- Core now pins `@mcpdesc/validator` `0.8.0` and reaches the snapshot-owned
  resolver only through its CSP-safe standalone entry.

## [0.6.1] - 2026-09-02

### Changed

- Core now pins `@mcpdesc/validator` `0.7.1`, whose package documentation and
  npm homepage identify the validator's purpose and package directory more
  clearly.

## [0.6.0] - 2026-09-02

### Added

- `@mcpdesc/validator` as an independently versioned workspace package,
  preserving its immutable snapshots, frozen fixtures, public APIs, and
  strict-CSP browser contracts from `0.6.0`.

### Changed

- Core development now consumes the repository-owned validator `0.7.0` workspace
  package through the existing standalone entry.

## [0.5.0] - 2026-09-02

### Added

- Optional RC.1 migration protocol defaults with snapshot validation and a
  stable `migration-default-protocol-version` warning when applied.
- Deterministic, JSON-compatible conversion reports for successful, warned, and
  failed migrations, plus pretty-printed report serialization.

## [0.4.0] - 2026-09-01

### Added

- Immutable MCP Description `0.8.0-rc.1` constants and provenance metadata.
- `migrateMcpDescription07ToRc1`, a dedicated migration that emits and validates
  the exact RC.1 schema snapshot.

### Changed

- Effective Protocol View projection and declaration selection now accept exact
  Draft 4 or RC.1 selectors while preserving all published Draft 4 behavior.

## [0.3.0] - 2026-09-01

### Added

- CSP-safe `@mcpdesc/core/documents` and `@mcpdesc/core/selection` subpath
  exports, with browser checks that keep document parsing validator-free.

### Changed

- Validator-backed operations now use `@mcpdesc/validator/standalone` 0.5.0 to
  avoid runtime code generation under strict browser CSP.

## [0.2.0] - 2026-08-31

### Added

- `parseMcpDescriptionSource` and `serializeMcpDescription`, browser-safe pure
  operations for source-aware JSON/YAML parsing and deterministic output without
  host I/O.
- JSON-compatible YAML enforcement for finite numbers, string mapping keys,
  plain values, and acyclic structures.
- Strict JSON enforcement for unique object keys and finite numbers.
- `selectMcpDescriptionDeclarations`, a pure Draft 4 operation for selecting
  tools, resources, resource templates, and prompts by their normative
  identities while retaining scoped variants and omitting empty collections.
- Source/result validation, structured diagnostics, immutability tests, browser
  bundling, tarball checks, and isolated-consumer coverage for declaration
  selection.
- `migrateMcpDescription07ToDraft4`, a pure migration for caller-validated 0.7.0
  documents with deterministic inline-security extraction, empty collection
  normalization, generated-name diagnostics, and Draft 4 result validation.
- A maintainer-controlled release procedure covering tarball review, version and
  tag consistency, first-publication bootstrap, trusted npm publishing,
  provenance, and post-publication verification.
- A tag-triggered GitHub Actions workflow that runs the full validation suite
  and publishes `@mcpdesc/core` with npm provenance support.

### Changed

- Contribution guidance now uses lockfile-exact installation and links to the
  release procedure.
- The `Validate` workflow is enabled as a required check for `main`.
- Future npm releases use GitHub Actions trusted publishing without a stored npm
  token.

## [0.1.0] - 2026-08-31

Initial experimental package baseline, published manually to npm after local
tarball verification. The corresponding Git tag has not yet been created.

### Added

- `@mcpdesc/core`, a TypeScript ESM package for Node.js 22 or later and browser
  bundlers.
- `projectEffectiveProtocolView`, a pure operation that projects an MCP
  Description `0.8.0-draft.4` document to one declared MCP protocol revision.
- Projection across transports, capabilities, tools, resources, resource
  templates, prompts, and nested elicitation declarations while preserving
  document-wide content and reusable components.
- Validator-backed source and result validation with structured, phase-aware,
  deduplicated diagnostics.
- Immutable Draft 4 snapshot metadata sourced from `@mcpdesc/validator@0.4.0`,
  including the schema URI, snapshot tag, schema digest, and supported protocol
  revisions.
- Focused tests for scope inheritance, omission, nested projection,
  immutability, idempotence, diagnostics, and snapshot provenance.
- Type checking, formatting, browser bundling, exact package-content checks, and
  isolated tarball consumer verification in the local and CI validation
  workflow.
- Apache-2.0 licensing, provenance, contribution guidance, and repository
  instructions for coding assistants.

[Unreleased]: https://github.com/mcpdesc/core/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/mcpdesc/core/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/mcpdesc/core/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/mcpdesc/core/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/mcpdesc/core/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/mcpdesc/core/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/mcpdesc/core/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/mcpdesc/core/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/mcpdesc/core/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/mcpdesc/core/releases/tag/v0.1.0
