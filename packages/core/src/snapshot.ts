import {
  specificationProvenance,
  supportedProtocolVersions,
} from '@mcpdesc/validator';

export const DRAFT_4_SPECIFICATION = '0.8.0-draft.4' as const;
export const DRAFT_4_SCHEMA_URI =
  'https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json' as const;

const provenance = specificationProvenance[DRAFT_4_SPECIFICATION];

export const draft4Snapshot = Object.freeze({
  specification: DRAFT_4_SPECIFICATION,
  schemaUri: DRAFT_4_SCHEMA_URI,
  snapshotTag: provenance.snapshotTag,
  schemaSha256: provenance.schemaSha256,
  protocolVersions: supportedProtocolVersions,
});
