import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  deprecatedSpecifications,
  mcpExtensionCatalogue,
  mcpExtensionMaturity,
  resolveMcpDescriptionComponentReferences,
  resolveMcpDescriptionSpecification,
  specificationProvenance,
  supportedProtocolVersions,
  supportedSpecifications,
  validateMcpDescription
} from '../src/index.js';

const fixtureRoots = {
  '0.8.0-rc.3': new URL('./snapshots/0.8.0-rc.3/fixtures/', import.meta.url),
  '0.8.0-rc.4': new URL('./snapshots/0.8.0-rc.4/fixtures/', import.meta.url)
};

function fixture(group, name, specification = '0.8.0-rc.4') {
  return JSON.parse(fs.readFileSync(new URL(`${group}/${name}`, fixtureRoots[specification]), 'utf8'));
}

function validate(document, specification = '0.8.0-rc.4') {
  return validateMcpDescription(document, { specification });
}

test('exports the active validator API', () => {
  assert.equal(typeof validateMcpDescription, 'function');
  assert.equal(typeof resolveMcpDescriptionComponentReferences, 'function');
  assert.deepEqual(supportedSpecifications, ['0.8.0-rc.3', '0.8.0-rc.4']);
  assert.deepEqual(deprecatedSpecifications, ['0.8.0-rc.3']);
  assert.deepEqual(supportedProtocolVersions, [
    '2024-11-05',
    '2025-03-26',
    '2025-06-18',
    '2025-11-25',
    '2026-07-28'
  ]);
  assert.deepEqual(specificationProvenance, {
    '0.8.0-rc.3': {
      snapshotTag: 'v0.8.0-rc.3',
      schemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.3.json',
      schemaSha256: 'a9c3ff77ba37c72362909f538f6e957d055e6fdb372f8b3d529e3651af3fecf4'
    },
    '0.8.0-rc.4': {
      snapshotTag: 'v0.8.0-rc.4',
      schemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.4.json',
      schemaSha256: 'd38e54db859813b63be2a5c91dde91250035f18bcb5910208cf71fa6875d6eef'
    }
  });
});

test('exports the pinned RC.2 extension catalogue and maturity classification', () => {
  assert.deepEqual(mcpExtensionCatalogue, {
    effectiveDate: '2026-09-04',
    source: 'https://modelcontextprotocol.io/extensions/overview',
    officialIdentifiers: [
      'io.modelcontextprotocol/enterprise-managed-authorization',
      'io.modelcontextprotocol/oauth-client-credentials',
      'io.modelcontextprotocol/tasks',
      'io.modelcontextprotocol/ui'
    ],
    experimentalIdentifiers: []
  });
  assert.equal(mcpExtensionMaturity('io.modelcontextprotocol/ui'), 'official');
  assert.equal(mcpExtensionMaturity('io.modelcontextprotocol/future-capability'), 'uncatalogued');
  assert.ok(Object.isFrozen(mcpExtensionCatalogue));
  assert.ok(Object.isFrozen(mcpExtensionCatalogue.officialIdentifiers));
  assert.ok(Object.isFrozen(mcpExtensionCatalogue.experimentalIdentifiers));
});

test('keeps RC.3 protocol applicability and extension authority diagnostics independent', () => {
  const official = fixture('expected-warning', 'pre-standard-extension-capabilities.json', '0.8.0-rc.3');
  assert.deepEqual(
    validate(official, '0.8.0-rc.3').diagnostics.map(({ code, severity }) => ({ code, severity })),
    [{ code: 'extensions-not-supported-by-version', severity: 'warning' }]
  );

  official.capabilities[0].extensions = { 'io.modelcontextprotocol/future-capability': {} };
  assert.deepEqual(
    validate(official, '0.8.0-rc.3').diagnostics.map(({ code, severity }) => ({ code, severity })),
    [
      { code: 'extensions-not-supported-by-version', severity: 'warning' },
      { code: 'unknown-reserved-extension-identifier', severity: 'warning' }
    ]
  );
});

test('keeps pre-standard client requirements strict and malformed extension maps invalid', () => {
  const document = fixture('expected-warning', 'pre-standard-extension-capabilities.json', '0.8.0-rc.3');
  delete document.capabilities;
  document.tools = [{
    name: 'requires_apps',
    inputSchema: { type: 'object', additionalProperties: false },
    clientRequirements: { extensions: { 'io.modelcontextprotocol/ui': {} } }
  }];
  const requirement = validate(document, '0.8.0-rc.3');
  assert.equal(requirement.valid, false);
  assert.ok(requirement.diagnostics.some(({ code, severity }) => (
    code === 'client-requirement-version-mismatch' && severity === 'error'
  )));

  for (const extensions of [{}, { 'missing-prefix': {} }, { 'com.example/invalid': true }]) {
    const malformed = fixture('expected-warning', 'pre-standard-extension-capabilities.json', '0.8.0-rc.3');
    malformed.capabilities[0].extensions = extensions;
    assert.equal(validate(malformed, '0.8.0-rc.3').valid, false);
  }
});

for (const specification of ['0.8.0-rc.3', '0.8.0-rc.4']) {
  test(`resolves ${specification} component references with terminal provenance`, () => {
    const document = fixture('expected-valid', 'reusable-components.json', specification);
    const original = structuredClone(document);
    const first = resolveMcpDescriptionComponentReferences(document, { specification });
    const second = resolveMcpDescriptionComponentReferences(document, { specification });

    assert.deepEqual(first, second);
    assert.deepEqual(first.document.tools[0].inputSchema, document.components.schemas.Input);
    assert.deepEqual(first.provenance.find((record) => record.referencePath.join('.') === 'tools.0.inputSchema'), {
      referencePath: ['tools', 0, 'inputSchema'],
      targetPath: ['components', 'schemas', 'Input']
    });
    assert.ok(first.substitutions > first.provenance.length);
    assert.deepEqual(document, original);
  });
}

test('rejects component resolution for unsupported selectors', () => {
  const document = fixture('expected-valid', 'reusable-components.json', '0.8.0-rc.3');
  assert.throws(
    () => resolveMcpDescriptionComponentReferences(document, { specification: '0.8.0-draft.4' }),
    /does not support specification: 0\.8\.0-draft\.4/
  );
});

test('requires an explicit exact specification selector', () => {
  const document = fixture('expected-valid', 'minimal-zero-primitives.json');
  assert.throws(() => validateMcpDescription(document), /options\.specification is required/);
  assert.throws(() => validateMcpDescription(document, {}), /options\.specification is required/);
  assert.throws(
    () => validateMcpDescription(document, { specification: '0.8.0' }),
    /Unsupported MCP Description specification: 0\.8\.0/
  );
  assert.throws(
    () => validateMcpDescription(document, { specification: { toString: () => '0.8.0-draft.1' } }),
    /Unsupported MCP Description specification: 0\.8\.0-draft\.1/
  );
});

test('resolves exact snapshot identity offline', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('network access attempted');
  };
  try {
    assert.deepEqual(resolveMcpDescriptionSpecification({
      $schema: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.3.json',
      mcpdesc: '0.8.0'
    }), {
      status: 'resolved',
      specification: '0.8.0-rc.3',
      schemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.3.json',
      provenance: specificationProvenance['0.8.0-rc.3'],
      diagnostics: []
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('requires exact recognized identity instead of inferring from mcpdesc', () => {
  const missing = resolveMcpDescriptionSpecification({ mcpdesc: '0.8.0' });
  assert.equal(missing.status, 'unresolved');
  assert.equal(missing.diagnostics[0].code, 'missing-snapshot-identity');

  const retired = resolveMcpDescriptionSpecification({
    $schema: 'https://mcpdesc.org/schema/0.8.0.json',
    mcpdesc: '0.8.0'
  });
  assert.equal(retired.status, 'unresolved');
  assert.equal(retired.diagnostics[0].code, 'unknown-schema-identity');
});

test('checks explicit selector consistency with declared schema identity', () => {
  const selected = resolveMcpDescriptionSpecification({ mcpdesc: '0.8.0' }, {
    specification: '0.8.0-rc.3'
  });
  assert.equal(selected.status, 'resolved');
  assert.equal(selected.specification, '0.8.0-rc.3');

  const contradiction = resolveMcpDescriptionSpecification({
    $schema: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.4.json'
  }, { specification: '0.8.0-rc.3' });
  assert.equal(contradiction.status, 'unresolved');
  assert.equal(contradiction.diagnostics[0].code, 'contradictory-snapshot-identity');
});

test('distinguishes invalid, unknown, and unsupported identity inputs', () => {
  assert.equal(resolveMcpDescriptionSpecification({ $schema: 42 }).diagnostics[0].code, 'invalid-schema-identity');
  assert.equal(resolveMcpDescriptionSpecification({ $schema: 'https://example.com/schema.json' }).diagnostics[0].code, 'unknown-schema-identity');
  assert.equal(resolveMcpDescriptionSpecification({}, { specification: '0.8.0-draft.99' }).diagnostics[0].code, 'unsupported-specification');
});

test('dispatches both active exact selectors', () => {
  for (const specification of ['0.8.0-rc.3', '0.8.0-rc.4']) {
    const document = fixture('expected-valid', 'reusable-components.json', specification);
    assert.equal(validate(document, specification).valid, true);
  }
});

test('accepts an unknown JavaScript value and returns individual structural diagnostics', () => {
  const result = validate(null);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.length > 0);
  assert.ok(result.diagnostics.every((diagnostic) => diagnostic.code === 'schema-validation'));
  assert.ok(result.diagnostics.every((diagnostic) => diagnostic.severity === 'error'));
  assert.ok(result.diagnostics.every((diagnostic) => Array.isArray(diagnostic.path)));
});

test('appends required and additional property names to structural paths', () => {
  const document = fixture('expected-valid', 'minimal-zero-primitives.json');
  delete document.info;
  document.unexpected = true;

  const result = validate(document);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.message.includes("required property 'info'") && assert.deepEqual(diagnostic.path, ['info']) === undefined));
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.message.includes('additional properties') && assert.deepEqual(diagnostic.path, ['unexpected']) === undefined));
});

test('emits the public diagnostic shape and semantic rule-site paths', () => {
  const result = validate(fixture('expected-invalid', 'duplicate-tag-reference.json'));
  const diagnostic = result.diagnostics.find((candidate) => candidate.code === 'unknown-tag-reference');
  assert.ok(diagnostic);
  assert.deepEqual(Object.keys(diagnostic).sort(), ['code', 'message', 'path', 'severity']);
  assert.deepEqual(diagnostic.path, ['tools', 0, 'tags', 0]);
  assert.equal(Object.hasOwn(diagnostic, 'level'), false);
});

test('is deterministic and does not mutate the input document', () => {
  const document = fixture('expected-invalid', 'resource-example-cache-fields.json');
  const original = structuredClone(document);
  const first = validate(document);
  const second = validate(document);
  assert.deepEqual(first, second);
  assert.deepEqual(document, original);
});

test('exports immutable support and provenance data', () => {
  assert.ok(Object.isFrozen(supportedSpecifications));
  assert.ok(Object.isFrozen(deprecatedSpecifications));
  assert.ok(Object.isFrozen(supportedProtocolVersions));
  assert.ok(Object.isFrozen(specificationProvenance));
  assert.ok(Object.isFrozen(specificationProvenance['0.8.0-rc.2']));
  assert.ok(Object.isFrozen(specificationProvenance['0.8.0-rc.3']));
  assert.throws(() => supportedSpecifications.push('0.8.0'));
  assert.throws(() => supportedProtocolVersions.pop());
  assert.throws(() => {
    specificationProvenance['0.8.0-rc.2'].snapshotTag = 'changed';
  });
});

test('keeps unresolved external references offline', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('network access attempted');
  };
  try {
    const result = validate(fixture('expected-warning', 'unresolved-external-tool-ref.json'));
    assert.equal(result.valid, true);
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'unresolved-external-tool-schema-reference'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('uses browser-neutral UTF-8 lengths and canonical base64 checks', () => {
  const utf8Document = fixture('expected-valid', 'minimal-zero-primitives.json');
  utf8Document.protocolVersions = ['2025-11-25'];
  utf8Document.resources = [{
    uri: 'test://utf8',
    name: 'utf8',
    size: 2,
    examples: {
      sample: {
        result: {
          contents: [{ uri: 'test://utf8', text: '\u00e9' }]
        }
      }
    }
  }];
  assert.deepEqual(validate(utf8Document), { valid: true, diagnostics: [] });

  const base64Document = structuredClone(utf8Document);
  delete base64Document.resources[0].size;
  base64Document.resources[0].examples.sample.result.contents[0] = {
    uri: 'test://utf8',
    blob: 'Zh=='
  };
  const result = validate(base64Document);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((diagnostic) => (
    diagnostic.code === 'invalid-resource-example-base64'
      && diagnostic.path.join('.') === 'resources.0.examples.sample.result.contents.0.blob'
  )));
});