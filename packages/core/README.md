# @mcpdesc/core

[![npm](https://img.shields.io/npm/v/@mcpdesc/core.svg)](https://www.npmjs.com/package/@mcpdesc/core)
[![mcpdesc: 0.8](https://img.shields.io/badge/mcpdesc-0.8-blue.svg)](https://mcpdesc.org)
[![Node.js: >=22](https://img.shields.io/badge/Node.js-%3E%3D22-brightgreen.svg)](https://nodejs.org/)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/mcpdesc/core/blob/main/LICENSE)

Read, write, and transform [MCP Description](https://mcpdesc.org) documents.
Stable support covers v0.8, with preview support for v0.9 RC.3 and explicit pins
for earlier v0.9 drafts and release candidates.

`@mcpdesc/core` provides pure functions to:

- parse JSON or YAML text and serialize documents deterministically;
- project the view of a document for one MCP protocol revision, and merge views
  back together;
- select a subset of tools, resources, resource templates, and prompts;
- resolve reusable component references; and
- migrate MCP Description 0.7.0 documents to 0.8.0; and
- convert 0.8.0 documents to 0.9.0 before native MCP projection.

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

With RC.3, schema-derived diagnostics also expose structured `detail`. A finding
reached through `$componentRef` points to the use site and includes the
component definition in `relatedLocations`. Render recognized detail kinds and
fall back to `message` for unknown kinds or diagnostics without detail.

## Choosing a selector

A selector names one exact set of validation rules. Normally you omit the
`selector` option: each operation uses the validator's default selector for the
document's `mcpdesc` format version, currently `0.8.0-rev.20261021` for `0.8.0`
documents, and `0.9.0-rc.3` for `0.9.0` documents. Upgrading the package can
then deliver validator corrections and newer approved 0.9 RC snapshots, until
the 0.9 default is frozen to the final `0.9.0` release.

Pass `selector` to pin exact rules, for example in CI that must produce
identical results across upgrades:

```ts
projectEffectiveProtocolView(document, {
  selector: '0.8.0-rev.20261021',
  protocolVersion: '2026-07-28',
});
```

The older `specification` option remains a deprecated alias for `selector`.
Passing both with different values fails with `conflicting-selector-options`.

| Operation                          | `0.8.0-rev.20261021` (default) | `0.8.0` (deprecated) | `0.8.0-rc.4` (deprecated) | `0.9.0-draft.1` (preview) | `0.9.0-draft.2` (preview) | `0.9.0-draft.3` (preview) | `0.9.0-draft.4` (preview) | `0.9.0-rc.1`  | `0.9.0-rc.2`  | `0.9.0-rc.3` (default) |
| ---------------------------------- | ------------------------------ | -------------------- | ------------------------- | ------------------------- | ------------------------- | ------------------------- | ------------------------- | ------------- | ------------- | ---------------------- |
| Effective Protocol View projection | Supported                      | Supported            | Supported                 | Supported                 | Supported                 | Supported                 | Supported                 | Supported     | Supported     | Supported              |
| Effective Protocol View merge      | Supported                      | Supported            | Supported                 | Supported                 | Supported                 | Supported                 | Supported                 | Supported     | Supported     | Supported              |
| Declaration selection              | Supported                      | Supported            | Supported                 | Supported                 | Supported                 | Supported                 | Supported                 | Supported     | Supported     | Supported              |
| Component reference resolution     | Supported                      | Supported            | Supported                 | Supported                 | Supported                 | Supported                 | Supported                 | Supported     | Supported     | Supported              |
| Migration from 0.7.0               | Supported                      | Supported            | Supported                 | Not supported             | Not supported             | Not supported             | Not supported             | Not supported | Not supported | Not supported          |
| Native MCP value projection        | Not supported                  | Not supported        | Not supported             | Supported                 | Supported                 | Supported                 | Supported                 | Supported     | Supported     | Supported              |
| Conversion from 0.8.0              | Not supported                  | Not supported        | Not supported             | Not supported             | Supported                 | Supported                 | Supported                 | Supported     | Supported     | Supported              |

Deprecated selectors still work when pinned and are listed in
`deprecatedCoreSpecifications`; they may be removed in a later minor release.
Draft selectors are never defaults: pass one explicitly to retain that draft's
behavior. Unpinned 0.9.0 documents use RC.3 even when a recognized same-format
`$schema` names an earlier draft.

Unsupported selectors fail with an `unsupported-specification` diagnostic. A
document whose selector cannot be determined, such as an unknown `mcpdesc`
version, fails with a `source` diagnostic like `unsupported-format-version`;
core never falls back to older rules. Merge resolves the default from its first
document. Earlier drafts and release candidates are available from older package
releases.

### Upgrading from 0.11

`@mcpdesc/core` 0.11 required `specification`, and most callers passed
`'0.8.0'`, which pins the original 0.8.0 rules, now deprecated. Version 0.12
uses `@mcpdesc/validator` 0.13.1, whose default for 0.8.0 documents is the
`0.8.0-rev.20261021` correction. To adopt it:

- Remove `specification: '0.8.0'` to follow the maintained default. For example,
  a tool `inputSchema` property using `x-mcp-header` in a document that also
  declares MCP `2025-11-25` is rejected by the original rules but valid under
  the revision, which checks `x-mcp-header` only for `2026-07-28`.
- To pin instead, prefer `selector: '0.8.0-rev.20261021'`. Keep `'0.8.0'` only
  if you must reproduce earlier results exactly.
- Rename `specification` to `selector` when convenient; the old name keeps
  working.

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
const sortedYaml = serializeMcpDescription(document, {
  format: 'yaml',
  keyOrder: 'sorted',
});
const organizedYaml = serializeMcpDescription(document, {
  format: 'yaml',
  keyOrder: 'document',
});
```

Parsing returns a plain JSON-compatible value and rejects YAML that cannot be
represented as JSON. Serialization defaults to `keyOrder: 'preserve'`, retaining
JavaScript property enumeration order at every level, including objects inside
arrays. Use `keyOrder: 'sorted'` to recursively sort object keys so equal
documents produce identical text. Integer-like keys follow JavaScript's numeric
enumeration order, not their original source order. Neither mode changes array
order or mutates the input.

`keyOrder: 'document'` applies the maintainer-approved proposed specification
Section 18 presentation profile: header and identity, transports and security,
capabilities and declarations, then tags and components. Known nested structures
use context-specific sequences. Arrays and named-map entry order remain
unchanged; schemas, metadata, application payloads, and extensions remain
opaque. Unlisted fields follow known fields in their existing relative order.

This opt-in profile recognizes `mcpdesc: '0.8.0'` and `'0.9.0'` directly,
without selector resolution or validation. Version-specific fields remain scoped
to their format; unknown formats and unrecognized structures retain their order.
It anticipates the proposed specification profile, not a new validator snapshot
or a claim of RC.2 support. The default remains `preserve`. See the
[ordering design](https://github.com/mcpdesc/core/blob/main/docs/document-ordering-design.md)
for the full field sequences and preservation contract.

Preservation applies to the supplied value, including a converter's returned
value, not the original source text. Comments, quoting, whitespace, and original
positions of moved properties are not preserved. Parsing does not validate the
document; use the validator or any semantic operation for that.

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
`projection-protocol-version-not-declared` for RC.1, or
`projection-version-not-declared` for earlier selectors.

Projection preserves the relative property order of retained fields, the order
of retained array elements, and surviving component-map entries. Opaque values
such as schemas, metadata, and extensions retain their internal ordering. It
does not preserve source comments or formatting; integer-like keys follow
JavaScript enumeration order. To organize the returned document explicitly,
serialize it with `keyOrder: 'document'`.

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

### Convert MCP Description 0.8.0 to 0.9.0

Conversion follows the Proposal 0028 tooling profile. It validates the 0.8.0
source, applies only the profile's version and schema rewrites, reports
incompatibilities, and applies a fix only when requested at its blocker path.
The result includes an RFC 6902 patch; the input is never mutated. The profile
does not convert 0.7.0 documents directly. `selector` chooses the exact 0.9
snapshot for output; omission follows the configured 0.9.0 default, currently
RC.1. Pin `0.9.0-draft.2` to preserve the converter's earlier default target.

```ts
import {
  convertMcpDescriptionVersion,
  projectMcpNativeValue,
} from '@mcpdesc/core';

const converted = convertMcpDescriptionVersion(document, {
  from: '0.8.0',
  to: '0.9.0',
  selector: '0.9.0-rc.1',
  fixes: [
    {
      fix: 'remove-property',
      path: ['tools', 0, 'annotations', 'futureHint'],
    },
  ],
});

if (converted.ok) {
  const tool = projectMcpNativeValue(converted.value, {
    selector: '0.9.0-rc.1',
    protocolVersion: '2026-07-28',
    kind: 'tool',
    identifier: 'search',
  });
}
```

Without a requested fix, incompatible values are reported as blockers and no
converted document is returned. Native projection never converts implicitly.

### Project native MCP values (0.9 preview)

MCP Description 0.9 RC.1 and Drafts 1 through 4 define how a declaration becomes
the value an MCP server returns, for example a `Tool` in a `tools/list` result:

```ts
import { projectMcpNativeValue } from '@mcpdesc/core';

const tool = projectMcpNativeValue(draftDocument, {
  selector: '0.9.0-draft.4',
  protocolVersion: '2026-07-28',
  kind: 'tool',
  identifier: 'search',
});
if (tool.ok) console.log(tool.value); // { name: 'search', inputSchema: {...} }

const tools = projectMcpNativeValue(draftDocument, {
  selector: '0.9.0-draft.4',
  protocolVersion: '2026-07-28',
  kind: 'tool',
});
if (tools.ok) console.log(tools.value); // every applicable tool, in order

const organizedTools = projectMcpNativeValue(draftDocument, {
  protocolVersion: '2026-07-28',
  kind: 'tool',
  keyOrder: 'document',
});
if (organizedTools.ok) console.log(organizedTools.value);
```

`kind` is `tool`, `resource`, `resourceTemplate`, or `prompt`. The identifier is
a tool or prompt `name`, resource `uri`, or resource template `uriTemplate`;
omit it for the ordered list of applicable values, which may be empty.

Projection selects the protocol revision's view, resolves component references,
and removes MCP Description fields such as `examples`, `tags`, `security`,
`clientRequirements`, and `x-` extensions, including on icons and prompt
arguments. Embedded schemas and `_meta` are copied unchanged. The result is the
MCP value only, not a JSON-RPC message.

Native projection defaults to `keyOrder: 'preserve'`: retained fields and array
elements keep their relative order, including icons and prompt arguments.
Resolved schemas retain the component target's internal order. Opt into
`keyOrder: 'document'` to arrange native fields using the MCP Description
declaration sequences restricted to fields that native projection retains.
Icons, annotations, execution, and prompt arguments use their corresponding
nested sequences. Arrays, embedded schemas, and `_meta` contents are never
reordered by this policy.

This is a core presentation convention, not a required MCP wire order or a new
validator rule. It neither adds fields nor changes protocol-revision support,
validation, or diagnostics. Serialize the returned value normally to retain the
chosen order. The serializer's `document` policy does not infer a native kind
from bare MCP objects or arrays; use the projection option to organize them. For
recursive alphabetical sorting instead, serialize with `keyOrder: 'sorted'`.
Neither projection policy preserves source comments, quoting, or whitespace.

| Failure code                            | Cause                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------- |
| `projection-source-invalid`             | The document has validation errors.                                         |
| `projection-revision-not-declared`      | `protocolVersion` is not in the root `protocolVersions`.                    |
| `projection-declaration-not-applicable` | No declaration with that identifier applies to the revision.                |
| `projection-postcondition-failed`       | The projected MCP value fails the pinned schema for that protocol revision. |

This preview tracks a draft specification and may change in later drafts.

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
