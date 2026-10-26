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

`npm run check` runs formatting, type checks, both packages' tests, builds,
strict-CSP browser bundle checks, tarball content checks, and an isolated
consumer install of the packed tarballs.

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
