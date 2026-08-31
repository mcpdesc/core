import { execFileSync } from 'node:child_process';
import process from 'node:process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const output = execFileSync(
  npm,
  ['pack', '--dry-run', '--json', '--ignore-scripts'],
  {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  },
);
const [pack] = JSON.parse(output);
const actual = pack.files.map((file) => file.path).sort();

const expected = [
  'LICENSE',
  'MODIFICATIONS.md',
  'NOTICE',
  'ORIGIN.md',
  'README.md',
  'dist/documents.d.ts',
  'dist/documents.js',
  'dist/documents.js.map',
  'dist/index.d.ts',
  'dist/index.js',
  'dist/index.js.map',
  'dist/model.d.ts',
  'dist/model.js',
  'dist/model.js.map',
  'dist/migration.d.ts',
  'dist/migration.js',
  'dist/migration.js.map',
  'dist/projection.d.ts',
  'dist/projection.js',
  'dist/projection.js.map',
  'dist/selection.d.ts',
  'dist/selection.js',
  'dist/selection.js.map',
  'dist/snapshot.d.ts',
  'dist/snapshot.js',
  'dist/snapshot.js.map',
  'package.json',
].sort();

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`Unexpected package contents:\n${actual.join('\n')}`);
}

console.log(
  `Package tarball passed (${pack.files.length} files, ${pack.size} bytes).`,
);
