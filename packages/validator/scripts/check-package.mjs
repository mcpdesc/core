import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { validatorConfiguration } from '../src/generated/selector-config.js';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const changelog = fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
if (!changelog.includes(`## [${packageJson.version}] - `)) {
  throw new Error(`CHANGELOG.md has no dated ${packageJson.version} release section`);
}
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const output = execFileSync(
  npm,
  ['pack', '--dry-run', '--json', '--ignore-scripts'],
  { cwd: packageRoot, encoding: 'utf8' }
);
const [pack] = JSON.parse(output);
const actual = pack.files.map((file) => file.path).sort();
if (actual.some((filename) => filename.startsWith('test/snapshots/'))) {
  throw new Error('Frozen test snapshots must not ship in the package tarball');
}
if (actual.some((filename) => filename.startsWith('scripts/'))) {
  throw new Error('Mutable repository or package scripts must not ship in the package tarball');
}
for (const [entry, conditions] of Object.entries(packageJson.exports)) {
  for (const [condition, target] of Object.entries(conditions)) {
    const filename = target.replace(/^\.\//, '');
    if (!actual.includes(filename)) {
      throw new Error(`Export ${entry} condition ${condition} targets missing packed file ${filename}`);
    }
  }
}

const supportedSelectors = Object.entries(validatorConfiguration.selectors)
  .filter(([, metadata]) => metadata.lifecycle !== 'retired')
  .map(([selector]) => selector);
const snapshotFiles = supportedSelectors.flatMap((selector) => [
  'base.js',
  'index.js',
  'schema.json',
  'semantic.js'
].map((filename) => `src/snapshots/${selector}/${filename}`));

const expected = [
  'CHANGELOG.md',
  'LICENSE',
  'MODIFICATIONS.md',
  'NOTICE',
  'ORIGIN.md',
  'README.md',
  'index.d.ts',
  'package.json',
  'standalone.js',
  'src/index.js',
  'src/generated/selector-config.js',
  'src/generated/selector-config.d.ts',
  ...snapshotFiles
].sort();

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`Unexpected package contents:\n${actual.join('\n')}`);
}

console.log(`Package tarball passed (${pack.files.length} files, ${pack.size} bytes).`);