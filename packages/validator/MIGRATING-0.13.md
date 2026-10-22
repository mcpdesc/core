# Migrating `@mcpdesc/validator` to 0.13.0

This guide is for applications upgrading from validator 0.12.x. New integrations
should follow the
[`@mcpdesc/validator` README](../packages/validator/README.md).

Validator 0.13.0 introduces maintainer-selected defaults and the immutable
`0.8.0-rev.20261021` selector. Existing callers must decide whether they want to
receive the corrected default behavior or preserve the exact `0.8.0` validation
contract.

## What changed

- `validateMcpDescription(document, options)` no longer requires `options`.
  Without an explicit selector, the document's `mcpdesc` format version selects
  its configured default.
- `options.selector` is the canonical way to pin an immutable validation
  contract. The former `options.specification` name remains a compatibility
  alias.
- Validation results now include `selector`, the compatibility alias
  `specification`, and `defaulted`.
- The default selector for `mcpdesc: "0.8.0"` is `0.8.0-rev.20261021`. It fixes
  issue #24 while retaining the stable `0.8.0` schema URI and SHA-256 digest.
- Stable selector `0.8.0` and RC.4 remain available as deprecated explicit pins.
- Unsupported format versions return an `unsupported-format-version` diagnostic.
  The validator never falls back to an earlier format.

The default revision preserves unknown and custom keywords in embedded Tool
schemas. MCP-specific `x-mcp-header` semantics apply only to MCP protocol
revision `2026-07-28`.

## Choose an upgrade mode

### Adopt maintained defaults

Remove the explicit specification argument:

```js
// 0.12.x
const result = validateMcpDescription(document, {
  specification: '0.8.0',
});

// 0.13.0
const result = validateMcpDescription(document);
```

For a document with `mcpdesc: "0.8.0"`, 0.13.0 reports:

```js
result.selector === '0.8.0-rev.20261021';
result.specification === result.selector;
result.defaulted === true;
```

Use this mode when validator fixes should arrive through package upgrades. Do
not pass `document.mcpdesc` as a selector: a format version does not uniquely
identify validator behavior.

### Preserve 0.12 validation behavior

Pin stable `0.8.0` explicitly:

```js
const result = validateMcpDescription(document, {
  selector: '0.8.0',
});
```

This retains the immutable stable contract and sets `defaulted` to `false`. The
selector is deprecated but remains supported in 0.13.0.

The old spelling still works during migration:

```js
validateMcpDescription(document, { specification: '0.8.0' });
```

Prefer `selector` in new and updated code. If both names are supplied, they must
identify the same selector.

### Pin the corrected revision

Applications that require reproducibility and the issue #24 fixes can pin the
revision directly:

```js
const result = validateMcpDescription(document, {
  selector: '0.8.0-rev.20261021',
});
```

Future package releases will not retarget this selector.

## Document identity

`mcpdesc` identifies the document format, while a selector identifies one
immutable validator contract.

For format `0.8.0`, `schemaPins` is `false`. Consequently, an unpinned document
uses `0.8.0-rev.20261021` whether it declares the stable schema URI or omits
`$schema`:

```yaml
$schema: https://mcpdesc.org/schema/mcp-description/0.8.0.json
mcpdesc: '0.8.0'
```

A caller-supplied selector always wins as an explicit pin, provided the document
identifies the same format. No schema or document update is required to adopt
the revision.

## Update result handling

Code that reads only `valid` and `diagnostics` remains compatible. Update exact
object comparisons, snapshots, serialization, or destructuring assumptions for
the three added fields:

```js
const result = validateMcpDescription(document);

if (result.selector === null) {
  // Resolution failed. Inspect identity diagnostics before conformance errors.
}

console.log({
  valid: result.valid,
  selector: result.selector,
  defaulted: result.defaulted,
  diagnostics: result.diagnostics,
});
```

When selector resolution fails, validation returns `valid: false`,
`selector: null`, `specification: null`, and `defaulted: false`.

If code calls `resolveMcpDescriptionSpecification`, prefer `resolution.selector`
on resolved results. `resolution.specification` remains an alias.

## Handle unsupported formats

Do not interpret `unsupported-format-version` as ordinary document
non-conformance or retry with an older selector:

```js
const result = validateMcpDescription(document);
const unsupported = result.diagnostics.some(
  ({ code }) => code === 'unsupported-format-version',
);

if (unsupported) {
  // Upgrade to a validator release that supports this document format.
}
```

Explicit unknown or retired selector pins still throw `RangeError`.

## Component reference resolution

`resolveMcpDescriptionComponentReferences` remains an exact-selector operation.
It does not use maintainer defaults and still requires `options.specification`:

```js
const resolved = resolveMcpDescriptionComponentReferences(document, {
  specification: '0.8.0-rev.20261021',
});
```

Review this call separately from validation. Do not remove its required option.

## Entry points

The default, `/browser`, and `/standalone` entry points expose the same
validation API and selectors. Applications with strict Content Security Policy
should continue using `/browser` or `/standalone`; no entry-point migration is
required.

## Regression checklist

Before deploying the upgrade, test that:

- unpinned `0.8.0` documents resolve to `0.8.0-rev.20261021` with
  `defaulted: true`;
- explicit `selector: "0.8.0"` retains expected 0.12 results;
- documents with and without the stable `$schema` URI follow the intended mode;
- exact result-object comparisons include the new result fields;
- unsupported `mcpdesc` versions surface `unsupported-format-version` without
  fallback;
- Tool schemas with custom keywords and protocol-scoped `x-mcp-header` behavior
  produce the expected issue #24 results; and
- component reference resolution still receives an exact specification.
