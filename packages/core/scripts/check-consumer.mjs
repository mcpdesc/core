import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;
const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const validatorRoot = fileURLToPath(
  new URL('../../validator', import.meta.url),
);
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
  const validatorPackOutput = execFileSync(
    npm,
    ['pack', '--json', '--ignore-scripts', '--pack-destination', consumerRoot],
    { cwd: validatorRoot, encoding: 'utf8' },
  );
  const [validatorPack] = JSON.parse(validatorPackOutput);
  const validatorTarball = path.join(consumerRoot, validatorPack.filename);

  writeFileSync(
    path.join(consumerRoot, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  execFileSync(
    npm,
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      validatorTarball,
      tarball,
    ],
    { cwd: consumerRoot, stdio: 'pipe' },
  );

  writeFileSync(
    path.join(consumerRoot, 'smoke.mjs'),
    `
      import assert from 'node:assert/strict';
      import {
        RC_1_SCHEMA_URI,
        migrateMcpDescription07ToRc1,
        projectEffectiveProtocolView,
        rc1Snapshot,
        serializeMcpDescriptionMigrationReport,
      } from '@mcpdesc/core';
      import {
        parseMcpDescriptionSource,
        serializeMcpDescription,
      } from '@mcpdesc/core/documents';
      import { selectMcpDescriptionDeclarations } from '@mcpdesc/core/selection';
      import { validateMcpDescription } from '@mcpdesc/validator/browser';

      const source = {
        $schema: RC_1_SCHEMA_URI,
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
        specification: '0.8.0-rc.1',
        protocolVersion: '2026-07-28',
      });

      assert.equal(result.ok, true);
      assert.deepEqual(result.value.protocolVersions, ['2026-07-28']);
      assert.deepEqual(result.value.tools.map((tool) => tool.name), ['current']);

      const selection = selectMcpDescriptionDeclarations(source, {
        specification: '0.8.0-rc.1',
        selections: { tools: ['legacy'] },
      });
      assert.equal(selection.ok, true);
      assert.deepEqual(selection.value.tools.map((tool) => tool.name), ['legacy']);

      const migration = migrateMcpDescription07ToRc1({
        mcpdesc: '0.7.0',
        info: {
          name: 'legacy-consumer-smoke',
          version: '1.0.0',
          protocolVersion: '2025-11-25',
        },
        transports: [{ type: 'stdio', command: 'server' }],
        tools: [{ name: 'legacy', inputSchema: { type: 'object' } }],
      }, {
        specification: '0.8.0-rc.1',
        sourceValidated: true,
      });
      assert.equal(migration.ok, true);
      assert.deepEqual(migration.value.protocolVersions, ['2025-11-25']);
      assert.equal(migration.report.status, 'success');

      const defaultedMigration = migrateMcpDescription07ToRc1({
        mcpdesc: '0.7.0',
        info: { name: 'defaulted-consumer-smoke', version: '1.0.0' },
        transports: [{ type: 'stdio', command: 'server' }],
      }, {
        specification: '0.8.0-rc.1',
        defaultProtocolVersion: '2026-07-28',
        sourceValidated: true,
      });
      assert.equal(defaultedMigration.ok, true);
      assert.deepEqual(defaultedMigration.value.protocolVersions, ['2026-07-28']);
      assert.equal(defaultedMigration.report.status, 'success-with-warnings');
      assert.deepEqual(defaultedMigration.report.defaultsApplied, [{
        code: 'migration-default-protocol-version',
        path: ['info', 'protocolVersion'],
        protocolVersion: '2026-07-28',
      }]);
      assert.deepEqual(
        JSON.parse(serializeMcpDescriptionMigrationReport(defaultedMigration.report)),
        defaultedMigration.report,
      );
      assert.equal(validateMcpDescription(defaultedMigration.value, {
        specification: '0.8.0-rc.1',
      }).valid, true);
      assert.equal(rc1Snapshot.specification, '0.8.0-rc.1');
    `,
  );
  execFileSync(node, ['smoke.mjs'], { cwd: consumerRoot, stdio: 'pipe' });

  writeFileSync(
    path.join(consumerRoot, 'consumer.ts'),
    `
      import { parseMcpDescriptionSource } from '@mcpdesc/core/documents';
      import { selectMcpDescriptionDeclarations } from '@mcpdesc/core/selection';
      import {
        migrateMcpDescription07ToRc1,
        serializeMcpDescriptionMigrationReport,
        type MigrateMcpDescription07ToRc1Options,
      } from '@mcpdesc/core';

      const parsed = parseMcpDescriptionSource('{"mcpdesc":"0.8.0"}');
      if (parsed.ok) {
        selectMcpDescriptionDeclarations(parsed.value, {
          specification: '0.8.0-rc.1',
          selections: { tools: ['search'] },
        });
      }

      const migrationOptions: MigrateMcpDescription07ToRc1Options = {
        specification: '0.8.0-rc.1',
        defaultProtocolVersion: '2026-07-28',
        sourceValidated: true,
      };
      const migration = migrateMcpDescription07ToRc1(
        { mcpdesc: '0.7.0', info: { name: 'typed', version: '1.0.0' } },
        migrationOptions,
      );
      serializeMcpDescriptionMigrationReport(migration.report);
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
  if (installed.version !== '0.5.0') {
    throw new Error(
      `Expected installed core 0.5.0, found ${installed.version}`,
    );
  }
  const installedValidator = JSON.parse(
    readFileSync(
      path.join(consumerRoot, 'node_modules/@mcpdesc/validator/package.json'),
      'utf8',
    ),
  );
  if (installedValidator.version !== '0.7.0') {
    throw new Error(
      `Expected installed validator 0.7.0, found ${installedValidator.version}`,
    );
  }

  console.log(
    `Consumer smoke test passed for @mcpdesc/core@${installed.version} with @mcpdesc/validator@${installedValidator.version}.`,
  );
} finally {
  rmSync(consumerRoot, { force: true, recursive: true });
}
