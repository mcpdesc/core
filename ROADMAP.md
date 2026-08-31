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

- Integrate Effective Protocol View projection into the standalone MCP
  Description CLI and generator CLI behind their existing parsing and file I/O
  boundaries.
- Exercise the same public package entry point in Node.js and browser consumers.
- [x] Provide CSP-safe document and declaration-selection entry points for
      browser consumers.
- Gather consumer feedback before broadening the `0.x` API.

## 3. Add reusable semantic operations

- [x] Add identity-based declaration selection for focused document subsets.
- [x] Add pure JSON/YAML source parsing and deterministic serialization without
      host file or stream access.
- [x] Add validated 0.7.0-to-Draft-4 migration with deterministic security
      scheme extraction and explicit source-validation responsibility.
- [x] Add exact MCP Description RC.1 snapshot support without changing Draft 4
      selector behavior.
- Define and implement deterministic document merge behavior only after its
  contract is grounded in the active specification snapshot and conformance
  fixtures.
- Define reusable-component and local-reference resolution as a separate pure
  operation with explicit unresolved-reference diagnostics.
- Add normalization or comparison operations only where multiple consumers
  demonstrate the same requirement.

Each operation should remain side-effect free, return structured diagnostics,
avoid mutating inputs, support browser bundling, and validate its result when a
normative schema applies.

## 4. Expand ecosystem adoption

- Adopt shared operations in the editor and Inspector where they replace
  duplicated semantic logic.
- Add support for later immutable MCP Description snapshots without silently
  changing behavior for existing selectors; Draft 4 and RC.1 establish this
  additive pattern.
- Revisit package boundaries as concrete parser, serialization, or capture
  requirements emerge; keep file and network access out of `@mcpdesc/core`.

## Deferred decisions

- Moving `@mcpdesc/validator` from the specification repository.
- Stable `1.0` API commitments while MCP Description 0.8 remains a community
  working draft.
- Network reference retrieval, filesystem or stream access, transport selection,
  runtime discovery, or deployed-server fidelity claims in the core package.
