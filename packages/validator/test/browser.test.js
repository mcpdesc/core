import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const originalEval = globalThis.eval;
const OriginalFunction = globalThis.Function;
globalThis.eval = () => { throw new EvalError('eval blocked by test CSP'); };
globalThis.Function = function BlockedFunction() { throw new EvalError('Function blocked by test CSP'); };
let browser;
try {
  browser = await import('@mcpdesc/validator/browser');
} finally {
  globalThis.eval = originalEval;
  globalThis.Function = OriginalFunction;
}

function fixture(group, name) {
  return JSON.parse(fs.readFileSync(
    new URL(`./snapshots/0.8.0/fixtures/${group}/${name}`, import.meta.url),
    'utf8'
  ));
}

function validateUnderCsp(document, options = { specification: '0.8.0' }) {
  globalThis.eval = () => { throw new EvalError('eval blocked by test CSP'); };
  globalThis.Function = function BlockedFunction() { throw new EvalError('Function blocked by test CSP'); };
  try {
    return browser.validateMcpDescription(document, options);
  } finally {
    globalThis.eval = originalEval;
    globalThis.Function = OriginalFunction;
  }
}

test('browser entry imports and validates with dynamic code generation blocked', () => {
  const valid = validateUnderCsp(fixture('expected-valid', 'named-tool-examples.json'));
  assert.equal(valid.valid, true);

  const invalid = validateUnderCsp(fixture('expected-invalid', 'tool-example-schema-mismatches.json'));
  assert.equal(invalid.valid, false);
  const schemaMismatchPaths = invalid.diagnostics
    .filter((diagnostic) => diagnostic.code === 'tool-example-schema-mismatch')
    .map((diagnostic) => diagnostic.path.join('.'));
  assert.ok(schemaMismatchPaths.includes('tools.0.examples.wrong-types.input'));
  assert.ok(schemaMismatchPaths.includes('tools.0.examples.wrong-types.result.structuredContent'));
});

test('browser entry applies the format default when no selector is passed', () => {
  const result = validateUnderCsp(fixture('expected-valid', 'minimal-zero-primitives.json'), {});
  assert.equal(result.valid, true);
  assert.equal(result.specification, '0.8.0-rev.20261021');
  assert.equal(result.defaulted, true);
});

test('browser entry remains the standalone implementation', async () => {
  const standalone = await import('@mcpdesc/validator/standalone');
  assert.strictEqual(browser.validateMcpDescription, standalone.validateMcpDescription);
  assert.strictEqual(browser.supportedSpecifications, standalone.supportedSpecifications);
  assert.strictEqual(browser.defaultSpecifications, standalone.defaultSpecifications);
});