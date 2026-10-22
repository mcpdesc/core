# Validator selector configuration design

**Status:** implemented in the validator workspace; the currently configured
default is `0.8.0-rev.20261021`.

This design moves selector metadata and maintainer-chosen defaults out of
handwritten runtime code and into one validated YAML source. For definitions of
selector, snapshot, format version, schema URI, and `schemaPins`, see the
[terminology page](validator-terminology.md). For the approved behavior and
release sequence, see the [snapshot design record](validator-snapshots.md).

## Problem

Selector configuration is currently spread through
`packages/validator/src/index.js`, snapshot `index.js` files,
`packages/validator/index.d.ts`, the standalone build, package checks, and
tests. A maintainer changing the default has to know which code and generated
artifacts must stay in sync. That creates avoidable drift and makes it hard to
review the complete configuration in one place.

Configuration to centralize includes:

- supported, deprecated, and retired selector lifecycle;
- each selector's format version, specification source tag, schema URI, and
  schema SHA-256 digest;
- the maintainer-chosen default selector for each supported format version;
- whether `$schema` pins a selector (`schemaPins`);
- protocol versions exposed by the package, where they can be derived from the
  active snapshots rather than copied into another list.

Snapshot implementation code and JSON Schema remain snapshot-owned artifacts;
this proposal does not put semantic rules or schemas into the configuration.

## Recommendation

Use a YAML file as the maintainer-edited source of truth, validate it with a
small build-time script, and generate a static JavaScript module consumed by the
runtime. Do **not** parse YAML at runtime.

Files:

```text
packages/validator/config/selectors.yaml       # maintained configuration
packages/validator/scripts/build-selector-config.mjs
packages/validator/src/generated/selector-config.js  # generated runtime data
packages/validator/src/generated/selector-config.d.ts # generated selector type
```

The generated files are committed and checked for freshness by
`npm run check:config --workspace @mcpdesc/validator`. The runtime imports only
the JavaScript module, while the public declaration imports the generated
selector type. The YAML parser and generator remain development-only; both
generated files are included in the npm package.

This gives maintainers one readable configuration file without adding runtime
file access, network access, YAML parsing, or a YAML dependency to Node,
browser, or standalone consumers. The standalone build bundles the generated
static data as it does today.

## YAML shape for the issue #24 revision

This abridged example reflects the active revision configuration.

```yaml
configVersion: 1

formats:
  '0.8.0':
    defaultSelector: '0.8.0-rev.20261021'
    schemaPins: false

selectors:
  '0.8.0':
    formatVersion: '0.8.0'
    lifecycle: deprecated
    specificationTag: 'v0.8.0'
    schemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0.json'
    schemaSha256: '36686f92ba0cc98bde2c34eaad31c0304d6e5cebdd2c4d2be1be06aecef41119'

  '0.8.0-rc.4':
    formatVersion: '0.8.0'
    lifecycle: deprecated
    specificationTag: 'v0.8.0-rc.4'
    schemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.4.json'
    schemaSha256: 'd38e54db859813b63be2a5c91dde91250035f18bcb5910208cf71fa6875d6eef'

  '0.8.0-rev.20261021':
    formatVersion: '0.8.0'
    lifecycle: active
    specificationTag: 'v0.8.0-rev.20261021'
    schemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0.json'
    schemaSha256: '36686f92ba0cc98bde2c34eaad31c0304d6e5cebdd2c4d2be1be06aecef41119'
```

The current configuration uses `0.8.0-rev.20261021` as the default and retains
the historical selector identities in `config/selectors.yaml`. Stable `0.8.0`
and RC.4 are deprecated; older drafts and release candidates are retired.

The `formats` table owns defaults and `schemaPins`. The `selectors` table owns
selector lifecycle and identity metadata, including the schema digest verified
during bundle intake. Multiple selectors may intentionally share one `schemaUri`
when `schemaPins: false`; the configured default then selects validator behavior
for documents of that format. If `schemaPins: true`, a schema URI selects the
exact active selector it identifies.

The selector table retains tag, schema URI, and schema digest tombstones for
retired selectors so documents with old schema URIs can still be associated with
their format version and resolved according to the format's default. Retired
runtime and fixture directories leave `HEAD` after their complete trees are
committed to repository history. Validator release tags preserve them when
available; retired selectors are not bundled or offered for selection.

## Generated runtime data

For the example above, the generator would produce a static ESM module with
frozen data and imports only the active and deprecated snapshot implementations:

```js
export const validatorConfiguration = Object.freeze({
  formats: Object.freeze({
    '0.8.0': Object.freeze({
      defaultSelector: '0.8.0-rev.20261021',
      schemaPins: false,
    }),
  }),
  selectors: Object.freeze({
    '0.8.0-rev.20261021': Object.freeze({
      formatVersion: '0.8.0',
      lifecycle: 'active',
      specificationTag: 'v0.8.0-rev.20261021',
      schemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0.json',
      schemaSha256:
        '36686f92ba0cc98bde2c34eaad31c0304d6e5cebdd2c4d2be1be06aecef41119',
    }),
  }),
});
```

`src/index.js` derives these exports and registries from that data:

- `supportedSpecifications` from active and deprecated selectors;
- `deprecatedSpecifications` from lifecycle state;
- `defaultSpecifications` from `formats`;
- component-reference resolver dispatch from active and deprecated selectors;
- schema URI to format-version mappings from selector history;
- provenance records from configured tag, URI, and digest identity.

The generator also emits the public selector union. Generic fixture, standalone,
resolver, and package-content matrices consume the configured non-retired
selector set rather than repeating selector literals. The npm `files` allowlist
remains explicit so an unreviewed snapshot directory cannot be published.

Use a stable, deterministic property order in the generated file. Do not make
runtime code infer defaults by sorting selector strings; only the YAML table
chooses defaults.

## Configuration validation

The build/check script fails with a clear path and reason if:

- a selector key is malformed or its snapshot tag is not exactly `v<selector>`;
- a non-retired selector lacks a snapshot implementation or the implementation
  exports a different selector/tag;
- a configured schema URI does not match the embedded schema's `$id`;
- a configured schema digest is malformed or differs from the embedded schema
  bytes or snapshot implementation;
- a default points to an unknown or retired selector, or to a selector whose
  format version differs from the `formats` key;
- a default points to a draft or release candidate;
- `schemaPins` is missing or not boolean;
- schema-pinning selectors share an indistinguishable schema identity;
- an unknown configuration key appears, so typos do not silently change policy;
- either generated file differs from the output produced from YAML.

A format version without a default remains valid configuration, but documents
using it fail at runtime with `unsupported-format-version`. There is no
automatic fallback to another format version.

## Maintainer workflow

1. Review the specification bundle and import its immutable snapshot artifacts;
   the importer reports the independently computed schema URI and digest.
2. Add its selector, format version, lifecycle, tag, schema URI, and schema
   digest to `selectors.yaml`.
3. If the selector should become the default, update the one `formats` entry.
   Set `schemaPins: false` when the schema is unchanged; set it to `true` when
   the schema changed and documents with an older schema URI should remain
   pinned to the older behavior.
4. Regenerate the static runtime and declaration files with
   `npm run config:write --workspace   @mcpdesc/validator`;
   `npm run check:config --workspace @mcpdesc/validator` compares the committed
   output byte-for-byte. Never hand-edit generated output.
5. Review a readable configuration diff alongside the snapshot and fixtures.
6. Run the configuration checks, validator tests, browser/standalone checks,
   package checks, and repository `npm run check`.
7. Put default changes, deprecations, selector additions, and migration impact
   in the validator changelog.

The maintainer guide links here for the configuration schema and invariants;
this design document records why YAML is authoring input while the runtime
consumes generated JavaScript.

## Alternatives considered

### Parse YAML in the validator at runtime

Rejected. It would add parser code and complexity to Node and browser bundles,
require YAML parsing in the strict-CSP standalone path, and weaken the guarantee
that the package remains a small, synchronous, browser-safe static artifact.

### Keep all configuration in JavaScript

Rejected as the source of truth. It is executable rather than declarative and
encourages metadata to remain scattered across runtime registries, package
checks, and tests.

### Keep YAML uncompiled and read it from disk

Rejected. It breaks browser support, offline package use, and the package's
no-file-access runtime contract.

## Rollout

The YAML file is the maintained source for selector lifecycle, schema identity,
default mapping, and the generated public selector union. A future release that
changes public defaults or selector support still requires an explicit release
decision, npm package allowlist update, selector-specific tests where behavior
changes, and release notes.
