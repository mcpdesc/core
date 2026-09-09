import { describe, expect, it } from 'vitest';

import {
  RC_4_SCHEMA_URI,
  V0_8_SCHEMA_URI,
  migrateMcpDescription07To08,
  migrateMcpDescription07ToRc4,
  serializeMcpDescriptionMigrationReport,
  type MigrateMcpDescription07ToRc4Options,
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

describe('migrateMcpDescription07ToRc4', () => {
  it('uses a source protocol version and validates the exact RC.4 snapshot', () => {
    const result = migrateMcpDescription07ToRc4(source, {
      specification: '0.8.0-rc.4',
      sourceValidated: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.$schema).toBe(RC_4_SCHEMA_URI);
    expect(result.value.mcpdesc).toBe('0.8.0');
    expect(result.value.protocolVersions).toEqual(['2025-11-25']);
    expect(result.report.sourceSpecification).toBe('0.7.0');
    expect(result.report.targetSpecification).toBe('0.8.0-rc.4');
    expect(result.report.defaultsApplied).toEqual([]);
  });

  it('uses a caller-provided default only when the source version is missing', () => {
    const { protocolVersion: _, ...info } = source.info;
    const withoutProtocol = { ...source, info };
    const options = {
      specification: '0.8.0-rc.4',
      defaultProtocolVersion: '2026-07-28',
      sourceValidated: true,
    } as const;
    const originalSource = structuredClone(withoutProtocol);
    const originalOptions = structuredClone(options);

    const result = migrateMcpDescription07ToRc4(withoutProtocol, options);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.protocolVersions).toEqual(['2026-07-28']);
    expect(result.diagnostics).toContainEqual({
      code: 'migration-default-protocol-version',
      severity: 'warning',
      phase: 'operation',
      path: ['info', 'protocolVersion'],
      message: 'Used caller-provided default protocol version "2026-07-28"',
      protocolVersion: '2026-07-28',
    });
    expect(result.report.status).toBe('success-with-warnings');
    expect(result.report.defaultsApplied).toEqual([
      {
        code: 'migration-default-protocol-version',
        path: ['info', 'protocolVersion'],
        protocolVersion: '2026-07-28',
      },
    ]);
    expect(result.report.changes).toContainEqual(
      expect.objectContaining({
        code: 'migration-selected-protocol-version',
        protocolVersion: '2026-07-28',
      }),
    );
    expect(withoutProtocol).toEqual(originalSource);
    expect(options).toEqual(originalOptions);
  });

  it('returns the existing required error when no protocol version is available', () => {
    const { protocolVersion: _, ...info } = source.info;
    const result = migrateMcpDescription07ToRc4(
      { ...source, info },
      { specification: '0.8.0-rc.4', sourceValidated: true },
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'migration-protocol-version-required',
      }),
    );
    expect(result.report.status).toBe('failed');
  });

  it('prefers the source over a conflicting default but preserves explicit override conflicts', () => {
    const defaultResult = migrateMcpDescription07ToRc4(source, {
      specification: '0.8.0-rc.4',
      defaultProtocolVersion: '2026-07-28',
      sourceValidated: true,
    });
    expect(defaultResult.ok).toBe(true);
    if (defaultResult.ok) {
      expect(defaultResult.value.protocolVersions).toEqual(['2025-11-25']);
      expect(defaultResult.report.defaultsApplied).toEqual([]);
      expect(defaultResult.diagnostics).not.toContainEqual(
        expect.objectContaining({
          code: 'migration-default-protocol-version',
        }),
      );
    }

    const conflict = migrateMcpDescription07ToRc4(source, {
      specification: '0.8.0-rc.4',
      protocolVersion: '2026-07-28',
      sourceValidated: true,
    });
    expect(conflict.ok).toBe(false);
    expect(conflict.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'migration-protocol-version-conflict',
      }),
    );
  });

  it('rejects unsupported defaults at the runtime boundary', () => {
    const { protocolVersion: _, ...info } = source.info;
    const options = {
      specification: '0.8.0-rc.4',
      defaultProtocolVersion: '2099-01-01',
      sourceValidated: true,
    } as unknown as MigrateMcpDescription07ToRc4Options;
    const result = migrateMcpDescription07ToRc4({ ...source, info }, options);

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'migration-unsupported-default-protocol-version',
        phase: 'operation',
      }),
    );
    expect(result.report.status).toBe('failed');
  });

  it('reports generated names, deduplication, and result-validation failures', () => {
    const converted = migrateMcpDescription07ToRc4(source, {
      specification: '0.8.0-rc.4',
      sourceValidated: true,
    });
    expect(converted.report.status).toBe('success-with-warnings');
    expect(converted.report.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'migration-generated-security-name',
      }),
    );
    expect(converted.report.changes).toContainEqual(
      expect.objectContaining({
        code: 'migration-deduplicated-security-scheme',
      }),
    );

    const invalidTarget = {
      ...source,
      security: undefined,
      transports: [{ type: 'stdio', command: 'server' }],
      tools: [{ name: 'missing_input_schema' }],
    };
    const failed = migrateMcpDescription07ToRc4(invalidTarget, {
      specification: '0.8.0-rc.4',
      sourceValidated: true,
    });
    expect(failed.ok).toBe(false);
    expect(failed.report.status).toBe('failed');
    expect(failed.report.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'schema-validation',
        phase: 'result',
      }),
    );
  });

  it('distinguishes warning-free success and serializes reports deterministically', () => {
    const minimalSource = {
      mcpdesc: '0.7.0',
      info: {
        name: 'minimal-migration-test',
        version: '1.0.0',
        protocolVersion: '2025-11-25',
      },
      transports: [{ type: 'stdio', command: 'server' }],
    };
    const first = migrateMcpDescription07ToRc4(minimalSource, {
      specification: '0.8.0-rc.4',
      sourceValidated: true,
    });
    const second = migrateMcpDescription07ToRc4(minimalSource, {
      specification: '0.8.0-rc.4',
      sourceValidated: true,
    });

    expect(first.ok).toBe(true);
    expect(first.report.status).toBe('success');
    expect(first.report.diagnostics).toEqual([]);
    const serialized = serializeMcpDescriptionMigrationReport(first.report);
    expect(serialized).toBe(
      serializeMcpDescriptionMigrationReport(second.report),
    );
    expect(serialized.endsWith('\n')).toBe(true);
    expect(JSON.parse(serialized)).toEqual(first.report);
  });
});

describe('migrateMcpDescription07To08', () => {
  it('uses a source protocol version and validates the exact stable snapshot', () => {
    const result = migrateMcpDescription07To08(source, {
      specification: '0.8.0',
      sourceValidated: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.$schema).toBe(V0_8_SCHEMA_URI);
    expect(result.value.mcpdesc).toBe('0.8.0');
    expect(result.value.protocolVersions).toEqual(['2025-11-25']);
    expect(result.report.targetSpecification).toBe('0.8.0');
  });
});
