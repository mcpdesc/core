import { describe, expect, it } from 'vitest';

import {
  DRAFT_4_SCHEMA_URI,
  migrateMcpDescription07ToDraft4,
} from '../src/index.js';

const source = {
  mcpdesc: '0.7.0',
  info: {
    name: 'migration-test',
    version: '1.0.0',
    protocolVersion: '2025-11-25',
    icons: [],
  },
  transports: [
    {
      type: 'streamable-http',
      url: 'https://example.com/mcp',
      security: [{ type: 'http', scheme: 'bearer' }],
    },
  ],
  security: [{ scheme: 'bearer', type: 'http' }],
  capabilities: { tools: { listChanged: true } },
  tools: [
    {
      name: 'run_job',
      inputSchema: { type: 'object' },
      icons: [],
      tags: [],
    },
  ],
  resources: [],
  resourceTemplates: [],
  prompts: [],
  tags: [],
  'x-example': { retained: true },
};

describe('migrateMcpDescription07ToDraft4', () => {
  it('migrates protocol scope, capabilities, empty arrays, and inline security', () => {
    const original = structuredClone(source);
    const result = migrateMcpDescription07ToDraft4(source, {
      specification: '0.8.0-draft.4',
      sourceValidated: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toMatchObject({
      $schema: DRAFT_4_SCHEMA_URI,
      mcpdesc: '0.8.0',
      protocolVersions: ['2025-11-25'],
      capabilities: [{ tools: { listChanged: true } }],
      'x-example': { retained: true },
    });
    expect(result.value.info).not.toHaveProperty('protocolVersion');
    expect(result.value.resources).toBeUndefined();
    expect(result.value.resourceTemplates).toBeUndefined();
    expect(result.value.prompts).toBeUndefined();
    expect(result.value.tags).toBeUndefined();
    expect(result.value.tools?.[0]).not.toHaveProperty('icons');
    expect(result.value.tools?.[0]).not.toHaveProperty('tags');

    const schemeNames = Object.keys(result.value.securitySchemes ?? {});
    expect(schemeNames).toHaveLength(1);
    expect(result.value.security).toEqual([{ [schemeNames[0]]: [] }]);
    expect(result.value.transports?.[0]).toHaveProperty('security', [
      { [schemeNames[0]]: [] },
    ]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'migration-generated-security-name',
        severity: 'warning',
      }),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'migration-deduplicated-security-scheme',
        severity: 'warning',
      }),
    );
    expect(source).toEqual(original);
  });

  it('requires authoritative protocol input when v0.7 omits it', () => {
    const { protocolVersion: _, ...info } = source.info;
    const withoutProtocol = { ...source, info };
    const missing = migrateMcpDescription07ToDraft4(withoutProtocol, {
      specification: '0.8.0-draft.4',
      sourceValidated: true,
    });
    expect(missing.ok).toBe(false);
    expect(missing.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'migration-protocol-version-required' }),
    );

    const supplied = migrateMcpDescription07ToDraft4(withoutProtocol, {
      specification: '0.8.0-draft.4',
      protocolVersion: '2025-11-25',
      sourceValidated: true,
    });
    expect(supplied.ok).toBe(true);
  });

  it('returns Draft 4 result diagnostics instead of inventing required fields', () => {
    const invalidTarget = {
      ...source,
      security: undefined,
      transports: [{ type: 'stdio', command: 'server' }],
      tools: [{ name: 'missing_input_schema' }],
    };
    const result = migrateMcpDescription07ToDraft4(invalidTarget, {
      specification: '0.8.0-draft.4',
      sourceValidated: true,
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'schema-validation',
        phase: 'result',
      }),
    );
  });
});
