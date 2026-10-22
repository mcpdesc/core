import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDocument } from 'yaml';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const configPath = path.join(packageRoot, 'config/selectors.yaml');
const generatedPath = path.join(packageRoot, 'src/generated/selector-config.js');
const generatedDeclarationsPath = path.join(packageRoot, 'src/generated/selector-config.d.ts');
const selectorPattern = /^(\d+\.\d+\.\d+)(?:-(?:draft\.\d+|rc\.\d+|rev\.\d{8}))?$/;
const lifecycleValues = new Set(['active', 'deprecated', 'retired']);

function fail(location, reason) {
  throw new Error(`${location}: ${reason}`);
}

function record(value, location) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(location, 'must be a mapping');
  }
  return value;
}

function onlyKeys(value, allowed, location) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${location}.${key}`, 'unknown configuration key');
  }
}

function requireString(value, location) {
  if (typeof value !== 'string' || value.length === 0) fail(location, 'must be a non-empty string');
}

const source = fs.readFileSync(configPath, 'utf8');
const document = parseDocument(source, { uniqueKeys: true });
if (document.errors.length > 0) {
  fail('config/selectors.yaml', document.errors.map((error) => error.message).join('; '));
}
const config = record(document.toJS(), 'config/selectors.yaml');
onlyKeys(config, new Set(['configVersion', 'formats', 'selectors']), 'config');
if (config.configVersion !== 1) fail('configVersion', 'must be 1');

const formats = record(config.formats, 'formats');
const selectors = record(config.selectors, 'selectors');
if (Object.keys(selectors).length === 0) fail('selectors', 'must contain at least one selector');

for (const [formatVersion, value] of Object.entries(formats)) {
  const location = `formats[${JSON.stringify(formatVersion)}]`;
  if (!/^\d+\.\d+\.\d+$/.test(formatVersion)) fail(location, 'key must be a format version');
  const format = record(value, location);
  onlyKeys(format, new Set(['defaultSelector', 'schemaPins']), location);
  if (typeof format.schemaPins !== 'boolean') fail(`${location}.schemaPins`, 'must be boolean');
  if (format.defaultSelector !== undefined) {
    requireString(format.defaultSelector, `${location}.defaultSelector`);
    const defaultMetadata = selectors[format.defaultSelector];
    if (!defaultMetadata) fail(`${location}.defaultSelector`, 'must identify a configured selector');
    if (defaultMetadata.formatVersion !== formatVersion) {
      fail(`${location}.defaultSelector`, 'selector format version does not match the format key');
    }
    if (defaultMetadata.lifecycle !== 'active') {
      fail(`${location}.defaultSelector`, 'default selector must have active lifecycle');
    }
    if (/-draft\.|-rc\./.test(format.defaultSelector)) {
      fail(`${location}.defaultSelector`, 'draft and release-candidate selectors cannot be defaults');
    }
  }
}

const configuredSelectors = new Set();
for (const [selector, value] of Object.entries(selectors)) {
  const location = `selectors[${JSON.stringify(selector)}]`;
  const match = selectorPattern.exec(selector);
  if (!match) fail(location, 'key is not a supported selector');
  const metadata = record(value, location);
  onlyKeys(metadata, new Set(['formatVersion', 'lifecycle', 'specificationTag', 'schemaUri', 'schemaSha256']), location);
  if (metadata.formatVersion !== match[1]) fail(`${location}.formatVersion`, `must be ${match[1]}`);
  if (!lifecycleValues.has(metadata.lifecycle)) fail(`${location}.lifecycle`, 'must be active, deprecated, or retired');
  if (metadata.specificationTag !== `v${selector}`) fail(`${location}.specificationTag`, `must be v${selector}`);
  requireString(metadata.schemaUri, `${location}.schemaUri`);
  try {
    new URL(metadata.schemaUri);
  } catch {
    fail(`${location}.schemaUri`, 'must be an absolute URI');
  }
  if (!/^[a-f0-9]{64}$/.test(metadata.schemaSha256 ?? '')) {
    fail(`${location}.schemaSha256`, 'must be a lowercase SHA-256 digest');
  }

  const snapshotDirectory = path.join(packageRoot, 'src/snapshots', selector);
  const snapshotIndex = path.join(snapshotDirectory, 'index.js');
  const schemaPath = path.join(snapshotDirectory, 'schema.json');
  const hasImplementation = fs.existsSync(snapshotIndex) && fs.existsSync(schemaPath);
  if (metadata.lifecycle !== 'retired' && !hasImplementation) {
    fail(location, 'non-retired selector must have an implementation and schema');
  }
  if (hasImplementation) {
    const snapshot = await import(pathToFileURL(snapshotIndex).href);
    if (snapshot.specification !== selector) fail(location, 'snapshot implementation exports a different selector');
    if (snapshot.snapshotTag !== metadata.specificationTag) fail(`${location}.specificationTag`, 'does not match the snapshot implementation');
    const schemaBytes = fs.readFileSync(schemaPath);
    const schema = JSON.parse(schemaBytes);
    if (schema.$id !== metadata.schemaUri) fail(`${location}.schemaUri`, `does not match embedded schema $id ${JSON.stringify(schema.$id)}`);
    const schemaSha256 = createHash('sha256').update(schemaBytes).digest('hex');
    if (schemaSha256 !== metadata.schemaSha256) fail(`${location}.schemaSha256`, 'does not match embedded schema bytes');
    if (snapshot.schemaSha256 !== metadata.schemaSha256) fail(`${location}.schemaSha256`, 'does not match the snapshot implementation');
  }
  configuredSelectors.add(selector);
}

for (const entry of fs.readdirSync(path.join(packageRoot, 'src/snapshots'), { withFileTypes: true })) {
  if (entry.isDirectory() && !configuredSelectors.has(entry.name)) {
    fail(`selectors[${JSON.stringify(entry.name)}]`, 'snapshot directory must be represented in configuration');
  }
}

const formatsBySchemaUri = new Map();
for (const metadata of Object.values(selectors)) {
  const versions = formatsBySchemaUri.get(metadata.schemaUri) ?? new Set();
  versions.add(metadata.formatVersion);
  formatsBySchemaUri.set(metadata.schemaUri, versions);
}
for (const [schemaUri, versions] of formatsBySchemaUri) {
  if (versions.size > 1) {
    fail(`selectors[*].schemaUri (${JSON.stringify(schemaUri)})`, 'cannot identify multiple format versions');
  }
}

for (const [formatVersion, format] of Object.entries(formats)) {
  if (!format.schemaPins) continue;
  const formatSelectors = Object.entries(selectors).filter(([, metadata]) => metadata.formatVersion === formatVersion);
  const pinningSelectors = formatSelectors.filter(([, metadata]) => metadata.lifecycle !== 'retired');
  const defaultSelector = format.defaultSelector;
  const defaultSchemaUri = selectors[defaultSelector]?.schemaUri;
  if (defaultSelector !== undefined && pinningSelectors.filter(([, metadata]) => metadata.schemaUri === defaultSchemaUri).length !== 1) {
    fail(`formats[${JSON.stringify(formatVersion)}].schemaPins`, 'default schema URI must identify exactly one selector');
  }
  for (const [selector, metadata] of pinningSelectors) {
    const identities = pinningSelectors.filter(([, candidate]) => candidate.schemaUri === metadata.schemaUri);
    if (identities.length !== 1) {
      fail(`selectors[${JSON.stringify(selector)}].schemaUri`, 'schema-pinning selectors must have distinct schema identities');
    }
  }
}

const supportedSelectors = Object.entries(selectors)
  .filter(([, metadata]) => metadata.lifecycle !== 'retired')
  .map(([selector]) => selector);
const imports = supportedSelectors.map((selector, index) =>
  `import * as snapshot${index + 1} from ${JSON.stringify(`../snapshots/${selector}/index.js`)};`
);
const resolverImports = supportedSelectors.map((selector, index) =>
  `import { resolveComponentReferences as resolveComponentReferences${index + 1} } from ${JSON.stringify(`../snapshots/${selector}/semantic.js`)};`
);
const implementationEntries = supportedSelectors.map((selector, index) =>
  `  ${JSON.stringify(selector)}: snapshot${index + 1},`
);
const resolverEntries = supportedSelectors.map((selector, index) =>
  `  ${JSON.stringify(selector)}: resolveComponentReferences${index + 1},`
);
const generated = [
  ...imports,
  ...resolverImports,
  '',
  'function deepFreeze(value) {',
  '  if (value !== null && typeof value === \'object\' && !Object.isFrozen(value)) {',
  '    for (const child of Object.values(value)) deepFreeze(child);',
  '    Object.freeze(value);',
  '  }',
  '  return value;',
  '}',
  '',
  `export const validatorConfiguration = deepFreeze(${JSON.stringify(config, null, 2)});`,
  '',
  'export const snapshotImplementations = Object.freeze({',
  ...implementationEntries,
  '});',
  '',
  'export const componentResolvers = Object.freeze({',
  ...resolverEntries,
  '});',
  ''
].join('\n');
const generatedDeclarations = [
  `export type ConfiguredMcpDescriptionSelector = ${supportedSelectors.map(JSON.stringify).join(' | ')};`,
  ''
].join('\n');

if (process.argv.includes('--write')) {
  fs.mkdirSync(path.dirname(generatedPath), { recursive: true });
  fs.writeFileSync(generatedPath, generated);
  fs.writeFileSync(generatedDeclarationsPath, generatedDeclarations);
  console.log(`Generated ${path.relative(packageRoot, generatedPath)} and ${path.relative(packageRoot, generatedDeclarationsPath)}.`);
} else {
  if (!fs.existsSync(generatedPath) || fs.readFileSync(generatedPath, 'utf8') !== generated) {
    fail('src/generated/selector-config.js', 'is stale; run npm run config:write --workspace @mcpdesc/validator');
  }
  if (!fs.existsSync(generatedDeclarationsPath) || fs.readFileSync(generatedDeclarationsPath, 'utf8') !== generatedDeclarations) {
    fail('src/generated/selector-config.d.ts', 'is stale; run npm run config:write --workspace @mcpdesc/validator');
  }
  console.log('Selector configuration is valid and generated output is current.');
}