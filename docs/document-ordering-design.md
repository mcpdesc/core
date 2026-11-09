# Document-oriented serialization ordering

**Status:** implemented in core as the opt-in `document` policy alongside
`preserve` (the default) and `sorted`. It follows the maintainer-approved
proposed specification Section 18, planned for 0.9.0 RC.2 or a later release and
the final 0.9.0 release. That future specification has not been imported as a
validator snapshot. This policy does not change MCP Description conformance
rules.

Native MCP projection also supports opt-in `keyOrder: 'document'`, with
`preserve` as its default. This native subset is a maintainer-approved core
presentation convention, not an MCP wire-order requirement or an imported
specification rule.

## Purpose and scope

Document-oriented ordering presents familiar fields together in a predictable,
human-readable sequence. It is not alphabetical sorting, canonical JSON,
semantic normalization, source-preserving editing, or a conversion operation.

The core API is:

```ts
serializeMcpDescription(value, {
  format: 'yaml',
  keyOrder: 'document',
});
```

Routine editing and conversion should continue to use the `preserve` default. An
explicit editor or CLI organization command can choose `document`. Callers
requiring recursively sorted output can choose `sorted`.

The specification profile owns the presentation sequences; core owns their
implementation. Validator remains responsible for conformance, without an
ordering option, new diagnostic, or modified snapshot. The maintainer-approved
proposed profile is available explicitly ahead of its specification release; it
does not imply support for a future selector.

## Schema basis

The field inventory below comes from the embedded
[RC.3 schema](../packages/validator/src/snapshots/0.9.0-rc.3/schema.json).
Sequences come from the supplied proposed specification Section 18, not that
schema. Once published, the specification section is the source of truth for
this presentation profile. Schema source property order, examples, and
implementation constants do not override the specification sequences.

The inventory was also compared with the retained selectors `0.8.0`,
`0.8.0-rev.20261021`, and `0.9.0-rc.3`. Their fixed-field structures fit the
same tables, with these qualifications:

- The 0.8 selectors do not declare `_meta` on elicitation responses, root
  declarations, roots-list results, or sampling results. Do not treat `_meta` as
  a known field at those locations for those selectors.
- Earlier Tool input-schema alternatives and later schema restrictions differ.
  All embedded schemas remain opaque to this ordering policy regardless of those
  differences.
- A table entry never authorizes a field or adds one. Use only fields present in
  the supplied value and known at that location for the applicable format and
  selector. Snapshot-specific validity still belongs to validator.

Core recognizes the root `mcpdesc` value directly: `0.8.0` and `0.9.0` use these
tables; missing or other versions leave the entire input order unchanged. The
known field inventory is the same across current selectors within each format,
so this presentation option needs no selector resolution or selector option. It
does not widen `SupportedCoreSpecification` or change the selector-sensitive
operation matrix. Inventory tests check every currently embedded selector.

Future selector adoption must explicitly review these tables. If a selector
introduces a different field inventory within a format, resolve that difference
and any selector-sensitive support-contract implications before extending the
profile. Never infer the latest selector by sorting selector names.

## Ordering algorithm

At a recognized fixed-field object, emit present known fields in the listed
left-to-right order, then emit unlisted fields in their existing relative order.
Missing fields are skipped. Never create defaults or empty sections.

Apply the appropriate rule to recognized child objects. Preserve the order of
every array while visiting eligible elements. Preserve entry order in named maps
while visiting values whose structure is explicitly known.

Use the document path, owning structure, and union discriminator together to
identify a rule. Do not classify an arbitrary object by matching names such as
`name`, `type`, `properties`, or `description`. For an unknown object, unknown
variant, malformed container, or opaque subtree, preserve its entire existing
order; do not guess a rule or fall back to alphabetical sorting.

An invalid document is not repaired, validated, filtered, or silently converted
by serialization. Ordering must not resolve component references, expand aliases
semantically, deduplicate values, or replace inline objects with refs.

All sequences below apply to JSON and YAML equally. Neither format provides
additional semantics for object member order.

## Root document

| Structure            | Field sequence                                                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP Description root | `$schema`, `mcpdesc`, `info`, `instructions`, `protocolVersions`, `transports`, `securitySchemes`, `security`, `capabilities`, `tools`, `resources`, `resourceTemplates`, `prompts`, `tags`, `components` |

The header identifies the format first. Server identity and instructions precede
connectivity. Security definitions precede their default requirements.
Capability flags precede concrete declarations. Tag definitions and reusable
components follow the primary server description. Unknown fields and `x-`
extensions follow `components`, retaining their relative order.

This is the order of root properties only. It never sorts tools, resources,
prompts, transports, tags, or capability entries within their arrays.

## Identity and shared presentation fields

| Structure                              | Field sequence                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `info`                                 | `name`, `title`, `version`, `id`, `description`, `icons`, `websiteUrl`, `contact`, `license` |
| `info.contact`                         | `name`, `url`, `email`                                                                       |
| `info.license`                         | `name`, `url`                                                                                |
| Icon entry wherever icons are declared | `src`, `mimeType`, `sizes`, `theme`                                                          |
| Root tag definition                    | `name`, `description`                                                                        |

Preserve the order of icon and icon-size arrays. A declaration's `tags` array
contains names, not tag-definition objects, and retains its exact sequence.

## Transports and security

| Structure                                            | Field sequence                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| HTTP transport, including the schema's HTTP variants | `type`, `url`, `protocolVersions`, `security`                    |
| Stdio transport                                      | `type`, `command`, `args`, `env`, `protocolVersions`, `security` |
| HTTP security scheme                                 | `type`, `scheme`, `bearerFormat`, `description`                  |
| API-key security scheme                              | `type`, `in`, `name`, `description`                              |
| OAuth 2 security scheme                              | `type`, `description`, `flows`                                   |
| OpenID Connect security scheme                       | `type`, `description`, `openIdConnectUrl`                        |
| OAuth `flows`                                        | `authorizationCode`, `clientCredentials`, `implicit`, `password` |
| OAuth flow                                           | `authorizationUrl`, `tokenUrl`, `refreshUrl`, `scopes`           |

`securitySchemes` is a named map: preserve scheme-name order and organize only
recognized scheme values. Stdio `env` is an environment-variable map and is
opaque. OAuth `scopes` is a scope-name-to-description map and retains entry
order.

Every `security` array retains its exact order. Each requirement object maps
scheme names to scope arrays; preserve both the object entry order and scope
array order. Never sort alternatives, merge requirements, expand an empty
requirement, or collapse an empty security array.

## Server and client capabilities

| Structure                        | Field sequence                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Entry in root `capabilities`     | `protocolVersions`, `tools`, `resources`, `prompts`, `logging`, `completions`, `tasks`, `extensions`, `experimental` |
| Server tool capability           | `listChanged`                                                                                                        |
| Server resource capability       | `subscribe`, `listChanged`                                                                                           |
| Server prompt capability         | `listChanged`                                                                                                        |
| Server task capability           | `list`, `cancel`, `requests`                                                                                         |
| Task `requests`                  | `tools`                                                                                                              |
| Task `requests.tools`            | `call`                                                                                                               |
| Declaration `clientRequirements` | `roots`, `sampling`, `elicitation`, `tasks`, `extensions`, `experimental`                                            |

`logging`, `completions`, server `experimental`, task `list`, task `cancel`, and
task `requests.tools.call` have open payload objects. Preserve them in full. An
empty object remains empty; never synthesize capability flags.

Client requirement values are open objects. Preserve those values recursively;
do not interpret their keys as server capability fields or convert them to
flags. Client `experimental` is a named map of such values and is also
preserved. Both server and client `extensions` are extension-identifier maps
with opaque values. Preserve identifiers, their ordering, and all nested payload
ordering.

## Concrete capability declarations

The common progression is identity, documentation, protocol scope, primary
contract, behavior, dependencies, examples, and metadata. Exact per-kind lists
avoid inventing fields on kinds that do not support them.

| Structure                                                 | Field sequence                                                                                                                                                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tool                                                      | `name`, `title`, `description`, `icons`, `tags`, `deprecated`, `protocolVersions`, `inputSchema`, `outputSchema`, `annotations`, `execution`, `security`, `clientRequirements`, `elicitations`, `examples`, `interactionExamples`, `_meta` |
| Resource                                                  | `uri`, `name`, `title`, `description`, `icons`, `tags`, `deprecated`, `protocolVersions`, `mimeType`, `size`, `annotations`, `security`, `clientRequirements`, `elicitations`, `examples`, `_meta`                                         |
| Resource template                                         | `uriTemplate`, `name`, `title`, `description`, `icons`, `tags`, `deprecated`, `protocolVersions`, `mimeType`, `annotations`, `security`, `clientRequirements`, `elicitations`, `examples`, `completionExamples`, `_meta`                   |
| Prompt                                                    | `name`, `title`, `description`, `icons`, `tags`, `deprecated`, `protocolVersions`, `arguments`, `security`, `clientRequirements`, `elicitations`, `examples`, `completionExamples`, `_meta`                                                |
| Prompt argument                                           | `name`, `title`, `description`, `required`                                                                                                                                                                                                 |
| Tool annotations                                          | `title`, `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`                                                                                                                                                              |
| Resource annotations, including content-block annotations | `audience`, `priority`, `lastModified`                                                                                                                                                                                                     |
| Tool `execution`                                          | `taskSupport`                                                                                                                                                                                                                              |

Preserve `inputSchema` and `outputSchema` completely, including their property
maps, keyword order, and nested arrays. Preserve `_meta` completely. Annotation
rules apply only at recognized annotation locations, not arbitrary objects
called `annotations` inside schemas or application payloads.

## Elicitation declarations

| Structure               | Field sequence                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| Elicitation declaration | `name`, `mode`, `message`, `protocolVersions`, `when`, `requestedSchema`, `url`, `onDecline`, `onCancel` |

Preserve the order of the declaration array. Mode selects the appropriate shape;
ordering never changes it or supplies a missing discriminator.

`requestedSchema` is an opaque schema boundary, even though the specification
defines a restricted elicitation schema vocabulary. This includes the known
form-schema fields `$schema`, `type`, `properties`, and `required`; property
fields `type`, `title`, `description`, `default`, `format`, `minLength`,
`maxLength`, `minimum`, `maximum`, `enum`, `enumNames`, `oneOf`, `items`,
`minItems`, and `maxItems`; enum-option `const` and `title`; and item `type`,
`enum`, or `anyOf` structures. Preserve `additionalProperties` and its nested
property-schema structure as well. None receives an ordering rule. Preserve
parallel arrays such as `enum` and `enumNames` exactly.

## Examples and their fixed envelopes

Example names are authored identifiers, not fields with a preferred order.
Preserve entry order in `examples`, `completionExamples`, and
`interactionExamples` maps. Apply the following rules only to recognized example
envelopes and protocol-defined objects within them, never arbitrary application
input or output.

| Structure                       | Field sequence                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| Tool example                    | `input`, `result`                                                                                  |
| Resource example                | `result`                                                                                           |
| Resource-template example       | `uri`, `result`                                                                                    |
| Prompt example                  | `arguments`, `result`                                                                              |
| Completion example              | `argument`, `context`, `result`                                                                    |
| Completion argument             | `name`, `value`                                                                                    |
| Completion context              | `arguments`                                                                                        |
| Completion result               | `values`, `total`, `hasMore`                                                                       |
| Completed tool result           | `resultType`, `isError`, `content`, `structuredContent`, `_meta`                                   |
| Completed resource-read result  | `resultType`, `contents`, `cacheScope`, `ttlMs`, `_meta`                                           |
| Completed prompt result         | `resultType`, `description`, `messages`, `_meta`                                                   |
| Completed completion result     | `resultType`, `completion`, `_meta`                                                                |
| Prompt message                  | `role`, `content`                                                                                  |
| Resource text contents          | `uri`, `mimeType`, `text`, `_meta`                                                                 |
| Resource blob contents          | `uri`, `mimeType`, `blob`, `_meta`                                                                 |
| Text content block              | `type`, `text`, `annotations`, `_meta`                                                             |
| Image or audio content block    | `type`, `mimeType`, `data`, `annotations`, `_meta`                                                 |
| Embedded-resource content block | `type`, `resource`, `annotations`, `_meta`                                                         |
| Resource-link content block     | `type`, `uri`, `name`, `title`, `description`, `icons`, `mimeType`, `size`, `annotations`, `_meta` |

Tool example `input`, result `structuredContent`, prompt example `arguments`,
and completion context `arguments` are application-owned payloads or argument
maps: preserve them recursively. Keep content, messages, resource contents,
completion values, and all other arrays in their original order.

String payloads such as `text`, `blob`, and `data` are never parsed,
reformatted, decoded, or interpreted as nested documents. Unknown result or
content variants remain untouched, including their nested objects.

## Interaction examples

| Structure                                  | Field sequence                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tool interaction example                   | `input`, `steps`, `result`                                                                                                                       |
| Elicitation step                           | `type`, `declaration`, `request`, `response`                                                                                                     |
| Roots or sampling step                     | `type`, `request`, `response`                                                                                                                    |
| Form elicitation request                   | `mode`, `message`, `requestedSchema`                                                                                                             |
| URL elicitation request                    | `mode`, `message`, `url`                                                                                                                         |
| Accepted elicitation response              | `action`, `content`, `_meta`                                                                                                                     |
| Declined or cancelled elicitation response | `action`, `_meta`                                                                                                                                |
| Roots-list request                         | No declared fields; preserve the empty object                                                                                                    |
| Roots-list result                          | `roots`, `_meta`                                                                                                                                 |
| Root declaration                           | `uri`, `name`, `_meta`                                                                                                                           |
| Sampling create-message request            | `messages`, `systemPrompt`, `includeContext`, `modelPreferences`, `maxTokens`, `temperature`, `stopSequences`, `tools`, `toolChoice`, `metadata` |
| Sampling create-message result             | `role`, `content`, `model`, `stopReason`, `_meta`                                                                                                |
| Sampling message                           | `role`, `content`                                                                                                                                |
| Sampling model preferences                 | `hints`, `intelligencePriority`, `speedPriority`, `costPriority`                                                                                 |
| Sampling model hint                        | `name`                                                                                                                                           |
| Sampling request tool                      | `name`, `title`, `description`, `inputSchema`, `annotations`                                                                                     |
| Sampling tool choice                       | `mode`                                                                                                                                           |
| Sampling tool-use content                  | `type`, `id`, `name`, `input`                                                                                                                    |
| Sampling tool-result content               | `type`, `toolUseId`, `isError`, `content`                                                                                                        |

`steps` is an ordered interaction trace and must never be reordered. Preserve
tool inputs, elicitation response `content`, sampling tool-use `input`, sampling
`metadata`, and every `_meta` subtree in full. Sampling `inputSchema` and
elicitation `requestedSchema` retain all schema ordering.

Sampling message content uses the known content-block rules above where its
variant is recognized. Model hint preference, message, tool, stop-sequence, and
roots arrays retain their order. Unknown fields on open result envelopes are
emitted after known fields in their existing relative order, with opaque values;
openness is not permission to interpret those values.

## Reusable components and references

| Structure                  | Field sequence                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `components`               | `schemas`, `toolExamples`, `resourceExamples`, `resourceTemplateExamples`, `promptExamples` |
| Component reference object | `$componentRef`                                                                             |

Each component category is a named map. Preserve component-name order. Entire
`components.schemas` values are opaque, including schema objects and component
references. Boolean subschemas inside a schema remain untouched as well. Other
component values use the corresponding recognized example envelope rule or
remain reference objects. Reference objects inside an opaque schema are part of
that schema and are not traversed.

Keep reference strings byte-for-byte unchanged. Never resolve references, rename
components, reorder component entries by dependencies, inline values, or change
relative versus absolute references as part of ordering.

## Preservation contract

The following requirements always apply to `document` mode:

| Content                                                            | Required preservation                                                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Every array                                                        | Exact element sequence, including duplicates and empty arrays                                                  |
| Named maps                                                         | Existing entry order; organize values only where explicitly typed by this document                             |
| Embedded schemas                                                   | Entire subtree order, including `$defs`, `properties`, `required`, alternatives, enums, defaults, and examples |
| Application payloads and argument maps                             | Entire subtree order; never reinterpret familiar field names                                                   |
| `_meta`, sampling `metadata`, and extension payloads               | Entire subtree order                                                                                           |
| Open capability and client requirement payloads                    | Entire subtree order                                                                                           |
| Environment variables, OAuth scopes, and security requirement maps | Existing entry order and unchanged values                                                                      |
| Unknown fields and `x-` keys on organized objects                  | Relative order among these unlisted fields; values remain opaque                                               |
| Unknown objects and unrecognized union variants                    | Entire subtree order, without alphabetical fallback                                                            |
| Scalars, identifiers, URIs, and reference strings                  | Unchanged values                                                                                               |
| Presence and absence                                               | Never insert, delete, rename, coerce, deduplicate, or infer fields                                             |
| Input value                                                        | No mutation at any depth                                                                                       |

Unlisted fields move after known fields when their parent is organized. This
preserves their relative order, not their original absolute positions.
Similarly, `_meta` may move as a field in a known envelope, while its contents
remain opaque. `preserve` mode is the choice when even these moves are unwanted.

JavaScript integer-index property names follow JavaScript enumeration order.
Plain-object serialization cannot promise arbitrary insertion order for those
keys. The same limitation applies to named maps and opaque payloads; do not
claim original source order where parsing has already lost it.

Neither `document` nor `preserve` promises comments, original whitespace,
quoting, YAML anchors, source locations, or original positions of properties
moved by conversion. YAML writers may choose quoting and formatting; only the
value-level ordering contract is in scope. This is not a source-aware API.

## Projection ordering

Effective Protocol View projection preserves the relative property order of
retained fields, the relative order of retained array elements, and surviving
component-map entries. Removing scopes, filtering declarations and elicitations,
and pruning unused components do not organize the remaining fields. Schemas,
metadata, extensions, and application payloads retain their internal order.
Callers can serialize a view with `keyOrder: 'document'` to organize it
explicitly; effective projection has no separate ordering option.

Native MCP projection defaults to the same preservation policy and accepts:

```ts
projectMcpNativeValue(document, {
  protocolVersion: '2026-07-28',
  kind: 'tool',
  keyOrder: 'document',
});
```

Both individual values and lists support `preserve` and `document`. Native
projection first selects the effective view, resolves component references, and
removes description-only fields and extensions. Preserving projection retains
the relative order of surviving fields, including fields of icons and prompt
arguments. Resolved schemas inherit their target component's internal order; the
containing schema field stays in its retained position.

Document-oriented native projection reuses the declaration sequences above,
restricted to fields retained by native projection:

| Structure         | Field sequence                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| Tool              | `name`, `title`, `description`, `icons`, `inputSchema`, `outputSchema`, `annotations`, `execution`, `_meta` |
| Resource          | `uri`, `name`, `title`, `description`, `icons`, `mimeType`, `size`, `annotations`, `_meta`                  |
| Resource template | `uriTemplate`, `name`, `title`, `description`, `icons`, `mimeType`, `annotations`, `_meta`                  |
| Prompt            | `name`, `title`, `description`, `icons`, `arguments`, `_meta`                                               |

Use the same nested sequences for icons, tool/resource annotations, execution,
and prompt arguments. Preserve all arrays, embedded schemas, and `_meta`
contents. Missing fields are skipped; ordering never adds fields, removes
fields, or makes an otherwise unsupported field valid for a protocol revision.
Existing selector and protocol-revision validation, native postconditions,
diagnostics, and all-or-nothing failures remain unchanged. Ordering applies
before result validation.

The explicit `kind` selects the native rule. Do not infer native structures from
arbitrary objects, fabricate a document header, or change the serializer's
recognition rules. Serializing a bare native value with `keyOrder: 'document'`
continues to preserve its supplied order; organize during projection instead.
Recursive alphabetical ordering remains a serialization-only policy.

This convention requires no new selector or validator snapshot, and does not
change merge ordering. The value-level and source-text limitations described
above apply to both projections.

## Implementation and verification

The internal ordering module is
[document-ordering.ts](../packages/core/src/document-ordering.ts), reached when
serialization or native projection explicitly selects `document`. The two
operations share declaration and nested ordering rules. The module has no
validator, network, or filesystem dependency. Other ordering policies bypass its
traversal.

[document-ordering.test.ts](../packages/core/test/document-ordering.test.ts)
checks every fixed-field sequence against the embedded schemas, both supported
format versions, and both output formats. It also checks opaque boundaries,
unknown variants, named maps, empty values, and unchanged inputs. Browser and
isolated-consumer checks exercise the public option and declarations.

[projection-ordering.test.ts](../packages/core/test/projection-ordering.test.ts)
checks preservation across all supported effective-view selectors, plus native
preservation and organization across every supported native selector, protocol
revision, and declaration kind. It checks pinned MCP field inventories, exact
JSON/YAML ordering independent of YAML alias emission, filtering, component
pruning/resolution, opaque boundaries, idempotence, and input immutability.
Frozen native projection fixtures run under both policies, including failures.

The ongoing requirements are:

- Keep ordering tables and traversal in core, without importing validator
  semantic logic or modifying immutable schemas and fixtures.
- Use context-specific rules and explicit opaque boundaries, not a global
  property-priority list or unrestricted recursive matching.
- Maintain an exhaustive inventory check against supported schemas: each
  fixed-field structure must have a rule or an explicit preservation decision.
  An added schema field must trigger review, not silently acquire a guessed
  priority.
- Test every table row and union variant with intentionally scrambled fields,
  missing optional fields, and trailing unknown or extension fields.
- Assert exact JSON and YAML output, stable repeated serialization, idempotent
  document organization, value equality after parsing, and input immutability.
- Test all preservation boundaries with nested keys that resemble known
  structures, including schemas containing `info`, `type`, and `properties`.
- Test array and named-map order independently from the ordering of their
  recognized object values. Include numeric-like map keys and unknown variants.
- Confirm applicable selector behavior explicitly, retaining existing immutable
  snapshot validation results and diagnostics.
- Verify public types, browser bundles, offline behavior, strict CSP, package
  contents, isolated consumers, and the repository's `npm run check` gate.
- Keep the option documented in core's README and changelog. Do not release
  without maintainer approval.

Changing a published sequence later is an observable formatting change, even
when document values and validator results remain identical.
