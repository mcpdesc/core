import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const manifestPath = path.join(packageRoot, 'snapshot-integrity.json');
const snapshotRoots = ['src/snapshots', 'test/snapshots'];

function filesUnder(relativeDirectory) {
  const directory = path.join(packageRoot, relativeDirectory);
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      return entry.isDirectory() ? filesUnder(relativePath) : [relativePath];
    });
}

function sha256(relativePath) {
  return createHash('sha256')
    .update(fs.readFileSync(path.join(packageRoot, relativePath)))
    .digest('hex');
}

const files = snapshotRoots
  .flatMap(filesUnder)
  .sort()
  .map((relativePath) => ({
    path: relativePath,
    sha256: sha256(relativePath),
  }));
const generated = {
  formatVersion: 1,
  approvedExceptions: [
    {
      path: 'src/snapshots/0.8.0-rc.1/semantic.js',
      reason:
        'Add terminal component-reference provenance without changing the RC.1 schema, conformance results, diagnostics, or fixtures.',
    },
    {
      path: 'src/snapshots/0.8.0-rc.2/semantic.js',
      reason:
        'Add terminal component-reference provenance without changing the RC.2 schema, conformance results, diagnostics, or fixtures.',
    },
    {
      path: 'src/snapshots/0.8.0-rc.3/semantic.js',
      reason:
        'Add terminal component-reference provenance without changing the RC.3 schema, conformance results, diagnostics, or fixtures.',
    },
    {
      path: 'src/snapshots/0.8.0-rc.4/semantic.js',
      reason:
        'Add terminal component-reference provenance without changing the RC.4 schema, conformance results, diagnostics, or fixtures.',
    },
  ],
  files,
};
const serialized = `${JSON.stringify(generated, null, 2)}\n`;

if (process.argv.includes('--write')) {
  fs.writeFileSync(manifestPath, serialized);
  console.log(
    `Wrote snapshot integrity manifest for ${files.length} immutable files.`,
  );
} else {
  const existing = fs.readFileSync(manifestPath, 'utf8');
  if (existing !== serialized) {
    throw new Error(
      'Immutable validator snapshots differ from snapshot-integrity.json',
    );
  }
  console.log(
    `Snapshot integrity passed for ${files.length} immutable files.`,
  );
}