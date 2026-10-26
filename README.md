# MCP Description tooling

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![mcpdesc: 0.8](https://img.shields.io/badge/mcpdesc-0.8-blue.svg)](https://mcpdesc.org)
[![@mcpdesc/core](https://img.shields.io/npm/v/@mcpdesc/core.svg?label=%40mcpdesc%2Fcore)](https://www.npmjs.com/package/@mcpdesc/core)
[![@mcpdesc/validator](https://img.shields.io/npm/v/@mcpdesc/validator.svg?label=%40mcpdesc%2Fvalidator)](https://www.npmjs.com/package/@mcpdesc/validator)

JavaScript and TypeScript libraries for working with
[MCP Description](https://mcpdesc.org) documents: machine-readable descriptions
of an MCP server's tools, resources, prompts, transports, and capabilities.

Tested for MCP Description v0.8. Both libraries run offline in Node.js and in
browser bundles, including pages with a strict Content Security Policy.

## Which package do I need?

| I want to…                                                                      | Use                                                             |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Check that a document is valid and get errors and warnings with document paths  | [`@mcpdesc/validator`](packages/validator/README.md)            |
| Parse or write JSON/YAML, project a protocol view, select, merge, migrate 0.7.0 | [`@mcpdesc/core`](packages/core/README.md)                      |
| Both                                                                            | `@mcpdesc/core`; it depends on and validates with the validator |

```bash
npm install @mcpdesc/validator   # validation only
npm install @mcpdesc/core        # document operations (includes the validator)
```

## Quick start

Parse a YAML document, validate it, and project the view a client using MCP
`2026-07-28` would see:

```ts
import { parseMcpDescriptionSource } from '@mcpdesc/core/documents';
import { projectEffectiveProtocolView } from '@mcpdesc/core';
import { validateMcpDescription } from '@mcpdesc/validator';

const parsed = parseMcpDescriptionSource(`
mcpdesc: 0.8.0
info:
  name: weather
  version: 1.0.0
protocolVersions: ['2025-11-25', '2026-07-28']
transports:
  - type: stdio
    command: weather-server
tools:
  - name: get_forecast
    description: Get the forecast for a city.
    inputSchema:
      type: object
      properties:
        city: { type: string }
      required: [city]
`);
if (!parsed.ok) throw new Error(parsed.diagnostics[0].message);

const validation = validateMcpDescription(parsed.value);
console.log(validation.valid, validation.diagnostics);

const view = projectEffectiveProtocolView(parsed.value, {
  protocolVersion: '2026-07-28',
});
if (view.ok) console.log(view.value.tools);
```

## Key concepts

Several independent version numbers appear in these libraries:

| Concept                        | Example                       | Meaning                                                            |
| ------------------------------ | ----------------------------- | ------------------------------------------------------------------ |
| MCP Description format version | `mcpdesc: "0.8.0"`            | The document format, declared in the document.                     |
| Selector                       | `0.8.0`, `0.8.0-rev.20261021` | One exact, immutable set of validation rules for a format version. |
| MCP protocol revision          | `2025-11-25`, `2026-07-28`    | An MCP protocol version that the described server supports.        |
| npm package version            | `@mcpdesc/validator@0.13.1`   | A library release; it may support several selectors.               |

Both packages choose the default selector for the document's `mcpdesc` value, so
documents benefit from validator corrections when you upgrade. Pass a selector
explicitly to pin exact rules. See the
[terminology guide](docs/validator-terminology.md) for details.

## Compatibility

| Package                       | Supported selectors                                                               | Runtime     |
| ----------------------------- | --------------------------------------------------------------------------------- | ----------- |
| `@mcpdesc/validator` `0.13.x` | `0.8.0-rev.20261021` (default for `0.8.0`); `0.8.0` and `0.8.0-rc.4` (deprecated) | Node.js 20+ |
| `@mcpdesc/core` `0.12.x`      | Same selectors and defaults; pins `@mcpdesc/validator` `0.13.1`                   | Node.js 22+ |

Older drafts and release candidates remain available from earlier package
releases. npm versions are below `1.0.0`: a minor release may contain breaking
changes, which the package changelogs describe together with upgrade guidance.

## Documentation

- [`@mcpdesc/validator` README](packages/validator/README.md) and
  [changelog](packages/validator/CHANGELOG.md)
- [`@mcpdesc/core` README](packages/core/README.md) and
  [changelog](packages/core/CHANGELOG.md)
- [Validator terminology](docs/validator-terminology.md)
- [MCP Description specification](https://github.com/mcpdesc/mcpdesc-specification)

## Contributing and maintaining

This repository hosts both packages as npm workspaces:

```bash
npm install
npm run check
```

- [CONTRIBUTING.md](CONTRIBUTING.md): development setup, checks, and pull
  request expectations.
- [Validator maintainer guide](docs/validator-maintainer-guide.md): importing,
  testing, and retiring validator snapshots.
- [RELEASING.md](RELEASING.md): the maintainer-controlled release process.
- [Repository changelog](CHANGELOG.md) and [roadmap](ROADMAP.md).

## License

[Apache-2.0](LICENSE). See [NOTICE](NOTICE) and [ORIGIN.md](ORIGIN.md).
