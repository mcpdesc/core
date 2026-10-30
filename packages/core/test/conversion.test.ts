import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

import {
  convertMcpDescriptionVersion,
  projectMcpNativeValue,
  V0_8_SCHEMA_URI,
  V0_9_DRAFT_2_SPECIFICATION,
  V0_9_DRAFT_2_SCHEMA_URI,
  V0_9_DRAFT_3_SPECIFICATION,
  V0_9_DRAFT_3_SCHEMA_URI,
} from '../src/index.js';

function conversionFixtureDirectory(selector: string): string {
  return fileURLToPath(
    new URL(
      `../../validator/test/snapshots/${selector}/conversion/fixtures/`,
      import.meta.url,
    ),
  );
}

function readDocument(fixtureRoot: string, reference: unknown): unknown {
  if (typeof reference !== 'string') return reference;
  const filename = path.resolve(fixtureRoot, reference);
  const source = readFileSync(filename, 'utf8');
  return /\.ya?ml$/i.test(filename) ? YAML.parse(source) : JSON.parse(source);
}

function errorDiagnostics(
  diagnostics: readonly {
    code: string;
    rule?: string;
    path: readonly (number | string)[];
    severity: string;
  }[],
) {
  return diagnostics
    .filter(({ severity }) => severity === 'error')
    .map(({ code, rule, path: diagnosticPath }) => ({
      code,
      rule,
      path: diagnosticPath,
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
}

function testConversionProfile(selector: string): void {
  const fixtureRoot = conversionFixtureDirectory(selector);
  describe(`convertMcpDescriptionVersion frozen profile conformance: ${selector}`, () => {
    for (const filename of readdirSync(fixtureRoot)
      .filter((name) => name.endsWith('.json'))
      .sort()) {
      it(filename, () => {
        const fixture = JSON.parse(
          readFileSync(path.join(fixtureRoot, filename), 'utf8'),
        ) as {
          document: unknown;
          from: string;
          to: string;
          fixes?: {
            fix: 'remove-property' | 'move-to-experimental';
            path: (string | number)[];
          }[];
          expectedStatus:
            'converted' | 'blocked' | 'invalid-source' | 'unsupported';
          expectedPatch?: unknown;
          expectedDiagnostics?: {
            code: string;
            rule: string;
            path: (string | number)[];
          }[];
        };
        const result = convertMcpDescriptionVersion(
          readDocument(fixtureRoot, fixture.document),
          {
            from: fixture.from,
            to: fixture.to,
            selector: selector as
              | typeof V0_9_DRAFT_2_SPECIFICATION
              | typeof V0_9_DRAFT_3_SPECIFICATION,
            fixes: fixture.fixes,
          },
        );

        expect(result.status).toBe(fixture.expectedStatus);
        if (fixture.expectedStatus === 'converted') {
          expect(result.ok).toBe(true);
          if (result.ok) expect(result.patch).toEqual(fixture.expectedPatch);
        } else {
          expect(result.ok).toBe(false);
          expect(errorDiagnostics(result.diagnostics)).toEqual(
            errorDiagnostics(
              (fixture.expectedDiagnostics ?? []).map((diagnostic) => ({
                ...diagnostic,
                severity: 'error',
              })),
            ),
          );
          if (!result.ok) {
            expect('value' in result).toBe(false);
            expect('patch' in result).toBe(false);
          }
        }
      });
    }
  });
}

testConversionProfile(V0_9_DRAFT_2_SPECIFICATION);
testConversionProfile(V0_9_DRAFT_3_SPECIFICATION);

describe('convert then project', () => {
  it('targets Draft 3 explicitly and projects the converted value', () => {
    const source = {
      $schema: V0_8_SCHEMA_URI,
      mcpdesc: '0.8.0',
      info: { name: 'draft-3-conversion', version: '1.0.0' },
      protocolVersions: ['2026-07-28'],
      transports: [{ type: 'stdio', command: 'server' }],
      tools: [{ name: 'lookup', inputSchema: { type: 'object' } }],
    };
    const converted = convertMcpDescriptionVersion(source, {
      from: '0.8.0',
      to: '0.9.0',
      selector: V0_9_DRAFT_3_SPECIFICATION,
    });

    expect(converted.ok, JSON.stringify(converted.diagnostics)).toBe(true);
    if (!converted.ok) return;
    expect(converted.value.$schema).toBe(V0_9_DRAFT_3_SCHEMA_URI);
    expect(converted.patch[1]).toEqual({
      op: 'replace',
      path: '/$schema',
      value: V0_9_DRAFT_3_SCHEMA_URI,
    });

    const projected = projectMcpNativeValue(converted.value, {
      selector: V0_9_DRAFT_3_SPECIFICATION,
      protocolVersion: '2026-07-28',
      kind: 'tool',
      identifier: 'lookup',
    });
    expect(projected.ok, JSON.stringify(projected.diagnostics)).toBe(true);
    if (projected.ok)
      expect(projected.value).toEqual({
        name: 'lookup',
        inputSchema: { type: 'object' },
      });
  });

  it('requires explicit conversion before Draft 2 native projection', () => {
    const source = {
      $schema: V0_8_SCHEMA_URI,
      mcpdesc: '0.8.0',
      info: { name: 'weather', version: '1.0.0' },
      protocolVersions: ['2026-07-28'],
      transports: [{ type: 'stdio', command: 'weather' }],
      tools: [{ name: 'forecast', inputSchema: { type: 'object' } }],
    };
    const converted = convertMcpDescriptionVersion(source, {
      from: '0.8.0',
      to: '0.9.0',
    });

    expect(converted.ok, JSON.stringify(converted.diagnostics)).toBe(true);
    if (!converted.ok) return;
    expect(converted.value.$schema).toBe(V0_9_DRAFT_2_SCHEMA_URI);

    const projected = projectMcpNativeValue(converted.value, {
      selector: V0_9_DRAFT_2_SPECIFICATION,
      protocolVersion: '2026-07-28',
      kind: 'tool',
      identifier: 'forecast',
    });
    expect(projected.ok, JSON.stringify(projected.diagnostics)).toBe(true);
    if (projected.ok) {
      expect(projected.value).toEqual({
        name: 'forecast',
        inputSchema: { type: 'object' },
      });
    }
  });

  it('creates an experimental map only when an explicitly requested move needs one', () => {
    const source = {
      $schema: V0_8_SCHEMA_URI,
      mcpdesc: '0.8.0',
      info: { name: 'client-requirements', version: '1.0.0' },
      protocolVersions: ['2026-07-28'],
      transports: [{ type: 'stdio', command: 'server' }],
      tools: [
        {
          name: 'search',
          inputSchema: { type: 'object' },
          clientRequirements: { futureCapability: {} },
        },
      ],
    };
    const original = structuredClone(source);
    const converted = convertMcpDescriptionVersion(source, {
      from: '0.8.0',
      to: '0.9.0',
      fixes: [
        {
          fix: 'move-to-experimental',
          path: ['tools', 0, 'clientRequirements', 'futureCapability'],
        },
      ],
    });

    expect(converted.ok, JSON.stringify(converted.diagnostics)).toBe(true);
    expect(source).toEqual(original);
    if (converted.ok) {
      expect(converted.value.tools).toEqual([
        {
          name: 'search',
          inputSchema: { type: 'object' },
          clientRequirements: { experimental: { futureCapability: {} } },
        },
      ]);
      expect(converted.patch.slice(2)).toEqual([
        {
          op: 'add',
          path: '/tools/0/clientRequirements/experimental',
          value: {},
        },
        {
          op: 'move',
          from: '/tools/0/clientRequirements/futureCapability',
          path: '/tools/0/clientRequirements/experimental/futureCapability',
        },
      ]);
    }
  });
});
