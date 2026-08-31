# AGENTS.md - MCP Description tooling

## Mission

Maintain small, deterministic, reusable MCP Description operations without
creating a second source of normative semantics.

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

- The MCP Description specification repository owns normative text, schemas,
  immutable snapshot definitions, and conformance fixtures.
- This repository owns executable tooling packages and their public APIs.
- `@mcpdesc/validator` remains the conformance authority until an explicit,
  separately reviewed repository migration occurs.
- Do not copy validator semantic rules into core operations.
- Keep file access, network access, capture, and generation outside the pure
  core package. Pure source parsing and serialization may live in core when they
  do not read files or streams and remain browser-compatible.

## Snapshot discipline

- Require exact immutable snapshot selectors.
- Do not infer a draft selector from `mcpdesc: "0.8.0"` alone.
- Do not change behavior captured for a published selector silently.
- Keep npm versions, format versions, snapshot selectors, schema identities, and
  MCP protocol revisions separate.

## Validation

Run:

```bash
npm run check
```

Projection changes must validate their source and result and include focused
tests for protocol scopes, omission, input immutability, and browser bundling.

## AI disclosure

Pull requests containing AI-assisted content must disclose the tool and extent
of assistance. The human author remains accountable for the result.
