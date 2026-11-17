# Migrating to `@mcpdesc/validator` 0.14

Validator 0.14 adopts stable MCP Description `0.9.0` as the default selector for
`mcpdesc: "0.9.0"`. The deprecated `0.9.0-rc.3` selector remains available for
explicit reproducibility.

## Acceptance change

Stable 0.9.0 rejects unknown members on Elicitation Interaction Response
Objects in Tool Interaction Examples. This concerns description-document
validation and does not change native MCP runtime responses.

## Diagnostic changes

Stable 0.9.0 uses validation-result format `1.4.0`. Diagnostics may have
different paths, counts, rule attribution, and rule results than RC.3:

- A missing member points to its enclosing object; `detail.member` identifies
  the missing name.
- An unexpected member points to the member present in the source.
- Findings reached through `$componentRef` point to the reference use site and
  include the component definition in `relatedLocations`.
- `detail` provides factual, machine-readable diagnostic information for
  schema-derived findings.
- Final terminology changes rule identifier
  `mcpdesc.extensions.catalogue-maturity` to
  `mcpdesc.extensions.catalog-maturity` and warning code
  `uncatalogued-oauth-scope` to `uncataloged-oauth-scope`.

Render recognized `detail.kind` values, navigate primary and related paths,
and fall back to `message` for unknown kinds or findings without detail. Do not
rely on message wording, raw engine paths, diagnostic order, or fixed error
counts.

Rule results distinguish `passed`, `failed`, `warning`, `not-applicable`,
`not-evaluated`, and `delegated`. Only error-severity diagnostics determine
document validity; warning diagnostics and rule statuses do not independently
make a document invalid.

## Retired selectors

The current package keeps `0.8.0-rev.20261021`, `0.8.0`, stable `0.9.0`, and
deprecated `0.9.0-rc.3`. Earlier drafts and release candidates, including RC.2,
are no longer shipped or accepted as explicit pins. Applications that need
their exact historical results must use the earlier validator package release
that shipped those selectors.

An unrecognized or retired explicit selector now fails with
`Unsupported MCP Description selector`.

## Pinning the deprecated RC.3 selector

Pin RC.3 when exact current results are required:

```js
const result = validateMcpDescription(document, {
  selector: '0.9.0-rc.3'
});
```
