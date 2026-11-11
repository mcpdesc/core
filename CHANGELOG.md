# Repository changelog

This changelog records repository structure, maintainer workflows, development
scripts, and release infrastructure.

> Published package behavior and contents remain in the independently versioned
> package changelogs:
>
> - [`@mcpdesc/core`](packages/core/CHANGELOG.md)
> - [`@mcpdesc/validator`](packages/validator/CHANGELOG.md)

## 2026-11-10

### Changed

- Added an internal normalized-YAML serializer to the core tarball allowlist and
  extended browser, consumer, and public-type checks for the opt-in Section 15.9
  presentation profile. Round-trip checks now use the public parser, including
  octal-like string keys and values under the approved input scalar contract. No
  validator selector was imported or modified.
- Prepared core `0.13.0-rc.9` with the existing validator `0.14.0-rc.9` pin. Its
  reviewed PR merged, and the release was tagged and published.
- Prepared core `0.13.0-rc.10` with opt-in sorted ordering for normalized YAML;
  the validator package and its version remain unchanged.

## 2026-11-09

### Changed

- Added `check:yaml-style` to routine checks for mutable YAML files and embedded
  examples, including validator files excluded by Prettier. Documented the
  two-space indented-sequence convention and intentional parser-input
  exceptions. Frozen snapshot artifacts remain excluded and unchanged.
- Made formatter indentation settings explicit and added YAML style-checker
  tests to the repository test command.
- Retired older validator selectors from current validator and core runtime
  support, keeping only `0.8.0-rev.20261021`, `0.8.0`, and `0.9.0-rc.3`.
  Historical selector identities remain configured as tombstones; consumers
  needing retired behavior must use its earlier package release.
- Prepared validator `0.14.0-rc.9` followed by core `0.13.0-rc.8`; tagging and
  publication await the reviewed PR merge and required CI.

## 2026-11-08

### Added

- Imported the manifest-verified immutable specification RC.3 snapshot,
  including its schema, runtime inputs, provenance, frozen fixtures, and
  validation-result format `1.4.0`.
- Integrated RC.3 diagnostics and selector support across validator entry points
  and selector-sensitive core operations, with source-aware structured results,
  rule attribution, and component related locations.

### Changed

- Prepared validator `0.14.0-rc.8` followed by core `0.13.0-rc.7`, with core
  pinned to the matching validator. No tag or publication was created.

## 2026-11-06

### Added

- Imported immutable specification RC.2 from tag `v0.9.0-rc.2`, including frozen
  conformance, projection, conversion, and view/merge fixtures.
- Added RC.2 selector support across validator and core operations. The
  discriminator-driven schema reports the transport `arg` typo as one focused
  diagnostic and suppresses redundant conditional summaries; RC.1 remains
  unchanged.
- Documented projection preservation guarantees and the approved native MCP
  presentation subset of document-oriented ordering.
- Added explicit projection-ordering tests across supported selectors, MCP
  revisions, and native kinds, plus strict-CSP and isolated-consumer coverage.
  Frozen native projection fixtures now run under both ordering policies;
  validator snapshots remain unchanged.

### Changed

- Published validator `0.14.0-rc.6` followed by core `0.13.0-rc.6` on the `next`
  channel, with core pinned to the matching validator.

## 2026-11-05

### Added

- Added the document-oriented ordering design, recording the proposed
  specification Section 18 sequences and explicit preservation boundaries.
- Added exhaustive ordering and field-inventory tests across all eight embedded
  selectors, with JSON/YAML, strict-CSP, and isolated-consumer coverage.

### Changed

- Extended the core tarball allowlist for the internal document-ordering module.
  Validator snapshots remain unchanged.
- Prepared core `0.13.0-rc.6` for the `next` channel with preserving, sorted,
  and document-oriented serialization. Validator remains `0.14.0-rc.5`;
  publication requires the reviewed release commit and passing remote checks.

## 2026-11-04

### Added

- Imported specification RC.1 as immutable selector `0.9.0-rc.1`, preserving
  exported artifacts and freezing its tagged validation result schema `1.3.0`.
- Extended standalone rule-result instrumentation and core frozen-fixture,
  strict-CSP, type, and isolated-consumer checks to RC.1.

### Changed

- Approved release-candidate defaults: `0.9.0` follows RC.1 and later approved
  RC intakes, then freezes to final `0.9.0`. Draft defaults remain prohibited;
  explicit selectors remain immutable pins. Updated configuration validation and
  maintainer policy accordingly.
- Prepared validator `0.14.0-rc.5` and core `0.13.0-rc.5` without publication;
  core pins the matching validator and conversion follows its 0.9.0 default.

## 2026-11-01

### Added

- Imported the immutable `0.9.0-draft.4` validator snapshot, including frozen
  validation-result and view/merge fixtures.
- Added Draft 4 result-format support and gated core component reconciliation to
  the Draft 4 merge path.

### Changed

- Prepared validator `0.14.0-rc.4` and core `0.13.0-rc.4`, with core pinned to
  the matching validator prerelease.

## 2026-10-29

### Added

- Imported the immutable `0.9.0-draft.3` validator snapshot and its frozen
  conformance, projection, and conversion profile fixtures.
- Added core native projection postcondition validation against the pinned MCP
  schemas for each protocol revision.

### Changed

- Prepared validator `0.14.0-rc.3` and core `0.13.0-rc.3`, with core pinned to
  the matching validator prerelease.

## 2026-10-28

### Added

- Imported the immutable `0.9.0-draft.2` validator snapshot and its frozen
  conformance, projection, and version-conversion profile artifacts.
- Added the explicit 0.8.0-to-0.9.0 converter in core and extended native
  projection to Draft 2; conversion remains a separate caller-controlled step.
- Prepared validator `0.14.0-rc.2` and core `0.13.0-rc.2` package metadata.

### Changed

- Extended snapshot intake integrity checks to include optional conversion
  profile artifacts.

## 2026-10-26

### Added

- Integrated MCP Description `0.9.0-draft.1` from specification tag
  `v0.9.0-draft.1` (commit `7227e7695e9b97227391e5530963432bfa7d8839`, PR #81).
  A re-export from the tag matches all 178 imported files byte for byte, and the
  deployed schema matches the imported SHA-256 digest.
- Extended manifest-verified snapshot intake to preserve optional native
  projection fixtures alongside their referenced conformance fixtures.
- Added frozen native-projection coverage and Draft 1 checks in strict-CSP and
  isolated tarball consumers.
- Added an opt-in example smoke test that accepts one or more folders, with an
  in-memory Draft 1 rehearsal and no external checkout dependency in CI.
- Added `npm run check:readme`, which typechecks README code blocks against the
  built packages as part of `npm run check`.

### Fixed

- Key standalone structural validators by complete schema content rather than
  non-unique schema descriptions, preventing cross-snapshot lookup collisions.

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
