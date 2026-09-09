export type McpDescriptionSpecification = '0.8.0-rc.4' | '0.8.0';

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
}

export interface McpDescriptionValidationResult {
  readonly valid: boolean;
  readonly diagnostics: McpDescriptionDiagnostic[];
}

export interface ValidateMcpDescriptionOptions {
  specification: McpDescriptionSpecification;
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
  readonly specification: '0.8.0-rc.4' | '0.8.0';
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

export interface SpecificationProvenance {
  readonly '0.8.0-rc.4': {
    readonly snapshotTag: 'v0.8.0-rc.4';
    readonly schemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.4.json';
    readonly schemaSha256: 'd38e54db859813b63be2a5c91dde91250035f18bcb5910208cf71fa6875d6eef';
  };
  readonly '0.8.0': {
    readonly snapshotTag: 'v0.8.0';
    readonly schemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0.json';
    readonly schemaSha256: '36686f92ba0cc98bde2c34eaad31c0304d6e5cebdd2c4d2be1be06aecef41119';
  };
}

export interface ResolveMcpDescriptionSpecificationOptions {
  readonly specification?: McpDescriptionSpecification;
}

export interface ResolvedMcpDescriptionSpecification {
  readonly status: 'resolved';
  readonly specification: McpDescriptionSpecification;
  readonly schemaUri: string;
  readonly provenance: SpecificationProvenance[McpDescriptionSpecification];
  readonly diagnostics: McpDescriptionDiagnostic[];
}

export interface UnresolvedMcpDescriptionSpecification {
  readonly status: 'unresolved';
  readonly diagnostics: McpDescriptionDiagnostic[];
}

export type McpDescriptionSpecificationResolution =
  | ResolvedMcpDescriptionSpecification
  | UnresolvedMcpDescriptionSpecification;

export declare const supportedSpecifications: readonly ['0.8.0-rc.4', '0.8.0'];
export declare const deprecatedSpecifications: readonly ['0.8.0-rc.4'];

export declare const supportedProtocolVersions: readonly [
  '2024-11-05',
  '2025-03-26',
  '2025-06-18',
  '2025-11-25',
  '2026-07-28'
];

export declare const specificationProvenance: Readonly<SpecificationProvenance>;
export declare const mcpExtensionCatalogue: Readonly<McpExtensionCatalogue>;
export declare function mcpExtensionMaturity(identifier: string): McpExtensionMaturity;

export declare function resolveMcpDescriptionSpecification(
  document: unknown,
  options?: ResolveMcpDescriptionSpecificationOptions
): McpDescriptionSpecificationResolution;

export declare function validateMcpDescription(
  document: unknown,
  options: ValidateMcpDescriptionOptions
): McpDescriptionValidationResult;

export declare function resolveMcpDescriptionComponentReferences(
  document: unknown,
  options: ResolveMcpDescriptionComponentReferencesOptions
): McpDescriptionComponentResolutionResult;