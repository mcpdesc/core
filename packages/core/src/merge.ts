import {
  validateMcpDescription,
  type McpDescriptionDiagnostic,
  type SupportedProtocolVersion,
} from '@mcpdesc/validator/standalone';

import type {
  CoreDiagnostic,
  JsonObject,
  JsonValue,
  McpDescriptionDocument,
  OperationResult,
  ProtocolScopedDeclaration,
} from './model.js';
import {
  selectCoreSpecification,
  V0_9_DRAFT_4_SPECIFICATION,
  V0_9_RC_1_SPECIFICATION,
  V0_9_RC_2_SPECIFICATION,
  type CoreSelectorOptions,
} from './snapshot.js';

const scopedCollections = [
  'transports',
  'capabilities',
  'tools',
  'resources',
  'resourceTemplates',
  'prompts',
] as const;

const componentNamespaces = [
  'schemas',
  'toolExamples',
  'resourceExamples',
  'resourceTemplateExamples',
  'promptExamples',
] as const;

type MutableObject = Record<string, unknown>;

export type MergeEffectiveProtocolViewsOptions = CoreSelectorOptions;

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
  mergeComponents: boolean,
): McpDescriptionDocument {
  const result = structuredClone(document) as MutableObject;
  delete result.protocolVersions;
  for (const collection of scopedCollections) delete result[collection];
  if (mergeComponents) delete result.components;
  return result as McpDescriptionDocument;
}

function isRecord(value: unknown): value is MutableObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function componentReference(
  value: unknown,
): { readonly namespace: string; readonly name: string } | undefined {
  if (!isRecord(value) || typeof value.$componentRef !== 'string') return;
  const match = /^#\/components\/([^/]+)\/([^/]+)$/.exec(value.$componentRef);
  if (!match) return;
  return { namespace: match[1]!, name: match[2]! };
}

function resolveComponentValue(
  value: unknown,
  components: unknown,
  stack: ReadonlySet<string> = new Set(),
): unknown {
  const reference = componentReference(value);
  if (reference) {
    const key = `${reference.namespace}/${reference.name}`;
    const componentsObject = isRecord(components) ? components : undefined;
    const candidateRegistry = componentsObject?.[reference.namespace];
    const registry: Record<string, unknown> | undefined = isRecord(
      candidateRegistry,
    )
      ? candidateRegistry
      : undefined;
    const target = registry?.[reference.name];
    if (target === undefined || stack.has(key)) return value;
    return resolveComponentValue(target, components, new Set([...stack, key]));
  }
  if (Array.isArray(value)) {
    return value.map((child) =>
      resolveComponentValue(child, components, stack),
    );
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        resolveComponentValue(child, components, stack),
      ]),
    );
  }
  return value;
}

function rewriteComponentReferences(
  value: unknown,
  mappings: ReadonlyMap<string, ReadonlyMap<string, string>>,
): unknown {
  const reference = componentReference(value);
  if (reference) {
    const name = mappings.get(reference.namespace)?.get(reference.name);
    if (name === undefined || !isRecord(value)) return value;
    return {
      ...value,
      $componentRef: `#/components/${reference.namespace}/${name}`,
    };
  }
  if (Array.isArray(value)) {
    return value.map((child) => rewriteComponentReferences(child, mappings));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        rewriteComponentReferences(child, mappings),
      ]),
    );
  }
  return value;
}

type ComponentMergeResult =
  | {
      readonly ok: true;
      readonly components: JsonObject | undefined;
      readonly views: ReadonlyMap<
        SupportedProtocolVersion,
        McpDescriptionDocument
      >;
    }
  | { readonly ok: false; readonly diagnostic: CoreDiagnostic };

function mergeComponentViews(
  views: ReadonlyMap<SupportedProtocolVersion, McpDescriptionDocument>,
  versions: readonly SupportedProtocolVersion[],
): ComponentMergeResult {
  const extensions = new Map<string, { value: unknown; canonical: string }>();
  const outputNames = new Map<
    (typeof componentNamespaces)[number],
    Map<string, { baseName: string; canonical: string }>
  >(componentNamespaces.map((namespace) => [namespace, new Map()]));
  const mergedRegistries = new Map<
    (typeof componentNamespaces)[number],
    MutableObject
  >(componentNamespaces.map((namespace) => [namespace, {}]));
  const normalizedViews = new Map<
    SupportedProtocolVersion,
    McpDescriptionDocument
  >();

  for (const version of versions) {
    const view = views.get(version)!;
    const components = isRecord(view.components) ? view.components : {};
    for (const [key, value] of Object.entries(components)) {
      if ((componentNamespaces as readonly string[]).includes(key)) continue;
      const canonical = canonicalString(value);
      const existing = extensions.get(key);
      if (existing && existing.canonical !== canonical) {
        return {
          ok: false,
          diagnostic: operationDiagnostic(
            'conflicting-unscoped-metadata',
            `Conflicting Components Object extension ${JSON.stringify(key)}`,
          ),
        };
      }
      extensions.set(key, { value: structuredClone(value), canonical });
    }

    const mappings = new Map<string, Map<string, string>>(
      componentNamespaces.map((namespace) => [namespace, new Map()]),
    );
    const pending: Array<{
      namespace: (typeof componentNamespaces)[number];
      name: string;
      outputName: string;
      value: unknown;
    }> = [];

    for (const namespace of componentNamespaces) {
      const sourceRegistry: Record<string, unknown> = isRecord(
        components[namespace],
      )
        ? components[namespace]
        : {};
      const names = outputNames.get(namespace)!;
      const destination = mergedRegistries.get(namespace)!;
      for (const [name, value] of Object.entries(sourceRegistry)) {
        const canonical = canonicalString(
          resolveComponentValue(value, components),
        );
        const existing = names.get(name);
        let outputName = name;
        if (existing) {
          if (existing.baseName === name && existing.canonical === canonical) {
            mappings.get(namespace)!.set(name, outputName);
            continue;
          }
          let suffix = 2;
          while (names.has(`${name}-${suffix}`)) suffix += 1;
          outputName = `${name}-${suffix}`;
        }
        names.set(outputName, { baseName: name, canonical });
        mappings.get(namespace)!.set(name, outputName);
        pending.push({ namespace, name, outputName, value });
        destination[outputName] = structuredClone(value) as JsonValue;
      }
    }

    for (const item of pending) {
      mergedRegistries.get(item.namespace)![item.outputName] =
        rewriteComponentReferences(item.value, mappings) as JsonValue;
    }
    normalizedViews.set(
      version,
      rewriteComponentReferences(view, mappings) as McpDescriptionDocument,
    );
  }

  const mergedComponents: MutableObject = Object.fromEntries(
    [...extensions].map(([key, entry]) => [key, entry.value]),
  );
  for (const namespace of componentNamespaces) {
    const registry = mergedRegistries.get(namespace)!;
    if (Object.keys(registry).length > 0)
      mergedComponents[namespace] = registry;
  }
  return {
    ok: true,
    components:
      Object.keys(mergedComponents).length > 0
        ? (mergedComponents as JsonObject)
        : undefined,
    views: normalizedViews,
  };
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
  options: MergeEffectiveProtocolViewsOptions = {},
): OperationResult<McpDescriptionDocument> {
  if (
    options.selector === undefined &&
    options.specification === undefined &&
    documents.length === 0
  ) {
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
  const selection = selectCoreSpecification(
    documents[0],
    options,
    'Effective Protocol View merge',
  );
  if (!selection.ok) return selection;
  const { specification } = selection;
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
      specification,
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
  const mergeComponents =
    specification === V0_9_DRAFT_4_SPECIFICATION ||
    specification === V0_9_RC_1_SPECIFICATION ||
    specification === V0_9_RC_2_SPECIFICATION;
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
    unscopedDocumentPart(firstView, mergeComponents),
  );
  for (const [version, view] of views) {
    if (
      semanticCanonicalString(unscopedDocumentPart(view, mergeComponents)) !==
      expectedUnscoped
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

  let collectionViews: ReadonlyMap<
    SupportedProtocolVersion,
    McpDescriptionDocument
  > = views;
  let mergedComponents: JsonObject | undefined;
  if (mergeComponents) {
    const componentMerge = mergeComponentViews(views, versions);
    if (!componentMerge.ok) {
      return {
        ok: false,
        diagnostics: [
          ...uniqueDiagnostics(sourceDiagnostics),
          componentMerge.diagnostic,
        ],
      };
    }
    collectionViews = componentMerge.views;
    mergedComponents = componentMerge.components;
  }

  const value = unscopedDocumentPart(firstView, mergeComponents);
  value.protocolVersions = versions;
  if (mergedComponents) value.components = mergedComponents;
  for (const collection of scopedCollections) {
    const merged = mergeCollection(collectionViews, collection, versions);
    if (merged.length > 0) value[collection] = merged as JsonValue;
  }

  const resultValidation = validateMcpDescription(value, {
    specification,
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
