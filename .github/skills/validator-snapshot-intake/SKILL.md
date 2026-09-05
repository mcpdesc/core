---
name: validator-snapshot-intake
description:
  Import an approved immutable MCP Description validator snapshot from the
  specification repository. Use when adding a new draft or release-candidate
  selector to @mcpdesc/validator.
license: Apache-2.0
---

# Validator Snapshot Intake

## Prerequisites

- Read the root and `packages/validator/AGENTS.md` files.
- Require an approved exact specification tag or full commit.
- Obtain a bundle with `manifest.json`, `runtime/`, and `fixtures/` from
  `mcpdesc/mcpdesc-specification`.
- Confirm both repositories have clean worktrees before generation or import.

## Bundle Contract

The manifest uses `formatVersion: 1`, an exact prerelease `selector`, matching
`snapshotTag`, source repository and full commit, and a complete sorted-capable
`files` array. Every file entry contains a bundle-relative path under `runtime/`
or `fixtures/` and its lowercase SHA-256 digest.

## Workflow

1. Validate without writing:

   ```bash
   npm run import:snapshot --workspace @mcpdesc/validator -- --check <bundle-directory>
   ```

2. Review the manifest, source commit, schema digest, semantic implementation,
   and fixture corpus against the approved specification snapshot.
3. Import only after approval:

   ```bash
   npm run import:snapshot --workspace @mcpdesc/validator -- <bundle-directory>
   ```

4. Update the runtime registry, declarations, validator README and changelog,
   package-content expectations, browser selector lists, and package version.
5. If `@mcpdesc/core` will consume or advertise the selector, perform the root
   `AGENTS.md` new-snapshot adoption review. Update every selector-sensitive
   operation's support disposition, tests, public types, package checks, and
   documentation; snapshot intake alone does not establish core support.
6. Regenerate the integrity baseline only after confirming all existing snapshot
   entries still pass unchanged:

   ```bash
   npm run check:snapshots --workspace @mcpdesc/validator
   node packages/validator/scripts/check-snapshot-integrity.mjs --write
   ```

7. Run `npm run check`, inspect both package tarballs, and review that prior
   runtime and fixture snapshots have no diff.

## Boundaries

- Snapshot approval does not authorize npm publication.
- Do not require a sibling specification checkout in routine tests or CI.
- Do not overwrite, alias, or silently retarget an existing selector.
- Record AI assistance in the pull request.
