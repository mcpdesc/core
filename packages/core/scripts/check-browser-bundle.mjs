import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const entries = [
  {
    name: 'root',
    path: '../src/index.ts',
    allowsValidator: true,
    requiredExports: [
      'migrateMcpDescription07ToRc1',
      'serializeMcpDescriptionMigrationReport',
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
        '../../validator/test/snapshots/0.8.0-rc.1/fixtures/expected-valid/reusable-components.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  for (const operation of [
    root.resolveMcpDescriptionComponentReferences,
    components.resolveMcpDescriptionComponentReferences,
  ]) {
    const result = operation(fixture, { specification: '0.8.0-rc.1' });
    if (!result.ok || result.provenance.length === 0) {
      throw new Error('Component resolution failed under strict CSP');
    }
  }
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
