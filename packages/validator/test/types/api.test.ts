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
  specification: '0.8.0-rc.2'
});
const componentResolution = resolveMcpDescriptionComponentReferences(document, {
  specification: '0.8.0-rc.2'
});
resolveMcpDescriptionComponentReferences(document, { specification: '0.8.0-rc.2' });
resolveMcpDescriptionComponentReferences(document, { specification: '0.8.0-rc.3' });
const referencePath: readonly (string | number)[] | undefined = componentResolution.provenance[0]?.referencePath;
validateMcpDescription(document, { specification: '0.8.0-rc.2' });
validateMcpDescription(document, { specification: '0.8.0-rc.3' });
const standaloneResult: McpDescriptionValidationResult = validateStandalone(document, {
  specification: '0.8.0-rc.3'
});
const browserResult: McpDescriptionValidationResult = validateBrowser(document, {
  specification: '0.8.0-rc.3'
});
const diagnostic: McpDescriptionDiagnostic | undefined = result.diagnostics[0];
const pathSegment: string | number | undefined = diagnostic?.path[0];
const rc2: '0.8.0-rc.2' = supportedSpecifications[0];
const rc3: '0.8.0-rc.3' = supportedSpecifications[1];
const deprecatedRc2: '0.8.0-rc.2' = deprecatedSpecifications[0];
const catalogueDate: '2026-09-04' = mcpExtensionCatalogue.effectiveDate;
const extensionMaturity: 'official' | 'experimental' | 'uncatalogued' = mcpExtensionMaturity('io.modelcontextprotocol/ui');
const protocolVersion: string = supportedProtocolVersions[0];
const rc2Tag: 'v0.8.0-rc.2' = specificationProvenance[rc2].snapshotTag;
const rc3SchemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.3.json' = specificationProvenance[rc3].schemaUri;
const resolution = resolveMcpDescriptionSpecification(document, { specification: rc3 });
if (resolution.status === 'resolved') {
  const resolvedSelector: string = resolution.specification;
  const resolvedSchemaUri: string = resolution.schemaUri;
  void resolvedSelector;
  void resolvedSchemaUri;
}

void pathSegment;
void protocolVersion;
void rc2Tag;
void rc3SchemaUri;
void rc2;
void rc3;
void deprecatedRc2;
void catalogueDate;
void extensionMaturity;
void browserResult;
void standaloneResult;
void referencePath;

// @ts-expect-error The options argument is required.
validateMcpDescription(document);
// @ts-expect-error Unqualified draft selectors are not supported.
validateMcpDescription(document, { specification: '0.8.0' });
// @ts-expect-error Later drafts are not supported by this package version.
validateMcpDescription(document, { specification: '0.8.0-draft.5' });
// @ts-expect-error Supported specification exports are readonly.
supportedSpecifications.push('0.8.0-rc.2');
// @ts-expect-error Provenance is only available for supported selectors.
specificationProvenance['0.8.0-draft.5'];
// @ts-expect-error Draft 4 component resolution is not supported.
resolveMcpDescriptionComponentReferences(document, { specification: '0.8.0-draft.4' });