# Migrating to `@mcpdesc/validator` 0.14

Validator 0.14 adopts MCP Description `0.9.0-rc.3` as the default selector for
`mcpdesc: "0.9.0"`. To keep RC.2 validation behavior, pin
`selector: '0.9.0-rc.2'`.

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

The RC.2 selector remains available for applications requiring exact prior
results:

```js
const result = validateMcpDescription(document, {
  selector: '0.9.0-rc.2'
});
```
