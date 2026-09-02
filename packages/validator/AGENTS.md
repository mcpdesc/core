# AGENTS.md - MCP Description validator

## Package role

`@mcpdesc/validator` is the executable conformance authority for exact,
immutable MCP Description snapshots. Normative text and canonical candidate
schemas remain in `mcpdesc/mcpdesc-specification`.

## Compatibility

- Preserve the public `.`, `./browser`, and `./standalone` entry points.
- Keep `./browser` and `./standalone` behavior-identical and strict-CSP safe.
- Keep Node.js 20 support even when repository-level tooling uses newer Node.js.
- Diagnostics are deterministic and contain only `code`, `severity`, `message`,
  and root-relative `path` unless a separately reviewed API change is approved.
- Validation is synchronous, browser-compatible, offline, and performs no file,
  network, or environment access.

## Snapshot changes

- Never modify a published selector under `src/snapshots/` or `test/snapshots/`.
- Import approved specification artifacts with exact source commit, tag, schema
  digest, semantic implementation, and frozen fixture provenance.
- Add later snapshots as siblings and update the registry, declarations,
  package README, changelog, package-content check, and browser build selector
  list together.
- Do not infer an exact selector from an unqualified format version.

## Validation

Run from the repository root:

```bash
npm test --workspace @mcpdesc/validator
npm run check
```

Review `npm pack --workspace @mcpdesc/validator --dry-run --json` before any
release. Publication requires an explicitly approved `validator-v<version>`
tag and must use the repository trusted-publishing workflow.