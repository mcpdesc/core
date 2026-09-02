import {
  validateMcpDescription,
  type McpDescriptionDiagnostic,
  type SupportedProtocolVersion,
} from '@mcpdesc/validator/standalone';

import type {
  CoreDiagnostic,
  JsonObject,
  JsonValue,
  McpDescriptionDocument,
} from './model.js';
import {
  DRAFT_4_SCHEMA_URI,
  DRAFT_4_SPECIFICATION,
  RC_1_SCHEMA_URI,
  RC_1_SPECIFICATION,
  draft4Snapshot,
  rc1Snapshot,
  type SupportedCoreSpecification,
} from './snapshot.js';

const rootCollections = [
  'transports',
  'tools',
  'resources',
  'resourceTemplates',
  'prompts',
  'tags',
] as const;

const declarationCollections = [
  'tools',
  'resources',
  'resourceTemplates',
  'prompts',
] as const;

export interface MigrateMcpDescription07Options {
  readonly specification: typeof DRAFT_4_SPECIFICATION;
  readonly protocolVersion?: SupportedProtocolVersion;
  readonly sourceValidated: true;
}

export interface MigrateMcpDescription07ToRc1Options {
  readonly specification: typeof RC_1_SPECIFICATION;
  readonly defaultProtocolVersion?: SupportedProtocolVersion;
  readonly protocolVersion?: SupportedProtocolVersion;
  readonly sourceValidated: true;
}

type SupportedMigrationOptions =
  MigrateMcpDescription07Options | MigrateMcpDescription07ToRc1Options;

export interface McpDescriptionMigrationDefault {
  readonly code: 'migration-default-protocol-version';
  readonly path: readonly (number | string)[];
  readonly protocolVersion: SupportedProtocolVersion;
}

export interface McpDescriptionMigrationChange {
  readonly code: string;
  readonly message: string;
  readonly path: readonly (number | string)[];
  readonly protocolVersion?: SupportedProtocolVersion;
}

export interface McpDescriptionMigrationReport {
  readonly status: 'failed' | 'success' | 'success-with-warnings';
  readonly sourceSpecification: '0.7.0';
  readonly targetSpecification: SupportedCoreSpecification;
  readonly diagnostics: readonly CoreDiagnostic[];
  readonly defaultsApplied: readonly McpDescriptionMigrationDefault[];
  readonly changes: readonly McpDescriptionMigrationChange[];
}

export type McpDescriptionMigrationResult =
  | {
      readonly ok: true;
      readonly value: McpDescriptionDocument;
      readonly diagnostics: readonly CoreDiagnostic[];
      readonly report: McpDescriptionMigrationReport;
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly CoreDiagnostic[];
      readonly report: McpDescriptionMigrationReport;
    };

function operationDiagnostic(
  code: string,
  severity: 'error' | 'warning',
  message: string,
  path: readonly (number | string)[],
  protocolVersion?: SupportedProtocolVersion,
): CoreDiagnostic {
  return {
    code,
    severity,
    message,
    path,
    phase: 'operation',
    ...(protocolVersion === undefined ? {} : { protocolVersion }),
  };
}

function migrationReport(
  targetSpecification: SupportedCoreSpecification,
  diagnostics: readonly CoreDiagnostic[],
  defaultsApplied: readonly McpDescriptionMigrationDefault[],
  changes: readonly McpDescriptionMigrationChange[],
): McpDescriptionMigrationReport {
  const failed = diagnostics.some(({ severity }) => severity === 'error');
  const warned = diagnostics.some(({ severity }) => severity === 'warning');
  return {
    status: failed ? 'failed' : warned ? 'success-with-warnings' : 'success',
    sourceSpecification: '0.7.0',
    targetSpecification,
    diagnostics,
    defaultsApplied,
    changes,
  };
}

function failedMigration(
  targetSpecification: SupportedCoreSpecification,
  diagnostics: readonly CoreDiagnostic[],
  defaultsApplied: readonly McpDescriptionMigrationDefault[] = [],
  changes: readonly McpDescriptionMigrationChange[] = [],
): McpDescriptionMigrationResult {
  return {
    ok: false,
    diagnostics,
    report: migrationReport(
      targetSpecification,
      diagnostics,
      defaultsApplied,
      changes,
    ),
  };
}

function resultDiagnostics(
  diagnostics: readonly McpDescriptionDiagnostic[],
): CoreDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    phase: 'result',
  }));
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function canonicalize(value: JsonValue): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  if (isJsonObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key]!)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const character of value) {
    hash ^= BigInt(character.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

function omitEmptyArray(object: JsonObject, property: string): void {
  if (Array.isArray(object[property]) && object[property].length === 0) {
    delete object[property];
  }
}

function normalizeOptionalArrays(document: JsonObject): void {
  for (const collection of rootCollections)
    omitEmptyArray(document, collection);

  const info = document.info;
  if (isJsonObject(info)) omitEmptyArray(info, 'icons');

  for (const collection of declarationCollections) {
    const declarations = document[collection];
    if (!Array.isArray(declarations)) continue;
    for (const declaration of declarations) {
      if (!isJsonObject(declaration)) continue;
      omitEmptyArray(declaration, 'icons');
      omitEmptyArray(declaration, 'tags');
      if (collection === 'prompts') omitEmptyArray(declaration, 'arguments');
    }
  }
}

function migrateSecurity(
  document: JsonObject,
  diagnostics: CoreDiagnostic[],
  changes: McpDescriptionMigrationChange[],
): CoreDiagnostic | undefined {
  const definitions = new Map<
    string,
    { name: string; scheme: JsonObject; count: number }
  >();
  const names = new Map<string, string>();

  const migrateRequirements = (
    value: JsonValue | undefined,
    path: readonly (number | string)[],
  ): { value: JsonValue | undefined } | { error: CoreDiagnostic } => {
    if (!Array.isArray(value)) return { value };

    const requirements: JsonValue[] = [];
    for (const [index, candidate] of value.entries()) {
      if (!isJsonObject(candidate)) {
        requirements.push(candidate);
        continue;
      }
      const canonical = canonicalize(candidate);
      const existing = definitions.get(canonical);
      if (existing) {
        existing.count += 1;
        requirements.push({ [existing.name]: [] });
        continue;
      }

      const type =
        typeof candidate.type === 'string' ? candidate.type : 'scheme';
      const name = `legacy-${type}-${stableHash(canonical)}`;
      const collision = names.get(name);
      if (collision && collision !== canonical) {
        return {
          error: operationDiagnostic(
            'migration-security-name-collision',
            'error',
            `Generated security scheme name ${JSON.stringify(name)} collides with a distinct definition`,
            [...path, index],
          ),
        };
      }

      names.set(name, canonical);
      definitions.set(canonical, {
        name,
        scheme: structuredClone(candidate),
        count: 1,
      });
      diagnostics.push(
        operationDiagnostic(
          'migration-generated-security-name',
          'warning',
          `Generated security scheme name ${JSON.stringify(name)} for author review`,
          [...path, index],
        ),
      );
      changes.push({
        code: 'migration-extracted-security-scheme',
        message: `Extracted inline security scheme as ${JSON.stringify(name)}`,
        path: [...path, index],
      });
      requirements.push({ [name]: [] });
    }
    return { value: requirements };
  };

  const migratedRoot = migrateRequirements(document.security, ['security']);
  if ('error' in migratedRoot) return migratedRoot.error;
  if (migratedRoot.value !== undefined) document.security = migratedRoot.value;

  const transports = document.transports;
  if (Array.isArray(transports)) {
    for (const [index, transport] of transports.entries()) {
      if (!isJsonObject(transport) || transport.security === undefined)
        continue;
      const migrated = migrateRequirements(transport.security, [
        'transports',
        index,
        'security',
      ]);
      if ('error' in migrated) return migrated.error;
      if (migrated.value !== undefined) transport.security = migrated.value;
    }
  }

  if (definitions.size > 0) {
    document.securitySchemes = Object.fromEntries(
      [...definitions.values()]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map(({ name, scheme }) => [name, scheme]),
    );
  }

  for (const definition of definitions.values()) {
    if (definition.count > 1) {
      diagnostics.push(
        operationDiagnostic(
          'migration-deduplicated-security-scheme',
          'warning',
          `Reused ${JSON.stringify(definition.name)} for ${definition.count} identical inline security schemes`,
          ['securitySchemes', definition.name],
        ),
      );
      changes.push({
        code: 'migration-deduplicated-security-scheme',
        message: `Reused ${JSON.stringify(definition.name)} for ${definition.count} identical inline security schemes`,
        path: ['securitySchemes', definition.name],
      });
    }
  }
  return undefined;
}

function migrateMcpDescription07(
  source: unknown,
  options: SupportedMigrationOptions,
  targetSpecification: SupportedCoreSpecification,
  targetSchemaUri: typeof DRAFT_4_SCHEMA_URI | typeof RC_1_SCHEMA_URI,
  targetProtocolVersions: readonly SupportedProtocolVersion[],
): McpDescriptionMigrationResult {
  if (options.specification !== targetSpecification) {
    return failedMigration(targetSpecification, [
      operationDiagnostic(
        'unsupported-specification',
        'error',
        `MCP Description migration does not support ${JSON.stringify(options.specification)}`,
        [],
      ),
    ]);
  }
  if (options.sourceValidated !== true) {
    return failedMigration(targetSpecification, [
      operationDiagnostic(
        'migration-source-validation-required',
        'error',
        'Migration requires a source validated against MCP Description 0.7.0',
        [],
      ),
    ]);
  }
  if (!isJsonObject(source) || source.mcpdesc !== '0.7.0') {
    return failedMigration(targetSpecification, [
      operationDiagnostic(
        'migration-invalid-source-version',
        'error',
        'Migration source must be an MCP Description 0.7.0 document',
        ['mcpdesc'],
      ),
    ]);
  }

  const info = source.info;
  const declaredVersion = isJsonObject(info) ? info.protocolVersion : undefined;
  if (
    options.protocolVersion !== undefined &&
    declaredVersion !== undefined &&
    options.protocolVersion !== declaredVersion
  ) {
    return failedMigration(targetSpecification, [
      operationDiagnostic(
        'migration-protocol-version-conflict',
        'error',
        `Provided protocol version ${JSON.stringify(options.protocolVersion)} conflicts with info.protocolVersion ${JSON.stringify(declaredVersion)}`,
        ['info', 'protocolVersion'],
      ),
    ]);
  }
  const defaultProtocolVersion =
    targetSpecification === RC_1_SPECIFICATION &&
    'defaultProtocolVersion' in options
      ? options.defaultProtocolVersion
      : undefined;
  const selectedDefault =
    options.protocolVersion === undefined &&
    declaredVersion === undefined &&
    defaultProtocolVersion !== undefined;
  if (
    selectedDefault &&
    (typeof defaultProtocolVersion !== 'string' ||
      !targetProtocolVersions.includes(
        defaultProtocolVersion as SupportedProtocolVersion,
      ))
  ) {
    return failedMigration(targetSpecification, [
      operationDiagnostic(
        'migration-unsupported-default-protocol-version',
        'error',
        `Default protocol version ${JSON.stringify(defaultProtocolVersion)} is not supported by ${targetSpecification}`,
        ['info', 'protocolVersion'],
      ),
    ]);
  }
  const protocolVersion =
    options.protocolVersion ?? declaredVersion ?? defaultProtocolVersion;
  if (typeof protocolVersion !== 'string') {
    return failedMigration(targetSpecification, [
      operationDiagnostic(
        'migration-protocol-version-required',
        'error',
        'Migration requires info.protocolVersion or an explicit protocol version option',
        ['info', 'protocolVersion'],
      ),
    ]);
  }

  const diagnostics: CoreDiagnostic[] = [];
  const defaultsApplied: McpDescriptionMigrationDefault[] = [];
  const changes: McpDescriptionMigrationChange[] = [];
  if (selectedDefault) {
    const selectedProtocolVersion =
      defaultProtocolVersion as SupportedProtocolVersion;
    diagnostics.push(
      operationDiagnostic(
        'migration-default-protocol-version',
        'warning',
        `Used caller-provided default protocol version ${JSON.stringify(selectedProtocolVersion)}`,
        ['info', 'protocolVersion'],
        selectedProtocolVersion,
      ),
    );
    defaultsApplied.push({
      code: 'migration-default-protocol-version',
      path: ['info', 'protocolVersion'],
      protocolVersion: selectedProtocolVersion,
    });
  }
  changes.push({
    code: 'migration-selected-protocol-version',
    message: `Selected protocol version ${JSON.stringify(protocolVersion)}`,
    path: ['protocolVersions'],
    protocolVersion: protocolVersion as SupportedProtocolVersion,
  });

  const value = structuredClone(source);
  value.$schema = targetSchemaUri;
  value.mcpdesc = '0.8.0';
  value.protocolVersions = [protocolVersion];
  if (isJsonObject(value.info)) delete value.info.protocolVersion;

  if (isJsonObject(value.capabilities)) {
    if (Object.keys(value.capabilities).length > 0) {
      value.capabilities = [value.capabilities];
      changes.push({
        code: 'migration-wrapped-capabilities',
        message: 'Wrapped legacy capabilities in a protocol-scoped collection',
        path: ['capabilities'],
        protocolVersion: protocolVersion as SupportedProtocolVersion,
      });
    } else {
      delete value.capabilities;
    }
  }
  normalizeOptionalArrays(value);

  const securityError = migrateSecurity(value, diagnostics, changes);
  if (securityError)
    return failedMigration(
      targetSpecification,
      [...diagnostics, securityError],
      defaultsApplied,
      changes,
    );

  const validation = validateMcpDescription(value, {
    specification: targetSpecification,
  });
  diagnostics.push(...resultDiagnostics(validation.diagnostics));
  if (!validation.valid)
    return failedMigration(
      targetSpecification,
      diagnostics,
      defaultsApplied,
      changes,
    );

  return {
    ok: true,
    value: value as McpDescriptionDocument,
    diagnostics,
    report: migrationReport(
      targetSpecification,
      diagnostics,
      defaultsApplied,
      changes,
    ),
  };
}

export function serializeMcpDescriptionMigrationReport(
  report: McpDescriptionMigrationReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function migrateMcpDescription07ToDraft4(
  source: unknown,
  options: MigrateMcpDescription07Options,
): McpDescriptionMigrationResult {
  return migrateMcpDescription07(
    source,
    options,
    DRAFT_4_SPECIFICATION,
    DRAFT_4_SCHEMA_URI,
    draft4Snapshot.protocolVersions,
  );
}

export function migrateMcpDescription07ToRc1(
  source: unknown,
  options: MigrateMcpDescription07ToRc1Options,
): McpDescriptionMigrationResult {
  return migrateMcpDescription07(
    source,
    options,
    RC_1_SPECIFICATION,
    RC_1_SCHEMA_URI,
    rc1Snapshot.protocolVersions,
  );
}
