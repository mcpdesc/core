import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

import {
  deprecatedSpecifications,
  defaultSpecifications,
  mcpExtensionCatalogue,
  mcpExtensionMaturity,
  resolveMcpDescriptionComponentReferences,
  resolveMcpDescriptionSpecification,
  specificationProvenance,
  supportedProtocolVersions,
  supportedSpecifications,
  validateMcpDescription
} from '../src/index.js';
import { validatorConfiguration } from '../src/generated/selector-config.js';

const configuredSelectors = Object.entries(validatorConfiguration.selectors);
const expectedSupportedSpecifications = configuredSelectors
  .filter(([, metadata]) => metadata.lifecycle !== 'retired')
  .map(([selector]) => selector);
const expectedDeprecatedSpecifications = configuredSelectors
  .filter(([, metadata]) => metadata.lifecycle === 'deprecated')
  .map(([selector]) => selector);
const fixtureRoots = Object.fromEntries(supportedSpecifications.map((specification) => [
  specification,
  new URL(`./snapshots/${specification}/fixtures/`, import.meta.url)
]));

function fixture(group, name, specification = '0.8.0') {
  return JSON.parse(fs.readFileSync(new URL(`${group}/${name}`, fixtureRoots[specification]), 'utf8'));
}

function validate(document, specification = '0.8.0') {
  return validateMcpDescription(document, { specification });
}

test('exports the active validator API', () => {
  assert.equal(typeof validateMcpDescription, 'function');
  assert.equal(typeof resolveMcpDescriptionComponentReferences, 'function');
  assert.deepEqual(supportedSpecifications, expectedSupportedSpecifications);
  assert.deepEqual(deprecatedSpecifications, expectedDeprecatedSpecifications);
  assert.deepEqual(defaultSpecifications, {
    '0.8.0': { selector: '0.8.0-rev.20261021', schemaPins: false }
  });
  assert.deepEqual(supportedProtocolVersions, [
    '2024-11-05',
    '2025-03-26',
    '2025-06-18',
    '2025-11-25',
    '2026-07-28'
  ]);
  assert.deepEqual(Object.keys(specificationProvenance), supportedSpecifications);
});

test('requires an explicit draft selector and preserves registered rule identities', () => {
  const document = fixture('expected-valid', 'minimal-zero-primitives.json', '0.9.0-draft.1');
  const pinned = validateMcpDescription(document, { selector: '0.9.0-draft.1' });
  assert.equal(pinned.valid, true);
  assert.equal(pinned.defaulted, false);
  assert.equal(pinned.selector, '0.9.0-draft.1');
  assert.equal(validateMcpDescription(document).diagnostics[0].code, 'unsupported-format-version');
  assert.equal(resolveMcpDescriptionSpecification(document, { selector: '0.9.0-draft.1' }).status, 'resolved');
  const invalid = validateMcpDescription({ ...document, tools: [{ name: 'missing' }] }, { selector: '0.9.0-draft.1' });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.diagnostics.some((diagnostic) => diagnostic.rule === 'mcpdesc.document.schema'));
});

test('exports configured provenance for each supported schema', () => {
  for (const specification of supportedSpecifications) {
    const metadata = validatorConfiguration.selectors[specification];
    const schema = fs.readFileSync(new URL(`../src/snapshots/${specification}/schema.json`, import.meta.url));
    const schemaSha256 = createHash('sha256').update(schema).digest('hex');
    assert.equal(metadata.schemaSha256, schemaSha256);
    assert.deepEqual(specificationProvenance[specification], {
      snapshotTag: metadata.specificationTag,
      schemaUri: metadata.schemaUri,
      schemaSha256
    });
  }
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

test('keeps RC.4 protocol applicability and extension authority diagnostics independent', () => {
  const official = fixture('expected-warning', 'pre-standard-extension-capabilities.json', '0.8.0-rc.4');
  assert.deepEqual(
    validate(official, '0.8.0-rc.4').diagnostics.map(({ code, severity }) => ({ code, severity })),
    [{ code: 'extensions-not-supported-by-version', severity: 'warning' }]
  );

  official.capabilities[0].extensions = { 'io.modelcontextprotocol/future-capability': {} };
  assert.deepEqual(
    validate(official, '0.8.0-rc.4').diagnostics.map(({ code, severity }) => ({ code, severity })),
    [
      { code: 'extensions-not-supported-by-version', severity: 'warning' },
      { code: 'unknown-reserved-extension-identifier', severity: 'warning' }
    ]
  );
});

test('keeps pre-standard client requirements strict and malformed extension maps invalid', () => {
  const document = fixture('expected-warning', 'pre-standard-extension-capabilities.json', '0.8.0-rc.4');
  delete document.capabilities;
  document.tools = [{
    name: 'requires_apps',
    inputSchema: { type: 'object', additionalProperties: false },
    clientRequirements: { extensions: { 'io.modelcontextprotocol/ui': {} } }
  }];
  const requirement = validate(document, '0.8.0-rc.4');
  assert.equal(requirement.valid, false);
  assert.ok(requirement.diagnostics.some(({ code, severity }) => (
    code === 'client-requirement-version-mismatch' && severity === 'error'
  )));

  for (const extensions of [{}, { 'missing-prefix': {} }, { 'com.example/invalid': true }]) {
    const malformed = fixture('expected-warning', 'pre-standard-extension-capabilities.json', '0.8.0-rc.4');
    malformed.capabilities[0].extensions = extensions;
    assert.equal(validate(malformed, '0.8.0-rc.4').valid, false);
  }
});

for (const specification of supportedSpecifications) {
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
  const document = fixture('expected-valid', 'reusable-components.json', '0.8.0-rc.4');
  assert.throws(
    () => resolveMcpDescriptionComponentReferences(document, { specification: '0.8.0-draft.4' }),
    /does not support specification: 0\.8\.0-draft\.4/
  );
});

test('defaults from the format version unless the caller pins a selector', () => {
  const document = fixture('expected-valid', 'minimal-zero-primitives.json');
  const defaultResult = validateMcpDescription(document);
  assert.equal(defaultResult.valid, true);
  assert.equal(defaultResult.selector, '0.8.0-rev.20261021');
  assert.equal(defaultResult.specification, '0.8.0-rev.20261021');
  assert.equal(defaultResult.defaulted, true);

  const pinnedResult = validateMcpDescription(document, { selector: '0.8.0-rc.4' });
  assert.equal(pinnedResult.valid, true);
  assert.equal(pinnedResult.selector, '0.8.0-rc.4');
  assert.equal(pinnedResult.specification, '0.8.0-rc.4');
  assert.equal(pinnedResult.defaulted, false);

  const legacyPinnedResult = validateMcpDescription(document, { specification: '0.8.0-rc.4' });
  assert.equal(legacyPinnedResult.selector, '0.8.0-rc.4');
  assert.throws(
    () => validateMcpDescription(document, { selector: '0.8.0', specification: '0.8.0-rc.4' }),
    /must identify the same selector/
  );

  const noSchemaDocument = structuredClone(document);
  delete noSchemaDocument.$schema;
  const noSchemaResult = validateMcpDescription(noSchemaDocument);
  assert.equal(noSchemaResult.valid, true);
  assert.equal(noSchemaResult.specification, '0.8.0-rev.20261021');
  assert.equal(noSchemaResult.defaulted, true);

  const unsupportedDocument = { ...document, mcpdesc: '0.9.0' };
  delete unsupportedDocument.$schema;
  const unsupported = validateMcpDescription(unsupportedDocument);
  assert.equal(unsupported.valid, false);
  assert.equal(unsupported.specification, null);
  assert.equal(unsupported.diagnostics[0].code, 'unsupported-format-version');

  assert.equal(validateMcpDescription(document, {}).specification, '0.8.0-rev.20261021');
  assert.throws(
    () => validateMcpDescription(document, { specification: '0.8.0-rc.3' }),
    /Unsupported MCP Description selector: 0\.8\.0-rc\.3/
  );
  assert.throws(
    () => validateMcpDescription(document, { specification: { toString: () => '0.8.0-draft.1' } }),
    /Unsupported MCP Description selector: 0\.8\.0-draft\.1/
  );
});

test('resolves exact snapshot identity offline', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('network access attempted');
  };
  try {
    assert.deepEqual(resolveMcpDescriptionSpecification({
      $schema: 'https://mcpdesc.org/schema/mcp-description/0.8.0.json',
      mcpdesc: '0.8.0'
    }), {
      status: 'resolved',
      selector: '0.8.0-rev.20261021',
      specification: '0.8.0-rev.20261021',
      defaulted: true,
      schemaUri: 'https://mcpdesc.org/schema/mcp-description/0.8.0.json',
      provenance: specificationProvenance['0.8.0-rev.20261021'],
      diagnostics: []
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('uses maintainer defaults and fails unsupported format versions without fallback', () => {
  const defaulted = resolveMcpDescriptionSpecification({ mcpdesc: '0.8.0' });
  assert.equal(defaulted.status, 'resolved');
  assert.equal(defaulted.selector, '0.8.0-rev.20261021');
  assert.equal(defaulted.specification, '0.8.0-rev.20261021');
  assert.equal(defaulted.defaulted, true);

  const unsupported = resolveMcpDescriptionSpecification({ mcpdesc: '0.9.0' });
  assert.equal(unsupported.status, 'unresolved');
  assert.equal(unsupported.diagnostics[0].code, 'unsupported-format-version');

  const retired = resolveMcpDescriptionSpecification({
    $schema: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.3.json',
    mcpdesc: '0.8.0'
  });
  assert.equal(retired.status, 'resolved');
  assert.equal(retired.selector, '0.8.0-rev.20261021');
  assert.equal(retired.defaulted, true);

  const rcSchemaDefault = resolveMcpDescriptionSpecification({
    $schema: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.4.json',
    mcpdesc: '0.8.0'
  });
  assert.equal(rcSchemaDefault.status, 'resolved');
  assert.equal(rcSchemaDefault.selector, '0.8.0-rev.20261021');
  assert.equal(rcSchemaDefault.defaulted, true);

  const missing = resolveMcpDescriptionSpecification({});
  assert.equal(missing.status, 'unresolved');
  assert.equal(missing.diagnostics[0].code, 'missing-format-version');
});

test('checks explicit selector consistency with declared schema identity', () => {
  const selected = resolveMcpDescriptionSpecification({ mcpdesc: '0.8.0' }, {
    selector: '0.8.0'
  });
  assert.equal(selected.status, 'resolved');
  assert.equal(selected.selector, '0.8.0');
  assert.equal(selected.specification, '0.8.0');

  const contradiction = resolveMcpDescriptionSpecification({
    $schema: 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.4.json'
  }, { selector: '0.8.0' });
  assert.equal(contradiction.status, 'resolved');
  assert.equal(contradiction.selector, '0.8.0');

  const formatContradiction = resolveMcpDescriptionSpecification({
    $schema: 'https://mcpdesc.org/schema/mcp-description/0.8.0.json',
    mcpdesc: '0.9.0'
  });
  assert.equal(formatContradiction.status, 'unresolved');
  assert.equal(formatContradiction.diagnostics[0].code, 'contradictory-format-version');

  const optionConflict = resolveMcpDescriptionSpecification({ mcpdesc: '0.8.0' }, {
    selector: '0.8.0',
    specification: '0.8.0-rc.4'
  });
  assert.equal(optionConflict.status, 'unresolved');
  assert.equal(optionConflict.diagnostics[0].code, 'conflicting-selector-options');
});

test('distinguishes invalid, unknown, and unsupported identity inputs', () => {
  assert.equal(resolveMcpDescriptionSpecification({ $schema: 42 }).diagnostics[0].code, 'invalid-schema-identity');
  assert.equal(resolveMcpDescriptionSpecification({ $schema: 'https://example.com/schema.json' }).diagnostics[0].code, 'unknown-schema-identity');
  assert.equal(resolveMcpDescriptionSpecification({}, { selector: '0.8.0-draft.99' }).diagnostics[0].code, 'unsupported-selector');
});

test('dispatches all supported exact selectors', () => {
  for (const specification of supportedSpecifications) {
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
  assert.ok(Object.isFrozen(defaultSpecifications));
  assert.ok(Object.isFrozen(defaultSpecifications['0.8.0']));
  assert.ok(Object.isFrozen(supportedProtocolVersions));
  assert.ok(Object.isFrozen(specificationProvenance));
  for (const specification of supportedSpecifications) {
    assert.ok(Object.isFrozen(specificationProvenance[specification]));
  }
  assert.throws(() => supportedSpecifications.push('0.8.0'));
  assert.throws(() => supportedProtocolVersions.pop());
  assert.throws(() => {
    specificationProvenance['0.8.0'].snapshotTag = 'changed';
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
  assert.deepEqual(validate(utf8Document), {
    valid: true,
    diagnostics: [],
    selector: '0.8.0',
    specification: '0.8.0',
    defaulted: false
  });

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