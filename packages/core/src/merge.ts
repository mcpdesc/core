import {
  validateMcpDescription,
  type McpDescriptionDiagnostic,
  type SupportedProtocolVersion,
} from '@mcpdesc/validator/standalone';

import type {
  CoreDiagnostic,
  JsonValue,
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

type MutableObject = Record<string, unknown>;

export interface MergeEffectiveProtocolViewsOptions {
  readonly specification: SupportedCoreSpecification;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

function canonicalString(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function normalizeSecurity(owner: MutableObject): void {
  if (!Array.isArray(owner.security)) return;
  owner.security = owner.security
    .map((requirement: MutableObject) =>
      Object.fromEntries(
        Object.entries(requirement)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, scopes]) => [
            name,
            Array.isArray(scopes) ? [...scopes].sort() : scopes,
          ]),
      ),
    )
    .sort((left, right) =>
      canonicalString(left).localeCompare(canonicalString(right)),
    );
}

function semanticCanonicalString(value: unknown): string {
  const normalized = structuredClone(value) as MutableObject;
  if (Array.isArray(normalized.protocolVersions)) {
    normalized.protocolVersions.sort();
  }
  normalizeSecurity(normalized);

  for (const collection of scopedCollections) {
    const declarations = normalized[collection];
    if (!Array.isArray(declarations)) continue;
    for (const declaration of declarations as MutableObject[]) {
      if (Array.isArray(declaration.protocolVersions)) {
        declaration.protocolVersions.sort();
      }
      if (Array.isArray(declaration.elicitations)) {
        for (const elicitation of declaration.elicitations as MutableObject[]) {
          if (Array.isArray(elicitation.protocolVersions)) {
            elicitation.protocolVersions.sort();
          }
        }
      }
      normalizeSecurity(declaration);
    }
    declarations.sort((left, right) =>
      canonicalString(left).localeCompare(canonicalString(right)),
    );
  }

  return canonicalString(normalized);
}

export function areMcpDescriptionDocumentsSemanticallyEquivalent(
  left: unknown,
  right: unknown,
): boolean {
  return semanticCanonicalString(left) === semanticCanonicalString(right);
}

function withoutScope(
  declaration: ProtocolScopedDeclaration,
): ProtocolScopedDeclaration {
  const result = structuredClone(declaration);
  delete result.protocolVersions;
  return result;
}

function projectUnchecked(
  document: McpDescriptionDocument,
  protocolVersion: SupportedProtocolVersion,
): McpDescriptionDocument {
  const result = structuredClone(document);
  result.protocolVersions = [protocolVersion];

  for (const collection of scopedCollections) {
    const declarations = document[collection];
    if (!Array.isArray(declarations)) continue;
    const projected = declarations
      .filter((declaration): declaration is ProtocolScopedDeclaration => {
        if (
          declaration === null ||
          typeof declaration !== 'object' ||
          Array.isArray(declaration)
        ) {
          return false;
        }
        const scope = Array.isArray(declaration.protocolVersions)
          ? declaration.protocolVersions
          : document.protocolVersions;
        return scope.includes(protocolVersion);
      })
      .map(withoutScope);

    if (projected.length > 0) result[collection] = projected;
    else delete result[collection];
  }

  return result;
}

function unscopedDocumentPart(
  document: McpDescriptionDocument,
): McpDescriptionDocument {
  const result = structuredClone(document) as MutableObject;
  delete result.protocolVersions;
  for (const collection of scopedCollections) delete result[collection];
  return result as McpDescriptionDocument;
}

function mergeCollection(
  views: ReadonlyMap<SupportedProtocolVersion, McpDescriptionDocument>,
  collection: (typeof scopedCollections)[number],
  allVersions: readonly SupportedProtocolVersion[],
): ProtocolScopedDeclaration[] {
  const declarations = new Map<
    string,
    {
      declaration: ProtocolScopedDeclaration;
      versions: SupportedProtocolVersion[];
    }
  >();

  for (const [version, view] of views) {
    const values = view[collection];
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        continue;
      }
      const declaration = withoutScope(value as ProtocolScopedDeclaration);
      const key = semanticCanonicalString(declaration);
      const existing = declarations.get(key) ?? { declaration, versions: [] };
      existing.versions.push(version);
      declarations.set(key, existing);
    }
  }

  return [...declarations.values()]
    .sort((left, right) =>
      canonicalString(left.declaration).localeCompare(
        canonicalString(right.declaration),
      ),
    )
    .map(({ declaration, versions }) => {
      const orderedVersions = allVersions.filter((version) =>
        versions.includes(version),
      );
      return orderedVersions.length === allVersions.length
        ? declaration
        : { ...declaration, protocolVersions: orderedVersions };
    });
}

function diagnosticForPhase(
  diagnostic: McpDescriptionDiagnostic,
  phase: 'result' | 'source',
): CoreDiagnostic {
  return { ...diagnostic, phase };
}

function operationDiagnostic(code: string, message: string): CoreDiagnostic {
  return { code, severity: 'error', message, path: [], phase: 'operation' };
}

function uniqueDiagnostics(
  diagnostics: readonly CoreDiagnostic[],
): CoreDiagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const identity = JSON.stringify([
      diagnostic.code,
      diagnostic.severity,
      diagnostic.message,
      diagnostic.path,
      diagnostic.phase,
    ]);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export function mergeEffectiveProtocolViews(
  documents: readonly unknown[],
  options: MergeEffectiveProtocolViewsOptions,
): OperationResult<McpDescriptionDocument> {
  if (!isSupportedCoreSpecification(options.specification)) {
    return {
      ok: false,
      diagnostics: [
        operationDiagnostic(
          'unsupported-specification',
          `Effective Protocol View merge does not support ${JSON.stringify(options.specification)}`,
        ),
      ],
    };
  }
  if (documents.length === 0) {
    return {
      ok: false,
      diagnostics: [
        operationDiagnostic(
          'merge-input-required',
          'At least one MCP Description document is required for merge',
        ),
      ],
    };
  }

  const sourceDiagnostics = documents.flatMap((document) =>
    validateMcpDescription(document, {
      specification: options.specification,
    }).diagnostics.map((diagnostic) =>
      diagnosticForPhase(diagnostic, 'source'),
    ),
  );
  if (sourceDiagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    return { ok: false, diagnostics: uniqueDiagnostics(sourceDiagnostics) };
  }

  const sources = documents as readonly McpDescriptionDocument[];
  const views = new Map<SupportedProtocolVersion, McpDescriptionDocument>();
  for (const source of sources) {
    for (const version of source.protocolVersions as SupportedProtocolVersion[]) {
      const view = projectUnchecked(source, version);
      const previous = views.get(version);
      if (
        previous &&
        !areMcpDescriptionDocumentsSemanticallyEquivalent(previous, view)
      ) {
        return {
          ok: false,
          diagnostics: [
            ...uniqueDiagnostics(sourceDiagnostics),
            operationDiagnostic(
              'conflicting-protocol-view',
              `Conflicting Effective Protocol Views for MCP ${version}`,
            ),
          ],
        };
      }
      views.set(version, previous ?? view);
    }
  }

  const versions = [...views.keys()].sort();
  const firstView = views.values().next().value;
  if (firstView === undefined) {
    return {
      ok: false,
      diagnostics: [
        operationDiagnostic(
          'merge-input-required',
          'Merge inputs contain no protocol revisions',
        ),
      ],
    };
  }
  const expectedUnscoped = semanticCanonicalString(
    unscopedDocumentPart(firstView),
  );
  for (const [version, view] of views) {
    if (
      semanticCanonicalString(unscopedDocumentPart(view)) !== expectedUnscoped
    ) {
      return {
        ok: false,
        diagnostics: [
          ...uniqueDiagnostics(sourceDiagnostics),
          operationDiagnostic(
            'conflicting-unscoped-metadata',
            `Conflicting unscoped metadata in MCP ${version} Effective Protocol View`,
          ),
        ],
      };
    }
  }

  const value = unscopedDocumentPart(firstView);
  value.protocolVersions = versions;
  for (const collection of scopedCollections) {
    const merged = mergeCollection(views, collection, versions);
    if (merged.length > 0) value[collection] = merged as JsonValue;
  }

  const resultValidation = validateMcpDescription(value, {
    specification: options.specification,
  });
  const diagnostics = uniqueDiagnostics([
    ...sourceDiagnostics,
    ...resultValidation.diagnostics.map((diagnostic) =>
      diagnosticForPhase(diagnostic, 'result'),
    ),
  ]);
  if (!resultValidation.valid) return { ok: false, diagnostics };
  return { ok: true, value, diagnostics };
}
