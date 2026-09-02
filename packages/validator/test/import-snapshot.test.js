import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(
  new URL('../scripts/import-snapshot.mjs', import.meta.url),
);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function createBundle() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcpdesc-snapshot-'));
  const contents = {
    'runtime/base.js': 'export const supportedProtocolVersions = [];\n',
    'runtime/index.js': "export const specification = '9.9.9-draft.1';\n",
    'runtime/schema.json': '{"type":"object"}\n',
    'runtime/semantic.js': 'export function validate() { return []; }\n',
    'fixtures/expected-valid/minimal.json': '{}\n',
  };
  for (const [relativePath, value] of Object.entries(contents)) {
    const filename = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, value);
  }
  const manifest = {
    formatVersion: 1,
    selector: '9.9.9-draft.1',
    snapshotTag: 'v9.9.9-draft.1',
    source: {
      repository: 'https://github.com/mcpdesc/mcpdesc-specification',
      commit: '1234567890abcdef1234567890abcdef12345678',
    },
    files: Object.entries(contents).map(([relativePath, value]) => ({
      path: relativePath,
      sha256: sha256(value),
    })),
  };
  fs.writeFileSync(
    path.join(root, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return root;
}

test('validates a complete snapshot bundle without writing it', () => {
  const root = createBundle();
  try {
    const output = execFileSync(process.execPath, [script, '--check', root], {
      encoding: 'utf8',
    });
    assert.match(output, /Validated 9\.9\.9-draft\.1/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test('rejects a snapshot bundle whose bytes do not match its manifest', () => {
  const root = createBundle();
  try {
    fs.appendFileSync(path.join(root, 'runtime/schema.json'), ' ');
    assert.throws(
      () =>
        execFileSync(process.execPath, [script, '--check', root], {
          stdio: 'pipe',
        }),
      /Command failed/,
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test('rejects a snapshot bundle without its semantic base', () => {
  const root = createBundle();
  try {
    const manifestPath = path.join(root, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.files = manifest.files.filter(
      (file) => file.path !== 'runtime/base.js',
    );
    fs.rmSync(path.join(root, 'runtime/base.js'));
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    assert.throws(
      () =>
        execFileSync(process.execPath, [script, '--check', root], {
          stdio: 'pipe',
        }),
      /Command failed/,
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});