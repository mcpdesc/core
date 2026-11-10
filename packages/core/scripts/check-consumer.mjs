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
        V0_8_SCHEMA_URI,
        V0_9_RC_3_SCHEMA_URI,
        V0_9_RC_3_SPECIFICATION,
        convertMcpDescriptionVersion,
        migrateMcpDescription07To08,
        projectEffectiveProtocolView,
        projectMcpNativeValue,
        mergeEffectiveProtocolViews,
        v0_8Snapshot,
        v0_9Rc3Snapshot,
        resolveMcpDescriptionComponentReferences,
        serializeMcpDescriptionMigrationReport,
      } from '@mcpdesc/core';
      import {
        parseMcpDescriptionSource,
        serializeMcpDescription,
      } from '@mcpdesc/core/documents';
      import { selectMcpDescriptionDeclarations } from '@mcpdesc/core/selection';
      import { resolveMcpDescriptionComponentReferences as resolveComponentsSubpath } from '@mcpdesc/core/components';
      import { validateMcpDescription } from '@mcpdesc/validator/browser';

      const source = {
        $schema: V0_8_SCHEMA_URI,
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

      const normalizedValue = {
        protocolVersions: ['2026-07-28'],
        on: 'on',
        '0o12': '0o12',
        text: 'first\\nsecond\\n\\n',
      };
      for (const keyOrder of [undefined, 'preserve', 'document']) {
        const options = { format: 'yaml', presentation: 'normalized', keyOrder };
        const source = serializeMcpDescription(normalizedValue, options);
        assert.equal(
          source,
          'protocolVersions:\\n  - "2026-07-28"\\n"on": "on"\\n0o12: 0o12\\ntext: "first\\\\nsecond\\\\n\\\\n"\\n',
        );
        const parsed = parseMcpDescriptionSource(source);
        assert.equal(parsed.ok, true);
        assert.deepEqual(parsed.value, normalizedValue);
        assert.equal(serializeMcpDescription(parsed.value, options), source);
      }
      assert.throws(
        () => serializeMcpDescription({}, { format: 'json', presentation: 'normalized' }),
        TypeError,
      );

      for (const keyOrder of [undefined, 'preserve', 'sorted', 'document']) {
        assert.equal(
          serializeMcpDescription(
            { tools: [{ inputSchema: { required: ['query'] } }] },
            { format: 'yaml', keyOrder },
          ),
          'tools:\\n  - inputSchema:\\n      required:\\n        - query\\n',
        );
      }

      const orderedSource = {
        tools: [{ inputSchema: { properties: { z: {}, a: {} }, type: 'object' }, name: 'lookup' }],
        info: { version: '1.0.0', name: 'ordering' },
        mcpdesc: '0.9.0',
      };
      const orderedExpected = {
        mcpdesc: '0.9.0',
        info: { name: 'ordering', version: '1.0.0' },
        tools: [{ name: 'lookup', inputSchema: orderedSource.tools[0].inputSchema }],
      };
      for (const format of ['json', 'yaml']) {
        assert.equal(
          serializeMcpDescription(orderedSource, { format, keyOrder: 'document' }),
          serializeMcpDescription(orderedExpected, { format, keyOrder: 'preserve' }),
        );
      }

      const result = projectEffectiveProtocolView(source, {
        specification: '0.8.0',
        protocolVersion: '2026-07-28',
      });

      assert.equal(result.ok, true);
      assert.deepEqual(result.value.protocolVersions, ['2026-07-28']);
      assert.deepEqual(result.value.tools.map((tool) => tool.name), ['current']);

      const selection = selectMcpDescriptionDeclarations(source, {
        specification: '0.8.0',
        selections: { tools: ['legacy'] },
      });
      assert.equal(selection.ok, true);
      assert.deepEqual(selection.value.tools.map((tool) => tool.name), ['legacy']);

      const migration = migrateMcpDescription07To08({
        mcpdesc: '0.7.0',
        info: {
          name: 'legacy-consumer-smoke',
          version: '1.0.0',
          protocolVersion: '2025-11-25',
        },
        transports: [{ type: 'stdio', command: 'server' }],
        tools: [{ name: 'legacy', inputSchema: { type: 'object' } }],
      }, {
        specification: '0.8.0',
        sourceValidated: true,
      });
      assert.equal(migration.ok, true);
      assert.deepEqual(migration.value.protocolVersions, ['2025-11-25']);
      assert.equal(migration.report.status, 'success');

      const defaultedMigration = migrateMcpDescription07To08({
        mcpdesc: '0.7.0',
        info: { name: 'defaulted-consumer-smoke', version: '1.0.0' },
        transports: [{ type: 'stdio', command: 'server' }],
      }, {
        specification: '0.8.0',
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
        specification: '0.8.0',
      }).valid, true);

      const stableMigration = migrateMcpDescription07To08({
        mcpdesc: '0.7.0',
        info: {
          name: 'legacy-stable-consumer-smoke',
          version: '1.0.0',
          protocolVersion: '2025-11-25',
        },
        transports: [{ type: 'stdio', command: 'server' }],
      }, {
        specification: '0.8.0',
        sourceValidated: true,
      });
      assert.equal(stableMigration.ok, true);
      assert.equal(stableMigration.value.$schema, V0_8_SCHEMA_URI);
      assert.equal(stableMigration.report.targetSpecification, '0.8.0');
      assert.equal(validateMcpDescription(stableMigration.value, {
        specification: '0.8.0',
      }).valid, true);
      assert.equal(v0_8Snapshot.specification, '0.8.0');

      for (const [specification, schemaUri] of [
        ['0.8.0', V0_8_SCHEMA_URI],
        ['0.8.0-rev.20261021', 'https://mcpdesc.org/schema/mcp-description/0.8.0-rev.20261021.json'],
        [v0_9Rc3Snapshot.specification, V0_9_RC_3_SCHEMA_URI],
      ]) {
        const reusable = {
          ...source,
          $schema: schemaUri,
          mcpdesc: specification.startsWith('0.9.0-') ? '0.9.0' : '0.8.0',
          components: {
            schemas: {
              Input: { type: 'object', additionalProperties: false },
            },
          },
          tools: [{
            name: 'referenced',
            inputSchema: { $componentRef: '#/components/schemas/Input' },
          }],
        };
        for (const operation of [resolveMcpDescriptionComponentReferences, resolveComponentsSubpath]) {
          const resolution = operation(reusable, { specification });
          assert.equal(
            resolution.ok,
            true,
            JSON.stringify(resolution.diagnostics),
          );
          assert.deepEqual(resolution.provenance, [{
            referencePath: ['tools', 0, 'inputSchema'],
            targetPath: ['components', 'schemas', 'Input'],
          }]);
        }
        if (specification.startsWith('0.9.0-')) {
          const native = projectMcpNativeValue(reusable, {
            specification,
            protocolVersion: '2026-07-28',
            kind: 'tool',
            identifier: 'referenced',
          });
          assert.equal(native.ok, true, JSON.stringify(native.diagnostics));
          assert.deepEqual(native.value, { name: 'referenced', inputSchema: { type: 'object', additionalProperties: false } });
          const scrambled = {
            ...reusable,
            tools: [{ inputSchema: reusable.tools[0].inputSchema, name: 'referenced' }],
          };
          for (const keyOrder of ['preserve', 'document']) {
            const ordered = projectMcpNativeValue(scrambled, {
              specification,
              protocolVersion: '2026-07-28',
              kind: 'tool',
              keyOrder,
            });
            assert.equal(ordered.ok, true, JSON.stringify(ordered.diagnostics));
            assert.deepEqual(Object.keys(ordered.value[0]), keyOrder === 'document'
              ? ['name', 'inputSchema']
              : ['inputSchema', 'name']);
            assert.deepEqual(Object.keys(ordered.value[0].inputSchema), ['type', 'additionalProperties']);
          }
          assert.equal(selectMcpDescriptionDeclarations(reusable, { specification, selections: { tools: ['referenced'] } }).ok, true);
          const view = projectEffectiveProtocolView(reusable, { specification, protocolVersion: '2026-07-28' });
          assert.equal(view.ok, true);
          assert.equal(mergeEffectiveProtocolViews([view.value], { specification }).ok, true);
        }
      }

      const converted = convertMcpDescriptionVersion({
        $schema: V0_8_SCHEMA_URI,
        mcpdesc: '0.8.0',
        info: { name: 'consumer-conversion', version: '1.0.0' },
        protocolVersions: ['2026-07-28'],
        transports: [{ type: 'stdio', command: 'server' }],
        tools: [{ name: 'lookup', inputSchema: { type: 'object' } }],
      }, { from: '0.8.0', to: '0.9.0' });
      assert.equal(converted.ok, true, JSON.stringify(converted.diagnostics));
      assert.equal(converted.value.$schema, V0_9_RC_3_SCHEMA_URI);
      assert.equal(validateMcpDescription(converted.value).selector, V0_9_RC_3_SPECIFICATION);
      assert.equal(validateMcpDescription(converted.value).defaulted, true);
      const defaultNative = projectMcpNativeValue(converted.value, {
        protocolVersion: '2026-07-28', kind: 'tool', identifier: 'lookup',
      });
      assert.equal(defaultNative.ok, true, JSON.stringify(defaultNative.diagnostics));
      const projectedRc3 = projectMcpNativeValue(converted.value, {
        selector: v0_9Rc3Snapshot.specification,
        protocolVersion: '2026-07-28',
        kind: 'tool',
        identifier: 'lookup',
      });
      assert.equal(projectedRc3.ok, true, JSON.stringify(projectedRc3.diagnostics));
      assert.deepEqual(projectedRc3.value, { name: 'lookup', inputSchema: { type: 'object' } });
    `,
  );
  execFileSync(node, ['smoke.mjs'], { cwd: consumerRoot, stdio: 'pipe' });

  writeFileSync(
    path.join(consumerRoot, 'consumer.ts'),
    `
      import {
        parseMcpDescriptionSource,
        serializeMcpDescription,
        type SerializeMcpDescriptionOptions,
      } from '@mcpdesc/core/documents';
      import { selectMcpDescriptionDeclarations } from '@mcpdesc/core/selection';
      import {
        resolveMcpDescriptionComponentReferences,
        type McpDescComponentReference,
        type McpDescComponentRegistries,
      } from '@mcpdesc/core/components';
      import {
        migrateMcpDescription07To08,
        serializeMcpDescriptionMigrationReport,
        type MigrateMcpDescription07To08Options,
        projectMcpNativeValue,
        v0_9Rc3Snapshot,
        V0_9_RC_3_SPECIFICATION,
        V0_9_RC_3_SCHEMA_URI,
        convertMcpDescriptionVersion,
        type McpDescriptionConversionFix,
        type McpDescriptionJsonPatchOperation,
        type JsonObject,
        type OperationResult,
        type ProjectMcpNativeValueOptions,
      } from '@mcpdesc/core';

      const parsed = parseMcpDescriptionSource('{"mcpdesc":"0.8.0"}');
      const documentOrder: SerializeMcpDescriptionOptions = {
        format: 'yaml',
        keyOrder: 'document',
      };
      serializeMcpDescription({ mcpdesc: '0.9.0' }, documentOrder);
      const normalizedOptions: SerializeMcpDescriptionOptions = {
        format: 'yaml',
        presentation: 'normalized',
        keyOrder: 'document',
      };
      const normalized: string = serializeMcpDescription({}, normalizedOptions);
      void normalized;
      // @ts-expect-error Normalized presentation is YAML-only.
      serializeMcpDescription({}, { format: 'json', presentation: 'normalized' });
      // @ts-expect-error Normalized presentation cannot sort arbitrary keys.
      serializeMcpDescription({}, { format: 'yaml', presentation: 'normalized', keyOrder: 'sorted' });
      // @ts-expect-error Unknown presentation profiles are not accepted.
      serializeMcpDescription({}, { format: 'yaml', presentation: 'unknown' });
      const nativeOptions: ProjectMcpNativeValueOptions = {
        selector: v0_9Rc3Snapshot.specification,
        protocolVersion: '2026-07-28',
        kind: 'tool',
        keyOrder: 'document',
      };
      const nativeList: OperationResult<JsonObject[]> = projectMcpNativeValue({}, { ...nativeOptions, identifier: undefined });
      const nativeSingle: OperationResult<JsonObject> = projectMcpNativeValue({}, { ...nativeOptions, identifier: 'search' });
      projectMcpNativeValue({}, { ...nativeOptions, keyOrder: 'preserve' });
      // @ts-expect-error Recursive sorting is a serialization policy, not a native projection policy.
      projectMcpNativeValue({}, { ...nativeOptions, keyOrder: 'sorted' });
      const rule: string | undefined = nativeSingle.diagnostics[0]?.rule;
      void nativeList;
      void rule;
      const rc3Selector: '0.9.0-rc.3' = V0_9_RC_3_SPECIFICATION;
      const rc3Schema: string = V0_9_RC_3_SCHEMA_URI;
      void rc3Selector;
      void rc3Schema;
      const conversionFixes: McpDescriptionConversionFix[] = [];
      const conversion = convertMcpDescriptionVersion(
        { mcpdesc: '0.8.0' },
        { from: '0.8.0', to: '0.9.0', selector: v0_9Rc3Snapshot.specification, fixes: conversionFixes },
      );
      const patch: readonly McpDescriptionJsonPatchOperation[] = conversion.ok
        ? conversion.patch
        : [];
      void patch;
      if (parsed.ok) {
        selectMcpDescriptionDeclarations(parsed.value, {
          specification: '0.8.0',
          selections: { tools: ['search'] },
        });
      }

      const migrationOptions: MigrateMcpDescription07To08Options = {
        specification: '0.8.0',
        defaultProtocolVersion: '2026-07-28',
        sourceValidated: true,
      };
      const migration = migrateMcpDescription07To08(
        { mcpdesc: '0.7.0', info: { name: 'typed', version: '1.0.0' } },
        migrationOptions,
      );
      serializeMcpDescriptionMigrationReport(migration.report);
      const reference: McpDescComponentReference = {
        $componentRef: '#/components/schemas/Input',
      };
      const components: McpDescComponentRegistries = {
        schemas: { Input: { type: 'object' }, Alias: reference },
      };
      resolveMcpDescriptionComponentReferences(
        { mcpdesc: '0.8.0', info: {}, protocolVersions: [], components },
        { specification: '0.8.0' },
      );
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
  if (installed.version !== pack.version) {
    throw new Error(
      `Expected installed core ${pack.version}, found ${installed.version}`,
    );
  }
  const installedValidator = JSON.parse(
    readFileSync(
      path.join(consumerRoot, 'node_modules/@mcpdesc/validator/package.json'),
      'utf8',
    ),
  );
  if (installedValidator.version !== validatorPack.version) {
    throw new Error(
      `Expected installed validator ${validatorPack.version}, found ${installedValidator.version}`,
    );
  }

  console.log(
    `Consumer smoke test passed for @mcpdesc/core@${installed.version} with @mcpdesc/validator@${installedValidator.version}.`,
  );
} finally {
  rmSync(consumerRoot, { force: true, recursive: true });
}
