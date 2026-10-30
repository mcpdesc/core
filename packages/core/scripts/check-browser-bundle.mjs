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
      'migrateMcpDescription07ToRc4',
      'serializeMcpDescriptionMigrationReport',
      'projectMcpNativeValue',
      'v0_9Draft1Snapshot',
      'v0_9Draft2Snapshot',
      'v0_9Draft3Snapshot',
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
  const components = await import('../dist/components.js');
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
  const draft = JSON.parse(
    readFileSync(
      new URL(
        '../../validator/test/snapshots/0.9.0-draft.1/projection-fixtures/documents/tools.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const expected = JSON.parse(
    readFileSync(
      new URL(
        '../../validator/test/snapshots/0.9.0-draft.1/projection-fixtures/tool-component-input-array-output-2026-07-28.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ).expected;
  const native = root.projectMcpNativeValue(draft, {
    specification: '0.9.0-draft.1',
    protocolVersion: '2026-07-28',
    kind: 'tool',
    identifier: 'report',
  });
  assert.equal(native.ok, true, JSON.stringify(native.diagnostics));
  assert.deepEqual(native.value, expected);
  for (const operation of [
    root.resolveMcpDescriptionComponentReferences,
    components.resolveMcpDescriptionComponentReferences,
  ]) {
    const resolved = operation(draft, { specification: '0.9.0-draft.1' });
    assert.equal(resolved.ok, true);
    assert.ok(resolved.provenance.length > 0);
  }
  const conversionSource = {
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
  const projectedDraft2 = root.projectMcpNativeValue(converted.value, {
    specification: '0.9.0-draft.2',
    protocolVersion: '2026-07-28',
    kind: 'tool',
    identifier: 'lookup',
  });
  assert.equal(
    projectedDraft2.ok,
    true,
    JSON.stringify(projectedDraft2.diagnostics),
  );
  assert.deepEqual(projectedDraft2.value, {
    name: 'lookup',
    inputSchema: { type: 'object' },
  });
  const convertedDraft3 = root.convertMcpDescriptionVersion(conversionSource, {
    from: '0.8.0',
    to: '0.9.0',
    selector: '0.9.0-draft.3',
  });
  assert.equal(
    convertedDraft3.ok,
    true,
    JSON.stringify(convertedDraft3.diagnostics),
  );
  const projectedDraft3 = root.projectMcpNativeValue(convertedDraft3.value, {
    selector: '0.9.0-draft.3',
    protocolVersion: '2026-07-28',
    kind: 'tool',
    identifier: 'lookup',
  });
  assert.equal(
    projectedDraft3.ok,
    true,
    JSON.stringify(projectedDraft3.diagnostics),
  );
  assert.deepEqual(projectedDraft3.value, {
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
    selector: '0.9.0-draft.3',
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
