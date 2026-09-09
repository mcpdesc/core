# Roadmap

This roadmap sequences expected work; it is not a compatibility promise.
Normative MCP Description semantics remain owned by the specification
repository.

## 1. Establish the package

- [x] Land the initial repository baseline and enable required CI checks.
- [x] Review the `@mcpdesc/core@0.1.0` tarball and publish it to npm.
- [x] Make an explicit decision about the first Git tag.
- [x] Document the release process and package provenance before publishing.

## 2. Integrate initial consumers

- [x] Integrate shared MCP Description operations into the `mcpcontract` CLI
      behind its existing parsing and file I/O boundaries.
- [x] Exercise the public packages in both Node.js and browser consumers through
      `mcpcontract` and `mcptoolkit-editor`.
- [x] Provide CSP-safe document and declaration-selection entry points for
      browser consumers.
- [x] Validate the initial `0.x` API through downstream integration feedback
      from `mcpcontract` and `mcptoolkit-editor`.

## 3. Add reusable semantic operations

- [x] Add identity-based declaration selection for focused document subsets.
- [x] Add pure JSON/YAML source parsing and deterministic serialization without
      host file or stream access.
- [x] Add validated 0.7.0-to-Draft-4 migration with deterministic security
      scheme extraction and explicit source-validation responsibility.
- [x] Add exact MCP Description RC.1 snapshot support without changing Draft 4
      selector behavior.
- [x] Extend RC.1 migration with caller-selected protocol defaults and stable
      conversion reports without adding a built-in default.
- [x] Move `@mcpdesc/validator` maintenance and publication from the
      specification repository while preserving immutable snapshot behavior.
- [x] Define and implement deterministic Effective Protocol View merge behavior
      grounded in the RC.2 specification snapshot and conformance fixtures.
- [x] Add exact MCP Description RC.2 migration support from validated 0.7.0
      documents.
- [x] Adopt RC.3 with package-owned selector integrity and decouple
      non-normative specification documentation from validator releases.
- [x] Expose reusable-component resolution as a separate RC.1, RC.2, and RC.3
      pure operation with deterministic terminal-target provenance and existing
      unresolved-reference diagnostics.
- [x] Narrow current runtime and package support to RC.2 and RC.3, deprecate
      RC.2, and retain retired snapshot artifacts as repository history.
- [x] Adopt RC.4 across validation and supported core operations, advance the
      active transition window to RC.3 and RC.4, and support component reference
      resolution with terminal-target provenance.
- [x] Adopt stable 0.8.0 across validation and every selector-sensitive core
      operation, advance the active transition window to RC.4 and stable, and
      retire RC.3 from current package APIs and tarballs.
- Add normalization or comparison operations only where multiple consumers
  demonstrate the same requirement.

Each operation should remain side-effect free, return structured diagnostics,
avoid mutating inputs, support browser bundling, and validate its result when a
normative schema applies.

## 4. Expand ecosystem adoption

- [x] Adopt shared operations in `mcptoolkit-editor` where they replace
      duplicated semantic logic.
- Adopt shared operations in Inspector where they replace duplicated semantic
  logic.
- Add later immutable MCP Description snapshots through an explicit active
  support decision. Record every selector-sensitive operation as supported or
  intentionally unsupported, retire selectors from current packages when their
  transition window closes, and keep the exhaustive support contract current.
- Revisit package boundaries as concrete parser, serialization, or capture
  requirements emerge; keep file and network access out of `@mcpdesc/core`.

## Deferred decisions

- Stable `1.0` API commitments while MCP Description 0.8 remains a community
  working draft.
- Network reference retrieval, filesystem or stream access, transport selection,
  runtime discovery, or deployed-server fidelity claims in the core package.
