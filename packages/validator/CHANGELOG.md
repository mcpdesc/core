# Changelog

All notable changes to `@mcpdesc/validator` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this package follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Dates for published releases are the UTC publication dates recorded by npm.

## [Unreleased]

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

- Moved package maintenance and publication from the MCP Description
	specification repository to the MCP Description tooling repository without
	changing public APIs, immutable snapshots, diagnostics, or validation
	behavior.

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

[Unreleased]: https://github.com/mcpdesc/core/compare/validator-v0.8.0...HEAD
[0.8.0]: https://github.com/mcpdesc/core/compare/validator-v0.7.1...validator-v0.8.0
[0.7.1]: https://github.com/mcpdesc/core/compare/validator-v0.7.0...validator-v0.7.1
[0.7.0]: https://github.com/mcpdesc/core/releases/tag/validator-v0.7.0
[0.6.0]: https://github.com/mcpdesc/mcpdesc-specification/compare/validator-v0.5.0...validator-v0.6.0
[0.5.0]: https://github.com/mcpdesc/mcpdesc-specification/compare/17cc533e79b19ea2dbc1edcf06e30ba68a7d9b79...validator-v0.5.0
[0.4.0]: https://www.npmjs.com/package/@mcpdesc/validator/v/0.4.0
[0.3.0]: https://github.com/mcpdesc/mcpdesc-specification/releases/tag/validator-v0.3.0
[0.2.0]: https://www.npmjs.com/package/@mcpdesc/validator/v/0.2.0
[0.1.0]: https://github.com/mcpdesc/mcpdesc-specification/releases/tag/validator-v0.1.0