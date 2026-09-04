import { describe, expect, it } from 'vitest';

import {
  DRAFT_4_SCHEMA_URI,
  RC_1_SCHEMA_URI,
  RC_2_SCHEMA_URI,
  selectMcpDescriptionDeclarations,
} from '../src/index.js';

const source = {
  $schema: DRAFT_4_SCHEMA_URI,
  mcpdesc: '0.8.0',
  info: { name: 'selection-test', version: '1.0.0' },
  protocolVersions: ['2025-11-25', '2026-07-28'],
  tools: [
    {
      name: 'shared',
      protocolVersions: ['2025-11-25'],
      inputSchema: { type: 'object', additionalProperties: false },
    },
    {
      name: 'shared',
      protocolVersions: ['2026-07-28'],
      inputSchema: { type: 'object', additionalProperties: false },
    },
    {
      name: 'other',
      inputSchema: { type: 'object', additionalProperties: false },
    },
  ],
  resources: [
    { uri: 'test://selected', name: 'same-name' },
    { uri: 'test://other', name: 'same-name' },
  ],
  resourceTemplates: [
    { uriTemplate: 'test://selected/{id}', name: 'template' },
    { uriTemplate: 'test://other/{id}', name: 'template' },
  ],
  prompts: [{ name: 'selected' }, { name: 'other' }],
  components: { schemas: { Retained: { type: 'object' } } },
  'x-example': { retained: true },
};

describe('selectMcpDescriptionDeclarations', () => {
  it('selects by normative identity and preserves every scoped variant', () => {
    const original = structuredClone(source);
    const result = selectMcpDescriptionDeclarations(source, {
      specification: '0.8.0-draft.4',
      selections: {
        tools: ['shared'],
        resources: ['test://selected'],
        resourceTemplates: ['test://selected/{id}'],
        prompts: ['selected'],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.tools).toHaveLength(2);
    expect(result.value.resources).toEqual([
      { uri: 'test://selected', name: 'same-name' },
    ]);
    expect(result.value.resourceTemplates).toEqual([
      { uriTemplate: 'test://selected/{id}', name: 'template' },
    ]);
    expect(result.value.prompts).toEqual([{ name: 'selected' }]);
    expect(result.value.components).toEqual(source.components);
    expect(result.value['x-example']).toEqual({ retained: true });
    expect(result.diagnostics).toEqual([]);
    expect(source).toEqual(original);
  });

  it('omits unselected and empty declaration collections', () => {
    const result = selectMcpDescriptionDeclarations(source, {
      specification: '0.8.0-draft.4',
      selections: { tools: [] },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tools).toBeUndefined();
    expect(result.value.resources).toBeUndefined();
    expect(result.value.resourceTemplates).toBeUndefined();
    expect(result.value.prompts).toBeUndefined();
  });

  it('rejects invalid source documents', () => {
    const result = selectMcpDescriptionDeclarations(
      { ...source, tools: [{ name: 'invalid' }] },
      {
        specification: '0.8.0-draft.4',
        selections: { tools: ['invalid'] },
      },
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'schema-validation',
        phase: 'source',
      }),
    );
  });

  it('selects declarations from an RC.1 document', () => {
    const result = selectMcpDescriptionDeclarations(
      { ...source, $schema: RC_1_SCHEMA_URI },
      {
        specification: '0.8.0-rc.1',
        selections: { tools: ['other'] },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tools).toEqual([
      {
        name: 'other',
        inputSchema: { type: 'object', additionalProperties: false },
      },
    ]);
  });

  it('selects declarations from an RC.2 document', () => {
    const result = selectMcpDescriptionDeclarations(
      { ...source, $schema: RC_2_SCHEMA_URI },
      {
        specification: '0.8.0-rc.2',
        selections: { tools: ['other'] },
      },
    );

    expect(result.ok).toBe(true);
  });
});
