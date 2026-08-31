import { build } from 'esbuild';

const result = await build({
  entryPoints: [new URL('../src/index.ts', import.meta.url).pathname],
  bundle: true,
  format: 'esm',
  logLevel: 'silent',
  metafile: true,
  platform: 'browser',
  write: false,
});

const nodeInputs = Object.keys(result.metafile.inputs).filter((input) =>
  input.startsWith('node:'),
);
if (nodeInputs.length > 0) {
  throw new Error(
    `Browser bundle contains Node built-ins: ${nodeInputs.join(', ')}`,
  );
}
if (
  result.outputFiles.length !== 1 ||
  result.outputFiles[0].contents.length === 0
) {
  throw new Error('Browser bundle output is empty');
}

console.log(
  `Browser bundle passed (${result.outputFiles[0].contents.length} bytes).`,
);
