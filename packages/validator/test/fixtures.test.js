import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

import { supportedSpecifications, validateMcpDescription } from '../src/index.js';
import { validate as validateRc3Snapshot } from '../src/snapshots/0.9.0-rc.3/index.js';

const rc3ResultSchemaBytes = fs.readFileSync(
  new URL('./snapshots/0.9.0-rc.3/validation-result.schema.json', import.meta.url),
);
const rc3ResultSchema = JSON.parse(rc3ResultSchemaBytes.toString('utf8'));
const validateRc3Result = new Ajv2020({ allErrors: true, strict: false }).compile(rc3ResultSchema);

test('pins validation result format 1.4.0 with diagnostic details', () => {
  assert.equal(
    createHash('sha256').update(rc3ResultSchemaBytes).digest('hex'),
    '1c0e841ac0e2b2da49fbe1cdd154209c1b93011d9d5b0ba4737fe53429a4b8b7',
  );
  assert.equal(rc3ResultSchema.$id, 'https://mcpdesc.org/schema/validation-result/1.4.0.json');
  assert.ok(rc3ResultSchema.$defs.detail);
  assert.ok(rc3ResultSchema.$defs['related-location']);
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

        if (specification === '0.9.0-rc.3') {
          const reference = validateRc3Snapshot(document);
          const validateResult = validateRc3Result;
          assert.deepEqual(result.diagnostics, reference.diagnostics);
          assert.deepEqual(result.results, reference.results);
          assert.equal(validateResult(reference), true, JSON.stringify(validateResult.errors));
          assert.equal(validateResult(result), true, JSON.stringify(validateResult.errors));
        }

        for (const diagnostic of result.diagnostics) {
          const keys = ['path', 'severity'];
          for (const optional of [
            'code',
            'message',
            'protocolVersions',
            'detail',
            'relatedLocations',
          ]) {
            if (diagnostic[optional] !== undefined) keys.push(optional);
          }
          if (specification.startsWith('0.9.0-') && diagnostic.rule !== undefined) {
            assert.match(diagnostic.rule, /^(?:mcp|mcpdesc|json-schema)\.[a-z0-9.-]+$/);
            keys.push('rule');
          }
          assert.deepEqual(Object.keys(diagnostic).sort(), keys.sort());
          assert.ok(diagnostic.path.every((segment) => typeof segment === 'string' || Number.isInteger(segment)));
        }
        if (specification === '0.9.0-rc.3') {
          assert.equal(validateRc3Result(result), true, JSON.stringify(validateRc3Result.errors));
          for (const diagnostic of result.diagnostics) {
            if (diagnostic.code === 'schema-validation') assert.ok(diagnostic.detail);
          }
        }
      });
    }
  }
}