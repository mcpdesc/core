# @mcpdesc/core

[![npm](https://img.shields.io/npm/v/@mcpdesc/core.svg)](https://www.npmjs.com/package/@mcpdesc/core)
[![mcpdesc: 0.8](https://img.shields.io/badge/mcpdesc-0.8-blue.svg)](https://mcpdesc.org)
[![Node.js: >=22](https://img.shields.io/badge/Node.js-%3E%3D22-brightgreen.svg)](https://nodejs.org/)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/mcpdesc/core/blob/main/LICENSE)

Read, write, and transform [MCP Description](https://mcpdesc.org) documents.
Tested for MCP Description v0.8.

`@mcpdesc/core` provides pure functions to:

- parse JSON or YAML text and serialize documents deterministically;
- project the view of a document for one MCP protocol revision, and merge views
  back together;
- select a subset of tools, resources, resource templates, and prompts;
- resolve reusable component references; and
- migrate MCP Description 0.7.0 documents to 0.8.0.

Every operation validates its input and output with
[`@mcpdesc/validator`](https://www.npmjs.com/package/@mcpdesc/validator), never
mutates its arguments, and performs no file or network access. It runs in
Node.js 22+ and in browser bundles, including strict Content Security Policy
pages.

## Install

```bash
npm install @mcpdesc/core
```

`@mcpdesc/validator` is installed as a dependency.

## Quick start

```ts
import { parseMcpDescriptionSource } from '@mcpdesc/core/documents';
import { projectEffectiveProtocolView } from '@mcpdesc/core';

const parsed = parseMcpDescriptionSource(yamlText);
if (!parsed.ok) throw new Error(parsed.diagnostics[0].message);

const view = projectEffectiveProtocolView(parsed.value, {
  protocolVersion: '2026-07-28',
});

if (view.ok) {
  console.log(view.value.tools); // tools available to a 2026-07-28 client
} else {
  console.error(view.diagnostics);
}
```

## Working with results

Operations return an `ok` flag instead of throwing:

```ts
const result = projectEffectiveProtocolView(document, options);
if (result.ok) {
  use(result.value); // diagnostics may still contain warnings
} else {
  report(result.diagnostics); // at least one error
}
```

Each diagnostic has a `code`, a `severity` (`error` or `warning`), a
human-readable `message`, and a `path` into the document, such as
`['tools', 0, 'inputSchema']`. Its `phase` says where it came from:

| `phase`     | Meaning                                                                            |
| ----------- | ---------------------------------------------------------------------------------- |
| `source`    | The input document failed validation; the operation did not run.                   |
| `operation` | The request could not be carried out, for example an undeclared protocol revision. |
| `result`    | The produced document failed validation and was not returned.                      |

## Choosing a selector

A selector names one exact set of validation rules. Normally you omit the
`specification` option: each operation uses the validator's default selector for
the document's `mcpdesc` format version, currently `0.8.0-rev.20261021` for
`0.8.0` documents. Upgrading the package can then deliver validator corrections.

Pass `specification` to pin exact rules, for example in CI that must produce
identical results across upgrades:

```ts
projectEffectiveProtocolView(document, {
  specification: '0.8.0-rev.20261021',
  protocolVersion: '2026-07-28',
});
```

| Operation                          | `0.8.0-rev.20261021` (default) | `0.8.0` (pin only) | `0.8.0-rc.4` (deprecated) |
| ---------------------------------- | ------------------------------ | ------------------ | ------------------------- |
| Effective Protocol View projection | Supported                      | Supported          | Supported                 |
| Effective Protocol View merge      | Supported                      | Supported          | Supported                 |
| Declaration selection              | Supported                      | Supported          | Supported                 |
| Component reference resolution     | Supported                      | Supported          | Supported                 |
| Migration from 0.7.0               | Supported                      | Supported          | Supported                 |

Unsupported selectors fail with an `unsupported-specification` diagnostic. A
document whose selector cannot be determined, such as an unknown `mcpdesc`
version, fails with a `source` diagnostic like `unsupported-format-version`;
core never falls back to older rules. Merge resolves the default from its first
document. Earlier drafts and release candidates are available from older package
releases.

### Upgrading from 0.11

`@mcpdesc/core` 0.11 required `specification`, and most callers passed
`'0.8.0'`, which pins the original 0.8.0 rules. Version 0.12 uses
`@mcpdesc/validator` 0.13.1, whose default for 0.8.0 documents is the
`0.8.0-rev.20261021` correction. To adopt it:

- Remove `specification: '0.8.0'` to follow the maintained default. Documents
  with custom Tool-schema keywords, or with `x-mcp-header` under protocol
  revisions other than `2026-07-28`, become valid.
- Keep `specification: '0.8.0'` only if you must reproduce earlier results
  exactly.

If you also call `@mcpdesc/validator` directly, apply the same change and see
its
[0.13 migration guide](https://github.com/mcpdesc/core/blob/main/packages/validator/MIGRATING-0.13.md).

## Tasks

### Parse and serialize JSON or YAML

```ts
import {
  parseMcpDescriptionSource,
  serializeMcpDescription,
} from '@mcpdesc/core/documents';

const parsed = parseMcpDescriptionSource(text); // detects JSON or YAML
const yaml = parseMcpDescriptionSource(text, { format: 'yaml' }); // explicit

if (!parsed.ok) {
  const [{ message, location }] = parsed.diagnostics;
  console.error(`${location?.line}:${location?.column} ${message}`);
}

const json = serializeMcpDescription(document, { format: 'json' });
```

Parsing returns a plain JSON-compatible value and rejects YAML that cannot be
represented as JSON. Serialization sorts object keys, so equal documents always
produce identical text. Parsing does not validate the document; use the
validator or any semantic operation for that.

### Project an Effective Protocol View

A document can describe several MCP protocol revisions, with some declarations
scoped to particular revisions. Projection returns the document as seen by one
revision:

```ts
const view = projectEffectiveProtocolView(document, {
  protocolVersion: '2025-11-25',
});
```

The result keeps only applicable transports, capabilities, tools, resources,
resource templates, prompts, and elicitations; removes their `protocolVersions`
scopes; and sets root `protocolVersions` to the requested revision. A revision
missing from the document's root `protocolVersions` fails with
`projection-version-not-declared`.

### Merge protocol views

```ts
import { mergeEffectiveProtocolViews } from '@mcpdesc/core';

const merged = mergeEffectiveProtocolViews([view2025, view2026]);
```

Merging combines documents into one multi-revision document. A declaration
present in every revision is left unscoped; one present in only some revisions
gets a `protocolVersions` scope listing them. Inputs that describe the same
revision differently fail with `conflicting-protocol-view`, and differing root
metadata fails with `conflicting-unscoped-metadata`. Merged declarations are
returned in a canonical order, not input order.

### Select declarations

```ts
import { selectMcpDescriptionDeclarations } from '@mcpdesc/core/selection';

const subset = selectMcpDescriptionDeclarations(document, {
  selections: {
    tools: ['search'],
    resources: ['docs://index'],
  },
});
```

Declarations are identified by tool and prompt `name`, resource `uri`, and
resource template `uriTemplate`. Every protocol-scoped variant of a selected
declaration is kept; unselected and empty collections are omitted.

### Resolve component references

```ts
import { resolveMcpDescriptionComponentReferences } from '@mcpdesc/core/components';

const resolved = resolveMcpDescriptionComponentReferences(document);
if (resolved.ok) {
  console.log(resolved.value); // references replaced by their targets
  console.log(resolved.provenance);
  // [{ referencePath: ['tools', 0, 'inputSchema'],
  //    targetPath: ['components', 'schemas', 'SearchRequest'] }]
}
```

Each `$componentRef` is replaced by a copy of its final target. `components` is
retained, and `provenance` maps each authored reference to the component it
resolved to.

### Migrate from MCP Description 0.7.0

```ts
import {
  migrateMcpDescription07To08,
  serializeMcpDescriptionMigrationReport,
} from '@mcpdesc/core';

const migrated = migrateMcpDescription07To08(legacyDocument, {
  sourceValidated: true,
  defaultProtocolVersion: '2025-11-25', // used only if the source has none
});

console.log(migrated.report.status); // 'success' | 'success-with-warnings' | 'failed'
console.log(serializeMcpDescriptionMigrationReport(migrated.report));
```

This package does not include the 0.7.0 schema. Validate the source with a 0.7.0
validator first, then set `sourceValidated: true`. Migration moves the protocol
revision to root `protocolVersions`, wraps server capabilities, omits empty
optional arrays, and converts inline security schemes into named definitions.
The report lists every change, applied default, and diagnostic; generated names
are reported as warnings to review.

## Entry points

| Import                     | Contents                                         | Bundles the validator |
| -------------------------- | ------------------------------------------------ | --------------------- |
| `@mcpdesc/core`            | All operations                                   | Yes                   |
| `@mcpdesc/core/documents`  | Parsing and serialization only                   | No                    |
| `@mcpdesc/core/selection`  | Declaration selection                            | Yes                   |
| `@mcpdesc/core/components` | Component reference resolution and related types | Yes                   |

All entry points are safe under a strict Content Security Policy. Use
`/documents` when you only need parsing, to keep your bundle small.

## What this package does not do

It does not read files, fetch URLs or external references, select a transport,
connect to MCP servers, or claim that a description matches a deployed server.

## More information

- [Changelog](https://github.com/mcpdesc/core/blob/main/packages/core/CHANGELOG.md)
- [`@mcpdesc/validator`](https://www.npmjs.com/package/@mcpdesc/validator)
- [Terminology guide](https://github.com/mcpdesc/core/blob/main/docs/validator-terminology.md)
- [Contributing](https://github.com/mcpdesc/core/blob/main/CONTRIBUTING.md)
- [Issues](https://github.com/mcpdesc/core/issues)

## License

[Apache-2.0](https://github.com/mcpdesc/core/blob/main/LICENSE)
