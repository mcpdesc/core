import {
  getNodeValue,
  parseTree,
  printParseErrorCode,
  type Node,
  type ParseError,
} from 'jsonc-parser';
import {
  parseDocument as parseYamlDocument,
  Schema,
  stringify,
  visit,
} from 'yaml';

import { orderDocumentValue } from './document-ordering.js';
import type { JsonValue } from './model.js';
import {
  assertNormalizedYamlValue,
  serializeNormalizedYaml,
} from './normalized-yaml.js';

const yamlInputSchema = new Schema({
  schema: 'json',
  // The restricted profile treats unmatched plain scalars as strings.
  customTags: (tags) =>
    tags.filter((tag) => typeof tag !== 'string' && tag.tag !== ''),
});

export type DocumentSourceFormat = 'json' | 'yaml';

export interface DocumentSourceLocation {
  readonly line: number;
  readonly column: number;
}

export interface DocumentSourceDiagnostic {
  readonly code: 'document-parse';
  readonly severity: 'error';
  readonly message: string;
  readonly path: readonly [];
  readonly location?: DocumentSourceLocation;
}

export type ParseMcpDescriptionSourceResult =
  | {
      readonly ok: true;
      readonly value: JsonValue;
      readonly format: DocumentSourceFormat;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly DocumentSourceDiagnostic[];
    };

export interface ParseMcpDescriptionSourceOptions {
  readonly format?: DocumentSourceFormat;
}

export type SerializeMcpDescriptionOptions =
  | {
      readonly format: DocumentSourceFormat;
      readonly keyOrder?: 'sorted' | 'preserve' | 'document';
      readonly presentation?: undefined;
    }
  | {
      readonly format: 'yaml';
      readonly keyOrder?: 'sorted' | 'preserve' | 'document';
      readonly presentation: 'normalized';
    };

function lineAndColumn(source: string, offset: number): DocumentSourceLocation {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

function failure(
  message: string,
  location?: DocumentSourceLocation,
): ParseMcpDescriptionSourceResult {
  return {
    ok: false,
    diagnostics: [
      {
        code: 'document-parse',
        severity: 'error',
        message,
        path: [],
        ...(location ? { location } : {}),
      },
    ],
  };
}

function parseJson(source: string): ParseMcpDescriptionSourceResult {
  const errors: ParseError[] = [];
  const root = parseTree(source, errors, {
    allowTrailingComma: false,
    disallowComments: true,
  });
  const error = errors[0];
  if (error) {
    return failure(
      `Invalid JSON: ${printParseErrorCode(error.error)}`,
      lineAndColumn(source, error.offset),
    );
  }
  if (!root) return failure('Invalid JSON: ValueExpected');

  const duplicate = findDuplicateProperty(root);
  if (duplicate) {
    return failure(
      `Invalid JSON: Duplicate property ${JSON.stringify(duplicate.value)}`,
      lineAndColumn(source, duplicate.offset),
    );
  }
  const nonFinite = findNonFiniteNumber(root);
  if (nonFinite) {
    return failure(
      'Invalid JSON: numbers must be finite',
      lineAndColumn(source, nonFinite.offset),
    );
  }

  const value = getNodeValue(root) as JsonValue;
  return { ok: true, value, format: 'json', diagnostics: [] };
}

function findDuplicateProperty(node: Node): Node | undefined {
  if (node.type === 'object') {
    const names = new Set<string>();
    for (const property of node.children ?? []) {
      const name = property.children?.[0];
      if (!name || typeof name.value !== 'string') continue;
      if (names.has(name.value)) return name;
      names.add(name.value);
    }
  }
  for (const child of node.children ?? []) {
    const duplicate = findDuplicateProperty(child);
    if (duplicate) return duplicate;
  }
  return undefined;
}

function findNonFiniteNumber(node: Node): Node | undefined {
  if (node.type === 'number' && !Number.isFinite(node.value)) return node;
  for (const child of node.children ?? []) {
    const nonFinite = findNonFiniteNumber(child);
    if (nonFinite) return nonFinite;
  }
  return undefined;
}

function jsonCompatibleYaml(
  value: unknown,
  ancestors = new Set<object>(),
): JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return value;
    throw new Error('non-finite numbers are not supported');
  }
  if (typeof value !== 'object') {
    throw new Error(`values of type ${typeof value} are not supported`);
  }
  if (ancestors.has(value)) throw new Error('cyclic aliases are not supported');

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => jsonCompatibleYaml(item, ancestors));
    }
    if (value instanceof Map) {
      const entries = [...value].map(([key, child]) => {
        if (typeof key !== 'string') {
          throw new Error('mapping keys must be strings');
        }
        return [key, jsonCompatibleYaml(child, ancestors)] as const;
      });
      return Object.fromEntries(entries);
    }
    throw new Error(
      `${Object.prototype.toString.call(value)} values are not supported`,
    );
  } finally {
    ancestors.delete(value);
  }
}

function parseYaml(source: string): ParseMcpDescriptionSourceResult {
  const document = parseYamlDocument(source, {
    schema: yamlInputSchema,
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
    version: '1.2',
  });
  const error = document.errors[0] ?? document.warnings[0];
  if (error) {
    const position = error.linePos?.[0];
    return failure(
      error.message,
      position ? { line: position.line, column: position.col } : undefined,
    );
  }

  try {
    visit(document, {
      Scalar(_key, scalar) {
        if (
          !scalar.tag &&
          scalar.type === 'PLAIN' &&
          /^[+-]?(?:\.inf|\.nan)$/iu.test(scalar.source ?? '')
        ) {
          throw new Error('non-finite numeric forms are not supported');
        }
      },
    });
    return {
      ok: true,
      value: jsonCompatibleYaml(document.toJS({ mapAsMap: true })),
      format: 'yaml',
      diagnostics: [],
    };
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : 'unsupported value';
    return failure(`YAML is not JSON-compatible: ${detail}`);
  }
}

export function parseMcpDescriptionSource(
  source: string,
  options: ParseMcpDescriptionSourceOptions = {},
): ParseMcpDescriptionSourceResult {
  const format =
    options.format ??
    (source.trimStart().startsWith('{') || source.trimStart().startsWith('[')
      ? 'json'
      : 'yaml');
  return format === 'json' ? parseJson(source) : parseYaml(source);
}

function sortValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, child]) => [key, sortValue(child)]),
    );
  }
  return value;
}

export function serializeMcpDescription(
  value: JsonValue,
  options: SerializeMcpDescriptionOptions,
): string {
  if (
    options.presentation !== undefined &&
    options.presentation !== 'normalized'
  ) {
    throw new TypeError('Unsupported serialization presentation');
  }
  if (options.presentation === 'normalized') {
    if (
      options.format !== 'yaml' ||
      (options.keyOrder !== undefined &&
        options.keyOrder !== 'preserve' &&
        options.keyOrder !== 'sorted' &&
        options.keyOrder !== 'document')
    ) {
      throw new TypeError(
        'Normalized presentation requires YAML with sorted, preserve, or document key ordering',
      );
    }
    assertNormalizedYamlValue(value);
  }
  const output =
    options.keyOrder === 'sorted'
      ? sortValue(value)
      : options.keyOrder === 'document'
        ? orderDocumentValue(value)
        : value;
  return options.presentation === 'normalized'
    ? serializeNormalizedYaml(output)
    : options.format === 'json'
      ? `${JSON.stringify(output, undefined, 2)}\n`
      : stringify(output, { indent: 2, indentSeq: true, lineWidth: 0 });
}
