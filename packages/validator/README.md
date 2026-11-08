# @mcpdesc/validator

[![npm](https://img.shields.io/npm/v/@mcpdesc/validator.svg)](https://www.npmjs.com/package/@mcpdesc/validator)
[![mcpdesc: 0.8](https://img.shields.io/badge/mcpdesc-0.8-blue.svg)](https://mcpdesc.org)
[![Node.js: >=20](https://img.shields.io/badge/Node.js-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/mcpdesc/core/blob/main/LICENSE)

Validate [MCP Description](https://mcpdesc.org) documents. Tested for MCP
Description v0.8 and v0.9 RC.3.

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
Upgrading from 0.13.x? See the
[0.14.0 migration guide](https://github.com/mcpdesc/core/blob/main/packages/validator/MIGRATING-0.14.md).

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
    code?: string; // producer-defined category
    severity: 'error' | 'warning';
    message?: string; // human-readable explanation
    path: Array<string | number>; // location, for example ['tools', 0, 'inputSchema']
    rule?: string; // registered rule, for example 'mcp.meta.key-format'
    protocolVersions?: string[]; // revisions the finding concerns, when applicable
    detail?: McpDescriptionDiagnosticDetail; // factual explanation for RC.3 schema findings
    relatedLocations?: McpDescriptionRelatedLocation[]; // component definition locations
    explanation?: McpDescriptionDiagnosticExplanation; // only when requested and available
  }>;
  results?: Array<{
    rule: string;
    protocolVersion?: string;
    status: 'passed' | 'failed' | 'warning' | 'not-applicable' | 'not-evaluated' | 'delegated';
    reason?: 'earlier-stage-failed' | 'not-implemented' | 'operation';
  }>;
  /** @deprecated Use `selector`. */
  specification: string | null;
}

interface McpDescriptionDiagnosticDetail {
  kind: string; // extensible; render recognized kinds and fall back for unknown kinds
  member?: string;
  members?: string[];
  allowedValues?: unknown[];
  allowedMembers?: string[];
  allowedMemberPatterns?: string[];
  expectedTypes?: string[];
  keyword?: string;
  limit?: number | string;
  selector?: { member: string; value: unknown };
}

interface McpDescriptionRelatedLocation {
  path: Array<string | number>;
  relation: 'component-definition';
}

interface McpDescriptionDiagnosticExplanation {
  kind: 'unexpected-property';
  property: string;
  discriminator: { property: 'type'; value: string };
  suggestedProperty?: string;
}
```

- **Errors** make a document invalid.
- **Warnings** leave it valid but point out risks, such as deprecated features
  or checks that could not be completed offline.
- Paths are relative to the source document. In RC.3, a missing member points
  to its enclosing object and names the absent member in `detail.member`;
  unexpected members point to the member that exists in the source.
- Diagnostics are deterministic: the same document and selector always produce
  the same results.
- Diagnostic explanations are opt-in with `explainDiagnostics: true`. RC.2
  currently explains unexpected members in recognized transport variants,
  including a uniquely close property suggestion such as `arg` → `args`. The
  explanation is additive metadata; the default diagnostic message and shape
  remain unchanged. Other selectors and diagnostic kinds may have no
  explanation.
- RC.3 diagnostics include factual `detail` for schema-derived findings.
  `detail.kind` is extensible: render known kinds and fall back to `message`
  when the kind is unknown or detail is absent. Findings reached through a
  `$componentRef` use the reference site as `path` and add a related
  `component-definition` location.
- From MCP Description 0.9 drafts, diagnostics identify the specification
  `rule` they report. From Draft 4, `rule`, `severity`, and `path` are required
  interoperable fields; `code` and `message` are optional producer output, and
  `protocolVersions` identifies revision-dependent findings. Draft 4 also
  returns `results`, one status per rule and declared protocol version. RC.1
  uses result format `1.3.0` and protocol-version rule identifiers; RC.3 uses
  result format `1.4.0`, while Draft 4 keeps format `1.0.0` and its original
  identifiers. Treat `not-applicable` and
  `not-evaluated` as unconfirmed, not passed. Earlier
  selectors retain their prior diagnostic shape and do not return rule results.

## Choosing validation rules

A **selector** names one exact, immutable set of validation rules. Normally you
do not pass one: the validator reads the document's `mcpdesc` format version and
uses the default selector chosen for it.

| Selector             | Status                   | Use                                      |
| -------------------- | ------------------------ | ---------------------------------------- |
| `0.8.0-rev.20261021` | Default for `0.8.0`      | Current rules for MCP Description 0.8.   |
| `0.8.0`              | Deprecated, pin only     | Original 0.8.0 rules.                    |
| `0.8.0-rc.4`         | Deprecated, pin only     | Release candidate 4 rules.               |
| `0.9.0-draft.2`      | Preview, pin only        | MCP Description 0.9 Community Working Draft 2. |
| `0.9.0-draft.3`      | Preview, pin only        | MCP Description 0.9 Community Working Draft 3. |
| `0.9.0-draft.4`      | Preview, pin only        | MCP Description 0.9 Community Working Draft 4. |
| `0.9.0-draft.1`      | Preview, pin only        | MCP Description 0.9 Community Working Draft 1. |
| `0.9.0-rc.1`         | Explicit pin             | MCP Description 0.9 Release Candidate 1. |
| `0.9.0-rc.2`         | Explicit pin             | MCP Description 0.9 Release Candidate 2. |
| `0.9.0-rc.3`         | Default for `0.9.0`      | MCP Description 0.9 Release Candidate 3. |

The default may move to a corrected revision in a later minor release. Pin a
selector when results must stay identical across upgrades, for example in CI:

```js
validateMcpDescription(document, { selector: '0.8.0-rev.20261021' });
```

`mcpdesc: "0.9.0"` defaults to RC.3, with or without `$schema`. The default
advances through approved RC snapshots on package upgrades, then freezes to
`0.9.0` at final release. RC.3 selects applicable union branches through
guarded schemas and returns structured, source-aware diagnostics. It
intentionally rejects unknown members on Elicitation Interaction Response
Objects in Tool Interaction Examples; pin RC.2 to retain the earlier behavior.
Earlier selector behavior remains unchanged. Draft selectors are never defaults;
pin one to retain its original validation behavior:

```js
validateMcpDescription(draftDocument, { selector: '0.9.0-draft.4' });
```

Request structured explanation metadata for supported findings:

```js
const result = validateMcpDescription(document, {
  selector: '0.9.0-rc.2',
  explainDiagnostics: true
});

for (const diagnostic of result.diagnostics) {
  if (diagnostic.explanation?.kind === 'unexpected-property') {
    console.log(diagnostic.explanation.property);
    console.log(diagnostic.explanation.discriminator.value);
    console.log(diagnostic.explanation.suggestedProperty);
  }
}
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
for 0.8.0 and 0.9.0, recognized schema URIs do not pin a particular selector.
Use `options.selector` for an exact pin, including when `$schema` names an
earlier draft of the same format.

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
