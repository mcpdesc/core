import { describe, expect, it } from 'vitest';

import {
  DRAFT_4_SCHEMA_URI,
  RC_1_SCHEMA_URI,
  RC_2_SCHEMA_URI,
  mergeEffectiveProtocolViews,
  migrateMcpDescription07ToDraft4,
  migrateMcpDescription07ToRc1,
  migrateMcpDescription07ToRc2,
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
type SupportDisposition = 'supported' | 'unsupported-pending-contract';

const supportBySpecification = {
  '0.8.0-draft.4': {
    componentResolution: 'unsupported-pending-contract',
    merge: 'supported',
    migrationFrom07: 'supported',
    projection: 'supported',
    selection: 'supported',
  },
  '0.8.0-rc.1': {
    componentResolution: 'supported',
    merge: 'supported',
    migrationFrom07: 'supported',
    projection: 'supported',
    selection: 'supported',
  },
  '0.8.0-rc.2': {
    componentResolution: 'unsupported-pending-contract',
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
  '0.8.0-draft.4': DRAFT_4_SCHEMA_URI,
  '0.8.0-rc.1': RC_1_SCHEMA_URI,
  '0.8.0-rc.2': RC_2_SCHEMA_URI,
} as const satisfies Record<SupportedCoreSpecification, string>;

const migrateBySpecification = {
  '0.8.0-draft.4': (source: unknown) =>
    migrateMcpDescription07ToDraft4(source, {
      specification: '0.8.0-draft.4',
      sourceValidated: true,
    }),
  '0.8.0-rc.1': (source: unknown) =>
    migrateMcpDescription07ToRc1(source, {
      specification: '0.8.0-rc.1',
      sourceValidated: true,
    }),
  '0.8.0-rc.2': (source: unknown) =>
    migrateMcpDescription07ToRc2(source, {
      specification: '0.8.0-rc.2',
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
