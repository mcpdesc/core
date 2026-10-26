import {
  deprecatedSpecifications,
  defaultSpecifications,
  mcpExtensionCatalogue,
  mcpExtensionMaturity,
  type McpDescriptionSelector,
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
  selector: '0.8.0'
});
const defaultResult: McpDescriptionValidationResult = validateMcpDescription(document);
const selector: McpDescriptionSelector = result.selector!;
const componentResolution = resolveMcpDescriptionComponentReferences(document, {
  specification: '0.8.0'
});
const referencePath: readonly (string | number)[] | undefined = componentResolution.provenance[0]?.referencePath;
for (const configuredSelector of supportedSpecifications) {
  resolveMcpDescriptionComponentReferences(document, { specification: configuredSelector });
  validateMcpDescription(document, { specification: configuredSelector });
}
const standaloneResult: McpDescriptionValidationResult = validateStandalone(document, {
  specification: '0.8.0'
});
const browserResult: McpDescriptionValidationResult = validateBrowser(document, {
  specification: '0.8.0'
});
const diagnostic: McpDescriptionDiagnostic | undefined = result.diagnostics[0];
const pathSegment: string | number | undefined = diagnostic?.path[0];
const diagnosticRule: string | undefined = diagnostic?.rule;
const configuredSelector: McpDescriptionSelector = supportedSpecifications[0];
const deprecatedSelector: McpDescriptionSelector = deprecatedSpecifications[0];
const defaultedStable: McpDescriptionSelector | undefined = defaultSpecifications['0.8.0']?.selector;
const catalogueDate: '2026-09-04' = mcpExtensionCatalogue.effectiveDate;
const extensionMaturity: 'official' | 'experimental' | 'uncatalogued' = mcpExtensionMaturity('io.modelcontextprotocol/ui');
const protocolVersion: string = supportedProtocolVersions[0];
const configuredSchemaUri: string = specificationProvenance[configuredSelector].schemaUri;
const configuredTag: `v${McpDescriptionSelector}` = specificationProvenance[configuredSelector].snapshotTag;
const resolution = resolveMcpDescriptionSpecification(document, { selector: configuredSelector });
if (resolution.status === 'resolved') {
  const resolvedSelector: string = resolution.selector;
  const resolvedSchemaUri: string = resolution.schemaUri;
  void resolvedSelector;
  void resolvedSchemaUri;
}

void pathSegment;
void diagnosticRule;
void selector;
void defaultResult;
void protocolVersion;
void configuredTag;
void configuredSchemaUri;
void configuredSelector;
void deprecatedSelector;
void defaultedStable;
void catalogueDate;
void extensionMaturity;
void browserResult;
void standaloneResult;
void referencePath;

// @ts-expect-error Retired release candidates are not supported.
validateMcpDescription(document, { selector: '0.8.0-rc.3' });
// @ts-expect-error Arbitrary selectors are not supported.
validateMcpDescription(document, { selector: 'not-a-selector' });
// @ts-expect-error Supported specification exports are readonly.
supportedSpecifications.push('0.8.0');
// @ts-expect-error Provenance is only available for supported selectors.
specificationProvenance['not-a-specification'];
// @ts-expect-error Draft 4 component resolution is not supported.
resolveMcpDescriptionComponentReferences(document, { specification: '0.8.0-draft.4' });