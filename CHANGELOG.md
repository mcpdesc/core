# Changelog

All notable changes to this repository are documented here.

## [Unreleased]

### Added

- A maintainer-controlled release procedure covering tarball review, version and
  tag consistency, first-publication bootstrap, trusted npm publishing,
  provenance, and post-publication verification.
- A tag-triggered GitHub Actions workflow that runs the full validation suite
  and publishes `@mcpdesc/core` with npm provenance support.

### Changed

- Contribution guidance now uses lockfile-exact installation and links to the
  release procedure.
- The `Validate` workflow is enabled as a required check for `main`.

## [0.1.0] - 2026-08-31

Initial experimental package baseline. This version is prepared as a verified
local tarball and has not been published to npm.

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

[Unreleased]: https://github.com/mcpdesc/core/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mcpdesc/core/releases/tag/v0.1.0
