# AGENTS.md - MCP Description tooling and validation

## Mission

Maintain small, deterministic MCP Description operations and executable
validation without creating a second source of normative specification text.

## Starting a work session

- Work from this repository, not from a consumer or specification repository.
- Read `README.md`, `CHANGELOG.md`, and `ROADMAP.md` before selecting work.
- Inspect the current branch and worktree before editing; do not assume roadmap
  items have been approved or started.
- Confirm the next milestone with the maintainer when it requires publication, a
  new public operation, a cross-repository integration, or a package-boundary
  decision.
- Keep `CHANGELOG.md` and `ROADMAP.md` synchronized with delivered behavior and
  approved sequencing.

## Ownership boundaries

- The MCP Description specification repository owns normative text, canonical
  schemas, mutable draft fixtures, and candidate semantic validation used while
  developing a snapshot.
- This repository owns executable tooling packages, immutable validator
  snapshots, frozen package-test fixtures, and their public APIs.
- `@mcpdesc/validator` is the executable conformance authority. Core operations
  must consume it rather than duplicate its schema or semantic rules.
- Do not copy validator semantic rules into core operations.
- Keep file access, network access, capture, and generation outside the pure
  core package. Pure source parsing and serialization may live in core when they
  do not read files or streams and remain browser-compatible.

## Snapshot discipline

- Require exact immutable snapshot selectors.
- Do not infer a draft selector from `mcpdesc: "0.8.0"` alone.
- Do not change behavior captured for a published selector silently.
- Import a new snapshot only from an explicitly approved specification tag or
  commit, with exact schema, semantic implementation, fixture, and digest
  provenance. Never require a sibling specification checkout in routine CI.
- Existing directories under `packages/validator/src/snapshots/` and
  `packages/validator/test/snapshots/` are immutable. Add sibling selectors.
- A maintainer may approve an additive tooling-metadata correction to a
  published snapshot implementation only when its schema, conformance results,
  diagnostics, and frozen fixtures remain unchanged. Record each exception in
  `snapshot-integrity.json` and the validator changelog.
- Keep npm versions, format versions, snapshot selectors, schema identities, and
  MCP protocol revisions separate.

## Validation

Run:

```bash
npm run check
```

Validator changes must preserve the default, browser, and standalone entry
points, Node.js 20 support, deterministic diagnostics, offline behavior, and
strict-CSP checks. See `packages/validator/AGENTS.md` for package-specific
rules. Projection changes must validate their source and result and include
focused tests for protocol scopes, omission, input immutability, and browser
bundling.

## AI disclosure

Pull requests containing AI-assisted content must disclose the tool and extent
of assistance. The human author remains accountable for the result.
