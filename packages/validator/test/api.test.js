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
  assert.deepEqual(supportedSpecifications, [
    '0.9.0-rc.3',
    '0.8.0',
    '0.8.0-rev.20261021'
  ]);
  assert.deepEqual(deprecatedSpecifications, expectedDeprecatedSpecifications);
  assert.deepEqual(deprecatedSpecifications, ['0.8.0']);
  assert.deepEqual(defaultSpecifications, {
    '0.8.0': { selector: '0.8.0-rev.20261021', schemaPins: false },
    '0.9.0': { selector: '0.9.0-rc.3', schemaPins: false }
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

test('rejects retired selector pins while defaulting 0.9.0 documents to RC.3', () => {
  const document = fixture('expected-valid', 'minimal-zero-primitives.json', '0.9.0-rc.3');
  assert.equal(validateMcpDescription(document).selector, '0.9.0-rc.3');
  for (const selector of [
    '0.8.0-rc.4',
    '0.9.0-draft.1',
    '0.9.0-draft.2',
    '0.9.0-draft.3',
    '0.9.0-draft.4',
    '0.9.0-rc.1',
    '0.9.0-rc.2',
  ]) {
    assert.throws(
      () => validateMcpDescription(document, { selector }),
      new RegExp(`Unsupported MCP Description selector: ${selector.replaceAll('.', '\\.')}`),
    );
    assert.equal(
      resolveMcpDescriptionSpecification(document, { selector }).status,
      'unresolved',
    );
  }
});

test('defaults 0.9.0 with or without a schema identity and preserves exact rule pins', () => {
  const document = fixture('expected-warning', 'tool-schema-mcp-type-mismatch.json', '0.9.0-rc.3');
  for (const schema of [undefined, document.$schema, 'https://mcpdesc.org/schema/mcp-description/0.9.0-rc.2.json']) {
    const source = { ...document, $schema: schema };
    if (schema === undefined) delete source.$schema;
    const result = validateMcpDescription(source);
    assert.equal(result.valid, true);
    assert.equal(result.selector, '0.9.0-rc.3');
    assert.equal(result.defaulted, true);
    assert.ok(result.results.some(({ rule }) => rule === 'mcp.tool.output-schema.protocol-version'));
    assert.ok(!result.results.some(({ rule }) => rule.includes('revision-availability')));
    const pinned = validateMcpDescription(source, { selector: '0.9.0-rc.3' });
    assert.equal(pinned.selector, '0.9.0-rc.3');
    assert.equal(pinned.defaulted, false);
    assert.ok(pinned.results.some(({ rule }) => rule === 'mcp.tool.output-schema.protocol-version'));
  }
});

test('reports source-aware RC.3 schema details and focused rule results', () => {
  const document = fixture(
    'expected-invalid',
    'transport-arg-typo.json',
    '0.9.0-rc.3',
  );
  const result = validateMcpDescription(document, { selector: '0.9.0-rc.3' });
  const unexpected = result.diagnostics.find(
    ({ detail }) => detail?.kind === 'unexpected-member',
  );
  assert.ok(unexpected);
  assert.deepEqual(unexpected.path, ['transports', 0, 'arg']);
  assert.deepEqual(unexpected.detail, {
    kind: 'unexpected-member',
    member: 'arg',
    allowedMembers: ['args', 'command', 'env', 'protocolVersions', 'security', 'type'],
    allowedMemberPatterns: ['^x-'],
    selector: { member: 'type', value: 'stdio' },
  });
  assert.equal(unexpected.rule, 'mcpdesc.transport.members');
  assert.ok(
    !result.results.some(
      ({ rule, status }) =>
        rule === 'mcpdesc.components.members' && status === 'failed',
    ),
  );

  const missingTypeDocument = structuredClone(document);
  delete missingTypeDocument.transports[0].type;
  const missingType = validateMcpDescription(missingTypeDocument, {
    selector: '0.9.0-rc.3',
  }).diagnostics.find(({ detail }) => detail?.kind === 'missing-member');
  assert.ok(missingType);
  assert.deepEqual(missingType.path, ['transports', 0]);
  assert.equal(missingType.detail.member, 'type');
});

test('RC.3 rejects unknown elicitation response members', () => {
  const document = fixture(
    'expected-invalid',
    'elicitation-response-unknown-member.json',
    '0.9.0-rc.3',
  );
  assert.equal(
    validateMcpDescription(document, { selector: '0.9.0-rc.3' }).valid,
    false,
  );
});

test('maps RC.3 component findings to the reference use and definition', () => {
  const document = {
    mcpdesc: '0.9.0',
    info: { name: 'component-diagnostics', version: '1.0.0' },
    protocolVersions: ['2025-11-25'],
    transports: [{ type: 'stdio', command: 'server' }],
    prompts: [
      {
        name: 'prepare_release',
        elicitations: [
          {
            name: 'approval',
            mode: 'form',
            message: 'Approve this action.',
            requestedSchema: {
              $componentRef: '#/components/schemas/Form',
            },
          },
        ],
      },
    ],
    components: {
      schemas: {
        Form: {
          type: 'object',
          properties: { approval: { type: 'strin' } },
        },
      },
    },
  };
  const result = validateMcpDescription(document, { selector: '0.9.0-rc.3' });
  const diagnostic = result.diagnostics.find(
    ({ detail }) => detail?.kind === 'invalid-value',
  );
  assert.ok(diagnostic);
  assert.deepEqual(diagnostic.path, [
    'prompts',
    0,
    'elicitations',
    0,
    'requestedSchema',
  ]);
  assert.deepEqual(diagnostic.relatedLocations, [
    {
      path: [
        'components',
        'schemas',
        'Form',
        'properties',
        'approval',
        'type',
      ],
      relation: 'component-definition',
    },
  ]);
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

test('exports the configured extension catalogue and maturity classification', () => {
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
  const document = fixture('expected-valid', 'reusable-components.json', '0.8.0');
  assert.throws(
    () => resolveMcpDescriptionComponentReferences(document, { specification: '0.8.0-rc.4' }),
    /does not support specification: 0\.8\.0-rc\.4/
  );
});

test('defaults from the format version unless the caller pins a selector', () => {
  const document = fixture('expected-valid', 'minimal-zero-primitives.json');
  const defaultResult = validateMcpDescription(document);
  assert.equal(defaultResult.valid, true);
  assert.equal(defaultResult.selector, '0.8.0-rev.20261021');
  assert.equal(defaultResult.specification, '0.8.0-rev.20261021');
  assert.equal(defaultResult.defaulted, true);

  const pinnedResult = validateMcpDescription(document, { selector: '0.8.0' });
  assert.equal(pinnedResult.valid, true);
  assert.equal(pinnedResult.selector, '0.8.0');
  assert.equal(pinnedResult.specification, '0.8.0');
  assert.equal(pinnedResult.defaulted, false);

  const legacyPinnedResult = validateMcpDescription(document, { specification: '0.8.0' });
  assert.equal(legacyPinnedResult.selector, '0.8.0');
  assert.throws(
    () => validateMcpDescription(document, { selector: '0.8.0', specification: '0.8.0-rev.20261021' }),
    /must identify the same selector/
  );

  const noSchemaDocument = structuredClone(document);
  delete noSchemaDocument.$schema;
  const noSchemaResult = validateMcpDescription(noSchemaDocument);
  assert.equal(noSchemaResult.valid, true);
  assert.equal(noSchemaResult.specification, '0.8.0-rev.20261021');
  assert.equal(noSchemaResult.defaulted, true);

  const unsupportedDocument = { ...document, mcpdesc: '99.0.0' };
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

  const unsupported = resolveMcpDescriptionSpecification({ mcpdesc: '99.0.0' });
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

test('per-call schema policy rejects retired identities and optionally falls back', () => {
  const document = fixture('expected-valid', 'minimal-zero-primitives.json', '0.9.0-rc.3');
  document.$schema = 'https://mcpdesc.org/schema/mcp-description/0.9.0-rc.1.json';
  assert.equal(validateMcpDescription(document).selector, '0.9.0-rc.3');

  const unavailableResolution = resolveMcpDescriptionSpecification(document, {
    schemaPolicyIfPresent: true
  });
  assert.equal(unavailableResolution.status, 'unresolved');
  assert.equal(unavailableResolution.diagnostics[0].code, 'unsupported-selector');
  const unavailableValidation = validateMcpDescription(document, {
    schemaPolicyIfPresent: true
  });
  assert.equal(unavailableValidation.valid, false);
  assert.equal(unavailableValidation.selector, null);
  assert.equal(unavailableValidation.diagnostics[0].code, 'unsupported-selector');

  const noSchema = { ...document };
  delete noSchema.$schema;
  assert.equal(validateMcpDescription(noSchema, {
    schemaPolicyIfPresent: true
  }).selector, '0.9.0-rc.3');

  const fallbackResolution = resolveMcpDescriptionSpecification(document, {
    schemaPolicyIfPresent: true,
    fallbackIfSelectorIsUnknown: true
  });
  assert.equal(fallbackResolution.status, 'resolved');
  assert.equal(fallbackResolution.selector, '0.9.0-rc.3');
  assert.equal(fallbackResolution.defaulted, true);

  const fallbackValidation = validateMcpDescription(document, {
    schemaPolicyIfPresent: true,
    fallbackIfSelectorIsUnknown: true
  });
  assert.equal(fallbackValidation.selector, '0.9.0-rc.3');
  assert.equal(fallbackValidation.defaulted, true);
});

test('per-call schema policy preserves ambiguous, unknown, and contradictory identity errors', () => {
  const options = {
    schemaPolicyIfPresent: true,
    fallbackIfSelectorIsUnknown: true
  };
  const ambiguous = resolveMcpDescriptionSpecification({
    mcpdesc: '0.8.0',
    $schema: 'https://mcpdesc.org/schema/0.8.0.json'
  }, options);
  assert.equal(ambiguous.status, 'unresolved');
  assert.equal(ambiguous.diagnostics[0].code, 'ambiguous-schema-identity');

  const unknown = resolveMcpDescriptionSpecification({
    mcpdesc: '0.8.0',
    $schema: 'https://example.com/schema.json'
  }, options);
  assert.equal(unknown.status, 'unresolved');
  assert.equal(unknown.diagnostics[0].code, 'unknown-schema-identity');

  const contradictory = resolveMcpDescriptionSpecification({
    mcpdesc: '0.9.0',
    $schema: 'https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json'
  }, options);
  assert.equal(contradictory.status, 'unresolved');
  assert.equal(contradictory.diagnostics[0].code, 'contradictory-format-version');

  const explicit = validateMcpDescription({
    mcpdesc: '0.9.0',
    $schema: 'https://mcpdesc.org/schema/mcp-description/0.9.0-rc.3.json'
  }, {
    selector: '0.9.0-rc.3',
    schemaPolicyIfPresent: true,
    fallbackIfSelectorIsUnknown: true
  });
  assert.equal(explicit.selector, '0.9.0-rc.3');
});

test('validates per-call schema policy option types', () => {
  assert.throws(
    () => validateMcpDescription({}, { schemaPolicyIfPresent: 'true' }),
    /options\.schemaPolicyIfPresent must be a boolean/
  );
  assert.throws(
    () => validateMcpDescription({}, { fallbackIfSelectorIsUnknown: 1 }),
    /options\.fallbackIfSelectorIsUnknown must be a boolean/
  );
  assert.throws(
    () => resolveMcpDescriptionSpecification({}, { schemaPolicyIfPresent: 'true' }),
    /options\.schemaPolicyIfPresent must be a boolean/
  );
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
    specification: '0.8.0-rev.20261021'
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