# MCP Description tooling

Experimental shared tooling for MCP Description consumers.

The repository currently contains one package:

- `@mcpdesc/core`: pure source and semantic operations for MCP Description
  documents.

The package parses and serializes JSON or YAML source text, migrates validated
MCP Description 0.7.0 values to exact Draft 4 or RC.1 snapshots with stable
conversion reports, projects a document to one Effective Protocol View, and
selects declaration subsets by normative identity. All operations perform no
network or file access and support Node.js 22 or later and browser bundlers.

APIs remain experimental while MCP Description 0.8 is a community working draft.
npm package versions, MCP Description versions, immutable snapshot selectors,
schema identities, and MCP protocol revisions are separate version axes.

See [CHANGELOG.md](CHANGELOG.md) for delivered behavior and
[ROADMAP.md](ROADMAP.md) for the staged next steps and deferred decisions. See
[RELEASING.md](RELEASING.md) for the maintainer-controlled release process.

## Development

```bash
npm install
npm run check
```
