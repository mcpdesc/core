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
  type McpDescriptionDiagnosticDetail,
  type McpDescriptionDiagnosticExplanation,
  type McpDescriptionRelatedLocation,
  type McpDescriptionRuleResult,
  type McpDescriptionRuleResultStatus,
  type McpDescriptionValidationResult
} from '@mcpdesc/validator';
import { validateMcpDescription as validateBrowser } from '@mcpdesc/validator/browser';
import { validateMcpDescription as validateStandalone } from '@mcpdesc/validator/standalone';

declare const document: unknown;

const result: McpDescriptionValidationResult = validateMcpDescription(document, {
  selector: '0.8.0'
});
const defaultResult: McpDescriptionValidationResult = validateMcpDescription(document);
const draft4Result: McpDescriptionValidationResult = validateMcpDescription(document, {
  selector: '0.9.0-draft.4'
});
const rc1Result: McpDescriptionValidationResult = validateBrowser(document, {
  selector: '0.9.0-rc.1'
});
const rc3Result: McpDescriptionValidationResult = validateStandalone(document, {
  selector: '0.9.0-rc.3'
});
const rc3Detail: McpDescriptionDiagnosticDetail | undefined =
  rc3Result.diagnostics[0]?.detail;
const rc3RelatedLocation: McpDescriptionRelatedLocation | undefined =
  rc3Result.diagnostics[0]?.relatedLocations?.[0];
const rc3DetailKind: string | undefined = rc3Detail?.kind;
const rc3DetailMember: string | undefined = rc3Detail?.member;
const rc1Records: readonly McpDescriptionRuleResult[] | undefined = rc1Result.results;
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
const explainedResult = validateMcpDescription(document, { explainDiagnostics: true });
const schemaPolicyResult = validateMcpDescription(document, {
  schemaPolicyIfPresent: true,
  fallbackIfSelectorIsUnknown: true
});
const schemaPolicyResolution = resolveMcpDescriptionSpecification(document, {
  schemaPolicyIfPresent: true,
  fallbackIfSelectorIsUnknown: false
});
const diagnosticExplanation: McpDescriptionDiagnosticExplanation | undefined =
  explainedResult.diagnostics[0]?.explanation;
const pathSegment: string | number | undefined = diagnostic?.path[0];
const diagnosticRule: string | undefined = diagnostic?.rule;
const diagnosticCode: string | undefined = diagnostic?.code;
const diagnosticProtocolVersions: readonly string[] | undefined = diagnostic?.protocolVersions;
const draft4Records: readonly McpDescriptionRuleResult[] | undefined = draft4Result.results;
const draft4Status: McpDescriptionRuleResultStatus | undefined = draft4Records?.[0]?.status;
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
void diagnosticExplanation;
void diagnosticRule;
void diagnosticCode;
void diagnosticProtocolVersions;
void draft4Status;
void rc1Records;
void rc3DetailKind;
void rc3DetailMember;
void rc3RelatedLocation;
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
void schemaPolicyResult;
void schemaPolicyResolution;
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