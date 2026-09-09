# MCP Description tooling

Experimental shared tooling for MCP Description consumers.

The repository contains two independently versioned packages:

- `@mcpdesc/core`: pure source and semantic operations for MCP Description
  documents.
- `@mcpdesc/validator`: structural and semantic validation for exact immutable
  MCP Description snapshots, including strict-CSP browser entry points.

The core package parses and serializes JSON or YAML source text, migrates
validated MCP Description 0.7.0 values to stable `0.8.0` with deterministic
conversion reports, projects and merges Effective Protocol Views, selects
declaration subsets by normative identity, and resolves component references.
RC.4 remains operational but is deprecated during migration to stable `0.8.0`.
Validator snapshots provide the conformance authority for those operations.
Published package operations perform no network or file access and support
browser bundlers.

APIs remain experimental while MCP Description 0.8 is a community working draft.
npm package versions, MCP Description versions, immutable snapshot selectors,
schema identities, and MCP protocol revisions are separate version axes.

See the [package changelog index](CHANGELOG.md) for delivered behavior and
[ROADMAP.md](ROADMAP.md) for the staged next steps and deferred decisions. See
[RELEASING.md](RELEASING.md) for the maintainer-controlled release process.

## Development

```bash
npm install
npm run check
```
