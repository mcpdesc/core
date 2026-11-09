import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkFileSource,
  checkYamlSource,
  isStyleCheckedFile,
} from './check-yaml-style.mjs';

test('checks root and nested block sequences independently', () => {
  assert.deepEqual(
    checkYamlSource('tools:\n- inputSchema:\n    required:\n    - query\n'),
    [
      {
        line: 2,
        message:
          'Block sequences must be indented two spaces beyond their mapping key',
      },
      {
        line: 4,
        message:
          'Block sequences must be indented two spaces beyond their mapping key',
      },
    ],
  );
  assert.equal(checkYamlSource('tools:\n    - name: lookup\n').length, 1);
  assert.deepEqual(
    checkYamlSource(
      'tools:\n  - inputSchema:\n      required:\n        - query\n',
    ),
    [],
  );
});

test('allows flow sequences, empty arrays, root sequences, and nested arrays', () => {
  assert.deepEqual(
    checkYamlSource(
      'tools: []\nrequired: [query]\nmatrix:\n  - - first\n    - second\n',
    ),
    [],
  );
  assert.deepEqual(checkYamlSource('- first\n- second\n'), []);
});

test('checks each document and reports malformed YAML outside code literals', () => {
  assert.equal(
    checkYamlSource('tools: []\n---\ntools:\n- name: lookup\n')[0].line,
    4,
  );
  assert.ok(checkYamlSource('tools: [\n').length > 0);
  assert.deepEqual(checkYamlSource('tools: [\n', { literal: true }), []);
});

test('checks YAML fences and valid YAML code literals with source locations', () => {
  const markdown = '# Example\n\n```yaml\ntools:\n- name: lookup\n```\n';
  assert.equal(checkFileSource('README.md', markdown)[0].line, 5);
  const code = 'const source = `tools:\n- name: lookup\n`;\n';
  assert.equal(
    checkFileSource('packages/core/test/example.ts', code)[0].line,
    2,
  );
  assert.equal(
    checkFileSource('README.md', '```ts\n' + code + '```\n')[0].line,
    3,
  );
  assert.equal(
    checkFileSource(
      'example.js',
      "const source = 'tools:\\n- name: lookup\\n';",
    )[0].line,
    1,
  );
  assert.deepEqual(
    checkFileSource('example.ts', 'const source = `tools: [\n`;'),
    [],
  );
  assert.deepEqual(
    checkFileSource(
      'example.ts',
      '// yaml-style: intentional-input\nconst source = `tools:\n- name: lookup\n`;',
    ),
    [],
  );
});

test('exempts immutable snapshots but checks mutable validator files', () => {
  for (const directory of ['src', 'test']) {
    const filename = `packages/validator/${directory}/snapshots/0.9.0-rc.3/example.yaml`;
    assert.equal(isStyleCheckedFile(filename), false);
    assert.deepEqual(checkFileSource(filename, 'tools:\n- name: lookup\n'), []);
  }
  assert.equal(
    isStyleCheckedFile('packages/validator/config/selectors.yaml'),
    true,
  );
  assert.equal(
    checkFileSource(
      'packages/validator/test/example.js',
      'const source = `tools:\n- name: lookup\n`;',
    ).length,
    1,
  );
});
