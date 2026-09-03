import {
  resolveMcpDescriptionComponentReferences as resolveValidatorComponentReferences,
  validateMcpDescription,
  type McpDescriptionDiagnostic,
} from '@mcpdesc/validator/standalone';

import type { CoreDiagnostic, McpDescriptionDocument } from './model.js';
import { RC_1_SPECIFICATION } from './snapshot.js';

export type {
  McpDescComponentNamespace,
  McpDescComponentReference,
  McpDescComponentRegistries,
  McpDescPromptExampleComponentMap,
  McpDescResourceExampleComponentMap,
  McpDescResourceTemplateExampleComponentMap,
  McpDescSchemaComponentMap,
  McpDescToolExampleComponentMap,
} from './model.js';

export interface ResolveMcpDescriptionComponentReferencesOptions {
  readonly specification: typeof RC_1_SPECIFICATION;
}

export interface McpDescriptionComponentReferenceProvenance {
  readonly referencePath: readonly (number | string)[];
  readonly targetPath: readonly (number | string)[];
}

export type ResolveMcpDescriptionComponentReferencesResult =
  | {
      readonly ok: true;
      readonly value: McpDescriptionDocument;
      readonly diagnostics: readonly CoreDiagnostic[];
      readonly substitutions: number;
      readonly provenance: readonly McpDescriptionComponentReferenceProvenance[];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly CoreDiagnostic[];
    };

function diagnosticsForPhase(
  diagnostics: readonly McpDescriptionDiagnostic[],
  phase: 'result' | 'source',
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
      ]);
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    }),
  );
}

export function resolveMcpDescriptionComponentReferences(
  document: unknown,
  options: ResolveMcpDescriptionComponentReferencesOptions,
): ResolveMcpDescriptionComponentReferencesResult {
  if (options.specification !== RC_1_SPECIFICATION) {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'unsupported-specification',
          severity: 'error',
          message: `Component reference resolution does not support ${JSON.stringify(options.specification)}`,
          path: [],
          phase: 'operation',
        },
      ],
    };
  }

  const sourceValidation = validateMcpDescription(document, options);
  const sourceDiagnostics = diagnosticsForPhase(
    sourceValidation.diagnostics,
    'source',
  );
  if (!sourceValidation.valid) {
    return { ok: false, diagnostics: sourceDiagnostics };
  }

  const resolution = resolveValidatorComponentReferences(document, options);
  const value = resolution.document as McpDescriptionDocument;
  const resultValidation = validateMcpDescription(value, options);
  const diagnostics = uniqueDiagnostics(
    sourceDiagnostics,
    diagnosticsForPhase(resultValidation.diagnostics, 'result'),
  );
  if (!resultValidation.valid) return { ok: false, diagnostics };

  return {
    ok: true,
    value,
    diagnostics,
    substitutions: resolution.substitutions,
    provenance: resolution.provenance,
  };
}
