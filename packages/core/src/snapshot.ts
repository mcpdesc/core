import {
  specificationProvenance,
  supportedProtocolVersions,
} from '@mcpdesc/validator/standalone';

export const RC_4_SPECIFICATION = '0.8.0-rc.4' as const;
export const RC_4_SCHEMA_URI =
  'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.4.json' as const;
export const RC_3_SPECIFICATION = '0.8.0-rc.3' as const;
export const RC_3_SCHEMA_URI =
  'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.3.json' as const;

export type SupportedCoreSpecification =
  typeof RC_3_SPECIFICATION | typeof RC_4_SPECIFICATION;

export const deprecatedCoreSpecifications = Object.freeze([
  RC_3_SPECIFICATION,
] as const);

const rc3Provenance = specificationProvenance[RC_3_SPECIFICATION];
const rc4Provenance = specificationProvenance[RC_4_SPECIFICATION];

export const rc4Snapshot = Object.freeze({
  specification: RC_4_SPECIFICATION,
  schemaUri: RC_4_SCHEMA_URI,
  snapshotTag: rc4Provenance.snapshotTag,
  schemaSha256: rc4Provenance.schemaSha256,
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
    specification === RC_3_SPECIFICATION || specification === RC_4_SPECIFICATION
  );
}
