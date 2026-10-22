# Validator terminology

Short definitions shared by the `@mcpdesc/validator` README and maintainer
material. For implementation decisions about configurable selector metadata, see
the [configuration design](validator-configuration-design.md). For the workflow,
see the [maintainer guide](validator-maintainer-guide.md).

## Terms

| Term                               | Definition                                                                                                                                                                                    | Example                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **MCP Description format version** | The value in a document's `mcpdesc` field. It says which document format the document uses; it does not uniquely identify validator behavior.                                                 | `mcpdesc: "0.8.0"`                                                           |
| **Selector**                       | The name of one immutable validator contract. Callers normally omit it and use the maintainer-selected default; pass `options.selector` only to pin a contract.                               | `0.8.0`, `0.8.0-rev.20261021`                                                |
| **Snapshot**                       | The embedded schema and validation implementation for one supported selector, plus its frozen test fixtures. Retired snapshots remain available from repository history and release tags.     | `packages/validator/src/snapshots/0.8.0/`                                    |
| **Specification tag**              | The source Git tag in `mcpdesc/mcpdesc-specification` from which a snapshot was exported. It follows `v<selector>`.                                                                           | Selector `0.8.0` came from tag `v0.8.0`.                                     |
| **Bundle**                         | The temporary handoff of a snapshot from `mcpdesc/mcpdesc-specification` to `mcpdesc/core`, containing a manifest, runtime artifacts, and fixtures.                                           | `manifest.json`, `runtime/`, `fixtures/`                                     |
| **Default selector**               | The maintainer-chosen selector used when the caller does not pass one, configured per format version. Defaults are deliberate, not automatically the newest selector.                         | `mcpdesc: "0.8.0"` defaults to `0.8.0-rev.20261021`.                         |
| **`schemaPins`**                   | A default's setting for whether a document's `$schema` selects a particular selector (`true`) or follows the format version's configured default (`false`).                                   | `false` when a revision changes validator semantics but not its JSON Schema. |
| **Schema URI**                     | The URI in a document's `$schema`, matching the JSON Schema `$id`. It is for schema identification and external tooling; depending on `schemaPins`, it may or may not pin validator behavior. | `https://mcpdesc.org/schema/mcp-description/0.8.0.json`                      |
| **Validator npm version**          | The package release that contains selector snapshots, API behavior, and default mappings. It is independent from format versions and selectors.                                               | `@mcpdesc/validator@0.13.0`                                                  |
| **MCP protocol revision**          | The MCP protocol version a document says it supports. Protocol-specific semantic rules can differ within one MCP Description format version and selector.                                     | `2025-11-25`, `2026-07-28`                                                   |

## How identities relate

A document might contain:

```yaml
$schema: https://mcpdesc.org/schema/mcp-description/0.8.0.json
mcpdesc: '0.8.0'
```

`mcpdesc` identifies the format version. `$schema` identifies the JSON Schema,
not necessarily an exact validator selector. With `schemaPins: false`, the
validator uses the configured default for that `mcpdesc` value even when
`$schema` is present. A caller-supplied `options.selector` always pins the exact
validator contract.

The axes are distinct:

| Axis                           | Example                                                 |
| ------------------------------ | ------------------------------------------------------- |
| Validator npm version          | `@mcpdesc/validator@0.13.0`                             |
| MCP Description format version | `mcpdesc: "0.8.0"`                                      |
| Validator selector             | `0.8.0-rev.20261021`                                    |
| Schema URI                     | `https://mcpdesc.org/schema/mcp-description/0.8.0.json` |
| MCP protocol revision          | `2025-11-25`                                            |

## Snapshot integrity and tags

Each imported snapshot has one corresponding source tag, `v<selector>`; the
importer verifies that naming. The tag records provenance and maintainers must
not move or reuse it, although Git does not enforce that rule.

While a selector is supported, validator integrity checksums its package-owned
snapshot and fixture bytes in `snapshot-integrity.json`. After retirement,
repository history and available validator release tags archive those bytes,
while selector configuration retains their tag and schema identity. Routine
validator tests do not need a checkout of `mcpdesc/mcpdesc-specification`.
