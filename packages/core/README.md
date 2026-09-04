# `@mcpdesc/core`

Experimental, side-effect-free source and semantic operations for MCP
Description documents.

The package API remains experimental and may change while MCP Description 0.8
remains pre-1.0.

```ts
import {
  migrateMcpDescription07ToRc1,
  mergeEffectiveProtocolViews,
  projectEffectiveProtocolView,
  serializeMcpDescriptionMigrationReport,
} from '@mcpdesc/core';
import {
  parseMcpDescriptionSource,
  serializeMcpDescription,
} from '@mcpdesc/core/documents';
import { selectMcpDescriptionDeclarations } from '@mcpdesc/core/selection';
import { resolveMcpDescriptionComponentReferences } from '@mcpdesc/core/components';

const parsed = parseMcpDescriptionSource(sourceText);
if (!parsed.ok) {
  console.error(parsed.diagnostics);
}

const result = projectEffectiveProtocolView(document, {
  specification: '0.8.0-rc.2',
  protocolVersion: '2026-07-28',
});

if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.diagnostics);
}

const merged = mergeEffectiveProtocolViews(protocolViews, {
  specification: '0.8.0-rc.2',
});

const subset = selectMcpDescriptionDeclarations(document, {
  specification: '0.8.0-rc.1',
  selections: {
    tools: ['search'],
    resources: ['docs://index'],
  },
});

const migrated = migrateMcpDescription07ToRc1(validatedLegacyDocument, {
  specification: '0.8.0-rc.1',
  defaultProtocolVersion: '2026-07-28',
  sourceValidated: true,
});

const resolved = resolveMcpDescriptionComponentReferences(document, {
  specification: '0.8.0-rc.1',
});

if (resolved.ok) {
  console.log(resolved.value, resolved.provenance);
}

console.log(serializeMcpDescriptionMigrationReport(migrated.report));
```

Semantic operations require an exact immutable selector and support
`0.8.0-draft.4`, `0.8.0-rc.1`, and `0.8.0-rc.2`. They validate their source and
result with `@mcpdesc/validator`. Declaration selection uses MCP Description
identities: tool and prompt `name`, resource `uri`, and resource template
`uriTemplate`. It preserves all selected protocol-scoped variants and omits
empty declaration collections. Draft 4 constants and operations remain available
without being silently retargeted to RC.1.

RC.2 projection preserves pre-standard server extension maps in every applicable
Effective Protocol View. `mergeEffectiveProtocolViews` combines compatible
views, retains semantically equivalent declarations across scopes, and rejects
conflicting views or unscoped metadata without mutating inputs.

Component reference resolution is RC.1-only. It validates before resolving,
returns a deep-cloned document with root component registries retained, and
reports deterministic provenance from each authored reference path to its
terminal component path. Intermediate chain hops are not exposed. The operation
uses the resolver exported through `@mcpdesc/validator/standalone`; this keeps
the snapshot-owned traversal authoritative while avoiding the runtime AJV entry
and a dependency cycle.

Migration accepts a caller-validated MCP Description 0.7.0 value and validates
the result against the exact target snapshot. It moves the protocol revision to
root scope, wraps server capabilities, omits optional empty arrays, and converts
inline legacy security schemes to deterministic named definitions and
requirements. Generated names and deduplication are reported as warnings for
author review. RC.1 callers may opt into `defaultProtocolVersion` when the
source omits `info.protocolVersion`; the source value always takes precedence,
and no built-in default is applied. Every migration result includes a stable,
JSON-compatible report that distinguishes success, success with warnings, and
failure and records diagnostics, applied defaults, and proven conversion
changes. The package does not ship or duplicate the frozen 0.7.0 schema, so
callers must validate that source before setting `sourceValidated: true`.

Source parsing accepts text and returns a JSON-compatible value or structured
source diagnostics; serialization emits deterministic JSON or YAML. These
operations do not read files or streams. The package does not retrieve
references, select a transport, materialize inherited values, or claim that a
description is complete or faithful to a deployed server.

Strict-CSP browser consumers can import parsing and serialization from
`@mcpdesc/core/documents` without bundling validator code. Declaration selection
is available from `@mcpdesc/core/selection` and uses the CSP-safe standalone
validator entry. Component resolution is available from
`@mcpdesc/core/components`. The root entry is also CSP-safe.

## Package verification

The repository verifies the exact tarball contents, installs that tarball into
an isolated temporary consumer, imports the public package entry points, and
executes an RC.1 projection. Run all checks with `npm run check` from the
repository root.
