import { build } from 'esbuild';

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
