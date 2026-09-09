import {
  specificationProvenance,
  supportedProtocolVersions,
} from '@mcpdesc/validator/standalone';

export const RC_4_SPECIFICATION = '0.8.0-rc.4' as const;
export const RC_4_SCHEMA_URI =
  'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.4.json' as const;
export const V0_8_SPECIFICATION = '0.8.0' as const;
export const V0_8_SCHEMA_URI =
  'https://mcpdesc.org/schema/mcp-description/0.8.0.json' as const;

export type SupportedCoreSpecification =
  typeof RC_4_SPECIFICATION | typeof V0_8_SPECIFICATION;

export const deprecatedCoreSpecifications = Object.freeze([
  RC_4_SPECIFICATION,
] as const);

const rc4Provenance = specificationProvenance[RC_4_SPECIFICATION];
const v0_8Provenance = specificationProvenance[V0_8_SPECIFICATION];

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

export function isSupportedCoreSpecification(
  specification: string,
): specification is SupportedCoreSpecification {
  return (
    specification === RC_4_SPECIFICATION || specification === V0_8_SPECIFICATION
  );
}
