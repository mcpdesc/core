# MCP Description tooling - AI context

## Architecture

- `packages/core` owns pure MCP Description transformations and source
  operations.
- `packages/validator` owns executable conformance, immutable snapshots, and
  frozen validator fixtures.
- another repo: `mcpdesc/mcpdesc-specification` owns normative text, canonical
  schemas, mutable draft fixtures, and candidate semantics.

## Decision Rules

- For normative behavior changes, update and approve the specification
  repository before importing a new validator snapshot.
- For validator behavior, use exact immutable selectors and add sibling
  snapshots; never modify a published selector.
- A maintainer-approved additive tooling-metadata correction may modify a
  published snapshot implementation only when schemas, conformance behavior,
  diagnostics, and fixtures remain unchanged and the integrity exception is
  recorded explicitly.
- For core validation, import `@mcpdesc/validator/standalone` or `/browser`
  where strict CSP is required.
- For releases, use `v<version>` for core and `validator-v<version>` for
  validator.
- Before editing, read the nearest `AGENTS.md`; validator-specific rules live in
  `packages/validator/AGENTS.md`.

## Constraints

- Never duplicate validator semantic rules in core operations.
- Never infer a prerelease selector from `mcpdesc: "0.8.0"` alone.
- Keep published operations deterministic, browser-safe, offline, and free of
  file or network access.
- Preserve validator Node.js 20 compatibility and strict-CSP entry points.
- Treat core snapshot support as operation-specific. Adding a selector requires
  an explicit disposition for every selector-sensitive public operation and an
  updated exhaustive support-contract test.

## Documentation Delineation

- Operational setup and commands belong in `AGENTS.md` or package README files.
- Always-on architectural decisions belong here.
- Snapshot intake procedure belongs in the `validator-snapshot-intake` skill.
