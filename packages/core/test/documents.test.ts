import { describe, expect, it } from 'vitest';

import {
  parseMcpDescriptionSource,
  serializeMcpDescription,
} from '../src/index.js';

describe('MCP Description source documents', () => {
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
    const value = { z: 1, nested: { b: 2, a: 1 }, a: 2 };
    expect(serializeMcpDescription(value, { format: 'json' })).toBe(
      '{\n  "a": 2,\n  "nested": {\n    "a": 1,\n    "b": 2\n  },\n  "z": 1\n}\n',
    );
    expect(serializeMcpDescription(value, { format: 'yaml' })).toBe(
      'a: 2\nnested:\n  a: 1\n  b: 2\nz: 1\n',
    );
  });
});
