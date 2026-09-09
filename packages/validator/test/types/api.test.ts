import {
  deprecatedSpecifications,
  mcpExtensionCatalogue,
  mcpExtensionMaturity,
  resolveMcpDescriptionComponentReferences,
  resolveMcpDescriptionSpecification,
  specificationProvenance,
  supportedProtocolVersions,
  supportedSpecifications,
  validateMcpDescription,
  type McpDescriptionDiagnostic,
  type McpDescriptionValidationResult
} from '@mcpdesc/validator';
import { validateMcpDescription as validateBrowser } from '@mcpdesc/validator/browser';
import { validateMcpDescription as validateStandalone } from '@mcpdesc/validator/standalone';

declare const document: unknown;

const result: McpDescriptionValidationResult = validateMcpDescription(document, {
  specification: '0.8.0'
});
const componentResolution = resolveMcpDescriptionComponentReferences(document, {
  specification: '0.8.0'
});
resolveMcpDescriptionComponentReferences(document, { specification: '0.8.0-rc.4' });
resolveMcpDescriptionComponentReferences(document, { specification: '0.8.0' });
const referencePath: readonly (string | number)[] | undefined = componentResolution.provenance[0]?.referencePath;
validateMcpDescription(document, { specification: '0.8.0-rc.4' });
validateMcpDescription(document, { specification: '0.8.0' });
const standaloneResult: McpDescriptionValidationResult = validateStandalone(document, {
  specification: '0.8.0'
});
const browserResult: McpDescriptionValidationResult = validateBrowser(document, {
  specification: '0.8.0'
});
const diagnostic: McpDescriptionDiagnostic | undefined = result.diagnostics[0];
const pathSegment: string | number | undefined = diagnostic?.path[0];
const rc4: '0.8.0-rc.4' = supportedSpecifications[0];
const stable: '0.8.0' = supportedSpecifications[1];
const deprecatedRc4: '0.8.0-rc.4' = deprecatedSpecifications[0];
const catalogueDate: '2026-09-04' = mcpExtensionCatalogue.effectiveDate;
const extensionMaturity: 'official' | 'experimental' | 'uncatalogued' = mcpExtensionMaturity('io.modelcontextprotocol/ui');
const protocolVersion: string = supportedProtocolVersions[0];
const rc4SchemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.4.json' = specificationProvenance[rc4].schemaUri;
const stableTag: 'v0.8.0' = specificationProvenance[stable].snapshotTag;
const resolution = resolveMcpDescriptionSpecification(document, { specification: rc4 });
if (resolution.status === 'resolved') {
  const resolvedSelector: string = resolution.specification;
  const resolvedSchemaUri: string = resolution.schemaUri;
  void resolvedSelector;
  void resolvedSchemaUri;
}

void pathSegment;
void protocolVersion;
void stableTag;
void rc4SchemaUri;
void rc4;
void stable;
void deprecatedRc4;
void catalogueDate;
void extensionMaturity;
void browserResult;
void standaloneResult;
void referencePath;

// @ts-expect-error The options argument is required.
validateMcpDescription(document);
// @ts-expect-error Retired release candidates are not supported.
validateMcpDescription(document, { specification: '0.8.0-rc.3' });
// @ts-expect-error Arbitrary specification selectors are not supported.
validateMcpDescription(document, { specification: 'not-a-specification' });
// @ts-expect-error Supported specification exports are readonly.
supportedSpecifications.push('0.8.0');
// @ts-expect-error Provenance is only available for supported selectors.
specificationProvenance['not-a-specification'];
// @ts-expect-error Draft 4 component resolution is not supported.
resolveMcpDescriptionComponentReferences(document, { specification: '0.8.0-draft.4' });