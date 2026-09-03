import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  projectEffectiveProtocolView,
  resolveMcpDescriptionComponentReferences,
  type JsonObject,
} from '../src/index.js';

const reusableComponents = JSON.parse(
  readFileSync(
    new URL(
      '../../validator/test/snapshots/0.8.0-rc.1/fixtures/expected-valid/reusable-components.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as JsonObject;

function resolve(document: unknown) {
  return resolveMcpDescriptionComponentReferences(document, {
    specification: '0.8.0-rc.1',
  });
}

function expectDiagnostic(
  document: unknown,
  code: string,
  path: readonly (number | string)[],
) {
  const result = resolve(document);
  expect(result.ok).toBe(false);
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({ code, path, phase: 'source' }),
  );
}

describe('resolveMcpDescriptionComponentReferences', () => {
  it('resolves every namespace, chains, and shared targets with provenance', () => {
    const document = structuredClone(reusableComponents);
    const tools = document.tools as JsonObject[];
    tools.push({
      name: 'search-again',
      inputSchema: { $componentRef: '#/components/schemas/InputAlias' },
    });
    const original = structuredClone(document);

    const first = resolve(document);
    const second = resolve(document);

    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(first.value.components).toBeDefined();
    expect(
      ((first.value.components as JsonObject).schemas as JsonObject).InputAlias,
    ).toEqual(
      ((first.value.components as JsonObject).schemas as JsonObject).Input,
    );
    expect((first.value.tools as JsonObject[])[0].inputSchema).toEqual(
      (document.components as JsonObject).schemas && {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
        additionalProperties: false,
      },
    );
    expect(first.provenance).toContainEqual({
      referencePath: ['tools', 0, 'inputSchema'],
      targetPath: ['components', 'schemas', 'Input'],
    });
    expect(first.provenance).toContainEqual({
      referencePath: ['tools', 1, 'inputSchema'],
      targetPath: ['components', 'schemas', 'Input'],
    });
    expect(first.provenance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetPath: ['components', 'toolExamples', 'basic'],
        }),
        expect.objectContaining({
          targetPath: ['components', 'resourceExamples', 'current'],
        }),
        expect.objectContaining({
          targetPath: ['components', 'resourceTemplateExamples', 'item'],
        }),
        expect.objectContaining({
          targetPath: ['components', 'promptExamples', 'default'],
        }),
      ]),
    );
    expect(first.substitutions).toBeGreaterThan(first.provenance.length);
    expect(document).toEqual(original);
  });

  it('matches an equivalent inline document', () => {
    const referenced = resolve(reusableComponents);
    expect(referenced.ok).toBe(true);
    if (!referenced.ok) return;

    const inline = resolve(referenced.value);
    expect(inline.ok).toBe(true);
    if (!inline.ok) return;
    expect(inline.value).toEqual(referenced.value);
    expect(inline.provenance).toEqual([]);
  });

  it('is a cloning no-op without components', () => {
    const document = {
      $schema: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.1.json',
      mcpdesc: '0.8.0',
      info: { name: 'no-components', version: '1.0.0' },
      protocolVersions: ['2026-07-28'],
    };
    const result = resolve(document);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(document);
    expect(result.value).not.toBe(document);
    expect(result.provenance).toEqual([]);
    expect(result.substitutions).toBe(0);
  });

  it('composes with Effective Protocol View projection in either order', () => {
    const document = {
      $schema: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.1.json',
      mcpdesc: '0.8.0',
      info: { name: 'composition', version: '1.0.0' },
      protocolVersions: ['2025-11-25', '2026-07-28'],
      components: {
        schemas: { Input: { type: 'object', additionalProperties: false } },
      },
      tools: [
        {
          name: 'legacy-search',
          inputSchema: { $componentRef: '#/components/schemas/Input' },
          protocolVersions: ['2025-11-25'],
        },
        {
          name: 'current-search',
          inputSchema: { $componentRef: '#/components/schemas/Input' },
          protocolVersions: ['2026-07-28'],
        },
      ],
    };

    const resolvedFirst = resolve(document);
    expect(resolvedFirst.ok, JSON.stringify(resolvedFirst.diagnostics)).toBe(
      true,
    );
    if (!resolvedFirst.ok) return;
    const thenProjected = projectEffectiveProtocolView(resolvedFirst.value, {
      specification: '0.8.0-rc.1',
      protocolVersion: '2026-07-28',
    });

    const projectedFirst = projectEffectiveProtocolView(document, {
      specification: '0.8.0-rc.1',
      protocolVersion: '2026-07-28',
    });
    expect(projectedFirst.ok).toBe(true);
    if (!projectedFirst.ok) return;
    const thenResolved = resolve(projectedFirst.value);

    expect(thenProjected.ok).toBe(true);
    expect(thenResolved.ok).toBe(true);
    if (!thenProjected.ok || !thenResolved.ok) return;
    expect(thenProjected.value).toEqual(thenResolved.value);
  });

  it('reports missing and wrong-namespace references semantically', () => {
    const missing = structuredClone(reusableComponents);
    (missing.tools as JsonObject[])[0].inputSchema = {
      $componentRef: '#/components/schemas/Missing',
    };
    expectDiagnostic(missing, 'missing-component-reference-target', [
      'tools',
      0,
      'inputSchema',
    ]);

    const wrong = structuredClone(reusableComponents);
    (wrong.tools as JsonObject[])[0].inputSchema = {
      $componentRef: '#/components/toolExamples/basic',
    };
    expectDiagnostic(wrong, 'wrong-component-reference-namespace', [
      'tools',
      0,
      'inputSchema',
    ]);
  });

  it('reports direct and indirect cycles semantically', () => {
    const direct = structuredClone(reusableComponents);
    const directSchemas = (direct.components as JsonObject)
      .schemas as JsonObject;
    directSchemas.Input = {
      $componentRef: '#/components/schemas/Input',
    };
    expectDiagnostic(direct, 'component-reference-cycle', [
      'components',
      'schemas',
      'Input',
    ]);

    const indirect = structuredClone(reusableComponents);
    const indirectSchemas = (indirect.components as JsonObject)
      .schemas as JsonObject;
    indirectSchemas.Input = {
      $componentRef: '#/components/schemas/InputAlias',
    };
    expectDiagnostic(indirect, 'component-reference-cycle', [
      'components',
      'schemas',
      'Input',
    ]);
  });

  it.each([
    ['unknown namespace', '#/components/widgets/Input'],
    ['missing component name', '#/components/schemas'],
    ['bare fragment', '#'],
    ['external URI', 'https://example.com/schema.json'],
  ])('reports malformed reference shape structurally: %s', (_name, ref) => {
    const document = structuredClone(reusableComponents);
    (document.tools as JsonObject[])[0].inputSchema = { $componentRef: ref };
    expectDiagnostic(document, 'schema-validation', [
      'tools',
      '0',
      'inputSchema',
    ]);
  });

  it('reports sibling keys and forbidden reference locations structurally', () => {
    const sibling = structuredClone(reusableComponents);
    (sibling.tools as JsonObject[])[0].inputSchema = {
      $componentRef: '#/components/schemas/Input',
      description: 'not allowed',
    };
    expectDiagnostic(sibling, 'schema-validation', [
      'tools',
      '0',
      'inputSchema',
    ]);

    const interaction = structuredClone(reusableComponents);
    (interaction.tools as JsonObject[])[0].interactionExamples = {
      forbidden: { $componentRef: '#/components/toolExamples/basic' },
    };
    expectDiagnostic(interaction, 'schema-validation', [
      'tools',
      '0',
      'interactionExamples',
      'forbidden',
      '$componentRef',
    ]);

    const completion = structuredClone(reusableComponents);
    (completion.prompts as JsonObject[])[0].completionExamples = {
      forbidden: { $componentRef: '#/components/promptExamples/default' },
    };
    expectDiagnostic(completion, 'schema-validation', [
      'prompts',
      '0',
      'completionExamples',
      'forbidden',
      '$componentRef',
    ]);
  });

  it('reports empty components and invalid resolved consumption structurally', () => {
    const empty = structuredClone(reusableComponents);
    empty.components = {};
    expectDiagnostic(empty, 'schema-validation', ['components']);

    const invalidResolved = structuredClone(reusableComponents);
    ((invalidResolved.components as JsonObject).schemas as JsonObject).Input = {
      type: 'string',
    };
    expectDiagnostic(invalidResolved, 'schema-validation', [
      'tools',
      '0',
      'inputSchema',
    ]);
  });

  it('does not silently dispatch Draft 4 to the RC.1 resolver', () => {
    const result = resolveMcpDescriptionComponentReferences(
      reusableComponents,
      {
        specification: '0.8.0-draft.4',
      } as unknown as { specification: '0.8.0-rc.1' },
    );

    expect(result).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: 'unsupported-specification',
          phase: 'operation',
          path: [],
        }),
      ],
    });
  });
});
