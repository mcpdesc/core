import { validateMcpDescription } from '@mcpdesc/validator/standalone';

import type { CoreDiagnostic, JsonObject, JsonValue } from './model.js';
import {
  V0_9_DRAFT_2_SCHEMA_URI,
  V0_9_DRAFT_2_SPECIFICATION,
} from './snapshot.js';

const sourceSelector = '0.8.0-rev.20261021';
const targetVersion = '0.9.0';

const conversionRules = [
  {
    id: 'mcpdesc.conversion.0-8-to-0-9.tool-annotations-closed',
    targetRules: ['mcp.tool-annotations.members'],
    fixes: ['remove-property'],
  },
  {
    id: 'mcpdesc.conversion.0-8-to-0-9.annotations-closed',
    targetRules: ['mcp.annotations.members'],
    fixes: ['remove-property'],
  },
  {
    id: 'mcpdesc.conversion.0-8-to-0-9.client-requirements-closed',
    targetRules: ['mcp.client-capabilities.members'],
    fixes: ['remove-property', 'move-to-experimental'],
  },
  {
    id: 'mcpdesc.conversion.0-8-to-0-9.completion-result-closed',
    targetRules: ['mcp.completion.result-closed'],
    fixes: ['remove-property'],
  },
  {
    id: 'mcpdesc.conversion.0-8-to-0-9.uri-template-checked',
    targetRules: ['mcp.resource-template.uri-template'],
    fixes: [],
  },
  {
    id: 'mcpdesc.conversion.0-8-to-0-9.integer-numbers',
    targetRules: ['mcp.resource.size', 'mcp.cacheable-result.ttl-ms'],
    fixes: [],
  },
] as const;

export type McpDescriptionConversionFixKind =
  'remove-property' | 'move-to-experimental';

export interface McpDescriptionConversionFix {
  readonly fix: McpDescriptionConversionFixKind;
  readonly path: readonly (number | string)[];
}

export interface McpDescriptionConversionOptions {
  readonly from: string;
  readonly to: string;
  readonly fixes?: readonly McpDescriptionConversionFix[];
}

export type McpDescriptionJsonPatchOperation =
  | {
      readonly op: 'add' | 'replace';
      readonly path: string;
      readonly value: JsonValue;
    }
  | { readonly op: 'remove'; readonly path: string }
  | { readonly op: 'move'; readonly from: string; readonly path: string };

export type McpDescriptionConversionResult =
  | {
      readonly ok: true;
      readonly status: 'converted';
      readonly value: JsonObject;
      readonly patch: readonly McpDescriptionJsonPatchOperation[];
      readonly diagnostics: readonly CoreDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly status: 'blocked' | 'invalid-source' | 'unsupported';
      readonly diagnostics: readonly CoreDiagnostic[];
    };

function diagnostic(
  code: string,
  message: string,
  path: readonly (number | string)[],
  rule: string,
  phase: CoreDiagnostic['phase'],
): CoreDiagnostic {
  return { code, severity: 'error', message, path, rule, phase };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pointer(path: readonly (number | string)[]): string {
  return path
    .map(
      (segment) =>
        `/${String(segment).replaceAll('~', '~0').replaceAll('/', '~1')}`,
    )
    .join('');
}

function parentAtPath(
  root: unknown,
  path: readonly (number | string)[],
):
  | { parent: Record<string, unknown> | unknown[]; key: string | number }
  | undefined {
  if (path.length === 0) return undefined;
  let current = root;
  for (const segment of path.slice(0, -1)) {
    if (Array.isArray(current) && typeof segment === 'number') {
      current = current[segment];
    } else if (isObject(current) && typeof segment === 'string') {
      current = current[segment];
    } else {
      return undefined;
    }
  }
  const key = path.at(-1)!;
  if (Array.isArray(current) && typeof key === 'number') {
    return { parent: current, key };
  }
  if (isObject(current) && typeof key === 'string') {
    return { parent: current, key };
  }
  return undefined;
}

function hasValueAtPath(
  root: unknown,
  path: readonly (number | string)[],
): boolean {
  const location = parentAtPath(root, path);
  if (!location) return false;
  return Array.isArray(location.parent)
    ? typeof location.key === 'number' && location.key < location.parent.length
    : Object.hasOwn(location.parent, location.key);
}

function removeAtPath(
  root: unknown,
  path: readonly (number | string)[],
): boolean {
  const location = parentAtPath(root, path);
  if (!location || !hasValueAtPath(root, path)) return false;
  if (Array.isArray(location.parent) && typeof location.key === 'number') {
    location.parent.splice(location.key, 1);
  } else if (
    !Array.isArray(location.parent) &&
    typeof location.key === 'string'
  ) {
    delete location.parent[location.key];
  }
  return true;
}

function addAtPath(
  root: unknown,
  path: readonly (number | string)[],
  value: unknown,
): boolean {
  const location = parentAtPath(root, path);
  if (!location) return false;
  if (Array.isArray(location.parent) && typeof location.key === 'number') {
    if (location.key > location.parent.length) return false;
    location.parent.splice(location.key, 0, value);
  } else if (
    !Array.isArray(location.parent) &&
    typeof location.key === 'string'
  ) {
    location.parent[location.key] = value;
  }
  return true;
}

function matchingRule(
  rule: string | undefined,
): (typeof conversionRules)[number] | undefined {
  return conversionRules.find((candidate) =>
    candidate.targetRules.includes(rule as never),
  );
}

function pathStartsWith(
  path: readonly (number | string)[],
  prefix: readonly (number | string)[],
): boolean {
  return (
    prefix.length <= path.length &&
    prefix.every((segment, index) => path[index] === segment)
  );
}

function isSchemaConsequence(
  diagnosticPath: readonly (number | string)[],
  blockerPaths: readonly (readonly (number | string)[])[],
): boolean {
  return blockerPaths.some((blockerPath) => {
    if (
      pathStartsWith(diagnosticPath, blockerPath) ||
      pathStartsWith(blockerPath, diagnosticPath)
    ) {
      return true;
    }
    return (
      diagnosticPath.at(-1) === '$componentRef' &&
      blockerPath.length >= 2 &&
      JSON.stringify(diagnosticPath.slice(0, -1)) ===
        JSON.stringify(blockerPath.slice(0, -2))
    );
  });
}

function conversionBlockerPaths(
  diagnostics: readonly CoreDiagnostic[],
): readonly (readonly (number | string)[])[] {
  return diagnostics
    .filter((item) => item.severity === 'error' && matchingRule(item.rule))
    .map((item) => item.path);
}

export function convertMcpDescriptionVersion(
  document: unknown,
  options: McpDescriptionConversionOptions,
): McpDescriptionConversionResult {
  if (options.from !== '0.8.0' || options.to !== targetVersion) {
    return {
      ok: false,
      status: 'unsupported',
      diagnostics: [
        diagnostic(
          'conversion-path-undefined',
          `No MCP Description conversion is defined from ${JSON.stringify(options.from)} to ${JSON.stringify(options.to)}`,
          [],
          'mcpdesc.conversion.path-defined',
          'operation',
        ),
      ],
    };
  }

  const sourceValidation = validateMcpDescription(document, {
    selector: sourceSelector,
  });
  if (!sourceValidation.valid) {
    return {
      ok: false,
      status: 'invalid-source',
      diagnostics: [
        diagnostic(
          'conversion-source-invalid',
          'The source document is not valid under MCP Description 0.8.0 rules',
          [],
          'mcpdesc.conversion.source-valid',
          'source',
        ),
      ],
    };
  }

  const value = structuredClone(document) as JsonObject;
  const patch: McpDescriptionJsonPatchOperation[] = [];
  value.mcpdesc = targetVersion;
  patch.push({ op: 'replace', path: '/mcpdesc', value: targetVersion });
  if (Object.hasOwn(value, '$schema')) {
    value.$schema = V0_9_DRAFT_2_SCHEMA_URI;
    patch.push({
      op: 'replace',
      path: '/$schema',
      value: V0_9_DRAFT_2_SCHEMA_URI,
    });
  }

  const beforeFixValidation = validateMcpDescription(value, {
    selector: V0_9_DRAFT_2_SPECIFICATION,
  });
  const beforeFixDiagnostics = beforeFixValidation.diagnostics.map((item) => ({
    ...item,
    phase: 'result' as const,
  }));
  const fixDiagnostics: CoreDiagnostic[] = [];

  for (const requested of options.fixes ?? []) {
    const blocker = beforeFixDiagnostics.find(
      (item) =>
        item.severity === 'error' &&
        JSON.stringify(item.path) === JSON.stringify(requested.path) &&
        matchingRule(item.rule)?.fixes.includes(requested.fix as never),
    );
    let applied = false;

    if (blocker && requested.fix === 'remove-property') {
      applied = removeAtPath(value, requested.path);
      if (applied) patch.push({ op: 'remove', path: pointer(requested.path) });
    } else if (blocker && requested.fix === 'move-to-experimental') {
      const source = parentAtPath(value, requested.path);
      const requirementName = requested.path.at(-1);
      const requirementParentPath = requested.path.slice(0, -1);
      const experimentalPath = [...requirementParentPath, 'experimental'];
      const sourceValue =
        source &&
        typeof requirementName === 'string' &&
        !Array.isArray(source.parent)
          ? source.parent[requirementName]
          : undefined;
      const hadExperimental = hasValueAtPath(value, experimentalPath);
      if (
        source &&
        typeof requirementName === 'string' &&
        !hasValueAtPath(value, [...experimentalPath, requirementName]) &&
        (hadExperimental || addAtPath(value, experimentalPath, {}))
      ) {
        if (!hadExperimental) {
          patch.push({ op: 'add', path: pointer(experimentalPath), value: {} });
        }
        const from = pointer(requested.path);
        const destination = [...experimentalPath, requirementName];
        const moved = removeAtPath(value, requested.path);
        if (moved && addAtPath(value, destination, sourceValue)) {
          patch.push({ op: 'move', from, path: pointer(destination) });
          applied = true;
        }
      }
    }

    if (!applied) {
      fixDiagnostics.push(
        diagnostic(
          'conversion-fix-not-applicable',
          `Conversion fix ${JSON.stringify(requested.fix)} is not applicable at this path`,
          requested.path,
          'mcpdesc.conversion.fix-applicable',
          'operation',
        ),
      );
    }
  }

  const resultValidation = validateMcpDescription(value, {
    selector: V0_9_DRAFT_2_SPECIFICATION,
  });
  const targetDiagnostics = resultValidation.diagnostics.map((item) => ({
    ...item,
    phase: 'result' as const,
  }));
  const blockerPaths = conversionBlockerPaths(targetDiagnostics);
  const diagnostics: CoreDiagnostic[] = [...fixDiagnostics];

  for (const item of targetDiagnostics) {
    if (item.severity !== 'error') {
      diagnostics.push(item);
      continue;
    }
    const rule = matchingRule(item.rule);
    if (rule) {
      diagnostics.push({
        ...item,
        code: 'conversion-blocked',
        rule: rule.id,
        phase: 'operation',
      });
    } else if (
      item.rule === 'mcpdesc.document.schema' &&
      isSchemaConsequence(item.path, blockerPaths)
    ) {
      continue;
    } else {
      diagnostics.push(item);
    }
  }

  if (
    fixDiagnostics.length > 0 ||
    diagnostics.some(({ severity }) => severity === 'error')
  ) {
    return { ok: false, status: 'blocked', diagnostics };
  }
  return { ok: true, status: 'converted', value, patch, diagnostics };
}
