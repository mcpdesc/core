# Origin and provenance

## Validator repository migration

`@mcpdesc/validator` versions through `0.6.0` were maintained in the MCP
Description specification repository. Version `0.7.0` moves the package to the
MCP Description tooling repository without changing its public API or the
behavior and bytes of its published immutable snapshot implementations.

| Field | Value |
|---|---|
| Source repository | `https://github.com/mcpdesc/mcpdesc-specification` |
| Source commit | `6eb1b54330f8b7dc11468c7e31614214c7521cd0` |
| Source package | `packages/validator` (`@mcpdesc/validator@0.6.0`) |
| Destination repository | `https://github.com/mcpdesc/core` |
| Destination package | `packages/validator` |
| Migration date | `2026-09-02` |

The specification repository continues to own normative text, canonical
schemas, and mutable draft fixtures. This package owns executable validation,
immutable runtime snapshots, frozen package-test fixtures, and its public API.

MCP Description v0.7.0 originated in the Cisco Open `mcptoolkit-contract`
repository and remains the current stable release as of 2026-07-28. The
specification repository imported that material as the basis for v0.8.0
community work and created the validator package from it. Neither repository
migration is a copyright assignment or donation.

## Source import

| Field | Value |
|---|---|
| Upstream repository | `https://github.com/cisco-open/mcptoolkit-contract` |
| Upstream commit | `874ffba8dd2772a6df4df2d76f402ba731a74617` |
| Import date | `2026-07-28` |
| Method | History-preserving filtered import (`git-filter-repo`); commit hashes rewritten by path filtering |
| Imported paths | `spec/**`, `schemas/mcp-description/**`, `schemas/latest.json`, `LICENSE`, `NOTICE` |

The imported v0.7.0 JSON Schemas are preserved byte-for-byte in their immutable
validator snapshots. The v0.7.0 specification text is not stored here; its
canonical source remains the upstream repository above. Changes to imported
material are recorded in [`MODIFICATIONS.md`](MODIFICATIONS.md) and Git history.
