# Roadmap

This roadmap sequences expected work; it is not a compatibility promise.
Normative MCP Description semantics remain owned by the specification
repository.

## 1. Establish the package

- Land the initial repository baseline and enable required CI checks.
- Review the `@mcpdesc/core@0.1.0` tarball, then make an explicit decision about
  the first npm publication and Git tag.
- Document the release process and package provenance before publishing.

## 2. Integrate initial consumers

- Integrate Effective Protocol View projection into the standalone MCP
  Description CLI and generator CLI behind their existing parsing and file I/O
  boundaries.
- Exercise the same public package entry point in Node.js and browser consumers.
- Gather consumer feedback before broadening the `0.x` API.

## 3. Add reusable semantic operations

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
  changing behavior for existing selectors.
- Revisit package boundaries as concrete parser, serialization, or capture
  requirements emerge; keep file and network access out of `@mcpdesc/core`.

## Deferred decisions

- Moving `@mcpdesc/validator` from the specification repository.
- Stable `1.0` API commitments while MCP Description 0.8 remains a community
  working draft.
- Network reference retrieval, filesystem access, transport selection, runtime
  discovery, or deployed-server fidelity claims in the core package.
