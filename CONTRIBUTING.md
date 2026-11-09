# Contributing

This repository publishes two packages, tested for MCP Description v0.8. For
using them, see the [root README](README.md) and the package READMEs. This guide
is for changing them.

Open focused changes against one operation or public contract at a time. A
change that alters MCP Description semantics must first be grounded in the
corresponding specification snapshot and conformance fixtures. Normative changes
belong in the specification repository, not here.

Before opening a pull request, run:

```bash
npm ci
npm run check
```

`npm run check` runs formatting, YAML sequence-style checks, type checks, both
packages' tests, builds, README example type checks, strict-CSP browser bundle
checks, tarball content checks, and an isolated consumer install of the packed
tarballs.

`npm run check:readme` extracts the TypeScript and JavaScript code blocks from
the three READMEs and typechecks them against the built packages; it declares
common placeholders such as `document` and `yamlText`. Keep README examples
compiling when public APIs change.

### YAML presentation

Use two spaces for indentation and indent block sequences two spaces beyond
their mapping key, including nested sequences. Flow sequences such as `[query]`
and empty arrays `[]` remain permitted. This is a tooling presentation
convention, not a validator conformance rule.

`npm run check:yaml-style` checks tracked and non-ignored untracked YAML files,
YAML Markdown fences, and valid YAML string literals in JavaScript/TypeScript
and their Markdown examples. It also checks mutable validator files even though
Prettier excludes that package. Malformed parser-test literals are exempt; mark
the statement defining a deliberately non-preferred valid input with
`// yaml-style: intentional-input`. The style checker's own negative tests are
also exempt. Interpolated templates are not parsed as complete YAML documents.

Never reformat imported examples or frozen fixtures under validator
`src/snapshots/` or `test/snapshots/`; those trees are excluded from the style
check and remain protected by snapshot integrity checks. Review YAML
presentation in the upstream source before future exports and imports. The
importer preserves reviewed artifact bytes rather than applying local
formatting.

Use core's `serializeMcpDescription(value, { format: 'yaml' })` for YAML output
after migration, conversion, projection, merge, or selection. It explicitly uses
two-space indentation and indented sequences under every key-order policy. Do
not introduce separate serializers in command utilities.

To smoke-test real documents, point the opt-in example test at one or more
folders; it recurses into each and never modifies the files:

```bash
npm run test:examples --workspace @mcpdesc/core -- path/to/examples/features
npm run test:examples --workspace @mcpdesc/core -- --as-draft path/to/examples/vendors
```

It validates every JSON/YAML document with the runtime and standalone validators
and checks Effective Protocol Views. `--as-draft` also tests an in-memory copy
with only `mcpdesc` and `$schema` changed to 0.9 Draft 1, including native
projection of every declaration; it is a compatibility rehearsal, not a
migration. Routine CI does not depend on external example repositories.

Focused validator checks, from the repository root:

```bash
npm test --workspace @mcpdesc/validator
npm run test:types --workspace @mcpdesc/validator
npm run test:browser --workspace @mcpdesc/validator
npm run test:package --workspace @mcpdesc/validator
```

The validator tests run each active selector against its own frozen valid,
invalid, and warning fixtures and verify snapshot integrity. The other checks
compile declarations, bundle the browser entry with esbuild and Vite, reject
dynamic code generation, and compare `npm pack --dry-run --json` with the
intended tarball contents.

Package READMEs ship in npm tarballs: write them for library users, and link to
repository files with absolute GitHub URLs so links work on npmjs.com.

Do not add filesystem or network access to `@mcpdesc/core`. New core
dependencies must work in Node.js 22 and browser bundles.

Validator changes must preserve Node.js 20 support, deterministic offline
validation, and strict-CSP behavior. Never modify an existing published snapshot
directory. A later approved specification snapshot is added as a sibling with an
exact schema digest, reviewed semantic implementation, and frozen fixtures.
Upstream repository tags and commits are informational provenance.

Pull requests containing AI-assisted content must disclose the tool and extent
of assistance. Releases follow the maintainer-controlled process in
[RELEASING.md](RELEASING.md).
