import {
  specificationProvenance,
  supportedProtocolVersions,
} from '@mcpdesc/validator/standalone';

export const RC_2_SPECIFICATION = '0.8.0-rc.2' as const;
export const RC_2_SCHEMA_URI =
  'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.2.json' as const;
export const RC_3_SPECIFICATION = '0.8.0-rc.3' as const;
export const RC_3_SCHEMA_URI =
  'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.3.json' as const;

export type SupportedCoreSpecification =
  typeof RC_2_SPECIFICATION | typeof RC_3_SPECIFICATION;

export const deprecatedCoreSpecifications = Object.freeze([
  RC_2_SPECIFICATION,
] as const);

const rc2Provenance = specificationProvenance[RC_2_SPECIFICATION];
const rc3Provenance = specificationProvenance[RC_3_SPECIFICATION];

export const rc2Snapshot = Object.freeze({
  specification: RC_2_SPECIFICATION,
  schemaUri: RC_2_SCHEMA_URI,
  snapshotTag: rc2Provenance.snapshotTag,
  schemaSha256: rc2Provenance.schemaSha256,
  protocolVersions: supportedProtocolVersions,
});

export const rc3Snapshot = Object.freeze({
  specification: RC_3_SPECIFICATION,
  schemaUri: RC_3_SCHEMA_URI,
  snapshotTag: rc3Provenance.snapshotTag,
  schemaSha256: rc3Provenance.schemaSha256,
  protocolVersions: supportedProtocolVersions,
});

export function isSupportedCoreSpecification(
  specification: string,
): specification is SupportedCoreSpecification {
  return (
    specification === RC_2_SPECIFICATION || specification === RC_3_SPECIFICATION
  );
}
