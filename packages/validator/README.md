# @mcpdesc/validator

Validate parsed MCP Description documents against exact, immutable specification
snapshots. The package:

- checks document structure against the snapshot's embedded JSON Schema;
- applies semantic rules that JSON Schema alone cannot express;
- returns deterministic error and warning diagnostics with document paths; and
- runs synchronously and offline in Node.js 20+ and browser bundles.

Use it when accepting, generating, migrating, or transforming MCP Description
documents and you need to know whether the result conforms to a specific
published draft or release candidate. It validates MCP Description documents,
not live MCP servers or MCP protocol messages.

## Install

```bash
npm install @mcpdesc/validator
```

## Quick start

```js
import { validateMcpDescription } from '@mcpdesc/validator';

const result = validateMcpDescription(parsedDocument, {
  specification: '0.8.0-rc.4',
});

for (const diagnostic of result.diagnostics) {
  console.log(diagnostic.severity, diagnostic.path, diagnostic.message);
}

if (!result.valid) {
  // At least one error diagnostic was returned.
}
```

Callers provide an already parsed JavaScript value. JSON and YAML parsing, file
access, network access, and live-server inspection are outside this package.
The exact `specification` selector is required so validation never changes when
a later draft is published.

## Supported snapshots

The package supports these immutable selectors, newest first:

| Selector | First validator release | Embedded schema SHA-256 |
|---|---|---|
| `0.8.0-rc.4` | `0.11.0` | `d38e54db859813b63be2a5c91dde91250035f18bcb5910208cf71fa6875d6eef` |
| `0.8.0-rc.3` (deprecated) | `0.10.0` | `a9c3ff77ba37c72362909f538f6e957d055e6fdb372f8b3d529e3651af3fecf4` |

The validator package embeds the schema and executable behavior for each
selector. RC.3 remains available for migration compatibility; new integrations
should select RC.4. Earlier selectors remain available by pinning an older
immutable validator release. npm integrity and trusted-publishing provenance identify released
package bytes; specification repository tags and commits are informational.

Component reference resolution remains available for RC.3. RC.4 validation is
supported, but its snapshot resolver does not expose the terminal-target
provenance required by the package's public resolution result contract.

## Usage

The `options` argument and exact `specification` selector are required. The unqualified selector `0.8.0` is intentionally unsupported because draft and release-candidate iterations are immutable compatibility contracts.

### Entry points

| Entry | Strict CSP without `unsafe-eval` | Fixed MCP Description schemas | Document-provided schemas |
|---|---|---|---|
| `@mcpdesc/validator` | No | Compiled by AJV at runtime | Compiled or interpreted at runtime |
| `@mcpdesc/validator/browser` | Yes | Precompiled during package development | Interpreted at runtime |
| `@mcpdesc/validator/standalone` | Yes | Precompiled during package development | Interpreted at runtime |

Browser applications that prohibit dynamic code generation should use the descriptive CSP-safe browser entry:

```js
import { validateMcpDescription } from '@mcpdesc/validator/browser';
```

The `/browser` entry is a public alias for the existing `/standalone` implementation. `/standalone` remains supported for backward compatibility. Both have the same synchronous API, selectors, diagnostics, and offline external-reference behavior as the default entry. Fixed MCP Description schemas and JSON Schema meta-schemas are precompiled during package development; document-provided Tool and Elicitation schemas use the package's interpreted JSON Schema dependency, so neither entry uses `eval` or `new Function` or requires `unsafe-eval`. These entries are larger and slower than the default AJV-based entry and are JavaScript, not WASM.

The default entry remains unchanged and uses AJV runtime compilation. Applications that need dynamic schema compilation can use it where their runtime policy permits dynamic code generation. Importing it may fail when a browser enforces strict CSP. The package intentionally does not select a different implementation through conditional exports; consumers choose the required behavior explicitly.

## Snapshot resolution

`resolveMcpDescriptionSpecification` resolves an exact validator selector from
the document's `$schema` identity or checks a caller-supplied exact selector:

```js
import { resolveMcpDescriptionSpecification } from '@mcpdesc/validator';

const resolution = resolveMcpDescriptionSpecification(parsedDocument);
if (resolution.status === 'resolved') {
  console.log(resolution.specification, resolution.provenance);
} else {
  console.error(resolution.diagnostics);
}
```

Resolution is pure and performs no network retrieval. It does not validate the
document and never infers a draft snapshot from `mcpdesc: "0.8.0"` alone.
Retired schema identities are reported as unknown by current releases. Pin an
older package release to resolve or validate a retired selector.

Unresolved results distinguish missing, invalid, unknown, and
contradictory identity, as well as unsupported caller selectors. A supplied
selector can resolve a document with no `$schema`; when `$schema` is present it
must match the selected snapshot's recorded schema URI.

## Result

`validateMcpDescription` returns:

```ts
interface McpDescriptionValidationResult {
  valid: boolean;
  diagnostics: Array<{
    code: string;
    severity: 'error' | 'warning';
    message: string;
    path: Array<string | number>;
  }>;
}
```

`valid` is false only when at least one error diagnostic exists. Structural JSON Schema failures are emitted as individual diagnostics. Semantic diagnostics are deterministic and receive root-relative paths at their rule sites.

Structural paths start with AJV's instance path. A `required` error appends its `missingProperty`; an `additionalProperties` error appends its `additionalProperty`. This lets callers identify the absent or unexpected property directly.

## Support metadata

The package exports frozen `supportedSpecifications`, `deprecatedSpecifications`, `supportedProtocolVersions`, and `specificationProvenance` values. Provenance records include the snapshot tag, recorded schema URI, and embedded schema SHA-256 digest. Public validation dispatches through a registry keyed by exact specification selectors. The active selector set is `0.8.0-rc.3` and `0.8.0-rc.4`; `deprecatedSpecifications` contains RC.3. The protocol-version export is the deduplicated union supported by active snapshots.

The package also exports the frozen `mcpExtensionCatalogue` and
`mcpExtensionMaturity` classifier pinned by the RC.3 snapshot. The catalogue
records its authoritative source, effective date, and official or experimental
identifier assignments. Catalogue recognition establishes authority and
maturity only; it does not validate extension-specific settings.

npm package SemVer tracks implementation releases independently from specification snapshot identity. Adding a later snapshot is additive: it must use a sibling implementation and selector rather than changing an existing snapshot's schema, semantics, metadata, fixtures, or results.

The RC.3 component resolver reports authored and terminal target paths for
successful substitutions. RC.4 component resolution is unavailable because its
snapshot resolver does not expose that provenance result.

The runtime bundles its schema, performs no network fetches for external schema references, and imports no Node.js built-ins. Unresolved external Tool-schema references produce incomplete-validation warnings and are preserved. All three ESM entry points support Node.js 20 or later and browser bundlers.

## Snapshot lifecycle

For each approved specification snapshot, maintainers import artifacts from an
exact specification repository tag or commit and then:

1. Add a versioned implementation under `src/snapshots/<selector>/` with its exact selector, snapshot tag, embedded schema, schema SHA-256 digest, and semantic rules. Existing snapshot directories remain unchanged.
2. Freeze the matching fixture corpus under `test/snapshots/<selector>/fixtures/`. Package tests must not read mutable `spec/draft/fixtures/` for an already published selector.
3. Add the exact selector to the runtime registry and update support metadata, TypeScript declarations, tests, the package changelog, and expected package contents. Unqualified versions, aliases, ranges, and not-yet-published selectors remain unsupported.
4. Run the package and repository validation suites. The schema digest, immutable metadata, fixture behavior, browser bundle, declarations, and tarball contents must all pass.

The test snapshots are repository-only development assets and are excluded from the npm tarball. Historical runtime sources remain in Git for integrity history. Only active runtime snapshot implementations and embedded schemas ship, so installed packages remain self-contained without accumulating retired selectors.

Specification approval and imported supporting code do not authorize package
publication. During release review, a maintainer explicitly decides the
validator package version and npm dist-tag, reviews the exact imported source
and frozen fixture provenance, runs the full checks, and inspects the tarball.
The trusted-publishing workflow requires an annotated
`validator-v<semver>` tag whose version matches this package and whose commit is
the current `origin/main` tip. It publishes SemVer prereleases with npm `next`
and stable versions with `latest`. Scripts and other CI workflows do not choose
versions, create tags, or publish packages.

## Development checks

From the repository root:

```bash
npm test --workspace @mcpdesc/validator
npm run test:types --workspace @mcpdesc/validator
npm run test:browser --workspace @mcpdesc/validator
npm run test:package --workspace @mcpdesc/validator
```

The package test runs each active snapshot against its own frozen valid, invalid, and warning fixture corpus and verifies historical artifact integrity separately. YAML source fixtures are decoded by the test harness before validation; the public API continues to accept parsed JavaScript values only. The other checks compile the declarations, bundle the public browser entry with esbuild and Vite, reject runtime AJV compiler inputs and dynamic code generation in those bundles, and inspect `npm pack --dry-run --json` against the intended tarball contents and declared export targets.
