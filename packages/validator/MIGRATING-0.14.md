# Migrating to `@mcpdesc/validator` 0.14

Validator 0.14 adopts MCP Description `0.9.0-rc.3` as the default selector for
`mcpdesc: "0.9.0"`.

## Acceptance change

RC.3 rejects unknown members on Elicitation Interaction Response Objects in
Tool Interaction Examples. This concerns description-document validation and
does not change native MCP runtime responses.

## Diagnostic changes

RC.3 uses validation-result format `1.4.0`. Diagnostics may have different
paths, counts, rule attribution, and rule results than RC.2:

- A missing member points to its enclosing object; `detail.member` identifies
  the missing name.
- An unexpected member points to the member present in the source.
- Findings reached through `$componentRef` point to the reference use site and
  include the component definition in `relatedLocations`.
- `detail` provides factual, machine-readable diagnostic information for
  schema-derived findings.

Render recognized `detail.kind` values, navigate primary and related paths,
and fall back to `message` for unknown kinds or findings without detail. Do not
rely on message wording, raw engine paths, diagnostic order, or fixed error
counts.

Rule results distinguish `passed`, `failed`, `warning`, `not-applicable`,
`not-evaluated`, and `delegated`. Only error-severity diagnostics determine
document validity; warning diagnostics and rule statuses do not independently
make a document invalid.

## Retired selectors

The current package keeps only `0.8.0-rev.20261021`, `0.8.0`, and
`0.9.0-rc.3`. Earlier drafts and release candidates, including RC.2, are no
longer shipped or accepted as explicit pins. Applications that need their exact
historical results must use the earlier validator package release that shipped
those selectors.

An unrecognized or retired explicit selector now fails with
`Unsupported MCP Description selector`.

## Pinning the retained RC.3 selector

Pin RC.3 when exact current results are required:

```js
const result = validateMcpDescription(document, {
  selector: '0.9.0-rc.3'
});
```
