import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  RC_4_SCHEMA_URI,
  V0_8_SCHEMA_URI,
  V0_9_DRAFT_1_SCHEMA_URI,
  deprecatedCoreSpecifications,
  mergeEffectiveProtocolViews,
  migrateMcpDescription07ToRc4,
  migrateMcpDescription07To08,
  projectEffectiveProtocolView,
  projectMcpNativeValue,
  resolveMcpDescriptionComponentReferences,
  selectMcpDescriptionDeclarations,
  type ResolveMcpDescriptionComponentReferencesOptions,
  type SupportedCoreSpecification,
} from '../src/index.js';

type SelectorSensitiveOperation =
  | 'componentResolution'
  | 'merge'
  | 'migrationFrom07'
  | 'nativeProjection'
  | 'projection'
  | 'selection';
type SupportDisposition =
  | 'supported'
  | 'unsupported: no approved 0.7.0-to-0.9.0 migration'
  | 'unsupported: native projection requires 0.9.0-draft.1';
const nativeUnsupported =
  'unsupported: native projection requires 0.9.0-draft.1' as const;

const supportBySpecification = {
  '0.8.0-rc.4': {
    componentResolution: 'supported',
    merge: 'supported',
    migrationFrom07: 'supported',
    nativeProjection: nativeUnsupported,
    projection: 'supported',
    selection: 'supported',
  },
  '0.8.0': {
    componentResolution: 'supported',
    merge: 'supported',
    migrationFrom07: 'supported',
    nativeProjection: nativeUnsupported,
    projection: 'supported',
    selection: 'supported',
  },
  '0.8.0-rev.20261021': {
    componentResolution: 'supported',
    merge: 'supported',
    migrationFrom07: 'supported',
    nativeProjection: nativeUnsupported,
    projection: 'supported',
    selection: 'supported',
  },
  '0.9.0-draft.1': {
    componentResolution: 'supported',
    merge: 'supported',
    migrationFrom07: 'unsupported: no approved 0.7.0-to-0.9.0 migration',
    nativeProjection: 'supported',
    projection: 'supported',
    selection: 'supported',
  },
} as const satisfies Record<
  SupportedCoreSpecification,
  Record<SelectorSensitiveOperation, SupportDisposition>
>;

const schemaBySpecification = {
  '0.8.0-rc.4': RC_4_SCHEMA_URI,
  '0.8.0': V0_8_SCHEMA_URI,
  '0.8.0-rev.20261021': V0_8_SCHEMA_URI,
  '0.9.0-draft.1': V0_9_DRAFT_1_SCHEMA_URI,
} as const satisfies Record<SupportedCoreSpecification, string>;

const migrateBySpecification = {
  '0.8.0-rc.4': (source: unknown) =>
    migrateMcpDescription07ToRc4(source, {
      specification: '0.8.0-rc.4',
      sourceValidated: true,
    }),
  '0.8.0': (source: unknown) =>
    migrateMcpDescription07To08(source, {
      specification: '0.8.0',
      sourceValidated: true,
    }),
  '0.8.0-rev.20261021': (source: unknown) =>
    migrateMcpDescription07To08(source, {
      specification: '0.8.0-rev.20261021',
      sourceValidated: true,
    }),
} satisfies Record<
  Exclude<SupportedCoreSpecification, '0.9.0-draft.1'>,
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
  it('marks RC.4 and the original 0.8.0 rules as deprecated while keeping them operational', () => {
    expect(deprecatedCoreSpecifications).toEqual(['0.8.0-rc.4', '0.8.0']);
    expect(Object.isFrozen(deprecatedCoreSpecifications)).toBe(true);
  });

  for (const specification of Object.keys(
    supportBySpecification,
  ) as SupportedCoreSpecification[]) {
    it(`records and verifies ${specification}`, () => {
      const support = supportBySpecification[specification];
      const document = {
        $schema: schemaBySpecification[specification],
        mcpdesc: specification === '0.9.0-draft.1' ? '0.9.0' : '0.8.0',
        info: { name: 'support-matrix', version: '1.0.0' },
        protocolVersions: ['2025-11-25'],
        transports: [{ type: 'stdio', command: 'server' }],
        components: { schemas: { Input: { type: 'object' } } },
        tools: [
          {
            name: 'search',
            inputSchema: { $componentRef: '#/components/schemas/Input' },
          },
        ],
      };

      expect(
        projectEffectiveProtocolView(document, {
          selector: specification,
          protocolVersion: '2025-11-25',
        }).ok,
      ).toBe(true);
      expect(
        selectMcpDescriptionDeclarations(document, {
          selector: specification,
          selections: { tools: ['search'] },
        }).ok,
      ).toBe(true);
      expect(
        mergeEffectiveProtocolViews([document], { selector: specification }).ok,
      ).toBe(true);
      if (support.migrationFrom07 === 'supported') {
        expect(
          migrateBySpecification[
            specification as keyof typeof migrateBySpecification
          ](legacyDocument).ok,
        ).toBe(true);
      } else {
        const unsupported = migrateMcpDescription07To08(legacyDocument, {
          selector: specification as '0.8.0',
          sourceValidated: true,
        });
        expect(unsupported.ok).toBe(false);
        expect(unsupported.diagnostics[0]?.code).toBe(
          'unsupported-specification',
        );
      }

      const native = projectMcpNativeValue(document, {
        selector: specification as '0.9.0-draft.1',
        protocolVersion: '2025-11-25',
        kind: 'tool',
        identifier: 'search',
      });
      if (support.nativeProjection === 'supported') {
        expect(native.ok, JSON.stringify(native.diagnostics)).toBe(true);
        if (native.ok) {
          expect(native.value).toEqual({
            name: 'search',
            inputSchema: { type: 'object' },
          });
        }
      } else {
        expect(native.ok).toBe(false);
        expect(native.diagnostics[0]?.code).toBe('unsupported-specification');
      }

      const resolution = resolveMcpDescriptionComponentReferences(document, {
        selector: specification,
      } as ResolveMcpDescriptionComponentReferencesOptions);
      expect(resolution.ok).toBe(true);
      if (resolution.ok) {
        expect(resolution.provenance).toContainEqual({
          referencePath: ['tools', 0, 'inputSchema'],
          targetPath: ['components', 'schemas', 'Input'],
        });
      }
    });
  }

  it('requires an explicit selector for draft documents', () => {
    const draft = {
      $schema: V0_9_DRAFT_1_SCHEMA_URI,
      mcpdesc: '0.9.0',
      info: { name: 'draft', version: '1.0.0' },
      protocolVersions: ['2025-11-25'],
      tools: [{ name: 'search', inputSchema: { type: 'object' } }],
    };
    const unpinned = projectMcpNativeValue(draft, {
      protocolVersion: '2025-11-25',
      kind: 'tool',
    });
    expect(unpinned.ok).toBe(false);
    expect(unpinned.diagnostics[0]).toMatchObject({
      code: 'unsupported-format-version',
      phase: 'source',
    });
    expect(
      projectMcpNativeValue(draft, {
        specification: '0.9.0-draft.1',
        protocolVersion: '2025-11-25',
        kind: 'tool',
      }).ok,
    ).toBe(true);
  });
});

// Valid under the 0.8.0-rev.20261021 default, invalid under the original 0.8.0 rules.
const revisionOnlyValid = JSON.parse(
  readFileSync(
    new URL(
      '../../validator/test/snapshots/0.8.0-rev.20261021/fixtures/expected-valid/custom-tool-schema-keywords.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as { protocolVersions: string[]; tools: { name: string }[] };

describe('default selector resolution', () => {
  const protocolVersion = revisionOnlyValid.protocolVersions[0] as '2025-11-25';
  const tools = { tools: [revisionOnlyValid.tools[0]!.name] };
  const operations = {
    projection: (specification?: SupportedCoreSpecification) =>
      projectEffectiveProtocolView(revisionOnlyValid, {
        specification,
        protocolVersion,
      }),
    selection: (specification?: SupportedCoreSpecification) =>
      selectMcpDescriptionDeclarations(revisionOnlyValid, {
        specification,
        selections: tools,
      }),
    merge: (specification?: SupportedCoreSpecification) =>
      mergeEffectiveProtocolViews([revisionOnlyValid], { specification }),
    componentResolution: (specification?: SupportedCoreSpecification) =>
      resolveMcpDescriptionComponentReferences(revisionOnlyValid, {
        specification,
      }),
  };

  for (const [name, operation] of Object.entries(operations)) {
    it(`${name} uses the validator default when no selector is given`, () => {
      const original = structuredClone(revisionOnlyValid);
      expect(operation().ok).toBe(true);
      expect(operation('0.8.0-rev.20261021').ok).toBe(true);
      expect(operation('0.8.0').ok).toBe(false);
      expect(revisionOnlyValid).toEqual(original);
    });
  }

  it('accepts selector as the canonical option and specification as its alias', () => {
    const pinned = { selector: '0.8.0', protocolVersion } as const;
    expect(projectEffectiveProtocolView(revisionOnlyValid, pinned).ok).toBe(
      false,
    );
    expect(
      projectEffectiveProtocolView(revisionOnlyValid, {
        selector: '0.8.0-rev.20261021',
        specification: '0.8.0-rev.20261021',
        protocolVersion,
      }).ok,
    ).toBe(true);
    const migrated = migrateMcpDescription07To08(legacyDocument, {
      selector: '0.8.0',
      sourceValidated: true,
    });
    expect(migrated.report.targetSpecification).toBe('0.8.0');
  });

  it('rejects conflicting selector and specification options', () => {
    const conflicting = {
      selector: '0.8.0-rev.20261021',
      specification: '0.8.0',
    } as const;
    const results = [
      projectEffectiveProtocolView(revisionOnlyValid, {
        ...conflicting,
        protocolVersion,
      }),
      selectMcpDescriptionDeclarations(revisionOnlyValid, {
        ...conflicting,
        selections: tools,
      }),
      mergeEffectiveProtocolViews([revisionOnlyValid], conflicting),
      resolveMcpDescriptionComponentReferences(revisionOnlyValid, conflicting),
      migrateMcpDescription07To08(legacyDocument, {
        ...conflicting,
        sourceValidated: true,
      }),
    ];
    for (const result of results) {
      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]?.code).toBe('conflicting-selector-options');
    }
  });

  it('reports unresolvable documents instead of guessing a selector', () => {
    const result = projectEffectiveProtocolView(
      { ...revisionOnlyValid, mcpdesc: '9.9.9', $schema: undefined },
      { protocolVersion },
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'unsupported-format-version',
        phase: 'source',
        protocolVersion,
      }),
    );
  });

  it('validates 0.8.0 migration results with the default revision', () => {
    const migrated = migrateMcpDescription07To08(legacyDocument, {
      sourceValidated: true,
    });
    expect(migrated.ok).toBe(true);
    expect(migrated.report.targetSpecification).toBe('0.8.0-rev.20261021');
    expect(migrated.ok && migrated.value.$schema).toBe(V0_8_SCHEMA_URI);
  });

  it('still rejects unsupported explicit migration targets', () => {
    const migrated = migrateMcpDescription07To08(legacyDocument, {
      specification: '0.8.0-rc.4' as '0.8.0',
      sourceValidated: true,
    });
    expect(migrated.ok).toBe(false);
    expect(migrated.diagnostics[0]?.code).toBe('unsupported-specification');
  });
});
