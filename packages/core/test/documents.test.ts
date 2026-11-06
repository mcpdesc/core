import { describe, expect, it } from 'vitest';

import {
  parseMcpDescriptionSource,
  serializeMcpDescription,
} from '../src/index.js';

describe('MCP Description source documents', () => {
  it.each(['json', 'yaml'] as const)(
    'organizes known document fields without sorting payloads in %s',
    (format) => {
      const schema = {
        properties: { z: { type: 'string' }, a: {} },
        type: 'object',
      };
      const value = {
        components: { schemas: { z: schema, a: schema } },
        'x-last': { description: 'opaque', name: 'extension' },
        tools: [{ inputSchema: schema, description: 'Lookup', name: 'lookup' }],
        info: { version: '1.0.0', name: 'example' },
        mcpdesc: '0.9.0',
      };
      const source = serializeMcpDescription(value, {
        format,
        keyOrder: 'document',
      });
      const expected = {
        mcpdesc: '0.9.0',
        info: { name: 'example', version: '1.0.0' },
        tools: [{ name: 'lookup', description: 'Lookup', inputSchema: schema }],
        components: { schemas: { z: schema, a: schema } },
        'x-last': value['x-last'],
      };
      expect(source).toBe(serializeMcpDescription(expected, { format }));
      expect(parseMcpDescriptionSource(source, { format })).toMatchObject({
        ok: true,
        value,
      });
    },
  );

  it('parses equivalent JSON and YAML values', () => {
    const json = parseMcpDescriptionSource('{"mcpdesc":"0.8.0","tools":[]}');
    const yaml = parseMcpDescriptionSource('mcpdesc: 0.8.0\ntools: []\n');

    expect(json).toMatchObject({ ok: true, format: 'json' });
    expect(yaml).toMatchObject({ ok: true, format: 'yaml' });
    if (!json.ok || !yaml.ok) return;
    expect(yaml.value).toEqual(json.value);
  });

  it('honors an explicit source format', () => {
    const result = parseMcpDescriptionSource('null', { format: 'json' });
    expect(result).toEqual({
      ok: true,
      value: null,
      format: 'json',
      diagnostics: [],
    });
  });

  it('reports malformed JSON with a stable source location', () => {
    const result = parseMcpDescriptionSource('{\n  "mcpdesc": }');
    expect(result).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: 'document-parse',
          location: { line: 2, column: 14 },
        }),
      ],
    });
  });

  it('rejects duplicate JSON keys with a source location', () => {
    const result = parseMcpDescriptionSource(
      '{\n  "mcpdesc": "0.7.0",\n  "mcpdesc": "0.8.0"\n}',
    );
    expect(result).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: 'document-parse',
          message: 'Invalid JSON: Duplicate property "mcpdesc"',
          location: { line: 3, column: 3 },
        }),
      ],
    });
  });

  it('rejects non-finite JSON numbers', () => {
    const result = parseMcpDescriptionSource('{"value": 1e400}');
    expect(result).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: 'document-parse',
          message: 'Invalid JSON: numbers must be finite',
          location: { line: 1, column: 11 },
        }),
      ],
    });
  });

  it('reports duplicate YAML keys with a source location', () => {
    const result = parseMcpDescriptionSource(
      'mcpdesc: 0.8.0\nmcpdesc: 0.8.0\n',
    );
    expect(result).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: 'document-parse',
          location: expect.objectContaining({ line: 2 }),
        }),
      ],
    });
  });

  it.each([
    ['non-finite numbers', 'value: .inf\n'],
    ['non-string mapping keys', '? [a, b]\n: value\n'],
    ['binary values', 'value: !!binary SGk=\n'],
    ['cyclic aliases', '&value [*value]\n'],
  ])('rejects YAML %s outside the JSON data model', (_case, source) => {
    const result = parseMcpDescriptionSource(source);
    expect(result).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'document-parse',
          message: expect.stringMatching(/JSON-compatible/u),
        },
      ],
    });
  });

  it('serializes object keys deterministically', () => {
    const value = { ä: 3, z: 1, nested: { b: 2, a: 1 }, a: 2 };
    expect(
      serializeMcpDescription(value, { format: 'json', keyOrder: 'sorted' }),
    ).toBe(
      '{\n  "a": 2,\n  "nested": {\n    "a": 1,\n    "b": 2\n  },\n  "z": 1,\n  "ä": 3\n}\n',
    );
    expect(
      serializeMcpDescription(value, { format: 'yaml', keyOrder: 'sorted' }),
    ).toBe('a: 2\nnested:\n  a: 1\n  b: 2\nz: 1\nä: 3\n');
  });

  it.each(['json', 'yaml'] as const)(
    'keeps explicit preserve %s output identical to the default',
    (format) => {
      const value = { z: [{ b: 2, a: 1 }], a: 3 };
      expect(
        serializeMcpDescription(value, { format, keyOrder: 'preserve' }),
      ).toBe(serializeMcpDescription(value, { format }));
    },
  );

  it.each([
    [
      'json',
      '{\n  "z": [\n    {\n      "b": 2,\n      "a": 1\n    },\n    "second"\n  ],\n  "a": 3\n}\n',
    ],
    ['yaml', 'z:\n  - b: 2\n    a: 1\n  - second\na: 3\n'],
  ] as const)(
    'preserves nested key and array order in %s',
    (format, expected) => {
      const value = {
        z: [{ b: 2, a: 1 }, 'second'],
        a: 3,
      };
      Object.freeze(value.z[0]);
      Object.freeze(value.z);
      Object.freeze(value);
      const before = JSON.stringify(value);

      expect(
        serializeMcpDescription(value, { format, keyOrder: 'preserve' }),
      ).toBe(expected);
      expect(serializeMcpDescription(value, { format })).toBe(expected);
      expect(JSON.stringify(value)).toBe(before);
    },
  );

  it.each(['json', 'yaml'] as const)(
    'uses JavaScript enumeration order for numeric-like keys in %s',
    (format) => {
      const value = Object.fromEntries([
        ['10', 'ten'],
        ['2', 'two'],
        ['z', 'last'],
        ['a', 'first'],
      ]);
      const source = serializeMcpDescription(value, {
        format,
        keyOrder: 'preserve',
      });
      const parsed = parseMcpDescriptionSource(source, { format });

      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(parsed.value).toEqual(value);
      expect(Object.keys(parsed.value as object)).toEqual([
        '2',
        '10',
        'z',
        'a',
      ]);
    },
  );
});
