# Changelog

All notable changes to `@mcpdesc/core` are documented in this file.

## Unreleased

## [0.13.0-rc.8] - 2026-11-09

### Changed

- **Breaking:** narrowed supported selectors to `0.8.0-rev.20261021`, `0.8.0`,
  and `0.9.0-rc.3`. Retired selectors are no longer accepted by selector-
  sensitive operations; the RC.4-specific 0.7.0 migration API and retired
  selector exports were removed.
- Pin validator `0.14.0-rc.9`.

## [0.13.0-rc.7] - 2026-11-08

### Added

- Adopted immutable validator selector `0.9.0-rc.3` across projection, merge,
  declaration selection, component reference resolution, native projection, and
  0.8.0-to-0.9.0 conversion. Exported its selector identity and provenance.
- Preserve RC.3 diagnostic `detail`, `relatedLocations`, protocol versions, and
  rule identities through core results; de-duplication retains findings that
  differ in structured facts or attribution.
- Added exhaustive selector-support, structured diagnostic propagation, and
  updated RC.3 conversion and conditional-schema ordering coverage.

### Changed

- **Upgrade note:** unpinned `0.9.0` operations now use RC.3. Results can have
  different diagnostic paths, counts, rule attribution, and validity. RC.3
  rejects unknown members on Elicitation Interaction Response Objects in Tool
  Interaction Examples; pin RC.2 to retain its earlier behavior.
- Pin validator `0.14.0-rc.8`.

## [0.13.0-rc.6] - 2026-11-05

Ordering enhancements when projecting and serializing

### Clarified

- Effective Protocol Views and default native projections preserve relative
  ordering of retained fields and array elements. Native projection also accepts
  explicit `keyOrder: 'preserve'`. Resolved schemas retain component target
  ordering. Neither projection preserves source comments or formatting. Existing
  selector support, validation, and diagnostics remain unchanged.

### Added

- Added opt-in `keyOrder: 'document'` serialization using the
  maintainer-approved proposed specification Section 18 ordering profile for
  0.8.0 and 0.9.0 values. Context-specific field sequences preserve arrays,
  named-map entries, opaque schemas, metadata, and application payloads. Unknown
  formats and variants remain untouched. This does not add a validator selector
  or change validation. Neither document-oriented nor preserving serialization
  preserves source comments, quoting, whitespace, or moved-property positions.
- Added explicit `keyOrder: 'preserve'` and `keyOrder: 'sorted'` policies to
  `serializeMcpDescription` for JSON and YAML. Preservation retains recursive
  JavaScript property enumeration order; sorted mode retains the previous
  recursive key-sorting behavior. Neither changes array order or mutates inputs.
- Added opt-in `keyOrder: 'document'` to native MCP projection for tools,
  resources, resource templates, and prompts. It reuses MCP Description field
  sequences for retained native fields and known nested structures, without
  reordering arrays, embedded schemas, or `_meta` contents. This is a tooling
  presentation convention, not an MCP wire-order requirement or validator rule.
- Adopted immutable `0.9.0-rc.2` across projection, merge, declaration
  selection, component resolution, native projection, and 0.8.0-to-0.9.0
  conversion, with frozen RC.2 fixtures and strict-CSP and isolated-consumer
  coverage. Exported `V0_9_RC_2_SPECIFICATION`, `V0_9_RC_2_SCHEMA_URI`, and
  `v0_9Rc2Snapshot`.

### Changed

- **Upgrade note:** `serializeMcpDescription` now defaults to
  `keyOrder: 'preserve'` instead of sorting object keys. Pass
  `keyOrder: 'sorted'` to retain the previous output ordering for snapshots,
  comparisons, or generated files.
- **Upgrade note:** unpinned `0.9.0` documents and conversion now use RC.2.
  Migration from 0.7.0 remains unsupported for 0.9.0 selectors.

## [0.13.0-rc.5] - 2026-11-04

### Added

- Adopted immutable `0.9.0-rc.1` across projection, merge, declaration
  selection, component resolution, native projection, and 0.8.0-to-0.9.0
  conversion, with frozen RC.1 fixtures and strict-CSP and isolated-consumer
  checks.
- Exported `V0_9_RC_1_SPECIFICATION`, `V0_9_RC_1_SCHEMA_URI`, and
  `v0_9Rc1Snapshot`.

### Changed

- **Upgrade note:** unpinned `0.9.0` documents now use RC.1, including documents
  with a recognized earlier draft `$schema`. Explicit draft pins are unchanged.
  The configured default advances through approved RCs, then freezes to final
  `0.9.0`. RC.1 projection uses `projection-protocol-version-not-declared`;
  earlier selectors retain `projection-version-not-declared`.
- **Upgrade note:** conversion without `selector` follows the configured 0.9.0
  default instead of Draft 2. Pass `selector: '0.9.0-draft.2'` to retain the old
  target. Conversion still preserves omission of `$schema` and never guesses
  fixes.
- Pinned `@mcpdesc/validator` `0.14.0-rc.5` with RC.1 protocol-version rule IDs
  and result format `1.3.0`. Migration from 0.7.0 to 0.9.0 remains unsupported.

## [0.13.0-rc.4] - 2026-11-01

### Added

- Added explicit `0.9.0-draft.4` selector support, per-rule validation results,
  and the Draft 4 view/merge fixture suite.
- Added Draft 4 Tool-schema dialect rules, Resource URI conversion blockers, and
  longest-owner schema diagnostic attribution through validator diagnostics.
- Updated native projection postconditions for the new Tool-schema behavior.

### Changed

- Pinned `@mcpdesc/validator` `0.14.0-rc.4`.

## [0.13.0-rc.3] - 2026-10-29

### Added

- Added explicit `0.9.0-draft.3` selector support across selector-sensitive
  operations, with native MCP projection postcondition validation against the
  pinned protocol revision schemas. Postcondition failures report
  `projection-postcondition-failed` and return no partial list or value.
- Added `V0_9_DRAFT_3_SPECIFICATION`, `V0_9_DRAFT_3_SCHEMA_URI`, and
  `v0_9Draft3Snapshot`; extended 0.8.0-to-0.9.0 conversion to accept an explicit
  Draft 3 target selector while retaining Draft 2 as the default.
- Pinned MCP protocol schemas and their upstream license for offline native
  postcondition validation.

### Changed

- Pinned `@mcpdesc/validator` `0.14.0-rc.3`.

## [0.13.0-rc.2] - 2026-10-28

### Added

- Added explicit `0.9.0-draft.2` support across the selector-sensitive core
  operations and extended native MCP projection to Draft 2.
- Added `convertMcpDescriptionVersion` for the Draft 2 0.8.0-to-0.9.0 profile,
  including explicit blocker fixes and RFC 6902 patch output. Conversion and
  native projection remain separate steps.
- Added `V0_9_DRAFT_2_SPECIFICATION`, `V0_9_DRAFT_2_SCHEMA_URI`, and
  `v0_9Draft2Snapshot`.

### Changed

- Pinned `@mcpdesc/validator` `0.14.0-rc.2`.

## [0.13.0-rc.1] - 2026-10-26

### Added

- Added `0.9.0-draft.1` support for Effective Protocol View projection and
  merge, declaration selection, and component reference resolution. Draft
  selectors are never defaults and must be passed explicitly.
- Added `projectMcpNativeValue` for Draft 1 tool, resource, resource template,
  and prompt values or ordered lists, tested against the frozen specification
  projection fixtures. MCP Description fields and `x-` extensions are omitted;
  embedded schemas and `_meta` are copied unchanged.
- Added `V0_9_DRAFT_1_SPECIFICATION`, `V0_9_DRAFT_1_SCHEMA_URI`, and
  `v0_9Draft1Snapshot`, and preserved optional validator `rule` identities in
  core diagnostics.

### Changed

- Pinned `@mcpdesc/validator` `0.14.0-rc.1`.
- Migration from 0.7.0 to 0.9.0 is intentionally unsupported until a conversion
  contract is approved; 0.8.0 migrations are unchanged.

## [0.12.0] - 2026-10-26

### Added

- Added `selector` as the canonical option in projection, merge, declaration
  selection, component reference resolution, and migration, matching
  `@mcpdesc/validator`. Conflicting `selector` and `specification` values fail
  with `conflicting-selector-options`.

### Changed

- **Upgrade note:** the selector is now optional in projection, merge,
  declaration selection, component reference resolution, and 0.8.0 migration.
  When omitted, operations use the `@mcpdesc/validator` default selector for the
  document's `mcpdesc` version, `0.8.0-rev.20261021` for 0.8.0 documents.
  Explicit selectors still pin exact rules; remove `specification: '0.8.0'` to
  adopt the default. Merge resolves from its first document, and migration
  validates its result with the default unless pinned.
- Pinned `@mcpdesc/validator` `0.13.1` and added `0.8.0-rev.20261021` to every
  selector-sensitive operation, exported as `V0_8_REV_20261021_SPECIFICATION`.
- Documents whose selector cannot be resolved fail with a `source` diagnostic,
  such as `unsupported-format-version`, without falling back to older rules.
- Rewrote the README as a task-oriented guide covering installation, result
  handling, selector choice and upgrading, each operation, entry points, and
  limits, with absolute links that work on npmjs.com.

### Deprecated

- Deprecated the `specification` option in favor of `selector`; it remains a
  working alias.
- Deprecated selector `0.8.0`, matching `@mcpdesc/validator`. It still works
  when pinned and is listed in `deprecatedCoreSpecifications`; prefer the
  default or `0.8.0-rev.20261021`.

## [0.11.0] - 2026-09-09

### Changed

- Promoted the stable MCP Description `0.8.0` operations proven in `0.11.0-rc.1`
  without changing public APIs or behavior, and pinned `@mcpdesc/validator`
  `0.12.0`.

## [0.11.0-rc.1] - 2026-09-09

### Added

- Added stable MCP Description `0.8.0` support across projection, merge,
  declaration selection, migration from 0.7.0, and component reference
  resolution.
- Added `migrateMcpDescription07To08` and stable snapshot metadata.

### Changed

- Advanced current core support to RC.4 and stable `0.8.0`, deprecated RC.4,
  retired RC.3 from the current API, and pinned `@mcpdesc/validator`
  `0.12.0-rc.1`.

## [0.10.1] - 2026-09-08

### Fixed

- Enabled RC.4 component reference resolution with deterministic terminal-target
  provenance through `@mcpdesc/validator` `0.11.1`.

## [0.10.0] - 2026-09-08

### Added

- Added MCP Description `0.8.0-rc.4` support for projection, merge, declaration
  selection, and migration from 0.7.0, including protocol-independent root info
  metadata behavior.

### Changed

- Narrowed current core support to RC.3 and RC.4, deprecated RC.3, removed RC.2
  from the current API, and pinned `@mcpdesc/validator` `0.11.0`.
- Marked RC.4 component reference resolution intentionally unsupported because
  the snapshot resolver does not expose the terminal-target provenance required
  by the core operation contract.

## [0.9.1] - 2026-09-07

### Changed

- Narrowed core runtime support to RC.2 and RC.3, deprecated RC.2, and removed
  Draft 4 and RC.1 from the current API.
- Moved core release history into the package and included it in published
  tarballs.

## [0.9.0] - 2026-09-07

### Added

- Added MCP Description `0.8.0-rc.3` validator support and core support for
  projection, merge, declaration selection, component reference resolution, and
  migration from 0.7.0.
- Added RC.2 component reference resolution with deterministic terminal-target
  provenance.

### Changed

- Snapshot integrity now protects package-owned selector bytes without binding
  validation behavior to immutable specification repository documentation or
  source commits.

## [0.8.1] - 2026-09-05

### Added

- `migrateMcpDescription07ToRc2`, an exact-target migration from
  caller-validated MCP Description 0.7.0 documents with RC.2 result validation
  and conversion reports.

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

### Changed

- Core now pins the repository-owned `@mcpdesc/validator` `0.7.0` package
  through the existing standalone entry.

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
- Apache-2.0 licensing and package provenance files.

[Unreleased]: https://github.com/mcpdesc/core/compare/v0.11.0...HEAD
[0.11.0]: https://github.com/mcpdesc/core/compare/v0.11.0-rc.1...v0.11.0
[0.11.0-rc.1]: https://github.com/mcpdesc/core/compare/v0.10.1...v0.11.0-rc.1
[0.10.1]: https://github.com/mcpdesc/core/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/mcpdesc/core/compare/v0.9.1...v0.10.0
[0.9.1]: https://github.com/mcpdesc/core/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/mcpdesc/core/compare/v0.8.1...v0.9.0
[0.8.1]: https://github.com/mcpdesc/core/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/mcpdesc/core/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/mcpdesc/core/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/mcpdesc/core/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/mcpdesc/core/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/mcpdesc/core/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/mcpdesc/core/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/mcpdesc/core/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/mcpdesc/core/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/mcpdesc/core/releases/tag/v0.1.0
