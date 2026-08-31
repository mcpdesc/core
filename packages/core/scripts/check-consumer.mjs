import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;
const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url));
const tsc = path.join(
  repositoryRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
);
const consumerRoot = mkdtempSync(path.join(tmpdir(), 'mcpdesc-core-consumer-'));

try {
  const packOutput = execFileSync(
    npm,
    ['pack', '--json', '--ignore-scripts', '--pack-destination', consumerRoot],
    { cwd: packageRoot, encoding: 'utf8' },
  );
  const [pack] = JSON.parse(packOutput);
  const tarball = path.join(consumerRoot, pack.filename);

  writeFileSync(
    path.join(consumerRoot, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  execFileSync(
    npm,
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball],
    { cwd: consumerRoot, stdio: 'pipe' },
  );

  writeFileSync(
    path.join(consumerRoot, 'smoke.mjs'),
    `
      import assert from 'node:assert/strict';
      import {
        DRAFT_4_SCHEMA_URI,
        draft4Snapshot,
        migrateMcpDescription07ToDraft4,
        projectEffectiveProtocolView,
      } from '@mcpdesc/core';
      import {
        parseMcpDescriptionSource,
        serializeMcpDescription,
      } from '@mcpdesc/core/documents';
      import { selectMcpDescriptionDeclarations } from '@mcpdesc/core/selection';

      const source = {
        $schema: DRAFT_4_SCHEMA_URI,
        mcpdesc: '0.8.0',
        info: { name: 'consumer-smoke', version: '1.0.0' },
        protocolVersions: ['2025-11-25', '2026-07-28'],
        tools: [
          {
            name: 'legacy',
            protocolVersions: ['2025-11-25'],
            inputSchema: { type: 'object', additionalProperties: false },
          },
          {
            name: 'current',
            protocolVersions: ['2026-07-28'],
            inputSchema: { type: 'object', additionalProperties: false },
          },
        ],
      };
      const parsed = parseMcpDescriptionSource(
        serializeMcpDescription(source, { format: 'yaml' }),
      );
      assert.equal(parsed.ok, true);
      assert.deepEqual(parsed.value, source);

      const result = projectEffectiveProtocolView(source, {
        specification: '0.8.0-draft.4',
        protocolVersion: '2026-07-28',
      });

      assert.equal(result.ok, true);
      assert.deepEqual(result.value.protocolVersions, ['2026-07-28']);
      assert.deepEqual(result.value.tools.map((tool) => tool.name), ['current']);

      const selection = selectMcpDescriptionDeclarations(source, {
        specification: '0.8.0-draft.4',
        selections: { tools: ['legacy'] },
      });
      assert.equal(selection.ok, true);
      assert.deepEqual(selection.value.tools.map((tool) => tool.name), ['legacy']);

      const migration = migrateMcpDescription07ToDraft4({
        mcpdesc: '0.7.0',
        info: {
          name: 'legacy-consumer-smoke',
          version: '1.0.0',
          protocolVersion: '2025-11-25',
        },
        transports: [{ type: 'stdio', command: 'server' }],
        tools: [{ name: 'legacy', inputSchema: { type: 'object' } }],
      }, {
        specification: '0.8.0-draft.4',
        sourceValidated: true,
      });
      assert.equal(migration.ok, true);
      assert.deepEqual(migration.value.protocolVersions, ['2025-11-25']);
      assert.equal(draft4Snapshot.specification, '0.8.0-draft.4');
    `,
  );
  execFileSync(node, ['smoke.mjs'], { cwd: consumerRoot, stdio: 'pipe' });

  writeFileSync(
    path.join(consumerRoot, 'consumer.ts'),
    `
      import { parseMcpDescriptionSource } from '@mcpdesc/core/documents';
      import { selectMcpDescriptionDeclarations } from '@mcpdesc/core/selection';

      const parsed = parseMcpDescriptionSource('{"mcpdesc":"0.8.0"}');
      if (parsed.ok) {
        selectMcpDescriptionDeclarations(parsed.value, {
          specification: '0.8.0-draft.4',
          selections: { tools: ['search'] },
        });
      }
    `,
  );
  execFileSync(
    tsc,
    [
      '--noEmit',
      '--strict',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      '--target',
      'ES2023',
      'consumer.ts',
    ],
    { cwd: consumerRoot, stdio: 'pipe' },
  );

  const installed = JSON.parse(
    readFileSync(
      path.join(consumerRoot, 'node_modules/@mcpdesc/core/package.json'),
      'utf8',
    ),
  );
  if (installed.version !== '0.2.0') {
    throw new Error(
      `Expected installed core 0.2.0, found ${installed.version}`,
    );
  }

  console.log(
    `Consumer smoke test passed for @mcpdesc/core@${installed.version}.`,
  );
} finally {
  rmSync(consumerRoot, { force: true, recursive: true });
}
