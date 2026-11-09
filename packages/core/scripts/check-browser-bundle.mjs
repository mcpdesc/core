import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const entries = [
  {
    name: 'root',
    path: '../src/index.ts',
    allowsValidator: true,
    requiredExports: [
      'migrateMcpDescription07To08',
      'serializeMcpDescriptionMigrationReport',
      'projectMcpNativeValue',
      'v0_9Rc3Snapshot',
      'V0_9_RC_3_SPECIFICATION',
      'V0_9_RC_3_SCHEMA_URI',
      'convertMcpDescriptionVersion',
    ],
  },
  {
    name: 'documents',
    path: '../src/documents.ts',
    allowsValidator: false,
    requiredExports: [],
  },
  {
    name: 'components',
    path: '../src/components.ts',
    allowsValidator: true,
    requiredExports: ['resolveMcpDescriptionComponentReferences'],
  },
  {
    name: 'selection',
    path: '../src/selection.ts',
    allowsValidator: true,
    requiredExports: [],
  },
];

for (const entry of entries) {
  const result = await build({
    entryPoints: [new URL(entry.path, import.meta.url).pathname],
    bundle: true,
    format: 'esm',
    logLevel: 'silent',
    metafile: true,
    platform: 'browser',
    write: false,
  });
  const inputs = Object.keys(result.metafile.inputs);
  const nodeInputs = inputs.filter((input) => input.startsWith('node:'));
  if (nodeInputs.length > 0) {
    throw new Error(
      `${entry.name} browser bundle contains Node built-ins: ${nodeInputs.join(', ')}`,
    );
  }
  if (
    result.outputFiles.length !== 1 ||
    result.outputFiles[0].contents.length === 0
  ) {
    throw new Error(`${entry.name} browser bundle output is empty`);
  }

  const source = result.outputFiles[0].text;
  if (/\b(?:eval|Function)\s*\(/u.test(source)) {
    throw new Error(
      `${entry.name} browser bundle contains runtime code generation`,
    );
  }
  if (
    !entry.allowsValidator &&
    inputs.some(
      (input) =>
        input.includes('@mcpdesc/validator') || input.includes('/ajv/'),
    )
  ) {
    throw new Error(`${entry.name} browser bundle contains validator code`);
  }
  if (
    entry.allowsValidator &&
    inputs.some(
      (input) =>
        input.includes('@mcpdesc/validator/src/') || input.includes('/ajv/'),
    )
  ) {
    throw new Error(
      `${entry.name} browser bundle contains the validator runtime entry`,
    );
  }
  for (const requiredExport of entry.requiredExports) {
    if (!source.includes(requiredExport)) {
      throw new Error(`${entry.name} browser bundle omits ${requiredExport}`);
    }
  }

  console.log(
    `${entry.name} browser bundle passed (${result.outputFiles[0].contents.length} bytes).`,
  );
}

const originalEval = globalThis.eval;
const OriginalFunction = globalThis.Function;
let codegenAttempts = 0;
globalThis.eval = () => {
  codegenAttempts += 1;
  throw new EvalError('eval blocked by test CSP');
};
globalThis.Function = function BlockedFunction() {
  codegenAttempts += 1;
  throw new EvalError('Function blocked by test CSP');
};

try {
  const root = await import('../dist/index.js');
  const documents = await import('../dist/documents.js');
  const components = await import('../dist/components.js');
  const unordered = {
    tools: [
      {
        inputSchema: { properties: { z: {}, a: {} }, type: 'object' },
        name: 'lookup',
      },
    ],
    info: { version: '1.0.0', name: 'ordering' },
    mcpdesc: '0.9.0',
  };
  const ordered = {
    mcpdesc: '0.9.0',
    info: { name: 'ordering', version: '1.0.0' },
    tools: [{ name: 'lookup', inputSchema: unordered.tools[0].inputSchema }],
  };
  for (const entry of [root, documents]) {
    for (const keyOrder of [undefined, 'preserve', 'sorted', 'document']) {
      assert.equal(
        entry.serializeMcpDescription(
          { tools: [{ inputSchema: { required: ['query'] } }] },
          { format: 'yaml', keyOrder },
        ),
        'tools:\n  - inputSchema:\n      required:\n        - query\n',
      );
    }
    for (const format of ['json', 'yaml']) {
      assert.equal(
        entry.serializeMcpDescription(unordered, {
          format,
          keyOrder: 'document',
        }),
        entry.serializeMcpDescription(ordered, {
          format,
          keyOrder: 'preserve',
        }),
      );
    }
  }
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        '../../validator/test/snapshots/0.8.0/fixtures/expected-valid/reusable-components.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  for (const operation of [
    root.resolveMcpDescriptionComponentReferences,
    components.resolveMcpDescriptionComponentReferences,
  ]) {
    const result = operation(fixture, { specification: '0.8.0' });
    if (!result.ok || result.provenance.length === 0) {
      throw new Error('Component resolution failed under strict CSP');
    }
  }
  const rc3 = JSON.parse(
    readFileSync(
      new URL(
        '../../validator/test/snapshots/0.9.0-rc.3/projection-fixtures/documents/tools.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const expected = JSON.parse(
    readFileSync(
      new URL(
        '../../validator/test/snapshots/0.9.0-rc.3/projection-fixtures/tool-component-input-array-output-2026-07-28.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ).expected;
  const native = root.projectMcpNativeValue(rc3, {
    specification: '0.9.0-rc.3',
    protocolVersion: '2026-07-28',
    kind: 'tool',
    identifier: 'report',
  });
  assert.equal(native.ok, true, JSON.stringify(native.diagnostics));
  assert.deepEqual(native.value, expected);
  const orderingSource = {
    mcpdesc: '0.9.0',
    info: { name: 'native-ordering', version: '1.0.0' },
    protocolVersions: ['2026-07-28'],
    tools: [
      {
        _meta: { z: 1, a: 2 },
        inputSchema: { additionalProperties: false, type: 'object' },
        description: 'Tool',
        name: 'ordered',
      },
    ],
  };
  for (const keyOrder of ['preserve', 'document']) {
    const ordered = root.projectMcpNativeValue(orderingSource, {
      protocolVersion: '2026-07-28',
      kind: 'tool',
      keyOrder,
    });
    assert.equal(ordered.ok, true, JSON.stringify(ordered.diagnostics));
    assert.deepEqual(
      Object.keys(ordered.value[0]),
      keyOrder === 'document'
        ? ['name', 'description', 'inputSchema', '_meta']
        : ['_meta', 'inputSchema', 'description', 'name'],
    );
    assert.deepEqual(Object.keys(ordered.value[0].inputSchema), [
      'additionalProperties',
      'type',
    ]);
    assert.deepEqual(Object.keys(ordered.value[0]._meta), ['z', 'a']);
  }
  for (const operation of [
    root.resolveMcpDescriptionComponentReferences,
    components.resolveMcpDescriptionComponentReferences,
  ]) {
    const resolved = operation(rc3, { specification: '0.9.0-rc.3' });
    assert.equal(resolved.ok, true);
    assert.ok(resolved.provenance.length > 0);
  }
  const conversionSource = {
    $schema: root.V0_8_SCHEMA_URI,
    mcpdesc: '0.8.0',
    info: { name: 'csp-conversion', version: '1.0.0' },
    protocolVersions: ['2026-07-28'],
    transports: [{ type: 'stdio', command: 'server' }],
    tools: [{ name: 'lookup', inputSchema: { type: 'object' } }],
  };
  const converted = root.convertMcpDescriptionVersion(conversionSource, {
    from: '0.8.0',
    to: '0.9.0',
  });
  assert.equal(converted.ok, true, JSON.stringify(converted.diagnostics));
  assert.equal(converted.value.$schema, root.V0_9_RC_3_SCHEMA_URI);
  assert.equal(root.v0_9Rc3Snapshot.specification, '0.9.0-rc.3');
  const defaultNative = root.projectMcpNativeValue(converted.value, {
    protocolVersion: '2026-07-28',
    kind: 'tool',
    identifier: 'lookup',
  });
  assert.equal(
    defaultNative.ok,
    true,
    JSON.stringify(defaultNative.diagnostics),
  );
  const pinnedRc3 = root.projectMcpNativeValue(converted.value, {
    selector: root.V0_9_RC_3_SPECIFICATION,
    protocolVersion: '2026-07-28',
    kind: 'tool',
    identifier: 'lookup',
  });
  assert.deepEqual(defaultNative, pinnedRc3);
  const projectedRc3 = root.projectMcpNativeValue(converted.value, {
    specification: '0.9.0-rc.3',
    protocolVersion: '2026-07-28',
    kind: 'tool',
    identifier: 'lookup',
  });
  assert.equal(projectedRc3.ok, true, JSON.stringify(projectedRc3.diagnostics));
  assert.deepEqual(projectedRc3.value, {
    name: 'lookup',
    inputSchema: { type: 'object' },
  });

  const invalidTool = {
    mcpdesc: '0.9.0',
    info: { name: 'postcondition', version: '1.0.0' },
    protocolVersions: ['2025-11-25'],
    transports: [{ type: 'stdio', command: 'server' }],
    tools: [
      {
        name: 'toggle',
        description: 'Toggle a feature.',
        inputSchema: { type: 'object', properties: { enabled: true } },
      },
    ],
  };
  const failedPostcondition = root.projectMcpNativeValue(invalidTool, {
    selector: '0.9.0-rc.3',
    protocolVersion: '2025-11-25',
    kind: 'tool',
    identifier: 'toggle',
  });
  assert.equal(failedPostcondition.ok, false);
  assert.equal('value' in failedPostcondition, false);
  assert.ok(
    failedPostcondition.diagnostics.some(
      ({ code }) => code === 'projection-postcondition-failed',
    ),
  );
} finally {
  globalThis.eval = originalEval;
  globalThis.Function = OriginalFunction;
}

if (codegenAttempts !== 0) {
  throw new Error(`Runtime code generation attempted ${codegenAttempts} times`);
}
console.log(
  'Root and components operations passed with runtime code generation blocked.',
);
