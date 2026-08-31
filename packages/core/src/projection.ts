import {
  validateMcpDescription,
  type McpDescriptionDiagnostic,
  type SupportedProtocolVersion,
} from '@mcpdesc/validator/standalone';

import type {
  CoreDiagnostic,
  DiagnosticPhase,
  JsonObject,
  McpDescriptionDocument,
  OperationResult,
  ProtocolScopedDeclaration,
} from './model.js';
import {
  isSupportedCoreSpecification,
  type SupportedCoreSpecification,
} from './snapshot.js';

const scopedCollections = [
  'transports',
  'capabilities',
  'tools',
  'resources',
  'resourceTemplates',
  'prompts',
] as const;

export interface ProjectEffectiveProtocolViewOptions {
  readonly specification: SupportedCoreSpecification;
  readonly protocolVersion: SupportedProtocolVersion;
}

function diagnosticsForPhase(
  diagnostics: readonly McpDescriptionDiagnostic[],
  phase: DiagnosticPhase,
  protocolVersion: SupportedProtocolVersion,
): CoreDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    phase,
    protocolVersion,
  }));
}

function diagnosticIdentity(diagnostic: CoreDiagnostic): string {
  return JSON.stringify([
    diagnostic.code,
    diagnostic.severity,
    diagnostic.message,
    diagnostic.path,
    diagnostic.protocolVersion,
  ]);
}

function uniqueDiagnostics(
  ...groups: readonly (readonly CoreDiagnostic[])[]
): CoreDiagnostic[] {
  const seen = new Set<string>();
  return groups.flatMap((group) =>
    group.filter((diagnostic) => {
      const identity = diagnosticIdentity(diagnostic);
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    }),
  );
}

function operationDiagnostic(
  code: string,
  message: string,
  path: readonly (number | string)[],
  protocolVersion: SupportedProtocolVersion,
): CoreDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    path,
    phase: 'operation',
    protocolVersion,
  };
}

function effectiveScope(
  declaration: ProtocolScopedDeclaration,
  parentScope: readonly string[],
): readonly string[] {
  return declaration.protocolVersions ?? parentScope;
}

function withoutScope<T extends ProtocolScopedDeclaration>(declaration: T): T {
  const result = structuredClone(declaration);
  delete result.protocolVersions;
  return result;
}

function projectDeclaration(
  declaration: ProtocolScopedDeclaration,
  parentScope: readonly string[],
  protocolVersion: SupportedProtocolVersion,
): ProtocolScopedDeclaration {
  const declarationScope = effectiveScope(declaration, parentScope);
  const projected = withoutScope(declaration);
  const elicitations = declaration.elicitations;

  if (Array.isArray(elicitations)) {
    const projectedElicitations = elicitations
      .filter(
        (elicitation): elicitation is ProtocolScopedDeclaration =>
          typeof elicitation === 'object' &&
          elicitation !== null &&
          !Array.isArray(elicitation) &&
          effectiveScope(elicitation, declarationScope).includes(
            protocolVersion,
          ),
      )
      .map(withoutScope);

    if (projectedElicitations.length > 0) {
      projected.elicitations = projectedElicitations;
    } else {
      delete projected.elicitations;
    }
  }

  return projected;
}

function projectDocument(
  document: McpDescriptionDocument,
  protocolVersion: SupportedProtocolVersion,
): McpDescriptionDocument {
  const result = structuredClone(document);
  result.protocolVersions = [protocolVersion];

  for (const collection of scopedCollections) {
    const declarations = document[collection];
    if (!Array.isArray(declarations)) continue;

    const projected = declarations
      .filter(
        (declaration): declaration is ProtocolScopedDeclaration =>
          typeof declaration === 'object' &&
          declaration !== null &&
          !Array.isArray(declaration) &&
          effectiveScope(declaration, document.protocolVersions).includes(
            protocolVersion,
          ),
      )
      .map((declaration) =>
        projectDeclaration(
          declaration,
          document.protocolVersions,
          protocolVersion,
        ),
      );

    if (projected.length > 0) {
      result[collection] = projected;
    } else {
      delete result[collection];
    }
  }

  return result;
}

export function projectEffectiveProtocolView(
  document: unknown,
  options: ProjectEffectiveProtocolViewOptions,
): OperationResult<McpDescriptionDocument> {
  if (!isSupportedCoreSpecification(options.specification)) {
    return {
      ok: false,
      diagnostics: [
        operationDiagnostic(
          'unsupported-specification',
          `Effective Protocol View projection does not support ${JSON.stringify(options.specification)}`,
          [],
          options.protocolVersion,
        ),
      ],
    };
  }

  const sourceValidation = validateMcpDescription(document, {
    specification: options.specification,
  });
  const sourceDiagnostics = diagnosticsForPhase(
    sourceValidation.diagnostics,
    'source',
    options.protocolVersion,
  );
  if (!sourceValidation.valid) {
    return { ok: false, diagnostics: sourceDiagnostics };
  }

  const source = document as McpDescriptionDocument;
  if (!source.protocolVersions.includes(options.protocolVersion)) {
    return {
      ok: false,
      diagnostics: [
        ...sourceDiagnostics,
        operationDiagnostic(
          'projection-version-not-declared',
          `MCP protocol revision ${JSON.stringify(options.protocolVersion)} is absent from root protocolVersions`,
          ['protocolVersions'],
          options.protocolVersion,
        ),
      ],
    };
  }

  const value = projectDocument(source, options.protocolVersion);
  const resultValidation = validateMcpDescription(value, {
    specification: options.specification,
  });
  const diagnostics = uniqueDiagnostics(
    sourceDiagnostics,
    diagnosticsForPhase(
      resultValidation.diagnostics,
      'result',
      options.protocolVersion,
    ),
  );

  if (!resultValidation.valid) return { ok: false, diagnostics };
  return { ok: true, value, diagnostics };
}
