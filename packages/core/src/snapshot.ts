import {
  defaultSpecifications,
  resolveMcpDescriptionSpecification,
  specificationProvenance,
  supportedProtocolVersions,
} from '@mcpdesc/validator/standalone';

import type { CoreDiagnostic } from './model.js';

export const RC_4_SPECIFICATION = '0.8.0-rc.4' as const;
export const RC_4_SCHEMA_URI =
  'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.4.json' as const;
export const V0_8_SPECIFICATION = '0.8.0' as const;
export const V0_8_SCHEMA_URI =
  'https://mcpdesc.org/schema/mcp-description/0.8.0.json' as const;
export const V0_8_REV_20261021_SPECIFICATION = '0.8.0-rev.20261021' as const;
export const V0_9_DRAFT_1_SPECIFICATION = '0.9.0-draft.1' as const;
export const V0_9_DRAFT_1_SCHEMA_URI =
  'https://mcpdesc.org/schema/mcp-description/0.9.0-draft.1.json' as const;
export const V0_9_DRAFT_2_SPECIFICATION = '0.9.0-draft.2' as const;
export const V0_9_DRAFT_2_SCHEMA_URI =
  'https://mcpdesc.org/schema/mcp-description/0.9.0-draft.2.json' as const;

export type SupportedCoreSpecification =
  | typeof RC_4_SPECIFICATION
  | typeof V0_8_SPECIFICATION
  | typeof V0_8_REV_20261021_SPECIFICATION
  | typeof V0_9_DRAFT_1_SPECIFICATION
  | typeof V0_9_DRAFT_2_SPECIFICATION;

export const deprecatedCoreSpecifications = Object.freeze([
  RC_4_SPECIFICATION,
  V0_8_SPECIFICATION,
] as const);

const rc4Provenance = specificationProvenance[RC_4_SPECIFICATION];
const v0_8Provenance = specificationProvenance[V0_8_SPECIFICATION];
const v0_9Draft1Provenance =
  specificationProvenance[V0_9_DRAFT_1_SPECIFICATION];
const v0_9Draft2Provenance =
  specificationProvenance[V0_9_DRAFT_2_SPECIFICATION];

export const rc4Snapshot = Object.freeze({
  specification: RC_4_SPECIFICATION,
  schemaUri: RC_4_SCHEMA_URI,
  snapshotTag: rc4Provenance.snapshotTag,
  schemaSha256: rc4Provenance.schemaSha256,
  protocolVersions: supportedProtocolVersions,
});

export const v0_8Snapshot = Object.freeze({
  specification: V0_8_SPECIFICATION,
  schemaUri: V0_8_SCHEMA_URI,
  snapshotTag: v0_8Provenance.snapshotTag,
  schemaSha256: v0_8Provenance.schemaSha256,
  protocolVersions: supportedProtocolVersions,
});

export const v0_9Draft1Snapshot = Object.freeze({
  specification: V0_9_DRAFT_1_SPECIFICATION,
  schemaUri: V0_9_DRAFT_1_SCHEMA_URI,
  snapshotTag: v0_9Draft1Provenance.snapshotTag,
  schemaSha256: v0_9Draft1Provenance.schemaSha256,
  protocolVersions: supportedProtocolVersions,
});

export const v0_9Draft2Snapshot = Object.freeze({
  specification: V0_9_DRAFT_2_SPECIFICATION,
  schemaUri: V0_9_DRAFT_2_SCHEMA_URI,
  snapshotTag: v0_9Draft2Provenance.snapshotTag,
  schemaSha256: v0_9Draft2Provenance.schemaSha256,
  protocolVersions: supportedProtocolVersions,
});

export function isSupportedCoreSpecification(
  specification: unknown,
): specification is SupportedCoreSpecification {
  return (
    specification === RC_4_SPECIFICATION ||
    specification === V0_8_SPECIFICATION ||
    specification === V0_8_REV_20261021_SPECIFICATION ||
    specification === V0_9_DRAFT_1_SPECIFICATION ||
    specification === V0_9_DRAFT_2_SPECIFICATION
  );
}

export const defaultV0_8Specification: SupportedCoreSpecification | undefined =
  isSupportedCoreSpecification(defaultSpecifications['0.8.0']?.selector)
    ? defaultSpecifications['0.8.0']?.selector
    : undefined;

export type CoreSpecificationSelection =
  | { readonly ok: true; readonly specification: SupportedCoreSpecification }
  | { readonly ok: false; readonly diagnostics: readonly CoreDiagnostic[] };

export interface CoreSelectorOptions<
  Selector extends SupportedCoreSpecification = SupportedCoreSpecification,
> {
  /** Exact validation rules; omit to use the validator default for the document. */
  readonly selector?: Selector;
  /** @deprecated Use `selector`. */
  readonly specification?: Selector;
}

export type RequestedCoreSelector =
  | { readonly ok: true; readonly requested: unknown }
  | { readonly ok: false; readonly diagnostics: readonly CoreDiagnostic[] };

export function requestedCoreSelector(
  options: CoreSelectorOptions,
): RequestedCoreSelector {
  const { selector, specification } = options;
  if (
    selector !== undefined &&
    specification !== undefined &&
    selector !== specification
  ) {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'conflicting-selector-options',
          severity: 'error',
          message:
            'options.selector and options.specification must identify the same selector',
          path: [],
          phase: 'operation',
        },
      ],
    };
  }
  return { ok: true, requested: selector ?? specification };
}

function unsupportedSpecification(
  operation: string,
  specification: unknown,
): CoreDiagnostic {
  return {
    code: 'unsupported-specification',
    severity: 'error',
    message: `${operation} does not support ${JSON.stringify(specification)}`,
    path: [],
    phase: 'operation',
  };
}

// An explicit selector pins; otherwise use the validator default for the document's format.
export function selectCoreSpecification(
  document: unknown,
  options: CoreSelectorOptions,
  operation: string,
): CoreSpecificationSelection {
  const request = requestedCoreSelector(options);
  if (!request.ok) return request;
  const { requested } = request;
  if (requested !== undefined) {
    return isSupportedCoreSpecification(requested)
      ? { ok: true, specification: requested }
      : {
          ok: false,
          diagnostics: [unsupportedSpecification(operation, requested)],
        };
  }
  const resolution = resolveMcpDescriptionSpecification(document);
  if (resolution.status === 'unresolved') {
    return {
      ok: false,
      diagnostics: resolution.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        phase: 'source',
      })),
    };
  }
  return isSupportedCoreSpecification(resolution.selector)
    ? { ok: true, specification: resolution.selector }
    : {
        ok: false,
        diagnostics: [unsupportedSpecification(operation, resolution.selector)],
      };
}
