# Contributing

This repository is experimental while MCP Description 0.8 remains a community
working draft.

Open focused changes against one operation or public contract at a time. A
change that alters MCP Description semantics must first be grounded in the
corresponding specification snapshot and conformance fixtures. Normative changes
belong in the specification repository, not here.

Before opening a pull request, run:

```bash
npm install
npm run check
```

Do not add filesystem or network access to `@mcpdesc/core`. New dependencies
must work in Node.js 22 and browser bundles. Pull requests containing
AI-assisted content must disclose the tool and extent of assistance.
