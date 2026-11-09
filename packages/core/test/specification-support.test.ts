import { describe, expect, it } from 'vitest';

import {
  V0_8_REV_20261021_SPECIFICATION,
  V0_8_SCHEMA_URI,
  V0_8_SPECIFICATION,
  V0_9_RC_3_SCHEMA_URI,
  V0_9_RC_3_SPECIFICATION,
  deprecatedCoreSpecifications,
  mergeEffectiveProtocolViews,
  migrateMcpDescription07To08,
  projectEffectiveProtocolView,
  projectMcpNativeValue,
  resolveMcpDescriptionComponentReferences,
  selectMcpDescriptionDeclarations,
  type SupportedCoreSpecification,
} from '../src/index.js';

type SelectorSensitiveOperation =
  | 'componentResolution'
  | 'merge'
  | 'migrationFrom07'
  | 'nativeProjection'
  | 'projection'
  | 'selection'
  | 'conversionFrom08';
type SupportDisposition = 'supported' | 'unsupported: operation does not apply';

const supportBySpecification = {
  '0.8.0': {
    componentResolution: 'supported',
    merge: 'supported',
    migrationFrom07: 'supported',
    nativeProjection: 'unsupported: operation does not apply',
    projection: 'supported',
    selection: 'supported',
    conversionFrom08: 'unsupported: operation does not apply',
  },
  '0.8.0-rev.20261021': {
    componentResolution: 'supported',
    merge: 'supported',
    migrationFrom07: 'supported',
    nativeProjection: 'unsupported: operation does not apply',
    projection: 'supported',
    selection: 'supported',
    conversionFrom08: 'unsupported: operation does not apply',
  },
  '0.9.0-rc.3': {
    componentResolution: 'supported',
    merge: 'supported',
    migrationFrom07: 'unsupported: operation does not apply',
    nativeProjection: 'supported',
    projection: 'supported',
    selection: 'supported',
    conversionFrom08: 'supported',
  },
} as const satisfies Record<
  SupportedCoreSpecification,
  Record<SelectorSensitiveOperation, SupportDisposition>
>;

const schemaBySpecification = {
  '0.8.0': V0_8_SCHEMA_URI,
  '0.8.0-rev.20261021': V0_8_SCHEMA_URI,
  '0.9.0-rc.3': V0_9_RC_3_SCHEMA_URI,
} as const satisfies Record<SupportedCoreSpecification, string>;

const specifications = Object.keys(
  supportBySpecification,
) as SupportedCoreSpecification[];

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

function documentFor(specification: SupportedCoreSpecification) {
  const isRc3 = specification === V0_9_RC_3_SPECIFICATION;
  return {
    $schema: schemaBySpecification[specification],
    mcpdesc: isRc3 ? '0.9.0' : '0.8.0',
    info: { name: 'support-matrix', version: '1.0.0' },
    protocolVersions: ['2025-11-25'],
    transports: [{ type: 'stdio', command: 'server' }],
    tools: [
      {
        name: 'search',
        inputSchema: { type: 'object' },
      },
    ],
  };
}

describe('selector-sensitive operation support', () => {
  it('keeps only the approved selectors in the current core API', () => {
    expect(specifications).toEqual([
      V0_8_SPECIFICATION,
      V0_8_REV_20261021_SPECIFICATION,
      V0_9_RC_3_SPECIFICATION,
    ]);
    expect(deprecatedCoreSpecifications).toEqual([V0_8_SPECIFICATION]);
    expect(Object.isFrozen(deprecatedCoreSpecifications)).toBe(true);
  });

  for (const specification of specifications) {
    it(`records and verifies ${specification}`, () => {
      const document = documentFor(specification);
      const support = supportBySpecification[specification];

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

      const resolution = resolveMcpDescriptionComponentReferences(document, {
        selector: specification,
      });
      expect(resolution.ok).toBe(true);

      if (support.migrationFrom07 === 'supported') {
        expect(
          migrateMcpDescription07To08(legacyDocument, {
            selector: specification as
              | typeof V0_8_SPECIFICATION
              | typeof V0_8_REV_20261021_SPECIFICATION,
            sourceValidated: true,
          }).ok,
        ).toBe(true);
      }

      if (support.nativeProjection === 'supported') {
        expect(
          projectMcpNativeValue(document, {
            selector: V0_9_RC_3_SPECIFICATION,
            protocolVersion: '2025-11-25',
            kind: 'tool',
            identifier: 'search',
          }).ok,
        ).toBe(true);
      }

      expect(Object.keys(supportBySpecification[specification])).toEqual([
        'componentResolution',
        'merge',
        'migrationFrom07',
        'nativeProjection',
        'projection',
        'selection',
        'conversionFrom08',
      ]);
    });
  }

  it('rejects retired selectors at the core operation boundary', () => {
    const document = documentFor(V0_9_RC_3_SPECIFICATION);
    // @ts-expect-error Retired selectors are intentionally excluded from the public type.
    const projection = projectEffectiveProtocolView(document, {
      selector: '0.9.0-rc.2',
      protocolVersion: '2025-11-25',
    });
    expect(projection.ok).toBe(false);
    expect(projection.diagnostics[0]?.code).toBe('unsupported-specification');

    // @ts-expect-error Retired selectors are intentionally excluded from the public type.
    const merge = mergeEffectiveProtocolViews([document], {
      selector: '0.9.0-draft.4',
    });
    expect(merge.ok).toBe(false);
    expect(merge.diagnostics[0]?.code).toBe('unsupported-specification');
  });

  it('defaults 0.8 and 0.9 documents to their configured retained selectors', () => {
    expect(
      projectEffectiveProtocolView(documentFor(V0_8_SPECIFICATION), {
        protocolVersion: '2025-11-25',
      }),
    ).toEqual(
      projectEffectiveProtocolView(documentFor(V0_8_SPECIFICATION), {
        selector: V0_8_REV_20261021_SPECIFICATION,
        protocolVersion: '2025-11-25',
      }),
    );
    expect(
      projectEffectiveProtocolView(documentFor(V0_9_RC_3_SPECIFICATION), {
        protocolVersion: '2025-11-25',
      }),
    ).toEqual(
      projectEffectiveProtocolView(documentFor(V0_9_RC_3_SPECIFICATION), {
        selector: V0_9_RC_3_SPECIFICATION,
        protocolVersion: '2025-11-25',
      }),
    );
  });

  it('preserves RC.3 structured diagnostics through core operations', () => {
    const typoDocument = {
      ...documentFor(V0_9_RC_3_SPECIFICATION),
      transports: [{ type: 'stdio', command: 'server', typ: 'stdio' }],
    };
    const typo = projectEffectiveProtocolView(typoDocument, {
      selector: V0_9_RC_3_SPECIFICATION,
      protocolVersion: '2025-11-25',
    });
    expect(typo.ok).toBe(false);
    expect(typo.diagnostics).toContainEqual(
      expect.objectContaining({
        path: ['transports', 0, 'typ'],
        phase: 'source',
        rule: 'mcpdesc.transport.members',
        detail: expect.objectContaining({
          kind: 'unexpected-member',
          member: 'typ',
        }),
      }),
    );
  });
});
