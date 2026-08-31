import {
  validateMcpDescription,
  type McpDescriptionDiagnostic,
} from '@mcpdesc/validator/standalone';

import type {
  CoreDiagnostic,
  DiagnosticPhase,
  JsonObject,
  McpDescriptionDocument,
  OperationResult,
} from './model.js';
import {
  isSupportedCoreSpecification,
  type SupportedCoreSpecification,
} from './snapshot.js';

const declarationIdentities = {
  tools: 'name',
  resources: 'uri',
  resourceTemplates: 'uriTemplate',
  prompts: 'name',
} as const;

export interface DeclarationSelections {
  readonly tools?: readonly string[];
  readonly resources?: readonly string[];
  readonly resourceTemplates?: readonly string[];
  readonly prompts?: readonly string[];
}

export interface SelectMcpDescriptionDeclarationsOptions {
  readonly specification: SupportedCoreSpecification;
  readonly selections: DeclarationSelections;
}

function diagnosticsForPhase(
  diagnostics: readonly McpDescriptionDiagnostic[],
  phase: DiagnosticPhase,
): CoreDiagnostic[] {
  return diagnostics.map((diagnostic) => ({ ...diagnostic, phase }));
}

function uniqueDiagnostics(
  ...groups: readonly (readonly CoreDiagnostic[])[]
): CoreDiagnostic[] {
  const seen = new Set<string>();
  return groups.flatMap((group) =>
    group.filter((diagnostic) => {
      const identity = JSON.stringify([
        diagnostic.code,
        diagnostic.severity,
        diagnostic.message,
        diagnostic.path,
        diagnostic.protocolVersion,
      ]);
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    }),
  );
}

function selectDeclarations(
  document: McpDescriptionDocument,
  selections: DeclarationSelections,
): McpDescriptionDocument {
  const result = structuredClone(document);

  for (const [collection, identityProperty] of Object.entries(
    declarationIdentities,
  ) as Array<
    [
      keyof typeof declarationIdentities,
      (typeof declarationIdentities)[keyof typeof declarationIdentities],
    ]
  >) {
    const selectedIdentities = new Set(selections[collection] ?? []);
    const declarations = document[collection];
    if (!Array.isArray(declarations) || selectedIdentities.size === 0) {
      delete result[collection];
      continue;
    }

    const selected = declarations.filter(
      (declaration): declaration is JsonObject =>
        typeof declaration === 'object' &&
        declaration !== null &&
        !Array.isArray(declaration) &&
        typeof declaration[identityProperty] === 'string' &&
        selectedIdentities.has(declaration[identityProperty]),
    );

    if (selected.length > 0) {
      result[collection] = structuredClone(selected);
    } else {
      delete result[collection];
    }
  }

  return result;
}

export function selectMcpDescriptionDeclarations(
  document: unknown,
  options: SelectMcpDescriptionDeclarationsOptions,
): OperationResult<McpDescriptionDocument> {
  if (!isSupportedCoreSpecification(options.specification)) {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'unsupported-specification',
          severity: 'error',
          message: `Declaration selection does not support ${JSON.stringify(options.specification)}`,
          path: [],
          phase: 'operation',
        },
      ],
    };
  }

  const sourceValidation = validateMcpDescription(document, {
    specification: options.specification,
  });
  const sourceDiagnostics = diagnosticsForPhase(
    sourceValidation.diagnostics,
    'source',
  );
  if (!sourceValidation.valid) {
    return { ok: false, diagnostics: sourceDiagnostics };
  }

  const value = selectDeclarations(
    document as McpDescriptionDocument,
    options.selections,
  );
  const resultValidation = validateMcpDescription(value, {
    specification: options.specification,
  });
  const diagnostics = uniqueDiagnostics(
    sourceDiagnostics,
    diagnosticsForPhase(resultValidation.diagnostics, 'result'),
  );

  if (!resultValidation.valid) return { ok: false, diagnostics };
  return { ok: true, value, diagnostics };
}
