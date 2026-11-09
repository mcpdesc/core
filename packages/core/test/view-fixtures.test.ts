import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  areMcpDescriptionDocumentsSemanticallyEquivalent,
  mergeEffectiveProtocolViews,
  projectEffectiveProtocolView,
  resolveMcpDescriptionComponentReferences,
  V0_9_RC_3_SPECIFICATION,
} from '../src/index.js';

for (const selector of [V0_9_RC_3_SPECIFICATION]) {
  const fixtureRoot = fileURLToPath(
    new URL(
      `../../validator/test/snapshots/${selector}/view-fixtures/`,
      import.meta.url,
    ),
  );

  const codesByFailureAnchor: Readonly<Record<string, readonly string[]>> = {
    'req-component-merge-extensions': ['conflicting-unscoped-metadata'],
    'req-extension-merge': ['conflicting-protocol-view'],
    'req-merge-equivalence': [
      'conflicting-protocol-view',
      'conflicting-unscoped-metadata',
    ],
    'req-merge-inputs': ['schema-validation', 'merge-input-required'],
    'req-tags-merge': ['conflicting-unscoped-metadata'],
    'req-view-projection': [
      'projection-version-not-declared',
      'projection-protocol-version-not-declared',
      'schema-validation',
    ],
  };

  function readDocument(reference: string): Record<string, unknown> {
    return JSON.parse(
      readFileSync(path.resolve(fixtureRoot, reference), 'utf8'),
    ) as Record<string, unknown>;
  }

  function withoutComponents(
    document: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = structuredClone(document);
    delete result.components;
    return result;
  }

  function resolvedView(
    document: Record<string, unknown>,
    revision: string,
  ): Record<string, unknown> {
    const view = projectEffectiveProtocolView(document, {
      selector,
      protocolVersion: revision as never,
    });
    expect(view.ok, JSON.stringify(view.diagnostics)).toBe(true);
    if (!view.ok) return {};
    const resolved = resolveMcpDescriptionComponentReferences(view.value, {
      selector,
    });
    expect(resolved.ok, JSON.stringify(resolved.diagnostics)).toBe(true);
    return resolved.ok ? withoutComponents(resolved.value) : {};
  }

  describe(`${selector} Effective Protocol View and merge fixtures`, () => {
    for (const filename of readdirSync(fixtureRoot)
      .filter((name) => name.endsWith('.json'))
      .sort()) {
      it(filename, () => {
        const testCase = JSON.parse(
          readFileSync(path.join(fixtureRoot, filename), 'utf8'),
        ) as {
          operation: 'view' | 'merge';
          inputs: string[];
          revision?: string;
          protocolVersion?: string;
          expected?: string;
          expectedFailure?: string;
        };
        const inputs = testCase.inputs.map(readDocument);
        const result =
          testCase.operation === 'view'
            ? projectEffectiveProtocolView(inputs[0], {
                selector,
                protocolVersion: (testCase.protocolVersion ??
                  testCase.revision) as never,
              })
            : mergeEffectiveProtocolViews(inputs, {
                selector,
              });

        if (testCase.expectedFailure) {
          expect(result.ok).toBe(false);
          const allowedCodes = codesByFailureAnchor[testCase.expectedFailure];
          expect(
            allowedCodes,
            `unmapped requirement anchor ${testCase.expectedFailure}`,
          ).toBeDefined();
          if (!result.ok) {
            expect(
              result.diagnostics.some((diagnostic) =>
                allowedCodes!.includes(diagnostic.code ?? ''),
              ),
              JSON.stringify(result.diagnostics),
            ).toBe(true);
          }
          return;
        }

        expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
        if (!result.ok) return;
        const expected = readDocument(testCase.expected!);
        expect(
          areMcpDescriptionDocumentsSemanticallyEquivalent(
            result.value,
            expected,
          ),
        ).toBe(true);

        if (testCase.operation === 'merge') {
          const revisions = new Set(
            inputs.flatMap((document) => document.protocolVersions as string[]),
          );
          for (const revision of revisions) {
            for (const input of inputs) {
              if (!(input.protocolVersions as string[]).includes(revision))
                continue;
              expect(
                areMcpDescriptionDocumentsSemanticallyEquivalent(
                  resolvedView(result.value, revision),
                  resolvedView(input, revision),
                ),
                `${filename} failed the ${revision} merge round trip`,
              ).toBe(true);
            }
          }
        }
      });
    }
  });
}
