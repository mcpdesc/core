import { describe, expect, it } from 'vitest';

import {
  RC_4_SCHEMA_URI,
  RC_3_SCHEMA_URI,
  deprecatedCoreSpecifications,
  mergeEffectiveProtocolViews,
  migrateMcpDescription07ToRc4,
  migrateMcpDescription07ToRc3,
  projectEffectiveProtocolView,
  resolveMcpDescriptionComponentReferences,
  selectMcpDescriptionDeclarations,
  type ResolveMcpDescriptionComponentReferencesOptions,
  type SupportedCoreSpecification,
} from '../src/index.js';

type SelectorSensitiveOperation =
  | 'componentResolution'
  | 'merge'
  | 'migrationFrom07'
  | 'projection'
  | 'selection';
type SupportDisposition = 'supported' | 'unsupported';

const supportBySpecification = {
  '0.8.0-rc.3': {
    componentResolution: 'supported',
    merge: 'supported',
    migrationFrom07: 'supported',
    projection: 'supported',
    selection: 'supported',
  },
  '0.8.0-rc.4': {
    componentResolution: 'unsupported',
    merge: 'supported',
    migrationFrom07: 'supported',
    projection: 'supported',
    selection: 'supported',
  },
} as const satisfies Record<
  SupportedCoreSpecification,
  Record<SelectorSensitiveOperation, SupportDisposition>
>;

const schemaBySpecification = {
  '0.8.0-rc.3': RC_3_SCHEMA_URI,
  '0.8.0-rc.4': RC_4_SCHEMA_URI,
} as const satisfies Record<SupportedCoreSpecification, string>;

const migrateBySpecification = {
  '0.8.0-rc.3': (source: unknown) =>
    migrateMcpDescription07ToRc3(source, {
      specification: '0.8.0-rc.3',
      sourceValidated: true,
    }),
  '0.8.0-rc.4': (source: unknown) =>
    migrateMcpDescription07ToRc4(source, {
      specification: '0.8.0-rc.4',
      sourceValidated: true,
    }),
} satisfies Record<
  SupportedCoreSpecification,
  (source: unknown) => { readonly ok: boolean }
>;

const legacyDocument = {
  mcpdesc: '0.7.0',
  info: {
    name: 'support-matrix',
    version: '1.0.0',
    protocolVersion: '2025-11-25',
  },
  transports: [{ type: 'stdio', command: 'server' }],
  tools: [{ name: 'search', inputSchema: { type: 'object' } }],
};

describe('selector-sensitive operation support', () => {
  it('marks RC.3 as deprecated while keeping it operational', () => {
    expect(deprecatedCoreSpecifications).toEqual(['0.8.0-rc.3']);
    expect(Object.isFrozen(deprecatedCoreSpecifications)).toBe(true);
  });

  for (const specification of Object.keys(
    supportBySpecification,
  ) as SupportedCoreSpecification[]) {
    it(`records and verifies ${specification}`, () => {
      const document = {
        $schema: schemaBySpecification[specification],
        mcpdesc: '0.8.0',
        info: { name: 'support-matrix', version: '1.0.0' },
        protocolVersions: ['2025-11-25'],
        transports: [{ type: 'stdio', command: 'server' }],
        tools: [{ name: 'search', inputSchema: { type: 'object' } }],
      };

      expect(
        projectEffectiveProtocolView(document, {
          specification,
          protocolVersion: '2025-11-25',
        }).ok,
      ).toBe(true);
      expect(
        selectMcpDescriptionDeclarations(document, {
          specification,
          selections: { tools: ['search'] },
        }).ok,
      ).toBe(true);
      expect(
        mergeEffectiveProtocolViews([document], { specification }).ok,
      ).toBe(true);
      expect(migrateBySpecification[specification](legacyDocument).ok).toBe(
        true,
      );

      const resolution = resolveMcpDescriptionComponentReferences(document, {
        specification,
      } as ResolveMcpDescriptionComponentReferencesOptions);
      if (
        supportBySpecification[specification].componentResolution ===
        'supported'
      ) {
        expect(resolution.ok).toBe(true);
      } else {
        expect(resolution).toEqual({
          ok: false,
          diagnostics: [
            expect.objectContaining({
              code: 'unsupported-specification',
              phase: 'operation',
            }),
          ],
        });
      }
    });
  }
});
