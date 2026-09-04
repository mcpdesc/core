import {
  specificationProvenance,
  supportedProtocolVersions,
} from '@mcpdesc/validator/standalone';

export const DRAFT_4_SPECIFICATION = '0.8.0-draft.4' as const;
export const DRAFT_4_SCHEMA_URI =
  'https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json' as const;
export const RC_1_SPECIFICATION = '0.8.0-rc.1' as const;
export const RC_1_SCHEMA_URI =
  'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.1.json' as const;
export const RC_2_SPECIFICATION = '0.8.0-rc.2' as const;
export const RC_2_SCHEMA_URI =
  'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.2.json' as const;

export type SupportedCoreSpecification =
  | typeof DRAFT_4_SPECIFICATION
  | typeof RC_1_SPECIFICATION
  | typeof RC_2_SPECIFICATION;

const draft4Provenance = specificationProvenance[DRAFT_4_SPECIFICATION];
const rc1Provenance = specificationProvenance[RC_1_SPECIFICATION];
const rc2Provenance = specificationProvenance[RC_2_SPECIFICATION];

export const draft4Snapshot = Object.freeze({
  specification: DRAFT_4_SPECIFICATION,
  schemaUri: DRAFT_4_SCHEMA_URI,
  snapshotTag: draft4Provenance.snapshotTag,
  schemaSha256: draft4Provenance.schemaSha256,
  protocolVersions: supportedProtocolVersions,
});

export const rc1Snapshot = Object.freeze({
  specification: RC_1_SPECIFICATION,
  schemaUri: RC_1_SCHEMA_URI,
  snapshotTag: rc1Provenance.snapshotTag,
  schemaSha256: rc1Provenance.schemaSha256,
  protocolVersions: supportedProtocolVersions,
});

export const rc2Snapshot = Object.freeze({
  specification: RC_2_SPECIFICATION,
  schemaUri: RC_2_SCHEMA_URI,
  snapshotTag: rc2Provenance.snapshotTag,
  schemaSha256: rc2Provenance.schemaSha256,
  protocolVersions: supportedProtocolVersions,
});

export function isSupportedCoreSpecification(
  specification: string,
): specification is SupportedCoreSpecification {
  return (
    specification === DRAFT_4_SPECIFICATION ||
    specification === RC_1_SPECIFICATION ||
    specification === RC_2_SPECIFICATION
  );
}
