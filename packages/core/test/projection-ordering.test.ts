import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  projectEffectiveProtocolView,
  projectMcpNativeValue,
  serializeMcpDescription,
  type JsonObject,
  type JsonValue,
  type McpNativeKind,
} from '../src/index.js';

const nativeSelectors = ['0.9.0-rc.3'] as const;
const selectors = ['0.8.0', '0.8.0-rev.20261021', ...nativeSelectors] as const;
const revisions = [
  '2024-11-05',
  '2025-03-26',
  '2025-06-18',
  '2025-11-25',
  '2026-07-28',
] as const;
const kinds = {
  tool: {
    collection: 'tools',
    identity: 'name',
    definition: 'Tool',
    fields:
      'name title description icons inputSchema outputSchema annotations execution _meta',
  },
  resource: {
    collection: 'resources',
    identity: 'uri',
    definition: 'Resource',
    fields: 'uri name title description icons mimeType size annotations _meta',
  },
  resourceTemplate: {
    collection: 'resourceTemplates',
    identity: 'uriTemplate',
    definition: 'ResourceTemplate',
    fields:
      'uriTemplate name title description icons mimeType annotations _meta',
  },
  prompt: {
    collection: 'prompts',
    identity: 'name',
    definition: 'Prompt',
    fields: 'name title description icons arguments _meta',
  },
} as const;
const schema = {
  additionalProperties: false,
  properties: { z: { type: 'string' }, a: { type: 'number' } },
  type: 'object',
};
const meta = { z: { description: 'unchanged', name: 'opaque' }, a: 2 };

function object(value: JsonValue | undefined): JsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected an object');
  }
  return value;
}

function objects(value: JsonValue | undefined): JsonObject[] {
  if (!Array.isArray(value)) throw new Error('Expected an array');
  return value.map(object);
}

function reverse(value: JsonObject): JsonObject {
  return Object.fromEntries(Object.entries(value).reverse());
}

function expectSameOrder(actual: JsonValue, expected: JsonValue): void {
  expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
  // YAML aliases depend on object identity, not the value-level ordering contract.
  const actualValue: JsonValue = JSON.parse(JSON.stringify(actual));
  const expectedValue: JsonValue = JSON.parse(JSON.stringify(expected));
  for (const format of ['json', 'yaml'] as const) {
    expect(serializeMcpDescription(actualValue, { format })).toBe(
      serializeMcpDescription(expectedValue, { format, keyOrder: 'preserve' }),
    );
  }
}

describe('Effective Protocol View ordering', () => {
  for (const selector of selectors) {
    it(`preserves retained fields, arrays, maps, and opaque values: ${selector}`, () => {
      const current = {
        elicitations: [
          {
            requestedSchema: { properties: schema.properties, type: 'object' },
            protocolVersions: ['2026-07-28'],
            message: 'Current',
            mode: 'form',
            name: 'z',
          },
          {
            name: 'excluded',
            mode: 'form',
            message: 'Old',
            requestedSchema: { properties: schema.properties, type: 'object' },
            protocolVersions: ['2025-11-25'],
          },
        ],
        inputSchema: { $componentRef: '#/components/schemas/Z' },
        protocolVersions: ['2025-11-25', '2026-07-28'],
        description: 'Retained',
        name: 'z',
      };
      const document = {
        'x-root': meta,
        tools: [
          current,
          {
            name: 'excluded',
            inputSchema: { type: 'object' },
            protocolVersions: ['2025-11-25'],
          },
          { ...current, name: 'a' },
        ],
        components: {
          schemas: {
            Unused: { type: 'object' },
            Z: { $componentRef: '#/components/schemas/A' },
            A: schema,
          },
        },
        protocolVersions: ['2025-11-25', '2026-07-28'],
        info: { version: '1.0.0', name: 'ordering' },
        mcpdesc: selector.startsWith('0.8.') ? '0.8.0' : '0.9.0',
      };
      const original = JSON.stringify(document);
      const result = projectEffectiveProtocolView(document, {
        selector,
        protocolVersion: '2026-07-28',
      });
      expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
      if (!result.ok) return;
      const expected = structuredClone(document);
      expected.protocolVersions = ['2026-07-28'];
      const retained = structuredClone(current);
      Reflect.deleteProperty(retained, 'protocolVersions');
      retained.elicitations = retained.elicitations.slice(0, 1);
      Reflect.deleteProperty(retained.elicitations[0]!, 'protocolVersions');
      expected.tools = [retained, { ...retained, name: 'a' }];
      if (selector === '0.9.0-rc.3') {
        Reflect.deleteProperty(expected.components.schemas, 'Unused');
      }
      expect(Object.keys(result.value)).toEqual(Object.keys(document));
      expectSameOrder(result.value, expected);
      expect(JSON.stringify(document)).toBe(original);
    });
  }
});

for (const protocolVersion of revisions) {
  const pinnedSchema = JSON.parse(
    readFileSync(
      new URL(
        `../src/mcp-schemas/${protocolVersion}/schema.json`,
        import.meta.url,
      ),
      'utf8',
    ),
  ) as {
    definitions?: Record<string, { properties: Record<string, unknown> }>;
    $defs?: Record<string, { properties: Record<string, unknown> }>;
  };
  const definitions = pinnedSchema.$defs ?? pinnedSchema.definitions!;

  for (const kind of Object.keys(kinds) as McpNativeKind[]) {
    const { collection, identity, definition, fields } = kinds[kind];
    const supported = Object.keys(definitions[definition]!.properties);
    const sequence = fields
      .split(' ')
      .filter((field) => supported.includes(field));

    describe(`${protocolVersion} native ${kind} ordering`, () => {
      it('accounts for every pinned MCP field without using schema property order', () => {
        expect([...sequence].sort()).toEqual([...supported].sort());
      });

      for (const selector of nativeSelectors) {
        it(`preserves by default and organizes explicitly: ${selector}`, () => {
          const icon = {
            src: 'https://example.com/z.png',
            mimeType: 'image/png',
            sizes: ['48x48', '24x24'],
            theme: 'dark',
          };
          const argument = {
            name: 'z',
            title: 'Query',
            description: 'Argument',
            required: true,
          };
          if (protocolVersion < '2025-06-18')
            Reflect.deleteProperty(argument, 'title');
          const annotations =
            kind === 'tool'
              ? {
                  title: 'Tool',
                  readOnlyHint: true,
                  destructiveHint: false,
                  idempotentHint: true,
                  openWorldHint: false,
                }
              : {
                  audience: ['assistant', 'user'],
                  priority: 0.5,
                  ...(protocolVersion >= '2025-06-18'
                    ? { lastModified: '2026-01-01T00:00:00Z' }
                    : {}),
                };
          const fieldValues: JsonObject = {
            name: 'z',
            uri: 'test://z',
            uriTemplate: 'test://{z}',
            title: 'Declaration',
            description: 'Description',
            icons: [icon, { ...icon, src: 'https://example.com/a.png' }],
            inputSchema: schema,
            outputSchema: schema,
            annotations,
            execution: { taskSupport: 'optional' },
            mimeType: 'text/plain',
            size: 2,
            arguments: [argument, { ...argument, name: 'a' }],
            _meta: meta,
          };
          const expected = Object.fromEntries(
            sequence.map((field) => [field, fieldValues[field]!]),
          );
          const scrambled = reverse(expected);
          if ('inputSchema' in scrambled) {
            scrambled.inputSchema = {
              $componentRef: '#/components/schemas/Input',
            };
          }
          if ('annotations' in scrambled)
            scrambled.annotations = reverse(annotations);
          if ('icons' in scrambled) {
            scrambled.icons = objects(expected.icons).map((entry) => ({
              ...reverse(entry),
              'x-icon': meta,
            }));
          }
          if ('arguments' in scrambled) {
            scrambled.arguments = objects(expected.arguments).map((entry) => ({
              ...reverse(entry),
              'x-argument': meta,
            }));
          }
          const excluded: JsonObject = { name: 'excluded' };
          if (kind === 'tool') excluded.inputSchema = { type: 'object' };
          if (kind === 'resource') excluded.uri = 'test://excluded';
          if (kind === 'resourceTemplate')
            excluded.uriTemplate = 'test://excluded/{id}';
          const otherRevision =
            protocolVersion === '2024-11-05' ? '2026-07-28' : '2024-11-05';
          const document = {
            mcpdesc: '0.9.0',
            info: { version: '1.0.0', name: 'native-ordering' },
            protocolVersions: [protocolVersion, otherRevision],
            components: { schemas: { Input: schema } },
            [collection]: [
              {
                ...scrambled,
                protocolVersions: [protocolVersion],
                'x-declaration': meta,
              },
              { ...excluded, protocolVersions: [otherRevision] },
              {
                ...scrambled,
                [identity]:
                  kind === 'resource'
                    ? 'test://a'
                    : kind === 'resourceTemplate'
                      ? 'test://{a}'
                      : 'a',
                protocolVersions: [protocolVersion],
              },
            ],
          };
          const original = JSON.stringify(document);
          const options = { selector, protocolVersion, kind };
          const defaultResult = projectMcpNativeValue(document, options);
          const preserving = projectMcpNativeValue(document, {
            ...options,
            keyOrder: 'preserve',
          });
          const organized = projectMcpNativeValue(document, {
            ...options,
            keyOrder: 'document',
          });
          const single = projectMcpNativeValue(document, {
            ...options,
            identifier: String(expected[identity]),
            keyOrder: 'document',
          });
          const singlePreserved = projectMcpNativeValue(document, {
            ...options,
            identifier: String(expected[identity]),
            keyOrder: 'preserve',
          });
          for (const result of [
            defaultResult,
            preserving,
            organized,
            single,
            singlePreserved,
          ]) {
            expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
          }
          if (
            !defaultResult.ok ||
            !preserving.ok ||
            !organized.ok ||
            !single.ok ||
            !singlePreserved.ok
          )
            return;
          const expectedPreserved = Object.fromEntries(
            Object.entries(scrambled)
              .filter(([key]) => !key.startsWith('x-'))
              .map(([key, child]) => [
                key,
                key === 'inputSchema'
                  ? schema
                  : key === 'icons' || key === 'arguments'
                    ? objects(child).map((entry) =>
                        Object.fromEntries(
                          Object.entries(entry).filter(
                            ([field]) => !field.startsWith('x-'),
                          ),
                        ),
                      )
                    : child,
              ]),
          );
          expectSameOrder(defaultResult.value[0]!, expectedPreserved);
          expectSameOrder(singlePreserved.value, expectedPreserved);
          expectSameOrder(preserving.value, defaultResult.value);
          expectSameOrder(single.value, expected);
          expectSameOrder(organized.value[0]!, expected);
          expect(organized.value).toEqual(defaultResult.value);
          expect(organized.diagnostics).toEqual(defaultResult.diagnostics);
          expect(organized.value.map((value) => value[identity])).toEqual(
            defaultResult.value.map((value) => value[identity]),
          );
          const repeated = projectMcpNativeValue(
            {
              ...document,
              protocolVersions: [protocolVersion],
              [collection]: organized.value,
            },
            { ...options, keyOrder: 'document' },
          );
          expect(repeated.ok, JSON.stringify(repeated.diagnostics)).toBe(true);
          if (repeated.ok) expectSameOrder(repeated.value, organized.value);
          expect(JSON.stringify(document)).toBe(original);
        });
      }
    });
  }
}
