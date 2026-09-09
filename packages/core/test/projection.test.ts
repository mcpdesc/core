import { describe, expect, it } from 'vitest';

import {
  RC_4_SCHEMA_URI,
  V0_8_SCHEMA_URI,
  projectEffectiveProtocolView,
  rc4Snapshot,
  v0_8Snapshot,
} from '../src/index.js';

const source = {
  $schema: RC_4_SCHEMA_URI,
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
      specification: '0.8.0-rc.4',
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
      specification: '0.8.0-rc.4',
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
        specification: '0.8.0-rc.4',
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

  it('preserves pre-standard extension maps in RC.4 protocol views', () => {
    const extensions = {
      'io.modelcontextprotocol/ui': {
        mimeTypes: ['text/html;profile=mcp-app'],
      },
    };
    const document = {
      $schema: RC_4_SCHEMA_URI,
      mcpdesc: '0.8.0',
      info: { name: 'pre-standard-extensions', version: '1.0.0' },
      protocolVersions: ['2025-11-25', '2026-07-28'],
      capabilities: [{ extensions }],
    };

    for (const protocolVersion of document.protocolVersions) {
      const result = projectEffectiveProtocolView(document, {
        specification: '0.8.0-rc.4',
        protocolVersion,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.value.capabilities).toEqual([{ extensions }]);
    }

    expect(rc4Snapshot).toMatchObject({
      specification: '0.8.0-rc.4',
      schemaUri: RC_4_SCHEMA_URI,
      snapshotTag: 'v0.8.0-rc.4',
      schemaSha256:
        'd38e54db859813b63be2a5c91dde91250035f18bcb5910208cf71fa6875d6eef',
    });
    expect(Object.isFrozen(rc4Snapshot)).toBe(true);
  });

  it('publishes stable snapshot metadata', () => {
    expect(v0_8Snapshot).toMatchObject({
      specification: '0.8.0',
      schemaUri: V0_8_SCHEMA_URI,
      snapshotTag: 'v0.8.0',
      schemaSha256:
        '36686f92ba0cc98bde2c34eaad31c0304d6e5cebdd2c4d2be1be06aecef41119',
    });
    expect(Object.isFrozen(v0_8Snapshot)).toBe(true);
  });

  it('preserves protocol-independent RC.4 info metadata in older protocol views', () => {
    const info = {
      name: 'metadata-server',
      title: 'Metadata Server',
      version: '1.0.0',
      description: 'Document-wide metadata',
      icons: [{ src: 'https://example.com/icon.png' }],
      websiteUrl: 'https://example.com/server',
    };
    const result = projectEffectiveProtocolView(
      {
        $schema: RC_4_SCHEMA_URI,
        mcpdesc: '0.8.0',
        info,
        protocolVersions: ['2024-11-05'],
      },
      {
        specification: '0.8.0-rc.4',
        protocolVersion: '2024-11-05',
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.info).toEqual(info);
  });

  it('projects every scoped root collection and preserves unscoped semantics', () => {
    const comprehensive = {
      $schema: RC_4_SCHEMA_URI,
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
      specification: '0.8.0-rc.4',
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
      specification: '0.8.0-rc.4',
      protocolVersion: '2026-07-28',
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = projectEffectiveProtocolView(first.value, {
      specification: '0.8.0-rc.4',
      protocolVersion: '2026-07-28',
    });
    expect(second).toEqual(first);
  });

  it('does not duplicate a warning emitted for both source and result', () => {
    const warningSource = {
      $schema: RC_4_SCHEMA_URI,
      mcpdesc: '0.8.0',
      info: { name: 'warning', version: '1.0.0' },
      protocolVersions: ['2026-07-28'],
      capabilities: [{ logging: {} }],
    };
    const result = projectEffectiveProtocolView(warningSource, {
      specification: '0.8.0-rc.4',
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
