# Changelog

All notable changes to `@mcpdesc/validator` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this package follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Dates for published releases are the UTC publication dates recorded by npm.

## Unreleased

### Added

- Added per-call `schemaPolicyIfPresent` and
  `fallbackIfSelectorIsUnknown` options to validation and selector resolution,
  allowing consumers to select a recognized schema identity or explicitly
  fall back to the configured default for an unavailable selector.

### Changed

- **Breaking:** retired `0.8.0-rc.4`, `0.9.0-draft.1` through `.4`, and
  `0.9.0-rc.1` and `.2` from the current registry, declarations, standalone
  bundle, package contents, and snapshot trees. Only
  `0.8.0-rev.20261021`, `0.8.0`, and `0.9.0-rc.3` remain supported. Selector
  identities are retained as configuration tombstones; use the historical
  package release to reproduce their behavior.
- Removed RC.2-only `explainDiagnostics` support and its public diagnostic
  explanation type.

## [0.14.0-rc.8] - 2026-11-08

### Added

- Imported immutable `0.9.0-rc.3` from specification tag `v0.9.0-rc.3`
  (commit `106387d882030f2c5407291cb14e7cee2d6d6a31`) with the manifest-verified
  schema, runtime inputs, provenance, and frozen fixtures.
- Froze validation-result format `1.4.0` and expose RC.3 diagnostic `detail`
  and `relatedLocations` through default, browser, and standalone APIs.
- Added selected-branch diagnostic reduction, source-aware paths, component
  reference attribution, improved rule attribution, and precise de-duplication.

### Changed

- **Upgrade note:** `mcpdesc: "0.9.0"` now defaults to RC.3. Diagnostic
  locations, counts, rule attribution, and rule results can change. RC.3 also
  rejects unknown members on Elicitation Interaction Response Objects in Tool
  Interaction Examples; pin RC.2 to retain its earlier behavior.

## [0.14.0-rc.7] - 2026-11-07

### Added

- Added opt-in `explainDiagnostics` metadata for RC.2 unexpected transport
  properties, including the selected transport discriminator and a unique
  one-edit property suggestion when available. Default diagnostics are
  unchanged.

### Changed

- **Upgrade note:** diagnostic explanations are available only when requested
  with `explainDiagnostics: true`; the concise diagnostic output remains the
  default.

## [0.14.0-rc.6] - 2026-11-06

### Added

- Imported immutable `0.9.0-rc.2` from specification tag `v0.9.0-rc.2`
  (commit `450df01fbd1162cda4a9813ae470448f00fbe3da`) with frozen conformance,
  projection, conversion, and view/merge fixtures.
- Added discriminator-based conditional schema validation for RC.2, including
  filtering redundant conditional-summary errors while preserving specific
  branch failures and independent findings.

### Changed

- **Upgrade note:** `mcpdesc: "0.9.0"` now defaults to `0.9.0-rc.2`.
  Transport field typos such as `arg` instead of `args` now produce a focused
  schema diagnostic; RC.1 and earlier selectors remain unchanged.

## [0.14.0-rc.5] - 2026-11-04

### Added

- Imported immutable `0.9.0-rc.1` from specification tag `v0.9.0-rc.1`
	(commit `b208a06ef9a947556df0623f5431935681e8716d`), preserving conformance,
	native-projection, conversion, and view/merge fixtures.
- Froze the tagged validation result format `1.3.0` schema and checked every
	RC.1 fixture result against it. Standard and strict-CSP entry points preserve
	identical RC.1 diagnostics and rule results.

### Changed

- **Upgrade note:** `mcpdesc: "0.9.0"` now defaults to `0.9.0-rc.1` with
	`schemaPins: false`, including recognized same-format draft schema identities.
	Callers no longer need a selector for 0.9.0. Pin a draft explicitly to retain
	its original rule identifiers and results; existing snapshots are unchanged.
- Allow approved RC defaults, never draft defaults. The 0.9.0 default advances
	with approved RC intakes on package upgrades and freezes to final `0.9.0`.
- RC.1 uses protocol-version rule IDs and result format `1.3.0`, including
	`$defs/protocol-version`; Draft 4 retains its identifiers and format `1.0.0`.

## [0.14.0-rc.4] - 2026-11-01

### Added

- Added explicit selector `0.9.0-draft.4` with frozen conformance,
	projection, conversion, and view fixtures. Draft selectors remain
	never-default.
- Added rule-level validation results and version-scoped diagnostics for the
	Draft 4 validation result format 1.0.0.

## [0.14.0-rc.3] - 2026-10-29

### Added

- Added explicit selector `0.9.0-draft.3` from specification tag
	`v0.9.0-draft.3`, with frozen conformance, projection, and conversion profile
	fixtures. Draft selectors remain never-default.

## [0.14.0-rc.2] - 2026-10-28

### Added

- Added explicit selector `0.9.0-draft.2` from specification tag
	`v0.9.0-draft.2` with its frozen conformance,
  projection, and conversion profile fixtures. Draft selectors remain
  never-default; callers must pin the exact draft.

## [0.14.0-rc.1] - 2026-10-26

### Added

- Added explicit selector `0.9.0-draft.1` for MCP Description 0.9 Community
	Working Draft 1, with frozen conformance and native-projection fixtures. No
	`0.9.0` default is configured; callers must pin the draft explicitly.
- Exposed the draft's registered rule identity through optional
	`diagnostic.rule`. Existing selectors keep their four-field diagnostics.

### Fixed

- Prevented standalone validation from confusing snapshots whose schemas share
	a description. Runtime, browser, and standalone outcomes and rule identities
	are checked against the frozen fixtures.

## [0.13.1] - 2026-10-26

### Changed

- Rewrote the README as a task-oriented guide covering results, selector
  choice, browser and strict-CSP use, component resolution, support metadata,
  and troubleshooting, with absolute links that work on npmjs.com. Maintainer
  material moved to the repository guides. No API or behavior changes.

## [0.13.0] - 2026-10-22

### Added

- Added a consumer migration guide for choosing maintained defaults or exact
	selector pins when upgrading from validator 0.12.x to 0.13.0.

### Changed

- Promoted the default-selector behavior and issue #24 revision proven in
	`0.13.0-rc.1` without changing schemas, conformance behavior, diagnostics, or
	public APIs.

## [0.13.0-rc.1] - 2026-10-21

### Added

- Added immutable selector `0.8.0-rev.20261021` and its frozen fixtures. The
	revision fixes issue #24 by preserving unknown and custom Tool-schema
	keywords and applying MCP-specific `x-mcp-header` checks only to MCP
	`2026-07-28`.
- Added validated YAML configuration for selector lifecycle, schema identities,
  and per-format defaults, with freshness-checked generated runtime data.
- Added maintainer-chosen default selectors by MCP Description format version
	and report the selector used plus whether selection was defaulted.
- Added `options.selector` and `result.selector` as the canonical selector names;
	the prior `specification` option and result field remain compatibility aliases.
- Return `unsupported-format-version` when no default exists instead of
	silently falling back to an older format.

### Changed

- Changed the `0.8.0` format default from stable `0.8.0` to
	`0.8.0-rev.20261021` with `schemaPins: false`. Documents using the stable
	schema URI or no `$schema` receive the revision; explicit selector pins keep
	their original results. The schema URI and SHA-256 digest are unchanged.
- Generate the supported-selector TypeScript union and component-resolver
	registry from selector configuration, and derive generic package and test
	matrices from the same non-retired selector set.
- Store schema SHA-256 identities in selector configuration, validate them
	against imported bytes, and derive public provenance without per-selector
	hash tests. Snapshot intake reports the verified URI and digest.
- Remove retired Draft 1-4 and RC.1-3 runtime and fixture directories from
	`HEAD`; repository history retains their complete artifacts while
	configuration preserves their identity tombstones.
- Resolve known historical schema URIs through their format's configured
	default when `schemaPins` is false.
- Made the validation selector optional; callers may omit it to use the
	maintainer-configured format default or pass one explicitly to pin behavior.

### Deprecated

- Deprecated stable selector `0.8.0`; pin it explicitly to retain its original
  validation results. RC.4 remains supported and deprecated.

## [0.12.0] - 2026-09-09

### Changed

- Promoted the stable MCP Description `0.8.0` support proven in `0.12.0-rc.1`
	without changing schemas, conformance behavior, diagnostics, fixtures, or
	public APIs.

## [0.12.0-rc.1] - 2026-09-09

### Added

- Added the immutable stable `0.8.0` selector, its frozen conformance fixtures,
  and component reference resolution with terminal-target provenance.

### Changed

- Advanced active runtime support to RC.4 and stable `0.8.0`, deprecated RC.4,
  and retired RC.3 from current registries, declarations, bundles, and package
  contents while retaining its immutable source and fixtures in Git.

## [0.11.1] - 2026-09-08

### Fixed

- Added terminal-target provenance to RC.4 component reference resolution and
	enabled RC.4 through the public resolver. This is an approved additive
	tooling-metadata correction; schemas, conformance results, diagnostics, and
	frozen fixtures are unchanged.

## [0.11.0] - 2026-09-08

### Added

- Added the immutable `0.8.0-rc.4` selector, including protocol-independent
	root info metadata behavior and its frozen conformance fixture corpus.

### Changed

- Narrowed active runtime support to RC.3 and RC.4, deprecated RC.3, and removed
	RC.2 from current registries, declarations, generated bundles, and package
	contents while retaining its immutable source and fixtures in Git.
- Kept component reference resolution on RC.3 because RC.4's snapshot resolver
	does not expose the terminal-target provenance required by the public result
	contract.

## [0.10.1] - 2026-09-07

### Changed

- Narrowed active runtime support to RC.2 and RC.3 and marked RC.2 deprecated.
- Excluded retired runtime snapshots from generated bundles and package
	contents while retaining their source and frozen fixtures in Git.

## [0.10.0] - 2026-09-07

### Added

- Added the immutable `0.8.0-rc.3` selector with behavior equivalent to RC.2,
	its RC.3 schema identity, and frozen fixtures.
- Added component reference resolution for RC.2 and RC.3 with deterministic
	terminal-target provenance.

### Changed

- Validator integrity now relies on package-owned schema, runtime, fixture, and
	package bytes. Specification repository tags and commits are retained only as
	informational provenance.
- Recorded maintainer-approved additive provenance corrections to the RC.2 and
	RC.3 snapshot implementations. Their schemas, conformance results,
	diagnostics, and frozen fixtures remain unchanged.

## [0.9.0] - 2026-09-04

### Added

- Added the immutable `0.8.0-rc.2` selector from specification tag
	`v0.8.0-rc.2`, including its manifest-verified runtime, schema, and frozen
	fixture corpus.
- Exported the RC.2 MCP extension catalogue metadata and maturity classifier.

### Changed

- RC.2 preserves structurally valid pre-standard server extension maps and
	reports `extensions-not-supported-by-version` as a warning while retaining
	strict client extension requirements and independent reserved-identifier
	diagnostics. This is a compatible validator relaxation; RC.1 and earlier
	selectors are unchanged.

## [0.8.0] - 2026-09-03

### Added

- Added RC.1-only `resolveMcpDescriptionComponentReferences` to the default,
	browser, and standalone entries, returning the existing resolved clone,
	diagnostics, and substitution count plus deterministic terminal-target
	provenance.

### Changed

- Recorded the maintainer-approved additive provenance correction to the RC.1
	snapshot implementation. Its schema, conformance results, diagnostics, and
	frozen fixtures remain unchanged.

## [0.7.1] - 2026-09-02

### Changed

- Added an explicit package-specific homepage and expanded the README with the
	validator's purpose, boundaries, result model, installation, and newest-first
	snapshot support.

## [0.7.0] - 2026-09-02

### Changed

- Updated shipped repository metadata and provenance files to identify the MCP
	Description tooling repository as the package maintenance location. Public
	APIs, immutable snapshots, diagnostics, and validation behavior are unchanged.

## [0.6.0] - 2026-09-02

### Added

- Added `@mcpdesc/validator/browser` as a descriptive strict-CSP alias for the existing `@mcpdesc/validator/standalone` implementation, with the same API and declarations.
- Added blocked-code-generation validation coverage, including document-provided schemas, plus esbuild, Vite, runtime-AJV exclusion, and packed-export checks.

### Changed

- Documented the strict-CSP and runtime-compilation behavior of the default, browser, and standalone entries. The default and standalone exports remain unchanged, and no conditional browser export was added.

### Bundle size

- Before this change, the generated standalone artifact was 1,730,897 bytes (195,998 bytes gzip). After adding the zero-source-file browser alias it remains 1,730,897 bytes (195,998 bytes gzip). Minified esbuild bundles of `/browser` and `/standalone` are both 1,752,417 bytes (0-byte delta); the minified Vite `/browser` bundle is 2,088,016 bytes in the same development environment.
- A metadata-only entry was evaluated but not added. The current public metadata is coupled to the cumulative snapshot registry, and splitting it would introduce another declaration and synchronization boundary without an approved consumer or measured package-level benefit.

## [0.5.0] - 2026-08-31

### Added

- Added `resolveMcpDescriptionSpecification` for resolving an immutable validator selector from a document's `$schema` identity or checking an exact caller-supplied selector.
- Added each snapshot's recorded schema URI to `specificationProvenance`.
- Added the `@mcpdesc/validator/standalone` entry for strict-CSP browsers. It preserves the synchronous public API without `eval`, `new Function`, Node.js built-ins, network schema retrieval, or WASM.
- Added the immutable `0.8.0-rc.1` selector with the release candidate's canonical schema identity and published schema digest.

## [0.4.0] - 2026-08-29

### Added

- Added the immutable `0.8.0-draft.4` selector, embedded schema, semantic implementation, and frozen fixture corpus.
- Added Draft 4 schema-digest and snapshot metadata checks while preserving the Draft 1 through Draft 3 implementations.

## [0.3.0] - 2026-08-27

### Added

- Added the immutable `0.8.0-draft.3` selector, embedded schema, semantic implementation, and frozen fixture corpus.
- Added Draft 3 to the cumulative browser bundle, declarations, support metadata, and package-content checks.

## [0.2.0] - 2026-08-27

### Added

- Added the immutable `0.8.0-draft.2` selector as a sibling implementation without changing Draft 1 behavior.
- Added cumulative selector dispatch, protocol-version metadata, declarations, browser checks, and a frozen Draft 2 fixture corpus.

## [0.1.0] - 2026-08-25

### Added

- Published the initial reusable validator package for the immutable `0.8.0-draft.1` snapshot.
- Added synchronous structural and semantic validation for parsed JavaScript values with deterministic diagnostics and exact selector dispatch.
- Added ESM browser support, TypeScript declarations, embedded schema provenance, frozen fixtures, and package-content checks.

[Unreleased]: https://github.com/mcpdesc/core/compare/validator-v0.13.0...HEAD
[0.13.0]: https://github.com/mcpdesc/core/compare/validator-v0.13.0-rc.1...validator-v0.13.0
[0.13.0-rc.1]: https://github.com/mcpdesc/core/compare/validator-v0.12.0...validator-v0.13.0-rc.1
[0.12.0]: https://github.com/mcpdesc/core/compare/validator-v0.12.0-rc.1...validator-v0.12.0
[0.12.0-rc.1]: https://github.com/mcpdesc/core/compare/validator-v0.11.1...validator-v0.12.0-rc.1
[0.11.1]: https://github.com/mcpdesc/core/compare/validator-v0.11.0...validator-v0.11.1
[0.11.0]: https://github.com/mcpdesc/core/compare/validator-v0.10.1...validator-v0.11.0
[0.10.1]: https://github.com/mcpdesc/core/compare/validator-v0.10.0...validator-v0.10.1
[0.10.0]: https://github.com/mcpdesc/core/compare/validator-v0.9.0...validator-v0.10.0
[0.9.0]: https://github.com/mcpdesc/core/compare/validator-v0.8.0...validator-v0.9.0
[0.8.0]: https://github.com/mcpdesc/core/compare/validator-v0.7.1...validator-v0.8.0
[0.7.1]: https://github.com/mcpdesc/core/compare/validator-v0.7.0...validator-v0.7.1
[0.7.0]: https://github.com/mcpdesc/core/releases/tag/validator-v0.7.0
[0.6.0]: https://github.com/mcpdesc/mcpdesc-specification/compare/validator-v0.5.0...validator-v0.6.0
[0.5.0]: https://github.com/mcpdesc/mcpdesc-specification/compare/17cc533e79b19ea2dbc1edcf06e30ba68a7d9b79...validator-v0.5.0
[0.4.0]: https://www.npmjs.com/package/@mcpdesc/validator/v/0.4.0
[0.3.0]: https://github.com/mcpdesc/mcpdesc-specification/releases/tag/validator-v0.3.0
[0.2.0]: https://www.npmjs.com/package/@mcpdesc/validator/v/0.2.0
[0.1.0]: https://github.com/mcpdesc/mcpdesc-specification/releases/tag/validator-v0.1.0