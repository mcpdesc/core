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
- Compare imported helper result contracts with the previous active selector.
  If an operation loses only additive tooling metadata, require an explicit
  maintainer decision on the published-snapshot integrity exception before
  declaring that operation unsupported; do not confuse exporter regressions
  with normative incompatibility.
- Add later snapshots as siblings and update the registry, declarations,
  package README, changelog, package-content check, and browser build selector
  list together.
- Retire a selector only through an explicit support decision. Remove it from
  current registries, declarations, bundles, and package contents while keeping
  its immutable source and fixtures in Git; direct consumers to the older
  package release that contains it.
- Maintain selector lifecycle, schema identity, and per-format defaults in
  `config/selectors.yaml`. Regenerate with `npm run config:write` and keep
  `npm run check:config` passing; never hand-edit generated runtime config.
- When the caller omits a selector, resolve only through the YAML-configured
  format default. `mcpdesc` alone does not identify a unique selector; a format
  version without a default fails explicitly. Never choose a selector by
  ordering or downgrade to an earlier format version.
- Draft and release-candidate selectors are never defaults. Honor each
  default's `schemaPins` setting when resolving a declared `$schema`.

## Validation

Run from the repository root:

```bash
npm test --workspace @mcpdesc/validator
npm run check
```

Review `npm pack --workspace @mcpdesc/validator --dry-run --json` before any
release. Publication requires an explicitly approved `validator-v<version>`
tag and must use the repository trusted-publishing workflow.