import { describe, expect, it } from 'vitest';
import { isMap, isScalar, parseDocument, visit } from 'yaml';

import {
  convertMcpDescriptionVersion,
  mergeEffectiveProtocolViews,
  migrateMcpDescription07To08,
  parseMcpDescriptionSource,
  projectEffectiveProtocolView,
  projectMcpNativeValue,
  resolveMcpDescriptionComponentReferences,
  selectMcpDescriptionDeclarations,
  serializeMcpDescription,
  type JsonValue,
  type SerializeMcpDescriptionOptions,
} from '../src/index.js';

function decode(source: string): JsonValue {
  const result = parseMcpDescriptionSource(source, { format: 'yaml' });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.diagnostics[0]?.message);
  expect(result.diagnostics).toEqual([]);
  return result.value;
}

function normalized(value: JsonValue): string {
  return serializeMcpDescription(value, {
    format: 'yaml',
    presentation: 'normalized',
  });
}

function expectStable(value: JsonValue): string {
  const before = structuredClone(value);
  const source = normalized(value);
  const decoded = decode(source);
  expect(decoded).toEqual(JSON.parse(JSON.stringify(value)));
  expect(normalized(decoded)).toBe(source);
  expect(normalized(value)).toBe(source);
  expect(value).toEqual(before);
  expect(source).not.toMatch(/^\uFEFF|\r|\n\n$/u);
  expect(source.endsWith('\n')).toBe(true);
  return source;
}

describe('normalized YAML presentation', () => {
  it.each([
    ['2026-07-28', '"2026-07-28"'],
    ['0.8', '"0.8"'],
    ['123', '"123"'],
    ['true', '"true"'],
    ['on', '"on"'],
    ['null', '"null"'],
    ['', '""'],
    ['Search: documents', '"Search: documents"'],
    ['Hello # world', '"Hello # world"'],
    ['contains "quotes": yes', '"contains \\"quotes\\": yes"'],
    ['ordinary', 'ordinary'],
    ['0o12', '0o12'],
    ['0b101', '"0b101"'],
    ['012', '"012"'],
    ['0x12', '"0x12"'],
    ['1:20', '"1:20"'],
    ['.inf', '".inf"'],
    ['.NaN', '".NaN"'],
    ['~', '"~"'],
    ['OFF', '"OFF"'],
    ['Yes', '"Yes"'],
    ['n', '"n"'],
    ['+12', '"+12"'],
    ['1e3', '"1e3"'],
    ['1.0', '"1.0"'],
    ['2026-07-28T12:00:00Z', '"2026-07-28T12:00:00Z"'],
    ['https://example.com', 'https://example.com'],
  ])('formats string value and key %j as %s', (value, spelling) => {
    expect(expectStable({ value })).toBe(`value: ${spelling}\n`);
    expect(expectStable({ [value]: 'ordinary' })).toBe(
      `${spelling}: ordinary\n`,
    );
  });

  it('quotes protocol versions at root and nested scopes, not arbitrary strings', () => {
    const source = expectStable({
      protocolVersions: ['2026-07-28', 'future', ''],
      tools: [{ protocolVersions: ['future'], name: 'future' }],
    });
    expect(source).toBe(
      'protocolVersions:\n  - "2026-07-28"\n  - "future"\n  - ""\ntools:\n  - protocolVersions:\n      - "future"\n    name: future\n',
    );
  });

  it('emits actual scalars and RFC 8785 number spellings unquoted', () => {
    const value = {
      values: [
        true,
        false,
        null,
        -0,
        0.8,
        1e-7,
        1e-6,
        1e20,
        1e21,
        Number.MIN_VALUE,
        Number.MAX_VALUE,
        333333333.33333329,
      ],
    };
    const source = expectStable(value);
    expect(source).toBe(
      `values:\n${value.values.map((item) => `  - ${JSON.stringify(item)}\n`).join('')}`,
    );
  });

  it('uses block collections and preserves significant empty values', () => {
    const source = expectStable({
      security: [{ oauth: [] }, {}],
      tools: [],
      components: {},
      nested: [['first', 'second'], ['third']],
      empty: '',
    });
    expect(source).toBe(
      'security:\n  - oauth: []\n  - {}\ntools: []\ncomponents: {}\nnested:\n  - - first\n    - second\n  - - third\nempty: ""\n',
    );
    expect(expectStable({ security: [] })).toBe('security: []\n');
    expect(expectStable({})).toBe('{}\n');
    expect(expectStable([])).toBe('[]\n');
  });

  it('duplicates shared values without emitting anchors or aliases', () => {
    const shared = { required: ['query'] };
    Object.freeze(shared.required);
    Object.freeze(shared);
    const source = expectStable({ left: shared, right: shared });
    expect(source).toBe(
      'left:\n  required:\n    - query\nright:\n  required:\n    - query\n',
    );
  });

  it.each([
    ['first\nsecond', '|-'],
    ['first\nsecond\n', '|'],
    ['first\nsecond\n\n', '|+'],
    ['first\nsecond\n\n\n', '|+'],
  ])('preserves multiline value %j with %s chomping', (text, header) => {
    const source = expectStable({ text, after: 'last' });
    expect(source).toContain(`text: ${header}\n  first\n  second\n`);
    const finalSource = expectStable({ text });
    if (text.endsWith('\n\n')) {
      expect(finalSource).toBe(`text: ${JSON.stringify(text)}\n`);
    } else {
      expect(finalSource).toContain(`text: ${header}\n`);
    }
  });

  it.each([
    '\n',
    '\n\n',
    '\n\n\n',
    ' leading\n  indented\n',
    '\nleading blank\n',
    'first \nsecond',
    'first\n ',
    'first\r\nsecond\r\n',
    'first\rsecond',
    'first\n\u0001second',
    'first\u0085second',
    'first\u2028second',
    'first\u2029second',
    '\uD800\nsecond',
    '\uFEFFordinary',
    '\uFEFF',
    'ordinary\uFEFFtext',
    '---\n...\n%YAML',
    'first\tsecond\nlast',
  ])('preserves difficult string %j with one final LF', (text) => {
    expectStable({ text });
    expectStable({ text, after: 'last' });
    expectStable({ [text]: 'key' });
    expectStable(text);
  });

  it('does not wrap long plain or quoted scalars', () => {
    const plain = 'ordinary '.repeat(100).trimEnd();
    const quoted = 'Search: '.repeat(100);
    const source = expectStable({ plain, quoted });
    expect(source).toBe(`plain: ${plain}\nquoted: ${JSON.stringify(quoted)}\n`);
  });

  it('round-trips combinations of whitespace, indicators, and Unicode deterministically', () => {
    const characters = [
      'a',
      ' ',
      '\t',
      '\n',
      '\r',
      ':',
      '#',
      '"',
      "'",
      '-',
      '\u0085',
      '\u2028',
      '\u2029',
      '\u0000',
      '\uD800',
      '😀',
      '\uFEFF',
    ];
    for (const first of characters) {
      for (const second of characters) {
        const text = `${first}${second}`;
        expectStable({ text, after: 'last' });
        expectStable({ text });
        expectStable(text);
        expectStable({ [text]: 'key' });
      }
    }
  });

  it.each(['preserve', 'document'] as const)(
    'keeps values, arrays, named maps, and opaque order with %s ordering',
    (keyOrder) => {
      const schema = {
        properties: { z: { type: 'string' }, a: {} },
        required: ['z', 'a', 'z'],
        type: 'object',
      };
      const value = {
        components: { schemas: { z: schema, a: schema } },
        tools: [{ inputSchema: schema, description: 'Lookup', name: 'lookup' }],
        info: { version: '1.0.0', name: 'example' },
        mcpdesc: '0.9.0',
      };
      const before = structuredClone(value);
      const options = {
        format: 'yaml',
        presentation: 'normalized',
        keyOrder,
      } as const;
      const source = serializeMcpDescription(value, options);
      const decoded = decode(source);
      expect(decoded).toEqual(value);
      expect(serializeMcpDescription(decoded, options)).toBe(source);
      expect(value).toEqual(before);
      expect(source).toMatch(
        /properties:\n( +)z:\n\1  type: string\n\1a: \{\}\n/,
      );
      expect(source).toMatch(/required:\n {8}- z\n {8}- a\n {8}- z\n/);
      expect(Object.keys(decoded as object)[0]).toBe(
        keyOrder === 'document' ? 'mcpdesc' : 'components',
      );
      const document = parseDocument(source);
      expect(isMap(document.contents)).toBe(true);
      let foundSchemas = false;
      visit(document, {
        Pair(_key, pair) {
          if (
            isScalar(pair.key) &&
            pair.key.value === 'schemas' &&
            isMap(pair.value)
          ) {
            expect(
              pair.value.items.map(
                (item) => isScalar(item.key) && item.key.value,
              ),
            ).toEqual(['z', 'a']);
            foundSchemas = true;
          }
        },
      });
      expect(foundSchemas).toBe(true);
    },
  );

  it('preserves existing output defaults and sorted mode', () => {
    const value = { z: 'on', protocolVersions: ['2026-07-28'], a: 1 };
    expect(serializeMcpDescription(value, { format: 'yaml' })).toBe(
      'z: on\nprotocolVersions:\n  - 2026-07-28\na: 1\n',
    );
    expect(
      serializeMcpDescription(value, { format: 'yaml', keyOrder: 'sorted' }),
    ).toBe('a: 1\nprotocolVersions:\n  - 2026-07-28\nz: on\n');
    expect(serializeMcpDescription(value, { format: 'json' })).toBe(
      `${JSON.stringify(value, undefined, 2)}\n`,
    );
    expect(parseMcpDescriptionSource('value: on\n')).toMatchObject({
      ok: true,
      value: { value: 'on' },
    });
  });

  it.each([
    { format: 'json', presentation: 'normalized' },
    { format: 'yaml', presentation: 'normalized', keyOrder: 'sorted' },
    { format: 'yaml', presentation: 'normalized', keyOrder: 'unknown' },
    { format: 'yaml', presentation: 'unknown' },
  ])('rejects invalid runtime option combination %j', (options) => {
    expect(() =>
      Reflect.apply(serializeMcpDescription, undefined, [{}, options]),
    ).toThrow(TypeError);
  });

  it.each([
    NaN,
    Infinity,
    -Infinity,
    undefined,
    1n,
    new Date(0),
    new Map(),
    new Set(),
    () => 1,
  ])('rejects non-JSON runtime value %s without silent conversion', (value) => {
    expect(() =>
      Reflect.apply(serializeMcpDescription, undefined, [
        { value },
        { format: 'yaml', presentation: 'normalized' },
      ]),
    ).toThrow(TypeError);
  });

  it('rejects cycles and sparse arrays before ordering or creating YAML nodes', () => {
    const value: JsonValue = {};
    value.self = value;
    expect(() => normalized(value)).toThrow(/cyclic/);
    expect(() => normalized(Array(2))).toThrow(/JSON-compatible/);
    expect(() =>
      serializeMcpDescription(value, {
        format: 'yaml',
        presentation: 'normalized',
        keyOrder: 'document',
      }),
    ).toThrow(/cyclic/);
  });

  it('accepts null-prototype JSON objects and dangerous-looking string keys', () => {
    const value: JsonValue = Object.create(null);
    Object.defineProperty(value, '__proto__', {
      value: 'ordinary',
      enumerable: true,
    });
    expectStable(value);
  });

  it('exposes normalized options without changing the existing return type', () => {
    const options: SerializeMcpDescriptionOptions = {
      format: 'yaml',
      presentation: 'normalized',
    };
    const source: string = serializeMcpDescription({}, options);
    expect(source).toBe('{}\n');
  });

  it('uses the same presentation for migrated, converted, projected, and selected values', () => {
    const migrated = migrateMcpDescription07To08(
      {
        mcpdesc: '0.7.0',
        info: {
          name: 'presentation',
          version: '1.0.0',
          protocolVersion: '2025-11-25',
        },
        tools: [
          {
            name: 'lookup',
            description: 'on',
            inputSchema: { type: 'object', required: ['query'] },
          },
        ],
      },
      { sourceValidated: true },
    );
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    const converted = convertMcpDescriptionVersion(migrated.value, {
      from: '0.8.0',
      to: '0.9.0',
    });
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    const projected = projectEffectiveProtocolView(converted.value, {
      protocolVersion: '2025-11-25',
    });
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;
    const results = [
      migrated,
      converted,
      projected,
      mergeEffectiveProtocolViews([projected.value]),
      selectMcpDescriptionDeclarations(converted.value, {
        selections: { tools: ['lookup'] },
      }),
      resolveMcpDescriptionComponentReferences(converted.value),
      projectMcpNativeValue(converted.value, {
        kind: 'tool',
        protocolVersion: '2025-11-25',
      }),
    ];
    for (const result of results) {
      expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
      if (!result.ok) continue;
      const source = expectStable(result.value);
      expect(source).toContain('description: "on"\n');
      expect(source).toContain('required:\n');
    }
  });
});
