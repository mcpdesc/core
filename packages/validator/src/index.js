import {
  componentResolvers,
  snapshotImplementations,
  validatorConfiguration
} from './generated/selector-config.js';
import {
  mcpExtensionCatalogue,
  mcpExtensionMaturity
} from './snapshots/0.8.0/semantic.js';

export { mcpExtensionCatalogue, mcpExtensionMaturity };

const snapshots = snapshotImplementations;

const selectorMetadata = validatorConfiguration.selectors;
const schemaUris = Object.freeze(Object.fromEntries(
  Object.entries(selectorMetadata).map(([selector, metadata]) => [selector, metadata.schemaUri])
));

export const supportedSpecifications = Object.freeze(Object.keys(snapshots));
export const deprecatedSpecifications = Object.freeze(Object.entries(selectorMetadata)
  .filter(([, metadata]) => metadata.lifecycle === 'deprecated')
  .map(([selector]) => selector));
export const defaultSpecifications = Object.freeze(Object.fromEntries(
  Object.entries(validatorConfiguration.formats)
    .filter(([, format]) => format.defaultSelector !== undefined)
    .map(([formatVersion, format]) => [formatVersion, Object.freeze({
      selector: format.defaultSelector,
      schemaPins: format.schemaPins
    })])
));
export const supportedProtocolVersions = Object.freeze([
  ...new Set(Object.values(snapshots).flatMap((snapshot) => snapshot.supportedProtocolVersions))
]);

export const specificationProvenance = Object.freeze(Object.fromEntries(
  Object.entries(snapshots).map(([selector, snapshot]) => [selector, Object.freeze({
    snapshotTag: snapshot.snapshotTag,
    schemaUri: schemaUris[selector],
    schemaSha256: selectorMetadata[selector].schemaSha256
  })])
));

const selectorsBySchemaUri = new Map();
const formatVersionsBySchemaUri = new Map();
for (const [selector, metadata] of Object.entries(selectorMetadata)) {
  const selectors = selectorsBySchemaUri.get(metadata.schemaUri) ?? [];
  selectors.push(selector);
  selectorsBySchemaUri.set(metadata.schemaUri, selectors);
  formatVersionsBySchemaUri.set(metadata.schemaUri, metadata.formatVersion);
}

function resolutionDiagnostic(code, message, path = []) {
  return { code, severity: 'error', message, path };
}

function resolvedSpecification(specification, defaulted = false, diagnostics = []) {
  const snapshot = snapshots[specification];
  return {
    status: 'resolved',
    selector: specification,
    specification,
    defaulted,
    schemaUri: schemaUris[specification],
    provenance: specificationProvenance[specification],
    diagnostics
  };
}

export function resolveMcpDescriptionSpecification(document, options = {}) {
  const requestedSelector = options?.selector;
  const legacySpecification = options?.specification;
  if (requestedSelector !== undefined && legacySpecification !== undefined && requestedSelector !== legacySpecification) {
    return {
      status: 'unresolved',
      diagnostics: [resolutionDiagnostic(
        'conflicting-selector-options',
        'options.selector and options.specification must identify the same selector'
      )]
    };
  }
  const override = requestedSelector ?? legacySpecification;
  if (override !== undefined && (typeof override !== 'string' || !Object.hasOwn(snapshots, override))) {
    return {
      status: 'unresolved',
      diagnostics: [resolutionDiagnostic(
        'unsupported-selector',
        `Unsupported MCP Description selector: ${String(override)}`
      )]
    };
  }

  const declaredSchema = document !== null
    && typeof document === 'object'
    && !Array.isArray(document)
    && Object.hasOwn(document, '$schema')
    ? document.$schema
    : undefined;
  const formatVersion = document !== null
    && typeof document === 'object'
    && !Array.isArray(document)
    && typeof document.mcpdesc === 'string'
    ? document.mcpdesc
    : undefined;

  if (declaredSchema === undefined) {
    if (override !== undefined) {
      if (formatVersion !== undefined && formatVersion !== selectorMetadata[override].formatVersion) {
        return {
          status: 'unresolved',
          diagnostics: [resolutionDiagnostic(
            'contradictory-format-version',
            `mcpdesc ${JSON.stringify(formatVersion)} does not match selector ${JSON.stringify(override)}`,
            ['mcpdesc']
          )]
        };
      }
      return resolvedSpecification(override);
    }
    if (formatVersion !== undefined) {
      const defaultSpecification = defaultSpecifications[formatVersion];
      if (defaultSpecification) return resolvedSpecification(defaultSpecification.selector, true);
      return {
        status: 'unresolved',
        diagnostics: [resolutionDiagnostic(
          'unsupported-format-version',
          `Unsupported MCP Description format version: ${formatVersion}`,
          ['mcpdesc']
        )]
      };
    }
    return {
      status: 'unresolved',
      diagnostics: [resolutionDiagnostic(
        'missing-format-version',
        'A supported mcpdesc format version or an exact specification selector is required',
        ['mcpdesc']
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

  const candidates = selectorsBySchemaUri.get(declaredSchema) ?? [];
  const schemaFormatVersion = formatVersionsBySchemaUri.get(declaredSchema);
  if (override !== undefined) {
    const overrideFormatVersion = selectorMetadata[override].formatVersion;
    if (formatVersion !== undefined && formatVersion !== overrideFormatVersion) {
      return {
        status: 'unresolved',
        diagnostics: [resolutionDiagnostic(
          'contradictory-format-version',
          `mcpdesc ${JSON.stringify(formatVersion)} does not match selector ${JSON.stringify(override)}`,
          ['mcpdesc']
        )]
      };
    }
    const format = validatorConfiguration.formats[overrideFormatVersion];
    if (
      schemaFormatVersion === overrideFormatVersion
      && (!format?.schemaPins || candidates.includes(override))
    ) return resolvedSpecification(override);
    return {
      status: 'unresolved',
      diagnostics: [resolutionDiagnostic(
        'contradictory-snapshot-identity',
        `$schema ${JSON.stringify(declaredSchema)} does not identify specification ${JSON.stringify(override)}`,
        ['$schema']
      )]
    };
  }

  if (formatVersion !== undefined && schemaFormatVersion !== undefined && formatVersion !== schemaFormatVersion) {
    return {
      status: 'unresolved',
      diagnostics: [resolutionDiagnostic(
        'contradictory-format-version',
        `$schema ${JSON.stringify(declaredSchema)} does not match mcpdesc ${JSON.stringify(formatVersion)}`,
        ['$schema']
      )]
    };
  }

  if (schemaFormatVersion !== undefined) {
    const format = validatorConfiguration.formats[schemaFormatVersion];
    const defaultSpecification = defaultSpecifications[schemaFormatVersion];
    if (!format || !defaultSpecification) {
      return {
        status: 'unresolved',
        diagnostics: [resolutionDiagnostic(
          'unsupported-format-version',
          `Unsupported MCP Description format version: ${schemaFormatVersion}`,
          ['mcpdesc']
        )]
      };
    }
    if (format?.schemaPins === false) {
      return resolvedSpecification(defaultSpecification.selector, true);
    }
    if (format?.schemaPins === true) {
      const pinnedCandidates = candidates.filter((candidate) => Object.hasOwn(snapshots, candidate));
      if (pinnedCandidates.length > 1) {
        return {
          status: 'unresolved',
          diagnostics: [resolutionDiagnostic(
            'ambiguous-schema-identity',
            `$schema ${JSON.stringify(declaredSchema)} identifies multiple selectors: ${pinnedCandidates.join(', ')}`,
            ['$schema']
          )]
        };
      }
      if (pinnedCandidates.length === 1) {
        return resolvedSpecification(pinnedCandidates[0]);
      }
      if (candidates.length === 1) {
        return {
          status: 'unresolved',
          diagnostics: [resolutionDiagnostic(
            'unsupported-selector',
            `Schema identity selects retired MCP Description selector: ${candidates[0]}`,
            ['$schema']
          )]
        };
      }
    }
  }

  if (schemaFormatVersion === undefined && candidates.length === 1 && Object.hasOwn(snapshots, candidates[0])) {
    return resolvedSpecification(candidates[0]);
  }
  if (schemaFormatVersion === undefined && candidates.length > 1) {
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

export function validateMcpDescription(document, options = {}) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  if (options.selector !== undefined && options.specification !== undefined && options.selector !== options.specification) {
    throw new TypeError('options.selector and options.specification must identify the same selector');
  }
  const selectedSelector = options.selector ?? options.specification;
  if (selectedSelector !== undefined && (typeof selectedSelector !== 'string' || !Object.hasOwn(snapshots, selectedSelector))) {
    throw new RangeError(`Unsupported MCP Description selector: ${String(selectedSelector)}`);
  }

  const resolution = selectedSelector === undefined
    ? resolveMcpDescriptionSpecification(document)
    : resolvedSpecification(selectedSelector);
  if (resolution.status === 'unresolved') {
    return {
      valid: false,
      diagnostics: resolution.diagnostics,
      selector: null,
      specification: null,
      defaulted: false
    };
  }

  return {
    ...snapshots[resolution.specification].validate(document),
    selector: resolution.specification,
    specification: resolution.specification,
    defaulted: resolution.defaulted
  };
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