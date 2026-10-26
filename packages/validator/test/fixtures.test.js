import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

import { supportedSpecifications, validateMcpDescription } from '../src/index.js';

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
        const result = validateMcpDescription(parseFixture(filename), { specification });
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

        for (const diagnostic of result.diagnostics) {
          const keys = ['code', 'message', 'path', 'severity'];
          if (specification === '0.9.0-draft.1' && diagnostic.rule !== undefined) {
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