# Proposal: per-call schema selector policy

**Status:** implemented

## Summary

Add per-call controls to `validateMcpDescription` so downstream consumers can
choose how a document's `$schema` affects selector resolution without changing
the validator's configured defaults. Callers can opt into resolving a selector
from `$schema` and decide whether a known selector that is not shipped by the
current validator release should fail or fall back to the configured default.

This lets embedding libraries expose a policy appropriate to their own consumers
while retaining the validator's existing behavior for callers that do not opt
in.

Options:

```ts
interface ValidateMcpDescriptionOptions {
  selector?: McpDescriptionSelector;
  schemaPolicyIfPresent?: boolean;
  fallbackIfSelectorIsUnknown?: boolean;
}
```

The option name `fallbackIfSelectorIsUnknown` avoids the typo in its original
working name, `fallbackIfbehaviorIfSelectorIsUnknown`.

## Motivation

The validator has maintainer-configured defaults per MCP Description format.
Those defaults are useful and should remain the default behavior. However, a
caller may be validating a document whose `$schema` identifies a particular
release-candidate or draft selector and want to honor that identity when the
validator has the corresponding snapshot.

For example, the current `0.9.0` default can be RC.3 while a document declares
the RC.1 schema URI. With the current configuration (`schemaPins: false`), the
validator chooses RC.3. An embedding application may instead opt into using the
recognized schema identity, without changing the validator package's default for
all callers.

This is especially useful for release candidates, which may remain available
across validator releases for compatibility testing. Draft selectors are more
likely to be removed from a final validator package, so an opting-in caller also
needs a defined outcome when a schema identifies a selector whose implementation
is unavailable.

## Behavior

The options control per-call resolution; they do not alter the validator's
maintainer configuration.

1. **Explicit `selector` takes precedence.** Preserve the current explicit
   selector behavior; the new options do not override it or change its existing
   consistency and validation semantics.
2. **`schemaPolicyIfPresent` defaults to `false`.** When false or omitted,
   preserve the existing configured behavior exactly, including the format's
   configured `defaultSelector` and `schemaPins` setting.
3. **When `schemaPolicyIfPresent` is `true` and `$schema` is absent**, preserve
   the existing configured default behavior. There is no schema identity to use.
4. **When it is `true` and `$schema` uniquely identifies a selector shipped by
   this validator**, use that selector, after confirming it matches the
   document's `mcpdesc` format version.
5. **When it is `true` and `$schema` uniquely identifies a selector known to
   validator metadata but not shipped by this release**, apply
   `fallbackIfSelectorIsUnknown`:
   - `false` or omitted: return an unresolved validation result with an
     `unsupported-selector` diagnostic.
   - `true`: use the configured default selector for the document's `mcpdesc`
     format version. If that format has no configured default, return an
     `unsupported-format-version` diagnostic instead.
6. **An unknown or ambiguous `$schema` identity is not a known unsupported
   selector.** Return the existing `unknown-schema-identity` or
   `ambiguous-schema-identity` diagnostic rather than silently using a fallback.
   The fallback is only for a recognized schema identity that maps unambiguously
   to a selector the package does not ship.
7. **Contradictory document identities remain errors.** If the schema identity
   and `mcpdesc` format disagree, do not fallback to another selector.

Both boolean options default to `false`, preserving current behavior for
existing callers. `fallbackIfSelectorIsUnknown` is meaningful only when
`schemaPolicyIfPresent` is `true`.

## Resolution examples

Assume `0.9.0` defaults to RC.3:

| Call options                                                     | Document identity                                       | Expected selector or result                          |
| ---------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| no new options                                                   | `mcpdesc: 0.9.0`, RC.1 `$schema`                        | RC.3 under the existing configuration                |
| `schemaPolicyIfPresent: true`                                    | `mcpdesc: 0.9.0`, RC.1 `$schema`, RC.1 shipped          | RC.1                                                 |
| `schemaPolicyIfPresent: true`                                    | `mcpdesc: 0.9.0`, no `$schema`                          | configured default, RC.3                             |
| `schemaPolicyIfPresent: true`, fallback omitted                  | known draft `$schema`, draft not shipped                | unresolved with `unsupported-selector`               |
| `schemaPolicyIfPresent: true, fallbackIfSelectorIsUnknown: true` | known draft `$schema`, draft not shipped                | configured default, RC.3                             |
| `selector: '0.9.0-rc.1'`                                         | matching `mcpdesc`, any otherwise valid schema identity | RC.1, because the explicit selector takes precedence |
| `schemaPolicyIfPresent: true, fallbackIfSelectorIsUnknown: true` | unrecognized `$schema`                                  | unresolved with `unknown-schema-identity`            |

## Why use two options

These are separate decisions:

- `schemaPolicyIfPresent` opts in to using document schema identity rather than
  relying only on the configured policy.
- `fallbackIfSelectorIsUnknown` chooses whether a _recognized but unavailable_
  selector is an error or may use the format's configured default.

Combining them would make it impossible for callers to opt into schema selection
while still requiring exact snapshot support. Keeping fallback disabled by
default also avoids silently validating with different rules than the document
requested.

## Compatibility and API requirements

- Calls that omit both options retain their current result and selector.
- The new options are call-time policy only; they must not mutate
  `validatorConfiguration`, generated selector metadata, or defaults for other
  calls.
- The selected selector returned in the validation result must be the selector
  actually used, including when fallback occurs.
- An unresolved result must return `selector: null` and must not run a different
  snapshot behind an error-shaped result.
- Preserve existing explicit-selector behavior. Validate both new options as
  booleans and apply the new resolution policy only when no explicit selector is
  supplied.
- Keep the resolution behavior consistent across the Node, browser, and
  standalone entry points.

## Test coverage

Coverage includes focused tests for:

- omitted options preserving configured defaults and current `schemaPins`
  behavior;
- opt-in selection of a shipped selector from a recognized schema URI;
- no schema identity continuing to use the configured default;
- a recognized, unavailable selector failing by default;
- opt-in fallback selecting the configured default and reporting that selector;
- fallback failing clearly when the format has no configured default;
- unknown and ambiguous schema identities remaining errors even when fallback is
  enabled;
- contradictory `mcpdesc` and schema identities remaining errors;
- explicit `selector` precedence and consistency across package entry points.

## Implementation note

The validator already has a configuration-time `schemaPins` policy and metadata
that associates schema URIs with selector history. The per-call policy is
implemented over resolution, reusing the existing resolution registry and
preserving its identity checks. It does not reinterpret arbitrary external
`$schema` URIs as selectors, infer selectors by sorting versions, or change the
configured default.
