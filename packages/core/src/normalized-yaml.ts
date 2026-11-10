import { Document, isScalar, isSeq, Schema, Scalar, visit } from 'yaml';

import type { JsonValue } from './model.js';

const jsonSchema = new Schema({ schema: 'json' });
const normalizedSchema = new Schema({
  schema: 'core',
  compat: 'yaml-1.1',
  customTags: (tags) => [
    ...tags.filter(
      (tag) =>
        typeof tag !== 'string' &&
        (tag.collection || tag.tag === 'tag:yaml.org,2002:str'),
    ),
    // Keep the standard string emitter, but use JSON scalar resolution and numbers.
    ...jsonSchema.tags.filter(
      (tag) =>
        !tag.collection &&
        tag.tag !== '' &&
        tag.tag !== 'tag:yaml.org,2002:str',
    ),
  ],
});

export function assertNormalizedYamlValue(
  value: unknown,
  ancestors = new Set<object>(),
): asserts value is JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || value === null) {
    throw new TypeError(
      'Normalized YAML requires JSON-compatible finite values',
    );
  }
  if (ancestors.has(value)) {
    throw new TypeError('Normalized YAML cannot serialize cyclic values');
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    throw new TypeError(
      'Normalized YAML requires plain JSON objects and arrays',
    );
  }
  ancestors.add(value);
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    assertNormalizedYamlValue(child, ancestors);
  }
  ancestors.delete(value);
}

export function serializeNormalizedYaml(value: JsonValue): string {
  const document = new Document(value, {
    schema: normalizedSchema,
    aliasDuplicateObjects: false,
  });
  let lastScalar: Scalar | undefined;
  visit(document, {
    Collection(_key, collection) {
      collection.flow = collection.items.length === 0;
    },
    Pair(_key, pair) {
      if (
        isScalar(pair.key) &&
        pair.key.value === 'protocolVersions' &&
        isSeq(pair.value)
      ) {
        for (const item of pair.value.items) {
          if (isScalar(item) && typeof item.value === 'string') {
            item.type = Scalar.QUOTE_DOUBLE;
          }
        }
      }
    },
    Scalar(key, scalar) {
      lastScalar = scalar;
      if (typeof scalar.value !== 'string' || scalar.type) return;
      if (
        (key === null || key === 'key') &&
        scalar.value.startsWith('\uFEFF')
      ) {
        scalar.type = Scalar.QUOTE_DOUBLE;
      } else if (
        key === 'key' ||
        /[\r\u0085\u2028\u2029]/u.test(scalar.value)
      ) {
        if (/[\n\r\u0085\u2028\u2029]/u.test(scalar.value)) {
          scalar.type = Scalar.QUOTE_DOUBLE;
        }
      } else if (scalar.value.includes('\n')) {
        scalar.type =
          (key === null && scalar.value.startsWith(' ')) ||
          (/^[ \t\n]*$/u.test(scalar.value) && /[ \t]/u.test(scalar.value))
            ? Scalar.QUOTE_DOUBLE
            : Scalar.BLOCK_LITERAL;
      } else if (
        key === null &&
        /^(?:\uFEFF|%|---|\.\.\.)/u.test(scalar.value)
      ) {
        scalar.type = Scalar.QUOTE_DOUBLE;
      }
    },
  });
  const options = {
    indent: 2,
    indentSeq: true,
    lineWidth: 0,
    singleQuote: false,
    doubleQuotedAsJSON: true,
    blockQuote: 'literal',
  } as const;
  let source = document.toString(options);
  // A final keep-chomp block can require extra document-ending LFs.
  if (source.endsWith('\n\n') && lastScalar?.type === Scalar.BLOCK_LITERAL) {
    lastScalar.type = Scalar.QUOTE_DOUBLE;
    source = document.toString(options);
  }
  return source;
}
