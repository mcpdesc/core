import { readFileSync, readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  parseMcpDescriptionSource,
  serializeMcpDescription,
  type JsonObject,
  type JsonValue,
} from '../src/index.js';

interface OrderingCase {
  readonly definition: string;
  readonly fields: string;
  readonly path: readonly (string | number)[];
  readonly seed?: JsonObject;
  readonly step?: string;
  readonly modernMeta?: boolean;
}

const toolPath = ['tools', 0] as const;
const toolResultPath = [...toolPath, 'examples', 'sample', 'result'] as const;
const contentPath = [...toolResultPath, 'content', 0] as const;
const templatePath = ['resourceTemplates', 0] as const;
const promptPath = ['prompts', 0] as const;
const completionPath = [...promptPath, 'completionExamples', 'sample'] as const;
const stepPath = [
  ...toolPath,
  'interactionExamples',
  'sample',
  'steps',
  0,
] as const;
const samplingRequestPath = [...stepPath, 'request'] as const;
const samplingResultPath = [...stepPath, 'response'] as const;

const cases: readonly OrderingCase[] = [
  {
    definition: '',
    fields:
      '$schema mcpdesc info instructions protocolVersions transports securitySchemes security capabilities tools resources resourceTemplates prompts tags components',
    path: [],
  },
  {
    definition: 'info',
    fields:
      'name title version id description icons websiteUrl contact license',
    path: ['info'],
  },
  {
    definition: 'contact',
    fields: 'name url email',
    path: ['info', 'contact'],
  },
  { definition: 'license', fields: 'name url', path: ['info', 'license'] },
  {
    definition: 'icon',
    fields: 'src mimeType sizes theme',
    path: ['info', 'icons', 0],
  },
  { definition: 'tag', fields: 'name description', path: ['tags', 0] },
  {
    definition: 'transport/oneOf/0',
    fields: 'type url protocolVersions security',
    path: ['transports', 0],
    seed: { type: 'streamable-http' },
  },
  {
    definition: 'transport/oneOf/1',
    fields: 'type command args env protocolVersions security',
    path: ['transports', 0],
    seed: { type: 'stdio' },
  },
  {
    definition: 'transport/oneOf/2',
    fields: 'type url protocolVersions security',
    path: ['transports', 0],
    seed: { type: 'sse' },
  },
  {
    definition: 'securityScheme/oneOf/0',
    fields: 'type scheme bearerFormat description',
    path: ['securitySchemes', 'sample'],
    seed: { type: 'http' },
  },
  {
    definition: 'securityScheme/oneOf/1',
    fields: 'type in name description',
    path: ['securitySchemes', 'sample'],
    seed: { type: 'apiKey' },
  },
  {
    definition: 'securityScheme/oneOf/2',
    fields: 'type description flows',
    path: ['securitySchemes', 'sample'],
    seed: { type: 'oauth2' },
  },
  {
    definition: 'securityScheme/oneOf/3',
    fields: 'type description openIdConnectUrl',
    path: ['securitySchemes', 'sample'],
    seed: { type: 'openIdConnect' },
  },
  {
    definition: 'oauthFlows',
    fields: 'authorizationCode clientCredentials implicit password',
    path: ['securitySchemes', 'sample', 'flows'],
  },
  {
    definition: 'oauthFlow',
    fields: 'authorizationUrl tokenUrl refreshUrl scopes',
    path: ['securitySchemes', 'sample', 'flows', 'authorizationCode'],
  },
  {
    definition: 'capabilities',
    fields:
      'protocolVersions tools resources prompts logging completions tasks extensions experimental',
    path: ['capabilities', 0],
  },
  {
    definition: 'capabilityTools',
    fields: 'listChanged',
    path: ['capabilities', 0, 'tools'],
  },
  {
    definition: 'capabilityResources',
    fields: 'subscribe listChanged',
    path: ['capabilities', 0, 'resources'],
  },
  {
    definition: 'capabilityPrompts',
    fields: 'listChanged',
    path: ['capabilities', 0, 'prompts'],
  },
  {
    definition: 'capabilities/properties/tasks',
    fields: 'list cancel requests',
    path: ['capabilities', 0, 'tasks'],
  },
  {
    definition: 'capabilities/properties/tasks/properties/requests',
    fields: 'tools',
    path: ['capabilities', 0, 'tasks', 'requests'],
  },
  {
    definition:
      'capabilities/properties/tasks/properties/requests/properties/tools',
    fields: 'call',
    path: ['capabilities', 0, 'tasks', 'requests', 'tools'],
  },
  {
    definition: 'clientCapabilityRequirements',
    fields: 'roots sampling elicitation tasks extensions experimental',
    path: [...toolPath, 'clientRequirements'],
  },
  {
    definition: 'tool',
    fields:
      'name title description icons tags deprecated protocolVersions inputSchema outputSchema annotations execution security clientRequirements elicitations examples interactionExamples _meta',
    path: toolPath,
  },
  {
    definition: 'resource',
    fields:
      'uri name title description icons tags deprecated protocolVersions mimeType size annotations security clientRequirements elicitations examples _meta',
    path: ['resources', 0],
  },
  {
    definition: 'resourceTemplate',
    fields:
      'uriTemplate name title description icons tags deprecated protocolVersions mimeType annotations security clientRequirements elicitations examples completionExamples _meta',
    path: templatePath,
  },
  {
    definition: 'prompt',
    fields:
      'name title description icons tags deprecated protocolVersions arguments security clientRequirements elicitations examples completionExamples _meta',
    path: promptPath,
  },
  {
    definition: 'promptArgument',
    fields: 'name title description required',
    path: [...promptPath, 'arguments', 0],
  },
  {
    definition: 'toolAnnotations',
    fields: 'title readOnlyHint destructiveHint idempotentHint openWorldHint',
    path: [...toolPath, 'annotations'],
  },
  {
    definition: 'resourceAnnotations',
    fields: 'audience priority lastModified',
    path: ['resources', 0, 'annotations'],
  },
  {
    definition: 'execution',
    fields: 'taskSupport',
    path: [...toolPath, 'execution'],
  },
  {
    definition: 'elicitationDeclaration',
    fields:
      'name mode message protocolVersions when requestedSchema url onDecline onCancel',
    path: [...toolPath, 'elicitations', 0],
    seed: { mode: 'form' },
  },
  {
    definition: 'toolExample',
    fields: 'input result',
    path: [...toolPath, 'examples', 'sample'],
  },
  {
    definition: 'resourceExample',
    fields: 'result',
    path: ['resources', 0, 'examples', 'sample'],
  },
  {
    definition: 'resourceTemplateExample',
    fields: 'uri result',
    path: [...templatePath, 'examples', 'sample'],
  },
  {
    definition: 'promptExample',
    fields: 'arguments result',
    path: [...promptPath, 'examples', 'sample'],
  },
  {
    definition: 'completionExample',
    fields: 'argument context result',
    path: completionPath,
  },
  {
    definition: 'completionArgument',
    fields: 'name value',
    path: [...completionPath, 'argument'],
  },
  {
    definition: 'completionContext',
    fields: 'arguments',
    path: [...completionPath, 'context'],
  },
  {
    definition: 'completionResult',
    fields: 'values total hasMore',
    path: [...completionPath, 'result', 'completion'],
  },
  {
    definition: 'completedToolResultExample',
    fields: 'resultType isError content structuredContent _meta',
    path: toolResultPath,
    seed: { resultType: 'complete' },
  },
  {
    definition: 'completedReadResourceResultExample',
    fields: 'resultType contents cacheScope ttlMs _meta',
    path: ['resources', 0, 'examples', 'sample', 'result'],
    seed: { resultType: 'complete' },
  },
  {
    definition: 'completedPromptResultExample',
    fields: 'resultType description messages _meta',
    path: [...promptPath, 'examples', 'sample', 'result'],
    seed: { resultType: 'complete' },
  },
  {
    definition: 'completedCompletionResultExample',
    fields: 'resultType completion _meta',
    path: [...completionPath, 'result'],
    seed: { resultType: 'complete' },
  },
  {
    definition: 'promptMessageExample',
    fields: 'role content',
    path: [...promptPath, 'examples', 'sample', 'result', 'messages', 0],
  },
  {
    definition: 'resourceContents/oneOf/0',
    fields: 'uri mimeType text _meta',
    path: ['resources', 0, 'examples', 'sample', 'result', 'contents', 0],
    seed: { text: 'payload' },
  },
  {
    definition: 'resourceContents/oneOf/1',
    fields: 'uri mimeType blob _meta',
    path: ['resources', 0, 'examples', 'sample', 'result', 'contents', 0],
    seed: { blob: 'payload' },
  },
  {
    definition: 'toolResultContent/oneOf/0',
    fields: 'type text annotations _meta',
    path: contentPath,
    seed: { type: 'text' },
  },
  {
    definition: 'toolResultContent/oneOf/1',
    fields: 'type mimeType data annotations _meta',
    path: contentPath,
    seed: { type: 'image' },
  },
  {
    definition: 'toolResultContent/oneOf/2',
    fields: 'type resource annotations _meta',
    path: contentPath,
    seed: { type: 'resource' },
  },
  {
    definition: 'toolResultContent/oneOf/3',
    fields:
      'type uri name title description icons mimeType size annotations _meta',
    path: contentPath,
    seed: { type: 'resource_link' },
  },
  {
    definition: 'toolInteractionExample',
    fields: 'input steps result',
    path: [...toolPath, 'interactionExamples', 'sample'],
  },
  {
    definition: 'toolInteractionElicitationStep',
    fields: 'type declaration request response',
    path: stepPath,
    seed: { type: 'elicitation' },
  },
  {
    definition: 'toolInteractionRootsStep',
    fields: 'type request response',
    path: stepPath,
    seed: { type: 'roots' },
  },
  {
    definition: 'toolInteractionSamplingStep',
    fields: 'type request response',
    path: stepPath,
    seed: { type: 'sampling' },
  },
  {
    definition: 'elicitationInteractionFormRequest',
    fields: 'mode message requestedSchema',
    path: [...stepPath, 'request'],
    seed: { mode: 'form' },
    step: 'elicitation',
  },
  {
    definition: 'elicitationInteractionUrlRequest',
    fields: 'mode message url',
    path: [...stepPath, 'request'],
    seed: { mode: 'url' },
    step: 'elicitation',
  },
  {
    definition: 'elicitationInteractionAcceptedResponse',
    fields: 'action content _meta',
    path: [...stepPath, 'response'],
    seed: { action: 'accept' },
    step: 'elicitation',
    modernMeta: true,
  },
  {
    definition: 'elicitationInteractionDeclinedResponse',
    fields: 'action _meta',
    path: [...stepPath, 'response'],
    seed: { action: 'decline' },
    step: 'elicitation',
    modernMeta: true,
  },
  {
    definition: 'rootsListResult',
    fields: 'roots _meta',
    path: [...stepPath, 'response'],
    step: 'roots',
    modernMeta: true,
  },
  {
    definition: 'rootDeclaration',
    fields: 'uri name _meta',
    path: [...stepPath, 'response', 'roots', 0],
    step: 'roots',
    modernMeta: true,
  },
  {
    definition: 'samplingCreateMessageRequest',
    fields:
      'messages systemPrompt includeContext modelPreferences maxTokens temperature stopSequences tools toolChoice metadata',
    path: samplingRequestPath,
    step: 'sampling',
  },
  {
    definition: 'samplingCreateMessageResult',
    fields: 'role content model stopReason _meta',
    path: samplingResultPath,
    step: 'sampling',
    modernMeta: true,
  },
  {
    definition: 'samplingMessage',
    fields: 'role content',
    path: [...samplingRequestPath, 'messages', 0],
    step: 'sampling',
  },
  {
    definition: 'samplingModelPreferences',
    fields: 'hints intelligencePriority speedPriority costPriority',
    path: [...samplingRequestPath, 'modelPreferences'],
    step: 'sampling',
  },
  {
    definition: 'samplingModelHint',
    fields: 'name',
    path: [...samplingRequestPath, 'modelPreferences', 'hints', 0],
    step: 'sampling',
  },
  {
    definition: 'samplingRequestTool',
    fields: 'name title description inputSchema annotations',
    path: [...samplingRequestPath, 'tools', 0],
    step: 'sampling',
  },
  {
    definition: 'samplingToolChoice',
    fields: 'mode',
    path: [...samplingRequestPath, 'toolChoice'],
    step: 'sampling',
  },
  {
    definition: 'samplingToolUseContent',
    fields: 'type id name input',
    path: [...samplingResultPath, 'content'],
    seed: { type: 'tool_use' },
    step: 'sampling',
  },
  {
    definition: 'samplingToolResultContent',
    fields: 'type toolUseId isError content',
    path: [...samplingResultPath, 'content'],
    seed: { type: 'tool_result' },
    step: 'sampling',
  },
  {
    definition: 'components',
    fields:
      'schemas toolExamples resourceExamples resourceTemplateExamples promptExamples',
    path: ['components'],
  },
  {
    definition: 'referenceObject',
    fields: '$componentRef',
    path: ['components', 'toolExamples', 'sample'],
    seed: { $componentRef: '#/components/toolExamples/other' },
  },
];

function nest(path: readonly (string | number)[], value: JsonValue): JsonValue {
  const [head, ...tail] = path;
  if (head === undefined) return value;
  return typeof head === 'number'
    ? [nest(tail, value)]
    : { [head]: nest(tail, value) };
}

function at(value: JsonValue, path: readonly (string | number)[]): JsonValue {
  let current = value;
  for (const segment of path) {
    current =
      typeof segment === 'number'
        ? (current as JsonValue[])[segment]!
        : (current as JsonObject)[segment]!;
  }
  return current;
}

function wrap(
  testCase: OrderingCase,
  value: JsonObject,
  version: string,
): JsonObject {
  const root = {
    mcpdesc: version,
    ...(nest(testCase.path, value) as JsonObject),
  };
  if (testCase.path[0] === 'securitySchemes' && testCase.path.length > 2) {
    (at(root, ['securitySchemes', 'sample']) as JsonObject).type = 'oauth2';
  }
  if (testCase.step) {
    (at(root, stepPath) as JsonObject).type = testCase.step;
  }
  return root;
}

function freeze(value: JsonValue): void {
  if (value === null || typeof value !== 'object') return;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
}

function parse(source: string, format: 'json' | 'yaml'): JsonValue {
  const result = parseMcpDescriptionSource(source, { format });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Serialization did not round-trip');
  return result.value;
}

describe('document ordering field sequences', () => {
  for (const version of ['0.8.0', '0.9.0']) {
    for (const format of ['json', 'yaml'] as const) {
      for (const testCase of cases) {
        it(`${version} ${format}: ${testCase.definition || 'root'}`, () => {
          const fields = testCase.fields.split(' ');
          const opaque = {
            description: 'keep',
            name: 'order',
            type: { z: 1, a: 2 },
          };
          const value: JsonObject = {
            'x-before': opaque,
            future: structuredClone(opaque),
            ...Object.fromEntries(
              [...fields]
                .reverse()
                .map((field) => [
                  field,
                  testCase.seed?.[field] ??
                    (field === 'mcpdesc' ? version : field),
                ]),
            ),
            'x-after': structuredClone(opaque),
          };
          const root = wrap(testCase, value, version);
          const before = JSON.stringify(root);
          freeze(root);
          const source = serializeMcpDescription(root, {
            format,
            keyOrder: 'document',
          });
          const result = parse(source, format);
          const known = fields.filter(
            (field) =>
              !testCase.modernMeta || version !== '0.8.0' || field !== '_meta',
          );
          const expected = Object.fromEntries([
            ...known.map((field) => [field, value[field]]),
            ...Object.entries(value).filter(
              ([field]) => !known.includes(field),
            ),
          ]);

          expect(JSON.stringify(at(result, testCase.path))).toBe(
            JSON.stringify(expected),
          );
          expect(result).toEqual(root);
          expect(JSON.stringify(root)).toBe(before);
          expect(
            serializeMcpDescription(result, { format, keyOrder: 'document' }),
          ).toBe(source);
          expect(
            serializeMcpDescription(root, { format, keyOrder: 'document' }),
          ).toBe(source);
        });
      }
    }
  }
});

describe('document ordering schema inventory', () => {
  const directory = new URL('../../validator/src/snapshots/', import.meta.url);
  for (const selector of readdirSync(directory)) {
    it(`accounts for every fixed-field structure in ${selector}`, () => {
      const schema = JSON.parse(
        readFileSync(new URL(`${selector}/schema.json`, directory), 'utf8'),
      );
      const covered = new Set<string>();
      for (const testCase of cases) {
        const pointer = testCase.definition
          ? `/$defs/${testCase.definition}`
          : '';
        const definition = pointer
          .split('/')
          .slice(1)
          .reduce((current, segment) => current[segment], schema);
        const expected = testCase.fields
          .split(' ')
          .filter(
            (field) =>
              !testCase.modernMeta ||
              !selector.startsWith('0.8.0') ||
              field !== '_meta',
          );
        expect(Object.keys(definition.properties).sort(), pointer).toEqual(
          expected.sort(),
        );
        covered.add(pointer);
      }
      const opaque = [
        '/$defs/elicitationFormSchema',
        '/$defs/elicitationFormProperty',
        '/$defs/elicitationFormOption',
        '/$defs/tool/properties/inputSchema',
        '/$defs/samplingRequestTool/properties/inputSchema',
      ];
      function walk(value: unknown, pointer: string): void {
        if (value === null || typeof value !== 'object') return;
        if (
          opaque.some(
            (prefix) => pointer === prefix || pointer.startsWith(`${prefix}/`),
          )
        )
          return;
        const node = value as Record<string, unknown>;
        if (node.properties && !covered.has(pointer)) {
          expect(pointer).toMatch(
            /^\/\$defs\/elicitationDeclaration\/oneOf\/[01]$/,
          );
          expect(Object.keys(node.properties as object)).toEqual(['mode']);
        }
        for (const [key, child] of Object.entries(node))
          walk(child, `${pointer}/${key}`);
      }
      walk(schema, '');
    });
  }
});

describe('document ordering preservation boundaries', () => {
  const opaquePaths: readonly OrderingCase[] = [
    {
      definition: 'input schema',
      fields: '',
      path: [...toolPath, 'inputSchema'],
    },
    {
      definition: 'output schema',
      fields: '',
      path: [...toolPath, 'outputSchema'],
    },
    {
      definition: 'component schemas',
      fields: '',
      path: ['components', 'schemas'],
    },
    { definition: 'metadata', fields: '', path: [...toolPath, '_meta'] },
    { definition: 'extension', fields: '', path: ['x-payload'] },
    { definition: 'unknown field', fields: '', path: ['future'] },
    { definition: 'environment', fields: '', path: ['transports', 0, 'env'] },
    {
      definition: 'OAuth scopes',
      fields: '',
      path: ['securitySchemes', 'sample', 'flows', 'implicit', 'scopes'],
    },
    ...[
      'roots',
      'sampling',
      'elicitation',
      'tasks',
      'experimental',
      'extensions',
    ].map((field) => ({
      definition: `client ${field}`,
      fields: '',
      path: [...toolPath, 'clientRequirements', field],
    })),
    ...['logging', 'completions', 'experimental', 'extensions'].map(
      (field) => ({
        definition: `server ${field}`,
        fields: '',
        path: ['capabilities', 0, field],
      }),
    ),
    ...['list', 'cancel'].map((field) => ({
      definition: `task ${field}`,
      fields: '',
      path: ['capabilities', 0, 'tasks', field],
    })),
    {
      definition: 'task call',
      fields: '',
      path: ['capabilities', 0, 'tasks', 'requests', 'tools', 'call'],
    },
    {
      definition: 'tool example input',
      fields: '',
      path: [...toolPath, 'examples', 'sample', 'input'],
    },
    {
      definition: 'structured output',
      fields: '',
      path: [...toolResultPath, 'structuredContent'],
    },
    {
      definition: 'prompt argument values',
      fields: '',
      path: [...promptPath, 'examples', 'sample', 'arguments'],
    },
    {
      definition: 'completion argument values',
      fields: '',
      path: [...completionPath, 'context', 'arguments'],
    },
    {
      definition: 'interaction input',
      fields: '',
      path: [...toolPath, 'interactionExamples', 'sample', 'input'],
    },
    {
      definition: 'elicitation schema',
      fields: '',
      path: [...toolPath, 'elicitations', 0, 'requestedSchema'],
    },
    {
      definition: 'elicitation request schema',
      fields: '',
      path: [...stepPath, 'request', 'requestedSchema'],
      step: 'elicitation',
    },
    {
      definition: 'elicitation response content',
      fields: '',
      path: [...stepPath, 'response', 'content'],
      step: 'elicitation',
    },
    {
      definition: 'sampling metadata',
      fields: '',
      path: [...samplingRequestPath, 'metadata'],
      step: 'sampling',
    },
    {
      definition: 'sampling tool schema',
      fields: '',
      path: [...samplingRequestPath, 'tools', 0, 'inputSchema'],
      step: 'sampling',
    },
    {
      definition: 'sampling tool input',
      fields: '',
      path: [...samplingResultPath, 'content', 'input'],
      step: 'sampling',
    },
    {
      definition: 'open result field',
      fields: '',
      path: [...toolResultPath, 'future'],
    },
  ];

  for (const format of ['json', 'yaml'] as const) {
    for (const testCase of opaquePaths) {
      it(`preserves ${testCase.definition} recursively in ${format}`, () => {
        const payload = {
          description: 'do not move',
          name: 'opaque',
          properties: { z: { type: 'string' }, a: { type: 'number' } },
          type: 'stdio',
          mode: 'form',
          resultType: 'complete',
          info: { version: 'last', name: 'first' },
          content: [{ text: 'payload', type: 'text' }],
          required: ['z', 'a', 'z'],
        };
        const root = wrap(testCase, payload, '0.9.0');
        if (testCase.definition === 'environment') {
          (at(root, ['transports', 0]) as JsonObject).type = 'stdio';
        }
        if (testCase.definition === 'elicitation schema') {
          (at(root, [...toolPath, 'elicitations', 0]) as JsonObject).mode =
            'form';
        }
        if (testCase.definition === 'elicitation request schema') {
          (at(root, [...stepPath, 'request']) as JsonObject).mode = 'form';
        }
        if (testCase.definition === 'elicitation response content') {
          (at(root, [...stepPath, 'response']) as JsonObject).action = 'accept';
        }
        if (testCase.definition === 'sampling tool input') {
          (at(root, [...samplingResultPath, 'content']) as JsonObject).type =
            'tool_use';
        }
        const before = JSON.stringify(root);
        freeze(root);
        const result = parse(
          serializeMcpDescription(root, { format, keyOrder: 'document' }),
          format,
        );
        expect(JSON.stringify(at(result, testCase.path))).toBe(
          JSON.stringify(payload),
        );
        expect(result).toEqual(root);
        expect(JSON.stringify(root)).toBe(before);
      });
    }

    it(`preserves collection order and organizes eligible values in ${format}`, () => {
      const root = {
        components: {
          toolExamples: {
            z: { result: { content: [] }, input: { z: 1, a: 2 } },
            a: { $componentRef: '#/components/toolExamples/z' },
          },
          schemas: {
            z: { properties: { z: {}, a: {} }, type: 'object' },
            a: { $componentRef: '#/components/schemas/z' },
          },
        },
        tools: [
          { tags: ['z', 'a', 'z'], name: 'z', inputSchema: { type: 'object' } },
          { name: 'a', inputSchema: { type: 'object' } },
        ],
        security: [{ z: ['write', 'read'], a: [] }, {}],
        securitySchemes: {
          z: { scheme: 'bearer', type: 'http' },
          a: { name: 'key', in: 'header', type: 'apiKey' },
        },
        protocolVersions: ['2026-07-28', '2025-11-25'],
        info: {
          icons: [
            { theme: 'dark', sizes: ['64x64', '16x16'], src: 'first' },
            { src: 'second' },
          ],
          name: 'collections',
        },
        mcpdesc: '0.9.0',
      };
      const result = parse(
        serializeMcpDescription(root, { format, keyOrder: 'document' }),
        format,
      );
      expect(result).toEqual(root);
      expect(Object.keys(at(result, ['securitySchemes']) as object)).toEqual([
        'z',
        'a',
      ]);
      expect(
        Object.keys(at(result, ['securitySchemes', 'z']) as object),
      ).toEqual(['type', 'scheme']);
      expect(
        Object.keys(at(result, ['components', 'toolExamples']) as object),
      ).toEqual(['z', 'a']);
      expect(
        Object.keys(at(result, ['components', 'toolExamples', 'z']) as object),
      ).toEqual(['input', 'result']);
      expect(
        Object.keys(at(result, ['components', 'schemas']) as object),
      ).toEqual(['z', 'a']);
      expect(Object.keys(at(result, ['security', 0]) as object)).toEqual([
        'z',
        'a',
      ]);
      expect(Object.keys(at(result, ['info', 'icons', 0]) as object)).toEqual([
        'src',
        'sizes',
        'theme',
      ]);
    });

    it(`retains empty values, numeric-like keys, and special property names in ${format}`, () => {
      const payload = JSON.parse(
        '{"10":{},"2":{},"z":{},"__proto__":{"name":"keep","description":"order"},"a":{}}',
      ) as JsonObject;
      const root = {
        components: { schemas: payload, toolExamples: {} },
        security: [],
        tools: [],
        info: {},
        mcpdesc: '0.9.0',
      };
      const result = parse(
        serializeMcpDescription(root, { format, keyOrder: 'document' }),
        format,
      );
      expect(result).toEqual(root);
      expect(JSON.stringify(at(result, ['components', 'schemas']))).toBe(
        JSON.stringify(payload),
      );
      expect(Object.keys(result as object)).toEqual([
        'mcpdesc',
        'info',
        'security',
        'tools',
        'components',
      ]);
    });

    it(`keeps strings and references literal in ${format}`, () => {
      const text = '{"description":"do not parse","name":"payload"}\n';
      const root = {
        mcpdesc: '0.9.0',
        components: {
          toolExamples: {
            sample: { $componentRef: '#/components/toolExamples/missing' },
          },
        },
        tools: [
          {
            examples: {
              sample: {
                input: {},
                result: { content: [{ text, type: 'text' }] },
              },
            },
          },
        ],
      };
      const result = parse(
        serializeMcpDescription(root, { format, keyOrder: 'document' }),
        format,
      );
      expect(result).toEqual(root);
      expect(
        at(result, ['components', 'toolExamples', 'sample', '$componentRef']),
      ).toBe('#/components/toolExamples/missing');
      expect(at(result, [...contentPath, 'text'])).toBe(text);
    });

    it(`preserves unknown formats and non-document values in ${format}`, () => {
      for (const value of [
        null,
        true,
        12,
        'text',
        [{ info: {}, mcpdesc: '0.9.0' }],
        { info: {}, mcpdesc: '0.7.0' },
        { info: {}, mcpdesc: '1.0.0' },
        { info: { version: 'v', name: 'n' } },
      ]) {
        expect(
          serializeMcpDescription(value, { format, keyOrder: 'document' }),
        ).toBe(
          serializeMcpDescription(value, { format, keyOrder: 'preserve' }),
        );
      }
    });

    it(`leaves unrecognized variants and malformed containers untouched in ${format}`, () => {
      const variantCases: readonly OrderingCase[] = [
        { definition: 'transport', fields: '', path: ['transports', 0] },
        {
          definition: 'scheme',
          fields: '',
          path: ['securitySchemes', 'sample'],
        },
        {
          definition: 'elicitation',
          fields: '',
          path: [...toolPath, 'elicitations', 0],
        },
        { definition: 'result', fields: '', path: toolResultPath },
        { definition: 'content', fields: '', path: contentPath },
        { definition: 'step', fields: '', path: stepPath },
        {
          definition: 'resource contents',
          fields: '',
          path: ['resources', 0, 'examples', 'sample', 'result', 'contents', 0],
        },
      ];
      for (const testCase of variantCases) {
        const payload = {
          description: 'unknown',
          name: 'keep',
          text: 'ambiguous',
          blob: 'ambiguous',
          type: 'constructor',
          mode: 'future',
          resultType: 'future',
          content: [{ text: 'keep', type: 'text' }],
        };
        const root = wrap(testCase, payload, '0.9.0');
        const result = parse(
          serializeMcpDescription(root, { format, keyOrder: 'document' }),
          format,
        );
        expect(JSON.stringify(at(result, testCase.path))).toBe(
          JSON.stringify(payload),
        );
      }
      const malformed = {
        mcpdesc: '0.9.0',
        tools: { description: 'keep', name: 'order' },
        info: [{ version: 'last', name: 'first' }],
        components: { toolExamples: [{ result: {}, input: {} }] },
        capabilities: null,
      };
      const result = parse(
        serializeMcpDescription(malformed, { format, keyOrder: 'document' }),
        format,
      );
      expect(result).toEqual(malformed);
      for (const field of ['tools', 'info', 'components', 'capabilities']) {
        expect(JSON.stringify(at(result, [field]))).toBe(
          JSON.stringify(at(malformed, [field])),
        );
      }
    });

    it(`supports every secondary discriminator variant in ${format}`, () => {
      for (const [testCase, seed] of [
        [
          cases.find((entry) => entry.definition === 'elicitationDeclaration')!,
          { mode: 'url' },
        ],
        [
          cases.find(
            (entry) =>
              entry.definition === 'elicitationInteractionDeclinedResponse',
          )!,
          { action: 'cancel' },
        ],
        [
          cases.find(
            (entry) => entry.definition === 'toolResultContent/oneOf/1',
          )!,
          { type: 'audio' },
        ],
      ] as const) {
        const fields = testCase.fields.split(' ');
        const payload = Object.fromEntries(
          [...fields]
            .reverse()
            .map((field) => [
              field,
              Object.hasOwn(seed, field) ? (seed as JsonObject)[field] : field,
            ]),
        );
        const root = wrap(testCase, payload, '0.9.0');
        const result = parse(
          serializeMcpDescription(root, { format, keyOrder: 'document' }),
          format,
        );
        expect(Object.keys(at(result, testCase.path) as object)).toEqual(
          fields,
        );
      }
    });

    it(`organizes nested interaction envelopes without changing trace order in ${format}`, () => {
      const schema = {
        properties: { z: { type: 'string' }, a: {} },
        type: 'object',
      };
      const root = {
        mcpdesc: '0.9.0',
        tools: [
          {
            name: 'lookup',
            inputSchema: schema,
            interactionExamples: {
              z: {
                result: {
                  content: [
                    {
                      resource: {
                        text: 'payload',
                        mimeType: 'text/plain',
                        uri: 'test:one',
                      },
                      type: 'resource',
                    },
                  ],
                },
                steps: [
                  {
                    response: {
                      roots: [
                        { name: 'second', uri: 'file:///second' },
                        { name: 'first', uri: 'file:///first' },
                      ],
                    },
                    request: {},
                    type: 'roots',
                  },
                  {
                    response: {
                      model: 'example',
                      content: [
                        {
                          input: { z: 1, a: 2 },
                          name: 'lookup',
                          id: 'call',
                          type: 'tool_use',
                        },
                        {
                          content: [{ text: 'done', type: 'text' }],
                          toolUseId: 'call',
                          type: 'tool_result',
                        },
                      ],
                      role: 'assistant',
                    },
                    request: {
                      maxTokens: 10,
                      messages: [
                        {
                          content: { text: 'hello', type: 'text' },
                          role: 'user',
                        },
                      ],
                    },
                    type: 'sampling',
                  },
                  {
                    response: {
                      content: { z: 'last', a: 'first' },
                      action: 'accept',
                    },
                    request: {
                      requestedSchema: schema,
                      message: 'Choose',
                      mode: 'form',
                    },
                    type: 'elicitation',
                  },
                ],
                input: { z: 1, a: 2 },
              },
              a: { input: {}, steps: [], result: { content: [] } },
            },
          },
        ],
      };
      const result = parse(
        serializeMcpDescription(root, { format, keyOrder: 'document' }),
        format,
      );
      expect(result).toEqual(root);
      expect(
        Object.keys(at(result, [...toolPath, 'interactionExamples']) as object),
      ).toEqual(['z', 'a']);
      const steps = at(result, [
        ...toolPath,
        'interactionExamples',
        'z',
        'steps',
      ]) as JsonObject[];
      expect(steps.map((step) => step.type)).toEqual([
        'roots',
        'sampling',
        'elicitation',
      ]);
      expect(steps.map((step) => Object.keys(step))).toEqual([
        ['type', 'request', 'response'],
        ['type', 'request', 'response'],
        ['type', 'request', 'response'],
      ]);
      expect(
        Object.keys(at(steps[0]!, ['response', 'roots', 0]) as object),
      ).toEqual(['uri', 'name']);
      expect(Object.keys(at(steps[1]!, ['request']) as object)).toEqual([
        'messages',
        'maxTokens',
      ]);
      expect(
        Object.keys(at(steps[1]!, ['response', 'content', 0]) as object),
      ).toEqual(['type', 'id', 'name', 'input']);
      expect(
        Object.keys(
          at(steps[1]!, ['response', 'content', 1, 'content', 0]) as object,
        ),
      ).toEqual(['type', 'text']);
      expect(Object.keys(at(steps[2]!, ['request']) as object)).toEqual([
        'mode',
        'message',
        'requestedSchema',
      ]);
      expect(Object.keys(at(steps[2]!, ['response']) as object)).toEqual([
        'action',
        'content',
      ]);
      expect(
        Object.keys(
          at(result, [
            ...toolPath,
            'interactionExamples',
            'z',
            'result',
            'content',
            0,
            'resource',
          ]) as object,
        ),
      ).toEqual(['uri', 'mimeType', 'text']);
    });
  }
});
