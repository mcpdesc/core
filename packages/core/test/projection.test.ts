import { describe, expect, it } from 'vitest';

import {
  RC_2_SCHEMA_URI,
  RC_3_SCHEMA_URI,
  projectEffectiveProtocolView,
  rc2Snapshot,
  rc3Snapshot,
} from '../src/index.js';

const source = {
  $schema: RC_2_SCHEMA_URI,
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
      specification: '0.8.0-rc.2',
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
      specification: '0.8.0-rc.2',
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
        specification: '0.8.0-rc.2',
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

  it('preserves pre-standard extension maps in RC.2 protocol views', () => {
    const extensions = {
      'io.modelcontextprotocol/ui': {
        mimeTypes: ['text/html;profile=mcp-app'],
      },
    };
    const document = {
      $schema: RC_2_SCHEMA_URI,
      mcpdesc: '0.8.0',
      info: { name: 'pre-standard-extensions', version: '1.0.0' },
      protocolVersions: ['2025-11-25', '2026-07-28'],
      capabilities: [{ extensions }],
    };

    for (const protocolVersion of document.protocolVersions) {
      const result = projectEffectiveProtocolView(document, {
        specification: '0.8.0-rc.2',
        protocolVersion,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.value.capabilities).toEqual([{ extensions }]);
    }

    expect(rc2Snapshot).toMatchObject({
      specification: '0.8.0-rc.2',
      schemaUri: RC_2_SCHEMA_URI,
      snapshotTag: 'v0.8.0-rc.2',
      schemaSha256:
        '40f6775dde052224114e91d6aa484d826eecf56b77f7ac87b4cf707ffbcb6ce8',
    });
    expect(Object.isFrozen(rc2Snapshot)).toBe(true);
  });

  it('publishes RC.3 snapshot metadata', () => {
    expect(rc3Snapshot).toMatchObject({
      specification: '0.8.0-rc.3',
      schemaUri: RC_3_SCHEMA_URI,
      snapshotTag: 'v0.8.0-rc.3',
      schemaSha256:
        'a9c3ff77ba37c72362909f538f6e957d055e6fdb372f8b3d529e3651af3fecf4',
    });
    expect(Object.isFrozen(rc3Snapshot)).toBe(true);
  });

  it('projects every scoped root collection and preserves unscoped semantics', () => {
    const comprehensive = {
      $schema: RC_2_SCHEMA_URI,
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
      specification: '0.8.0-rc.2',
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
      specification: '0.8.0-rc.2',
      protocolVersion: '2026-07-28',
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = projectEffectiveProtocolView(first.value, {
      specification: '0.8.0-rc.2',
      protocolVersion: '2026-07-28',
    });
    expect(second).toEqual(first);
  });

  it('does not duplicate a warning emitted for both source and result', () => {
    const warningSource = {
      $schema: RC_2_SCHEMA_URI,
      mcpdesc: '0.8.0',
      info: { name: 'warning', version: '1.0.0' },
      protocolVersions: ['2026-07-28'],
      capabilities: [{ logging: {} }],
    };
    const result = projectEffectiveProtocolView(warningSource, {
      specification: '0.8.0-rc.2',
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
