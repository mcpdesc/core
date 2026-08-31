# MCP Description tooling

Experimental shared tooling for MCP Description consumers.

The repository currently contains one package:

- `@mcpdesc/core`: pure semantic operations over parsed MCP Description values.

The first supported operation projects an MCP Description `0.8.0-draft.4`
document to one Effective Protocol View. The package validates both the source
and projected document with `@mcpdesc/validator`, performs no network or file
access, retains components, and supports Node.js 22 or later and browser
bundlers.

APIs remain experimental while MCP Description 0.8 is a community working draft.
npm package versions, MCP Description versions, immutable snapshot selectors,
schema identities, and MCP protocol revisions are separate version axes.

See [CHANGELOG.md](CHANGELOG.md) for delivered behavior and
[ROADMAP.md](ROADMAP.md) for the staged next steps and deferred decisions.

## Development

```bash
npm install
npm run check
```
