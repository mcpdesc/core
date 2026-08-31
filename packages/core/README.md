# `@mcpdesc/core`

Experimental, side-effect-free semantic operations for parsed MCP Description
documents.

Version `0.1.0` is the first experimental package boundary. Its API may change
while MCP Description 0.8 remains a community working draft.

```ts
import { projectEffectiveProtocolView } from '@mcpdesc/core';

const result = projectEffectiveProtocolView(document, {
  specification: '0.8.0-draft.4',
  protocolVersion: '2026-07-28',
});

if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.diagnostics);
}
```

Projection validates its source and result with `@mcpdesc/validator`. It does
not parse source text, retrieve references, select a transport, materialize
inherited values, or claim that the description is complete or faithful to a
deployed server.

## Package verification

The repository verifies the exact tarball contents, installs that tarball into
an isolated temporary consumer, imports only the public package entry point, and
executes a Draft 4 projection. Run all checks with `npm run check` from the
repository root.
