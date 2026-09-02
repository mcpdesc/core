# Contributing

This repository is experimental while MCP Description 0.8 remains a community
working draft.

Open focused changes against one operation or public contract at a time. A
change that alters MCP Description semantics must first be grounded in the
corresponding specification snapshot and conformance fixtures. Normative changes
belong in the specification repository, not here.

Before opening a pull request, run:

```bash
npm ci
npm run check
```

Do not add filesystem or network access to `@mcpdesc/core`. New core
dependencies must work in Node.js 22 and browser bundles.

Validator changes must preserve Node.js 20 support, deterministic offline
validation, and strict-CSP behavior. Never modify an existing published snapshot
directory. A later approved specification snapshot is added as a sibling with
exact source, schema digest, semantic, and fixture provenance.

Pull requests containing AI-assisted content must disclose the tool and extent
of assistance. Releases follow the maintainer-controlled process in
[RELEASING.md](RELEASING.md).
