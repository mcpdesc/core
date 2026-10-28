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
  selectCoreSpecification,
  V0_9_DRAFT_2_SPECIFICATION,
  V0_9_DRAFT_1_SPECIFICATION,
  type CoreSelectorOptions,
} from './snapshot.js';
import { resolveMcpDescriptionComponentReferences } from './components.js';

const scopedCollections = [
  'transports',
  'capabilities',
  'tools',
  'resources',
  'resourceTemplates',
  'prompts',
] as const;

export interface ProjectEffectiveProtocolViewOptions extends CoreSelectorOptions {
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
  const selection = selectCoreSpecification(
    document,
    options,
    'Effective Protocol View projection',
  );
  if (!selection.ok) {
    return {
      ok: false,
      diagnostics: selection.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        protocolVersion: options.protocolVersion,
      })),
    };
  }
  const { specification } = selection;

  const sourceValidation = validateMcpDescription(document, {
    specification,
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
    specification,
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

const nativeKinds = {
  tool: { collection: 'tools', identity: 'name' },
  resource: { collection: 'resources', identity: 'uri' },
  resourceTemplate: {
    collection: 'resourceTemplates',
    identity: 'uriTemplate',
  },
  prompt: { collection: 'prompts', identity: 'name' },
} as const;

export type McpNativeKind = keyof typeof nativeKinds;

export interface ProjectMcpNativeValueOptions extends CoreSelectorOptions<
  typeof V0_9_DRAFT_1_SPECIFICATION | typeof V0_9_DRAFT_2_SPECIFICATION
> {
  readonly protocolVersion: SupportedProtocolVersion;
  readonly kind: McpNativeKind;
  readonly identifier?: string;
}

const descriptionOnlyFields = new Set([
  'protocolVersions',
  'examples',
  'interactionExamples',
  'completionExamples',
  'tags',
  'elicitations',
  'deprecated',
  'security',
  'clientRequirements',
]);

function nativeValue(declaration: JsonObject): JsonObject {
  const value: JsonObject = {};
  for (const [key, child] of Object.entries(declaration)) {
    if (descriptionOnlyFields.has(key) || key.startsWith('x-')) continue;
    if ((key === 'arguments' || key === 'icons') && Array.isArray(child)) {
      value[key] = child.map((entry) =>
        Object.fromEntries(
          Object.entries(entry as JsonObject).filter(
            ([field]) => !field.startsWith('x-'),
          ),
        ),
      );
    } else {
      value[key] = structuredClone(child);
    }
  }
  return value;
}

export function projectMcpNativeValue(
  document: unknown,
  options: ProjectMcpNativeValueOptions & { readonly identifier: string },
): OperationResult<JsonObject>;
export function projectMcpNativeValue(
  document: unknown,
  options: ProjectMcpNativeValueOptions & { readonly identifier?: undefined },
): OperationResult<JsonObject[]>;
export function projectMcpNativeValue(
  document: unknown,
  options: ProjectMcpNativeValueOptions,
): OperationResult<JsonObject | JsonObject[]>;
export function projectMcpNativeValue(
  document: unknown,
  options: ProjectMcpNativeValueOptions,
): OperationResult<JsonObject | JsonObject[]> {
  const failure = (
    code: string,
    message: string,
    path: readonly (number | string)[] = [],
  ): CoreDiagnostic =>
    operationDiagnostic(code, message, path, options.protocolVersion);
  const selection = selectCoreSpecification(
    document,
    options,
    'Native MCP projection',
  );
  if (!selection.ok) {
    return {
      ok: false,
      diagnostics: selection.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        protocolVersion: options.protocolVersion,
      })),
    };
  }
  if (
    selection.specification !== V0_9_DRAFT_1_SPECIFICATION &&
    selection.specification !== V0_9_DRAFT_2_SPECIFICATION
  ) {
    return {
      ok: false,
      diagnostics: [
        failure(
          'unsupported-specification',
          `Native MCP projection does not support ${JSON.stringify(selection.specification)}`,
        ),
      ],
    };
  }
  if (!Object.hasOwn(nativeKinds, options.kind)) {
    return {
      ok: false,
      diagnostics: [
        failure(
          'projection-unsupported-kind',
          `Unsupported MCP kind ${JSON.stringify(options.kind)}`,
        ),
      ],
    };
  }
  const selector = selection.specification;
  const view = projectEffectiveProtocolView(document, {
    selector,
    protocolVersion: options.protocolVersion,
  });
  if (!view.ok) {
    const sourceInvalid = view.diagnostics.some(
      (diagnostic) =>
        diagnostic.phase === 'source' && diagnostic.severity === 'error',
    );
    return {
      ok: false,
      diagnostics: sourceInvalid
        ? [
            ...view.diagnostics,
            failure(
              'projection-source-invalid',
              'Native MCP projection requires a valid source document',
            ),
          ]
        : view.diagnostics.map((diagnostic) =>
            diagnostic.code === 'projection-version-not-declared'
              ? { ...diagnostic, code: 'projection-revision-not-declared' }
              : diagnostic,
          ),
    };
  }
  const resolved = resolveMcpDescriptionComponentReferences(view.value, {
    selector,
  });
  if (!resolved.ok) return resolved;
  const { collection, identity } = nativeKinds[options.kind];
  const declarations = (resolved.value[collection] ?? []) as JsonObject[];
  const selected =
    options.identifier === undefined
      ? declarations
      : declarations.filter(
          (declaration) => declaration[identity] === options.identifier,
        );
  const diagnostics = uniqueDiagnostics(view.diagnostics, resolved.diagnostics);
  if (options.identifier !== undefined && selected.length === 0) {
    return {
      ok: false,
      diagnostics: [
        ...diagnostics,
        failure(
          'projection-declaration-not-applicable',
          `No applicable ${options.kind} ${JSON.stringify(options.identifier)}`,
          [collection],
        ),
      ],
    };
  }
  const values = selected.map(nativeValue);
  const projectedDocument = { ...resolved.value };
  if (values.length > 0) projectedDocument[collection] = values;
  else delete projectedDocument[collection];
  const resultValidation = validateMcpDescription(projectedDocument, {
    selector,
  });
  const resultDiagnostics = uniqueDiagnostics(
    diagnostics,
    diagnosticsForPhase(
      resultValidation.diagnostics,
      'result',
      options.protocolVersion,
    ),
  );
  if (!resultValidation.valid)
    return { ok: false, diagnostics: resultDiagnostics };
  return {
    ok: true,
    value: options.identifier === undefined ? values : values[0]!,
    diagnostics: resultDiagnostics,
  };
}
