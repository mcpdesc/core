# `@mcpdesc/core`

Experimental, side-effect-free source and semantic operations for MCP
Description documents.

The package API remains experimental and may change while MCP Description 0.8
remains a community working draft.

```ts
import {
  migrateMcpDescription07ToDraft4,
  projectEffectiveProtocolView,
} from '@mcpdesc/core';
import {
  parseMcpDescriptionSource,
  serializeMcpDescription,
} from '@mcpdesc/core/documents';
import { selectMcpDescriptionDeclarations } from '@mcpdesc/core/selection';

const parsed = parseMcpDescriptionSource(sourceText);
if (!parsed.ok) {
  console.error(parsed.diagnostics);
}

const result = projectEffectiveProtocolView(document, {
  specification: '0.8.0-draft.4',
  protocolVersion: '2026-07-28',
});

if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.diagnostics);
}

const subset = selectMcpDescriptionDeclarations(document, {
  specification: '0.8.0-draft.4',
  selections: {
    tools: ['search'],
    resources: ['docs://index'],
  },
});

const migrated = migrateMcpDescription07ToDraft4(validatedLegacyDocument, {
  specification: '0.8.0-draft.4',
  sourceValidated: true,
});
```

Draft 4 semantic operations validate their source and result with
`@mcpdesc/validator`. Declaration selection uses MCP Description identities:
tool and prompt `name`, resource `uri`, and resource template `uriTemplate`. It
preserves all selected protocol-scoped variants and omits empty declaration
collections.

Migration accepts a caller-validated MCP Description 0.7.0 value and validates
the Draft 4 result. It moves the protocol revision to root scope, wraps server
capabilities, omits optional empty arrays, and converts inline legacy security
schemes to deterministic named definitions and requirements. Generated names and
deduplication are reported as warnings for author review. The package does not
ship or duplicate the frozen 0.7.0 schema, so callers must validate that source
before setting `sourceValidated: true`.

Source parsing accepts text and returns a JSON-compatible value or structured
source diagnostics; serialization emits deterministic JSON or YAML. These
operations do not read files or streams. The package does not retrieve
references, select a transport, materialize inherited values, or claim that a
description is complete or faithful to a deployed server.

Strict-CSP browser consumers can import parsing and serialization from
`@mcpdesc/core/documents` without bundling validator code. Declaration selection
is available from `@mcpdesc/core/selection` and uses the CSP-safe standalone
validator entry. The root entry is also CSP-safe.

## Package verification

The repository verifies the exact tarball contents, installs that tarball into
an isolated temporary consumer, imports only the public package entry point, and
executes a Draft 4 projection. Run all checks with `npm run check` from the
repository root.
