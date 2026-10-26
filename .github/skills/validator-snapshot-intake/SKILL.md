---
name: validator-snapshot-intake
description:
  Import reviewed MCP Description artifacts as an immutable validator selector.
  Use when adding a new draft, release-candidate, or stable selector to
  @mcpdesc/validator.
license: Apache-2.0
---

# Validator Snapshot Intake

## Prerequisites

- Read the root and `packages/validator/AGENTS.md` files.
- Require an approved exact specification selector (`x.y.z`, `x.y.z-draft.n`,
  `x.y.z-rc.n`, or `x.y.z-rev.YYYYMMDD`), including a local tag during
  pre-publication integration testing.
- Obtain a bundle with `manifest.json`, `runtime/`, and `fixtures/` from
  `mcpdesc/mcpdesc-specification`, plus optional `projection-fixtures/`.
- Confirm both repositories have clean worktrees before generation or import.

## Bundle Contract

The manifest uses `formatVersion: 1`, an exact `selector`, matching
`snapshotTag` (`v<selector>`), and a complete sorted-capable `files` array.
Revision selectors use the date format `x.y.z-rev.YYYYMMDD`. Every file entry
contains a bundle-relative path under `runtime/`, `fixtures/`, or optional
`projection-fixtures/` and its lowercase SHA-256 digest. Source repository and
commit metadata are optional and informational.

Preserve projection fixtures beside conformance fixtures so their relative
`../fixtures/` references remain valid. Verify every declared byte and reject
undeclared projection files just as for runtime and conformance inputs.
Pre-publication rehearsal tags stay local. Before publication, export again from
the final approved specification tag and compare runtime and fixture bytes; do
not silently overwrite an imported selector with changed artifacts.

## Workflow

1. Validate without writing:

   ```bash
   npm run import:snapshot --workspace @mcpdesc/validator -- --check <bundle-directory>
   ```

2. Review the manifest, importer-reported schema URI and SHA-256 digest,
   semantic implementation, fixture corpus, and exported tooling result
   contracts against the previous active selector. Distinguish normative
   conformance changes from dropped additive tooling metadata such as provenance
   or reporting fields.
3. Import only after approval:

   ```bash
   npm run import:snapshot --workspace @mcpdesc/validator -- <bundle-directory>
   ```

4. Before marking an operation unsupported because an imported helper omits
   non-normative result metadata, inspect the existing approved integrity
   exceptions and obtain an explicit maintainer decision on applying the same
   additive correction. Do not treat an exporter regression as a snapshot
   incompatibility when schemas, conformance behavior, diagnostics, and frozen
   fixtures remain unchanged.
5. Add the selector lifecycle and importer-reported schema identity to
   `config/selectors.yaml`; update the explicit npm `files` allowlist, validator
   README and changelog, and package version; then regenerate configuration.
6. If `@mcpdesc/core` will consume or advertise the selector, perform the root
   `AGENTS.md` new-snapshot adoption review. Update every selector-sensitive
   operation's support disposition, tests, public types, package checks, and
   documentation; snapshot intake alone does not establish core support.
7. Regenerate the integrity baseline only after confirming all existing snapshot
   entries still pass unchanged:

   ```bash
   npm run check:snapshots --workspace @mcpdesc/validator
   node packages/validator/scripts/check-snapshot-integrity.mjs --write
   ```

8. Run `npm run check`, inspect both package tarballs, and review that prior
   runtime and fixture snapshots have no diff.

## Boundaries

- Snapshot approval does not authorize npm publication.
- Treat the source bundle and its `manifest.json` as disposable intake inputs.
  Do not copy or retain them under `packages/validator/`; imported runtime and
  fixture bytes are protected by `snapshot-integrity.json`.
- Do not require a sibling specification checkout in routine tests or CI.
- Do not overwrite, alias, or silently retarget an existing selector.
- Record AI assistance in the pull request.
