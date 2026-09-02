#!/usr/bin/env node
// Import an approved snapshot bundle after verifying every declared byte.
// Usage: node scripts/import-snapshot.mjs [--check] <bundle-directory>

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const checkOnly = process.argv[2] === '--check';
const bundleArgument = process.argv[checkOnly ? 3 : 2];

function fail(message) {
  throw new Error(`validator snapshot import: ${message}`);
}

if (!bundleArgument) fail('bundle directory is required');
const bundleRoot = path.resolve(bundleArgument);
const manifestPath = path.join(bundleRoot, 'manifest.json');
if (!fs.statSync(bundleRoot, { throwIfNoEntry: false })?.isDirectory()) {
  fail(`bundle directory does not exist: ${bundleRoot}`);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`cannot read manifest.json: ${error.message}`);
}

if (manifest.formatVersion !== 1) fail('formatVersion must be 1');
if (!/^\d+\.\d+\.\d+-(?:draft|rc)\.\d+$/.test(manifest.selector ?? '')) {
  fail('selector must use x.y.z-draft.n or x.y.z-rc.n');
}
if (manifest.snapshotTag !== `v${manifest.selector}`) {
  fail('snapshotTag must equal v<selector>');
}
if (!/^[a-f0-9]{40}$/.test(manifest.source?.commit ?? '')) {
  fail('source.commit must be a full lowercase Git commit');
}
if (manifest.source?.repository !== 'https://github.com/mcpdesc/mcpdesc-specification') {
  fail('source.repository must identify mcpdesc/mcpdesc-specification');
}
if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
  fail('files must be a non-empty array');
}

function filesUnder(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) fail(`symbolic links are not allowed: ${entry.name}`);
    const relativePath = path.posix.join(prefix, entry.name);
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? filesUnder(fullPath, relativePath)
      : [relativePath];
  });
}

const declaredPaths = new Set();
for (const file of manifest.files) {
  if (
    typeof file?.path !== 'string' ||
    !/^(?:runtime|fixtures)\/[A-Za-z0-9._/-]+$/.test(file.path) ||
    file.path.includes('..') ||
    path.posix.normalize(file.path) !== file.path
  ) {
    fail(`invalid file path: ${JSON.stringify(file?.path)}`);
  }
  if (!/^[a-f0-9]{64}$/.test(file.sha256 ?? '')) {
    fail(`invalid SHA-256 for ${file.path}`);
  }
  if (declaredPaths.has(file.path)) fail(`duplicate file path: ${file.path}`);
  declaredPaths.add(file.path);
}

for (const required of [
  'runtime/base.js',
  'runtime/index.js',
  'runtime/schema.json',
  'runtime/semantic.js',
]) {
  if (!declaredPaths.has(required)) fail(`missing required file: ${required}`);
}
if (![...declaredPaths].some((file) => file.startsWith('fixtures/'))) {
  fail('at least one frozen fixture is required');
}

const actualPaths = ['runtime', 'fixtures']
  .flatMap((directory) =>
    filesUnder(path.join(bundleRoot, directory), directory),
  )
  .sort();
const expectedPaths = [...declaredPaths].sort();
if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
  fail('manifest file list does not exactly match bundle contents');
}

for (const file of manifest.files) {
  const digest = createHash('sha256')
    .update(fs.readFileSync(path.join(bundleRoot, file.path)))
    .digest('hex');
  if (digest !== file.sha256) fail(`digest mismatch: ${file.path}`);
}

const runtimeTarget = path.join(
  packageRoot,
  'src',
  'snapshots',
  manifest.selector,
);
const fixtureTarget = path.join(
  packageRoot,
  'test',
  'snapshots',
  manifest.selector,
);
if (fs.existsSync(runtimeTarget) || fs.existsSync(fixtureTarget)) {
  fail(`${manifest.selector} already exists; snapshots are immutable`);
}

if (!checkOnly) {
  fs.cpSync(path.join(bundleRoot, 'runtime'), runtimeTarget, {
    recursive: true,
    errorOnExist: true,
  });
  fs.mkdirSync(fixtureTarget, { recursive: true });
  fs.cpSync(path.join(bundleRoot, 'fixtures'), path.join(fixtureTarget, 'fixtures'), {
    recursive: true,
    errorOnExist: true,
  });
  fs.writeFileSync(
    path.join(fixtureTarget, 'README.md'),
    `# Validator fixture snapshot: ${manifest.selector}\n\nThe \`fixtures/\` tree was imported from ${manifest.source.repository} commit \`${manifest.source.commit}\` for the immutable \`${manifest.snapshotTag}\` specification snapshot.\n`,
  );
  fs.mkdirSync(path.join(packageRoot, 'snapshot-imports'), { recursive: true });
  fs.copyFileSync(
    manifestPath,
    path.join(packageRoot, 'snapshot-imports', `${manifest.selector}.json`),
  );
}

console.log(
  `${checkOnly ? 'Validated' : 'Imported'} ${manifest.selector} from ${manifest.source.commit} (${manifest.files.length} files).`,
);
if (!checkOnly) {
  console.log(
    'Update the registry, declarations, README, changelog, package checks, browser selectors, and snapshot-integrity.json before validation.',
  );
}