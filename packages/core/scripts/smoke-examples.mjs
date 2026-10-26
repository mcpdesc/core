import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { after, test } from 'node:test';

import { validateMcpDescription as validateRuntime } from '@mcpdesc/validator';
import { validateMcpDescription as validateStandalone } from '@mcpdesc/validator/standalone';
import {
  V0_9_DRAFT_1_SCHEMA_URI,
  parseMcpDescriptionSource,
  projectEffectiveProtocolView,
  projectMcpNativeValue,
  resolveMcpDescriptionComponentReferences,
} from '../dist/index.js';

const argumentsList = process.argv.slice(2);
const asDraft = argumentsList.includes('--as-draft');
const directories = argumentsList.filter(
  (argument) => argument !== '--as-draft',
);
if (
  directories.length === 0 ||
  directories.some((directory) => directory.startsWith('--'))
) {
  throw new Error(
    'Usage: npm run test:examples --workspace @mcpdesc/core -- [--as-draft] <examples-directory>...',
  );
}

function exampleFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return exampleFiles(fullPath);
    return entry.isFile() && /\.(?:json|ya?ml)$/i.test(entry.name)
      ? [fullPath]
      : [];
  });
}

const cwd = process.env.INIT_CWD ?? process.cwd();
const files = directories
  .flatMap((directory) => exampleFiles(path.resolve(cwd, directory)))
  .sort();
assert.ok(files.length > 0, 'No example documents found');

const kinds = {
  tool: ['tools', 'name'],
  resource: ['resources', 'uri'],
  resourceTemplate: ['resourceTemplates', 'uriTemplate'],
  prompt: ['prompts', 'name'],
};
const omitted = new Set([
  'protocolVersions',
  'examples',
  'interactionExamples',
  'completionExamples',
  'tags',
  'elicitations',
  'deprecated',
  'security',
  'clientRequirements',
]);
const totals = {
  documents: files.length,
  authored: 0,
  draft: 0,
  warnings: 0,
  views: 0,
  lists: 0,
  singles: 0,
};

function diagnosticSummary(diagnostics) {
  return diagnostics
    .map(
      ({ severity, code, path: diagnosticPath, rule, message }) =>
        `${severity} ${code} at ${JSON.stringify(diagnosticPath)}${rule ? ` (${rule})` : ''}: ${message}`,
    )
    .join('\n');
}

function diagnosticIdentities(diagnostics) {
  return [
    ...new Set(
      diagnostics.map(({ code, severity, path: diagnosticPath, rule }) =>
        JSON.stringify([code, severity, diagnosticPath, rule]),
      ),
    ),
  ].sort();
}

function validate(document, selector) {
  const options = { selector };
  const runtime = validateRuntime(document, options);
  const standalone = validateStandalone(document, options);
  assert.equal(
    standalone.valid,
    runtime.valid,
    'Runtime/standalone validity differs',
  );
  assert.deepEqual(
    diagnosticIdentities(standalone.diagnostics),
    diagnosticIdentities(runtime.diagnostics),
    'Runtime/standalone diagnostic identities differ',
  );
  return runtime;
}

function expectedNative(declaration) {
  const expected = structuredClone(declaration);
  for (const field of Object.keys(expected)) {
    if (omitted.has(field) || field.startsWith('x-')) delete expected[field];
  }
  for (const field of ['icons', 'arguments']) {
    for (const entry of expected[field] ?? []) {
      for (const key of Object.keys(entry)) {
        if (key.startsWith('x-')) delete entry[key];
      }
    }
  }
  return expected;
}

for (const filename of files) {
  const relativePath = path.relative(cwd, filename);
  const source = readFileSync(filename, 'utf8');
  const parsed = parseMcpDescriptionSource(source);

  test(`${relativePath}: authored validation and Effective Protocol Views`, () => {
    assert.equal(parsed.ok, true, JSON.stringify(parsed.diagnostics));
    const document = parsed.value;
    const original = structuredClone(document);
    const selector = document.mcpdesc === '0.9.0' ? '0.9.0-draft.1' : undefined;
    const validation = validate(document, selector);
    assert.equal(
      validation.valid,
      true,
      diagnosticSummary(validation.diagnostics),
    );
    totals.authored += 1;
    for (const protocolVersion of document.protocolVersions) {
      const view = projectEffectiveProtocolView(document, {
        selector,
        protocolVersion,
      });
      assert.equal(view.ok, true, diagnosticSummary(view.diagnostics));
      assert.deepEqual(view.value.protocolVersions, [protocolVersion]);
      assert.equal(
        validateStandalone(view.value, { selector: validation.selector }).valid,
        true,
      );
    }
    assert.deepEqual(document, original, 'Authored document was mutated');
  });

  if (!asDraft) continue;
  test(`${relativePath}: Draft 1 identity-only rehearsal and native projection`, (context) => {
    assert.equal(parsed.ok, true, JSON.stringify(parsed.diagnostics));
    const original = structuredClone(parsed.value);
    const document = structuredClone(parsed.value);
    document.mcpdesc = '0.9.0';
    document.$schema = V0_9_DRAFT_1_SCHEMA_URI;
    const candidate = structuredClone(document);
    const selector = '0.9.0-draft.1';
    const validation = validate(document, selector);
    assert.equal(
      validation.valid,
      true,
      diagnosticSummary(validation.diagnostics),
    );
    totals.draft += 1;
    const warnings = validation.diagnostics.filter(
      ({ severity }) => severity === 'warning',
    );
    const warningIdentities = diagnosticIdentities(warnings);
    totals.warnings += warnings.length;
    if (warnings.length > 0) context.diagnostic(diagnosticSummary(warnings));
    const resolved = resolveMcpDescriptionComponentReferences(document, {
      selector,
    });
    assert.equal(resolved.ok, true, diagnosticSummary(resolved.diagnostics));

    for (const protocolVersion of document.protocolVersions) {
      const view = projectEffectiveProtocolView(document, {
        selector,
        protocolVersion,
      });
      assert.equal(view.ok, true, diagnosticSummary(view.diagnostics));
      assert.deepEqual(view.value.protocolVersions, [protocolVersion]);
      totals.views += 1;
      for (const [kind, [collection, identity]] of Object.entries(kinds)) {
        const applicable = (resolved.value[collection] ?? []).filter(
          (declaration) =>
            (
              declaration.protocolVersions ?? document.protocolVersions
            ).includes(protocolVersion),
        );
        const expected = applicable.map(expectedNative);
        const options = { selector, protocolVersion, kind };
        const list = projectMcpNativeValue(document, options);
        assert.equal(list.ok, true, diagnosticSummary(list.diagnostics));
        assert.deepEqual(
          list.value,
          expected,
          `${protocolVersion}/${kind}: values, scope, or document order differ`,
        );
        const projectedDiagnostics = new Set(
          diagnosticIdentities(list.diagnostics),
        );
        for (const warning of warningIdentities) {
          assert.ok(
            projectedDiagnostics.has(warning),
            'Projection dropped a source warning',
          );
        }
        assert.deepEqual(
          list,
          projectMcpNativeValue(document, options),
          'Projection is not deterministic',
        );
        totals.lists += 1;
        for (const declaration of expected) {
          const single = projectMcpNativeValue(document, {
            ...options,
            identifier: declaration[identity],
          });
          assert.equal(single.ok, true, diagnosticSummary(single.diagnostics));
          assert.deepEqual(
            single.value,
            declaration,
            `${protocolVersion}/${kind}/${declaration[identity]} differs from its list entry`,
          );
          totals.singles += 1;
        }
      }
    }
    assert.deepEqual(
      document,
      candidate,
      'Draft projection mutated its source',
    );
    assert.deepEqual(
      parsed.value,
      original,
      'Draft rehearsal mutated the authored document',
    );
    assert.equal(
      readFileSync(filename, 'utf8'),
      source,
      'External source file changed',
    );
  });
}

after(() => {
  console.log(
    `Examples: ${totals.documents}; authored valid: ${totals.authored}; draft valid: ${totals.draft}; draft warnings: ${totals.warnings}; draft views: ${totals.views}; native lists: ${totals.lists}; native singles: ${totals.singles}.`,
  );
  if (asDraft)
    console.log(
      'Draft mode changes only mcpdesc and $schema in memory; this is not a migration.',
    );
});
