import type { ConfiguredMcpDescriptionSelector } from './src/generated/selector-config.js';

export type McpDescriptionSelector = ConfiguredMcpDescriptionSelector;
export type McpDescriptionSpecification = McpDescriptionSelector;
type FormatVersionOf<Selector extends string> =
  Selector extends `${infer FormatVersion}-${string}` ? FormatVersion : Selector;
export type McpDescriptionFormatVersion = FormatVersionOf<McpDescriptionSelector>;

export type SupportedProtocolVersion =
  | '2024-11-05'
  | '2025-03-26'
  | '2025-06-18'
  | '2025-11-25'
  | '2026-07-28';

export type McpDescriptionDiagnosticSeverity = 'error' | 'warning';

export interface McpDescriptionDiagnostic {
  readonly code: string;
  readonly severity: McpDescriptionDiagnosticSeverity;
  readonly message: string;
  readonly path: Array<string | number>;
  readonly rule?: string;
}

export interface McpDescriptionValidationResult {
  readonly valid: boolean;
  readonly diagnostics: McpDescriptionDiagnostic[];
  readonly selector: McpDescriptionSelector | null;
  readonly specification: McpDescriptionSpecification | null;
  readonly defaulted: boolean;
}

export interface ValidateMcpDescriptionOptions {
  readonly selector?: McpDescriptionSelector;
  readonly specification?: McpDescriptionSpecification;
}

export interface McpDescriptionComponentReferenceProvenance {
  readonly referencePath: Array<string | number>;
  readonly targetPath: Array<string | number>;
}

export interface McpDescriptionComponentResolutionResult {
  readonly document: unknown;
  readonly diagnostics: McpDescriptionDiagnostic[];
  readonly substitutions: number;
  readonly provenance: McpDescriptionComponentReferenceProvenance[];
}

export interface ResolveMcpDescriptionComponentReferencesOptions {
  readonly specification: McpDescriptionSelector;
}

export type McpExtensionMaturity = 'official' | 'experimental' | 'uncatalogued';

export interface McpExtensionCatalogue {
  readonly effectiveDate: '2026-09-04';
  readonly source: 'https://modelcontextprotocol.io/extensions/overview';
  readonly officialIdentifiers: readonly [
    'io.modelcontextprotocol/enterprise-managed-authorization',
    'io.modelcontextprotocol/oauth-client-credentials',
    'io.modelcontextprotocol/tasks',
    'io.modelcontextprotocol/ui'
  ];
  readonly experimentalIdentifiers: readonly [];
}

export type McpDescriptionSelectorProvenance = {
  readonly [Selector in McpDescriptionSelector]: Readonly<{
    snapshotTag: `v${Selector}`;
    schemaUri: string;
    schemaSha256: string;
  }>;
};
export type SpecificationProvenance = McpDescriptionSelectorProvenance;

export interface McpDescriptionDefaultSelector {
  readonly selector: McpDescriptionSelector;
  readonly schemaPins: boolean;
}

export type McpDescriptionDefaultSelectors = Readonly<{
  [FormatVersion in McpDescriptionFormatVersion]:
    | Readonly<McpDescriptionDefaultSelector>
    | undefined;
}>;

export interface ResolveMcpDescriptionSpecificationOptions {
  readonly selector?: McpDescriptionSelector;
  readonly specification?: McpDescriptionSpecification;
}

export interface ResolvedMcpDescriptionSpecification {
  readonly status: 'resolved';
  readonly selector: McpDescriptionSelector;
  readonly specification: McpDescriptionSpecification;
  readonly defaulted: boolean;
  readonly schemaUri: string;
  readonly provenance: McpDescriptionSelectorProvenance[McpDescriptionSelector];
  readonly diagnostics: McpDescriptionDiagnostic[];
}

export interface UnresolvedMcpDescriptionSpecification {
  readonly status: 'unresolved';
  readonly diagnostics: McpDescriptionDiagnostic[];
}

export type McpDescriptionSpecificationResolution =
  | ResolvedMcpDescriptionSpecification
  | UnresolvedMcpDescriptionSpecification;

export declare const supportedSpecifications: readonly McpDescriptionSelector[];
export declare const deprecatedSpecifications: readonly McpDescriptionSelector[];
export declare const defaultSpecifications: McpDescriptionDefaultSelectors;

export declare const supportedProtocolVersions: readonly SupportedProtocolVersion[];

export declare const specificationProvenance: Readonly<SpecificationProvenance>;
export declare const mcpExtensionCatalogue: Readonly<McpExtensionCatalogue>;
export declare function mcpExtensionMaturity(identifier: string): McpExtensionMaturity;

export declare function resolveMcpDescriptionSpecification(
  document: unknown,
  options?: ResolveMcpDescriptionSpecificationOptions
): McpDescriptionSpecificationResolution;

export declare function validateMcpDescription(
  document: unknown,
  options?: ValidateMcpDescriptionOptions
): McpDescriptionValidationResult;

export declare function resolveMcpDescriptionComponentReferences(
  document: unknown,
  options: ResolveMcpDescriptionComponentReferencesOptions
): McpDescriptionComponentResolutionResult;