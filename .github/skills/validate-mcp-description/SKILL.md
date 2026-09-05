---
name: validate-mcp-description
description: >-
  Parse and validate MCP Description (mcpdesc) YAML or JSON and report whether
  it is valid, including errors and warnings. Use when asked to check, lint,
  verify, or validate an MCP Description document supplied as a file or fenced
  code block.
argument-hint: '<document path, YAML, or JSON>'
---

# Validate MCP Description

Use the bundled [validation runner](./scripts/validate.mjs) to parse the source,
resolve its exact immutable specification snapshot, and run
`@mcpdesc/validator`.

## Procedure

1. From the repository root, ensure dependencies are installed and build the
   core parser if `packages/core/dist/documents.js` is absent:

   ```bash
   npm run build --workspace @mcpdesc/core -- --force
   ```

2. Validate a referenced file directly:

   ```bash
   node .github/skills/validate-mcp-description/scripts/validate.mjs path/to/document.yaml
   ```

3. For YAML or JSON supplied in a fenced code block, pass the exact contents to
   stdin. Do not reformat or repair the document before validation:

   ```bash
   node .github/skills/validate-mcp-description/scripts/validate.mjs --stdin --format yaml <<'MCPDESC'
   <exact fenced document contents>
   MCPDESC
   ```

   Use `--format json` for a JSON fence. Omit `--format` only when the format
   should be inferred from the content.

4. If snapshot identity is missing or ambiguous, report that finding. Only rerun
   with an exact selector when the user supplied or confirms it:

   ```bash
   node .github/skills/validate-mcp-description/scripts/validate.mjs \
     --specification 0.8.0-rc.1 path/to/document.yaml
   ```

5. Report the result as **valid** only when the runner prints `VALID` and exits
   with status 0. Include the selected snapshot and every error and warning. A
   document with warnings but no errors is valid; explain that qualification.
   Never claim to validate a live MCP server or protocol messages.

## Runner Contract

- Input is one file path or `--stdin`.
- `--format` accepts `yaml` or `json` and overrides content inference.
- `--specification` accepts an exact snapshot selector; never infer one from
  `mcpdesc: "0.8.0"` alone.
- `--json` emits a machine-readable result.
- Exit status 0 means valid, 1 means parsing, resolution, or conformance failed,
  and 2 means usage or runtime setup failed.
