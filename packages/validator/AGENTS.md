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
- Exception: a maintainer may approve additive tooling result metadata in a
  published `src/snapshots/` implementation when schema validation, semantic
  conformance, diagnostics, and frozen fixtures remain unchanged. Record the
  exact file and reason in `snapshot-integrity.json` and the package changelog.
- Import reviewed specification artifacts with exact selector, schema digest,
  semantic implementation, and frozen fixtures. Source repository, tag, and
  commit are informational provenance rather than package integrity inputs.
- Add later snapshots as siblings and update the registry, declarations,
  package README, changelog, package-content check, and browser build selector
  list together.
- Retire a selector only through an explicit support decision. Remove it from
  current registries, declarations, bundles, and package contents while keeping
  its immutable source and fixtures in Git; direct consumers to the older
  package release that contains it.
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