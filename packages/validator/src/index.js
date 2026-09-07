import * as rc2 from './snapshots/0.8.0-rc.2/index.js';
import * as rc3 from './snapshots/0.8.0-rc.3/index.js';
import { resolveComponentReferences as resolveRc2ComponentReferences } from './snapshots/0.8.0-rc.2/semantic.js';
import { resolveComponentReferences as resolveRc3ComponentReferences } from './snapshots/0.8.0-rc.3/semantic.js';
import {
  mcpExtensionCatalogue,
  mcpExtensionMaturity
} from './snapshots/0.8.0-rc.2/semantic.js';

export { mcpExtensionCatalogue, mcpExtensionMaturity };

const snapshots = Object.freeze({
  [rc2.specification]: rc2,
  [rc3.specification]: rc3
});

const componentResolvers = Object.freeze({
  '0.8.0-rc.2': resolveRc2ComponentReferences,
  '0.8.0-rc.3': resolveRc3ComponentReferences
});

const schemaUris = Object.freeze({
  '0.8.0-rc.2': 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.2.json',
  '0.8.0-rc.3': 'https://mcpdesc.org/schema/mcp-description/0.8.0-rc.3.json'
});

export const supportedSpecifications = Object.freeze(Object.keys(snapshots));
export const deprecatedSpecifications = Object.freeze(['0.8.0-rc.2']);
export const supportedProtocolVersions = Object.freeze([
  ...new Set(Object.values(snapshots).flatMap((snapshot) => snapshot.supportedProtocolVersions))
]);

export const specificationProvenance = Object.freeze(Object.fromEntries(
  Object.entries(snapshots).map(([selector, snapshot]) => [selector, Object.freeze({
    snapshotTag: snapshot.snapshotTag,
    schemaUri: schemaUris[selector],
    schemaSha256: snapshot.schemaSha256
  })])
));

const specificationsBySchemaUri = new Map();
for (const snapshot of Object.values(snapshots)) {
  const schemaUri = schemaUris[snapshot.specification];
  const selectors = specificationsBySchemaUri.get(schemaUri) ?? [];
  selectors.push(snapshot.specification);
  specificationsBySchemaUri.set(schemaUri, selectors);
}

function resolutionDiagnostic(code, message, path = []) {
  return { code, severity: 'error', message, path };
}

function resolvedSpecification(specification, diagnostics = []) {
  const snapshot = snapshots[specification];
  return {
    status: 'resolved',
    specification,
    schemaUri: schemaUris[specification],
    provenance: specificationProvenance[specification],
    diagnostics
  };
}

export function resolveMcpDescriptionSpecification(document, options = {}) {
  const override = options?.specification;
  if (override !== undefined && (typeof override !== 'string' || !Object.hasOwn(snapshots, override))) {
    return {
      status: 'unresolved',
      diagnostics: [resolutionDiagnostic(
        'unsupported-specification',
        `Unsupported MCP Description specification: ${String(override)}`
      )]
    };
  }

  const declaredSchema = document !== null
    && typeof document === 'object'
    && !Array.isArray(document)
    && Object.hasOwn(document, '$schema')
    ? document.$schema
    : undefined;

  if (declaredSchema === undefined) {
    if (override !== undefined) return resolvedSpecification(override);
    return {
      status: 'unresolved',
      diagnostics: [resolutionDiagnostic(
        'missing-snapshot-identity',
        'An exact specification selector or recognized $schema identity is required',
        ['$schema']
      )]
    };
  }

  if (typeof declaredSchema !== 'string') {
    return {
      status: 'unresolved',
      diagnostics: [resolutionDiagnostic(
        'invalid-schema-identity',
        '$schema must be a string to resolve an MCP Description specification',
        ['$schema']
      )]
    };
  }

  const candidates = specificationsBySchemaUri.get(declaredSchema) ?? [];
  if (override !== undefined) {
    if (schemaUris[override] === declaredSchema) return resolvedSpecification(override);
    return {
      status: 'unresolved',
      diagnostics: [resolutionDiagnostic(
        'contradictory-snapshot-identity',
        `$schema ${JSON.stringify(declaredSchema)} does not identify specification ${JSON.stringify(override)}`,
        ['$schema']
      )]
    };
  }

  if (candidates.length === 1) return resolvedSpecification(candidates[0]);
  if (candidates.length > 1) {
    return {
      status: 'unresolved',
      diagnostics: [resolutionDiagnostic(
        'ambiguous-schema-identity',
        `$schema ${JSON.stringify(declaredSchema)} is shared by ${candidates.join(', ')} and does not select one immutable snapshot`,
        ['$schema']
      )]
    };
  }

  return {
    status: 'unresolved',
    diagnostics: [resolutionDiagnostic(
      'unknown-schema-identity',
      `Unknown MCP Description $schema identity: ${JSON.stringify(declaredSchema)}`,
      ['$schema']
    )]
  };
}

export function validateMcpDescription(document, options) {
  if (!options || typeof options !== 'object' || Array.isArray(options) || !Object.hasOwn(options, 'specification')) {
    throw new TypeError('options.specification is required');
  }
  if (typeof options.specification !== 'string' || !Object.hasOwn(snapshots, options.specification)) {
    throw new RangeError(`Unsupported MCP Description specification: ${String(options.specification)}`);
  }

  return snapshots[options.specification].validate(document);
}

export function resolveMcpDescriptionComponentReferences(document, options) {
  if (!options || typeof options !== 'object' || Array.isArray(options) || !Object.hasOwn(options, 'specification')) {
    throw new TypeError('options.specification is required');
  }
  if (!Object.hasOwn(componentResolvers, options.specification)) {
    throw new RangeError(`Component reference resolution does not support specification: ${String(options.specification)}`);
  }

  return componentResolvers[options.specification](document);
}