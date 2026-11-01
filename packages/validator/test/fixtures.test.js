import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

import { supportedSpecifications, validateMcpDescription } from '../src/index.js';
import { validate as validateDraft4Snapshot } from '../src/snapshots/0.9.0-draft.4/index.js';

const draft4ResultSchemaBytes = fs.readFileSync(
  new URL('./snapshots/0.9.0-draft.4/validation-result.schema.json', import.meta.url),
);
const validateDraft4Result = new Ajv2020({ allErrors: true, strict: false }).compile(
  JSON.parse(draft4ResultSchemaBytes.toString('utf8')),
);

test('pins validation result format 1.0.0', () => {
  assert.equal(
    createHash('sha256').update(draft4ResultSchemaBytes).digest('hex'),
    'e78b5755de7bc311a9a3d6d10e423cf667350e3150bb70cf31b500b64c85cc77',
  );
});

function fixtureFiles(fixtureRoot, group) {
  const directory = path.join(fixtureRoot, group);
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:json|ya?ml)$/i.test(entry.name))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

function parseFixture(filename) {
  const source = fs.readFileSync(filename, 'utf8');
  return filename.endsWith('.json') ? JSON.parse(source) : YAML.parse(source);
}

for (const specification of supportedSpecifications) {
  const fixtureRoot = fileURLToPath(new URL(`./snapshots/${specification}/fixtures/`, import.meta.url));
  for (const [group, expected] of [
    ['expected-valid', 'valid'],
    ['expected-invalid', 'invalid'],
    ['expected-warning', 'warning']
  ]) {
    for (const filename of fixtureFiles(fixtureRoot, group)) {
      test(`${specification}/${group}/${path.basename(filename)}`, () => {
        const document = parseFixture(filename);
        const result = validateMcpDescription(document, { specification });
        const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
        const warnings = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'warning');

        if (expected === 'valid') {
          assert.equal(result.valid, true);
          assert.deepEqual(result.diagnostics, []);
        } else if (expected === 'invalid') {
          assert.equal(result.valid, false);
          assert.ok(errors.length > 0);
        } else {
          assert.equal(result.valid, true);
          assert.deepEqual(errors, []);
          assert.ok(warnings.length > 0);
        }

        if (specification === '0.9.0-draft.4') {
          const reference = validateDraft4Snapshot(document);
          assert.deepEqual(result.diagnostics, reference.diagnostics);
          assert.deepEqual(result.results, reference.results);
          assert.equal(validateDraft4Result(reference), true, JSON.stringify(validateDraft4Result.errors));
          assert.equal(validateDraft4Result(result), true, JSON.stringify(validateDraft4Result.errors));
        }

        for (const diagnostic of result.diagnostics) {
          const keys = ['path', 'severity'];
          for (const optional of ['code', 'message', 'protocolVersions']) {
            if (diagnostic[optional] !== undefined) keys.push(optional);
          }
          if (specification.startsWith('0.9.0-draft.') && diagnostic.rule !== undefined) {
            assert.match(diagnostic.rule, /^(?:mcp|mcpdesc|json-schema)\.[a-z0-9.-]+$/);
            keys.push('rule');
          }
          assert.deepEqual(Object.keys(diagnostic).sort(), keys.sort());
          assert.ok(diagnostic.path.every((segment) => typeof segment === 'string' || Number.isInteger(segment)));
        }
      });
    }
  }
}