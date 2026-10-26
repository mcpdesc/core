# @mcpdesc/validator

[![npm](https://img.shields.io/npm/v/@mcpdesc/validator.svg)](https://www.npmjs.com/package/@mcpdesc/validator)
[![mcpdesc: 0.8](https://img.shields.io/badge/mcpdesc-0.8-blue.svg)](https://mcpdesc.org)
[![Node.js: >=20](https://img.shields.io/badge/Node.js-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/mcpdesc/core/blob/main/LICENSE)

Validate [MCP Description](https://mcpdesc.org) documents. Tested for MCP
Description v0.8.

The validator:

- checks document structure against the MCP Description JSON Schema;
- applies semantic rules that JSON Schema cannot express, such as protocol
  revision applicability, security scheme references, and tool example
  conformance;
- returns deterministic errors and warnings, each with a path into the
  document; and
- runs synchronously and offline in Node.js 20+ and browsers, including pages
  with a strict Content Security Policy.

It validates description documents, not live MCP servers or protocol messages.

## Install

```bash
npm install @mcpdesc/validator
```

Upgrading from 0.12.x? See the
[0.13.0 migration guide](https://github.com/mcpdesc/core/blob/main/packages/validator/MIGRATING-0.13.md).

## Quick start

```js
import { validateMcpDescription } from '@mcpdesc/validator';

const result = validateMcpDescription(document); // a parsed JavaScript value

if (result.valid) {
  console.log('Valid');
}
for (const { severity, path, message } of result.diagnostics) {
  console.log(`${severity} at ${path.join('.') || '(root)'}: ${message}`);
}
```

The validator accepts an already parsed value. To read JSON or YAML text, use
`parseMcpDescriptionSource` from
[`@mcpdesc/core/documents`](https://www.npmjs.com/package/@mcpdesc/core) or any
JSON/YAML parser.

## Understanding results

```ts
interface McpDescriptionValidationResult {
  valid: boolean; // false when at least one diagnostic is an error
  selector: string | null; // the validation rules used, or null if none applied
  defaulted: boolean; // true when the selector came from the document's format version
  diagnostics: Array<{
    code: string; // stable identifier, for example 'schema-validation'
    severity: 'error' | 'warning';
    message: string; // human-readable explanation
    path: Array<string | number>; // location, for example ['tools', 0, 'inputSchema']
    rule?: string; // registered rule, for example 'mcp.meta.key-format' (0.9 drafts)
  }>;
  /** @deprecated Use `selector`. */
  specification: string | null;
}
```

- **Errors** make a document invalid.
- **Warnings** leave it valid but point out risks, such as deprecated features
  or checks that could not be completed offline.
- Paths are relative to the document root. For a missing or unexpected
  property, the path ends with that property's name.
- Diagnostics are deterministic: the same document and selector always produce
  the same results.
- From MCP Description 0.9 Draft 1, many diagnostics also name the
  specification `rule` they enforce, so tools can link to or group by rule.
  Earlier selectors omit `rule`.

## Choosing validation rules

A **selector** names one exact, immutable set of validation rules. Normally you
do not pass one: the validator reads the document's `mcpdesc` format version and
uses the default selector chosen for it.

| Selector             | Status                   | Use                                      |
| -------------------- | ------------------------ | ---------------------------------------- |
| `0.8.0-rev.20261021` | Default for `0.8.0`      | Current rules for MCP Description 0.8.   |
| `0.8.0`              | Deprecated, pin only     | Original 0.8.0 rules.                    |
| `0.8.0-rc.4`         | Deprecated, pin only     | Release candidate 4 rules.               |
| `0.9.0-draft.1`      | Preview, pin only        | MCP Description 0.9 Community Working Draft 1. |

The default may move to a corrected revision in a later minor release. Pin a
selector when results must stay identical across upgrades, for example in CI:

```js
validateMcpDescription(document, { selector: '0.8.0-rev.20261021' });
```

Draft selectors are never defaults. Validate a 0.9 Draft 1 document by pinning
its selector; without it, `mcpdesc: "0.9.0"` is reported as
`unsupported-format-version`:

```js
validateMcpDescription(draftDocument, { selector: '0.9.0-draft.1' });
```

A document whose format version has no default, such as an unknown future
version, is reported as invalid with `unsupported-format-version`; the validator
never falls back to older rules. Passing an unsupported selector throws a
`RangeError`. Earlier drafts and release candidates are available from older
package releases.

To find out which selector a document would use, without validating it:

```js
import { resolveMcpDescriptionSpecification } from '@mcpdesc/validator';

const resolution = resolveMcpDescriptionSpecification(document);
if (resolution.status === 'resolved') {
  console.log(resolution.selector, resolution.defaulted, resolution.schemaUri);
} else {
  console.error(resolution.diagnostics); // e.g. contradictory $schema and mcpdesc
}
```

The format version comes from `mcpdesc`. A `$schema` value must agree with it;
for 0.8.0, the schema URI does not pin a particular selector.

## Browser and strict CSP use

| Import                          | Strict CSP (no `unsafe-eval`) | Notes                                        |
| ------------------------------- | ----------------------------- | -------------------------------------------- |
| `@mcpdesc/validator`            | No                            | Fastest; compiles schemas at runtime.        |
| `@mcpdesc/validator/browser`    | Yes                           | Precompiled schemas; recommended for browsers. |
| `@mcpdesc/validator/standalone` | Yes                           | Same as `/browser`; kept for compatibility.  |

```js
import { validateMcpDescription } from '@mcpdesc/validator/browser';
```

All entry points have the same API and produce the same results. The CSP-safe
entries are larger and slower: they precompile the MCP Description schemas and
interpret schemas embedded in documents, such as tool input schemas, instead of
compiling them. Choose the entry point explicitly; the package does not switch
implementations automatically.

## Resolve component references

```js
import { resolveMcpDescriptionComponentReferences } from '@mcpdesc/validator';

const { document: resolved, provenance, diagnostics } =
  resolveMcpDescriptionComponentReferences(document, { specification: '0.8.0-rev.20261021' });
```

Each `$componentRef` is replaced by a copy of its target, and `provenance`
maps each authored reference path to its final component path. For validated,
non-mutating resolution with an `ok` result, use
[`@mcpdesc/core`](https://www.npmjs.com/package/@mcpdesc/core).

## Support metadata

The package also exports frozen metadata:

| Export                      | Contents                                                     |
| --------------------------- | ------------------------------------------------------------ |
| `supportedSpecifications`   | Supported selectors.                                         |
| `deprecatedSpecifications`  | Supported selectors that are deprecated.                     |
| `defaultSpecifications`     | Default selector for each format version.                    |
| `supportedProtocolVersions` | MCP protocol revisions the supported selectors understand.   |
| `specificationProvenance`   | Each selector's source tag, schema URI, and schema SHA-256.  |
| `mcpExtensionCatalogue`     | Known official MCP extension identifiers and their source.   |
| `mcpExtensionMaturity()`    | Classifies an extension identifier.                          |

Names containing "specification" are historical; they list or describe
selectors.

## Troubleshooting

| Symptom                                       | Cause and fix                                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `unsupported-format-version`                  | The document's `mcpdesc` has no supported rules. Check the value, or use a package release supporting it.        |
| `contradictory-format-version` or `-snapshot-identity` | `$schema`, `mcpdesc`, or the requested selector disagree. Make them consistent.                        |
| Error importing the package in a browser      | The page blocks `eval`. Import `@mcpdesc/validator/browser`.                                                    |
| Warning about an unresolved external reference | External `$ref` targets are never fetched. The reference is kept and that part is not validated.               |

## More information

- [Changelog](https://github.com/mcpdesc/core/blob/main/packages/validator/CHANGELOG.md)
- [Terminology guide](https://github.com/mcpdesc/core/blob/main/docs/validator-terminology.md):
  format versions, selectors, schema URIs, and protocol revisions
- [MCP Description specification](https://github.com/mcpdesc/mcpdesc-specification)
- [Contributing](https://github.com/mcpdesc/core/blob/main/CONTRIBUTING.md) and
  [maintainer guide](https://github.com/mcpdesc/core/blob/main/docs/validator-maintainer-guide.md)
- [Issues](https://github.com/mcpdesc/core/issues)

## License

[Apache-2.0](https://github.com/mcpdesc/core/blob/main/LICENSE)
