import { parse, printParseErrorCode, type ParseError } from 'jsonc-parser';
import { parseDocument as parseYamlDocument, stringify } from 'yaml';

import type { JsonValue } from './model.js';

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

export interface SerializeMcpDescriptionOptions {
  readonly format: DocumentSourceFormat;
}

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
  const value = parse(source, errors, {
    allowTrailingComma: false,
    disallowComments: true,
  }) as JsonValue;
  const error = errors[0];
  if (error) {
    return failure(
      `Invalid JSON: ${printParseErrorCode(error.error)}`,
      lineAndColumn(source, error.offset),
    );
  }
  return { ok: true, value, format: 'json', diagnostics: [] };
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
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
    version: '1.2',
  });
  const error = document.errors[0];
  if (error) {
    const position = error.linePos?.[0];
    return failure(
      error.message,
      position ? { line: position.line, column: position.col } : undefined,
    );
  }

  try {
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
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortValue(child)]),
    );
  }
  return value;
}

export function serializeMcpDescription(
  value: JsonValue,
  options: SerializeMcpDescriptionOptions,
): string {
  const sorted = sortValue(value);
  return options.format === 'json'
    ? `${JSON.stringify(sorted, undefined, 2)}\n`
    : stringify(sorted, { lineWidth: 0 });
}
