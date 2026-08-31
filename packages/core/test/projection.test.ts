import { describe, expect, it } from 'vitest';

import {
  DRAFT_4_SCHEMA_URI,
  RC_1_SCHEMA_URI,
  draft4Snapshot,
  projectEffectiveProtocolView,
  rc1Snapshot,
} from '../src/index.js';

const source = {
  $schema: DRAFT_4_SCHEMA_URI,
  mcpdesc: '0.8.0',
  info: { name: 'projection-test', version: '1.0.0' },
  protocolVersions: ['2025-11-25', '2026-07-28'],
  components: {
    schemas: {
      Unused: { type: 'object' },
    },
  },
  capabilities: [
    {
      protocolVersions: ['2025-11-25'],
      tools: { listChanged: true },
    },
  ],
  tools: [
    {
      name: 'run_job',
      protocolVersions: ['2025-11-25'],
      inputSchema: { type: 'object', additionalProperties: false },
      execution: { taskSupport: 'optional' },
    },
    {
      name: 'run_job',
      protocolVersions: ['2026-07-28'],
      inputSchema: { type: 'object', additionalProperties: false },
    },
    {
      name: 'configure_job',
      inputSchema: { type: 'object', additionalProperties: false },
      elicitations: [
        {
          name: 'current',
          mode: 'form',
          message: 'Provide a value.',
          requestedSchema: { type: 'object', properties: {} },
          protocolVersions: ['2026-07-28'],
        },
        {
          name: 'legacy',
          mode: 'form',
          message: 'Provide a legacy value.',
          requestedSchema: { type: 'object', properties: {} },
          protocolVersions: ['2025-11-25'],
        },
      ],
    },
  ],
};

describe('projectEffectiveProtocolView', () => {
  it('projects scoped declarations without mutating the source', () => {
    const original = structuredClone(source);
    const result = projectEffectiveProtocolView(source, {
      specification: '0.8.0-draft.4',
      protocolVersion: '2026-07-28',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.protocolVersions).toEqual(['2026-07-28']);
    expect(result.value.capabilities).toBeUndefined();
    expect(result.value.tools).toEqual([
      {
        name: 'run_job',
        inputSchema: { type: 'object', additionalProperties: false },
      },
      {
        name: 'configure_job',
        inputSchema: { type: 'object', additionalProperties: false },
        elicitations: [
          {
            name: 'current',
            mode: 'form',
            message: 'Provide a value.',
            requestedSchema: { type: 'object', properties: {} },
          },
        ],
      },
    ]);
    expect(result.value.components).toEqual(source.components);
    expect(result.diagnostics).toEqual([]);
    expect(source).toEqual(original);
  });

  it('rejects a target absent from the root protocol scope', () => {
    const result = projectEffectiveProtocolView(source, {
      specification: '0.8.0-draft.4',
      protocolVersion: '2025-06-18',
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'projection-version-not-declared',
        phase: 'operation',
        path: ['protocolVersions'],
      }),
    );
  });

  it('returns source validation diagnostics without projecting invalid input', () => {
    const result = projectEffectiveProtocolView(
      { ...source, tools: [{ name: 'invalid' }] },
      {
        specification: '0.8.0-draft.4',
        protocolVersion: '2026-07-28',
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

  it('publishes immutable Draft 4 snapshot metadata from the validator', () => {
    expect(draft4Snapshot).toMatchObject({
      specification: '0.8.0-draft.4',
      schemaUri: DRAFT_4_SCHEMA_URI,
      snapshotTag: 'v0.8.0-draft.4',
      schemaSha256:
        '93ed03f74059b5b3ce7509a96b59161bdab2c3cf7734397a9bec5a7588d0b03b',
    });
    expect(Object.isFrozen(draft4Snapshot)).toBe(true);
  });

  it('projects and publishes immutable RC.1 snapshot metadata', () => {
    const result = projectEffectiveProtocolView(
      { ...source, $schema: RC_1_SCHEMA_URI },
      {
        specification: '0.8.0-rc.1',
        protocolVersion: '2026-07-28',
      },
    );

    expect(result.ok).toBe(true);
    expect(rc1Snapshot).toMatchObject({
      specification: '0.8.0-rc.1',
      schemaUri: RC_1_SCHEMA_URI,
      snapshotTag: 'v0.8.0-rc.1',
      schemaSha256:
        '936a0f24ade501fcabf3d6498c0440c445daa672a575573a35954cee49430ac4',
    });
    expect(Object.isFrozen(rc1Snapshot)).toBe(true);
  });

  it('projects every scoped root collection and preserves unscoped semantics', () => {
    const comprehensive = {
      $schema: DRAFT_4_SCHEMA_URI,
      mcpdesc: '0.8.0',
      info: { name: 'comprehensive', version: '1.0.0' },
      protocolVersions: ['2025-11-25', '2026-07-28'],
      'x-example-root': { retained: true },
      transports: [
        {
          type: 'stdio',
          command: 'legacy',
          protocolVersions: ['2025-11-25'],
        },
        {
          type: 'streamable-http',
          url: 'https://example.com/mcp',
          protocolVersions: ['2026-07-28'],
        },
      ],
      capabilities: [
        {
          tools: { listChanged: true },
          protocolVersions: ['2025-11-25'],
        },
        {
          tools: { listChanged: true },
          protocolVersions: ['2026-07-28'],
        },
      ],
      tools: [
        {
          name: 'clear_security',
          inputSchema: { type: 'object', additionalProperties: false },
          security: [],
        },
      ],
      resources: [
        {
          uri: 'test://legacy',
          name: 'legacy',
          protocolVersions: ['2025-11-25'],
        },
        {
          uri: 'test://current',
          name: 'current',
          protocolVersions: ['2026-07-28'],
        },
      ],
      resourceTemplates: [
        {
          uriTemplate: 'test://legacy/{id}',
          name: 'legacy',
          protocolVersions: ['2025-11-25'],
        },
        {
          uriTemplate: 'test://current/{id}',
          name: 'current',
          protocolVersions: ['2026-07-28'],
        },
      ],
      prompts: [
        { name: 'legacy', protocolVersions: ['2025-11-25'] },
        { name: 'current', protocolVersions: ['2026-07-28'] },
      ],
      tags: [{ name: 'document-wide' }],
    };

    const result = projectEffectiveProtocolView(comprehensive, {
      specification: '0.8.0-draft.4',
      protocolVersion: '2026-07-28',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.transports).toEqual([
      { type: 'streamable-http', url: 'https://example.com/mcp' },
    ]);
    expect(result.value.capabilities).toEqual([
      { tools: { listChanged: true } },
    ]);
    expect(result.value.resources).toEqual([
      { uri: 'test://current', name: 'current' },
    ]);
    expect(result.value.resourceTemplates).toEqual([
      { uriTemplate: 'test://current/{id}', name: 'current' },
    ]);
    expect(result.value.prompts).toEqual([{ name: 'current' }]);
    expect(result.value.tools).toEqual([
      {
        name: 'clear_security',
        inputSchema: { type: 'object', additionalProperties: false },
        security: [],
      },
    ]);
    expect(result.value.tags).toEqual([{ name: 'document-wide' }]);
    expect(result.value['x-example-root']).toEqual({ retained: true });
  });

  it('is idempotent for an already projected view', () => {
    const first = projectEffectiveProtocolView(source, {
      specification: '0.8.0-draft.4',
      protocolVersion: '2026-07-28',
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = projectEffectiveProtocolView(first.value, {
      specification: '0.8.0-draft.4',
      protocolVersion: '2026-07-28',
    });
    expect(second).toEqual(first);
  });

  it('does not duplicate a warning emitted for both source and result', () => {
    const warningSource = {
      $schema: DRAFT_4_SCHEMA_URI,
      mcpdesc: '0.8.0',
      info: { name: 'warning', version: '1.0.0' },
      protocolVersions: ['2026-07-28'],
      capabilities: [{ logging: {} }],
    };
    const result = projectEffectiveProtocolView(warningSource, {
      specification: '0.8.0-draft.4',
      protocolVersion: '2026-07-28',
    });

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'logging-deprecated-in-2026',
        phase: 'source',
        severity: 'warning',
      }),
    ]);
  });
});
