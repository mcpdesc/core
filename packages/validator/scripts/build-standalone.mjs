import { build } from 'esbuild';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import standaloneCode from 'ajv/dist/standalone/index.js';
import namesModule from 'ajv/dist/compile/names.js';
import { _, strConcat } from 'ajv/dist/compile/codegen/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { validatorConfiguration } from '../src/generated/selector-config.js';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const output = path.join(packageRoot, 'standalone.js');
const draft7Adapter = path.join(packageRoot, 'src/standalone/ajv-adapter.js');
const draft2020Adapter = path.join(packageRoot, 'src/standalone/ajv-2020-adapter.js');
const formatsAdapter = path.join(packageRoot, 'src/standalone/ajv-formats-adapter.js');
const codegenNames = namesModule.default ?? namesModule;
const selectors = Object.entries(validatorConfiguration.selectors)
  .filter(([, metadata]) => metadata.lifecycle !== 'retired')
  .map(([selector]) => selector);
const schemas = selectors.map((selector) => JSON.parse(fs.readFileSync(
  path.join(packageRoot, 'src/snapshots', selector, 'schema.json'),
  'utf8'
)));
const ajv = new Ajv2020({ allErrors: true, strict: false, verbose: true, code: { source: true, esm: true } });
addFormats(ajv);
const validatorExports = Object.fromEntries(selectors.map((selector, index) => [`snapshot${index + 1}`, selector]));
const instrumentedSchemas = [];
for (const selector of ['0.9.0-draft.4', '0.9.0-rc.1', '0.9.0-rc.2', '0.9.0-rc.3'].filter((selector) => selectors.includes(selector))) {
  const semanticPath = path.join(packageRoot, 'src/snapshots', selector, 'semantic.js');
  const semanticSource = fs.readFileSync(semanticPath, 'utf8');
  const semanticFile = ts.createSourceFile(semanticPath, semanticSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let documentSchemaOwners;
  for (const statement of semanticFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === 'documentSchemaOwners' && declaration.initializer) {
        documentSchemaOwners = JSON.parse(declaration.initializer.getText(semanticFile));
      }
    }
  }
  if (!Array.isArray(documentSchemaOwners)) {
    throw new Error(`${selector} semantic snapshot does not expose a parseable documentSchemaOwners map`);
  }
  const ownersByPointer = new Map(documentSchemaOwners);
  const instrumentedSchema = structuredClone(schemas[selectors.indexOf(selector)]);
  for (const [pointer, rule] of documentSchemaOwners) {
    const target = pointer.split('/').slice(1)
      .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'))
      .reduce((node, token) => node?.[token], instrumentedSchema);
    if (target && typeof target === 'object' && !Array.isArray(target)) {
      target['x-mcpdesc-rule'] = rule;
    }
  }
  const standaloneSchema = structuredClone(instrumentedSchema);
  const escapePointer = (segment) => String(segment).replaceAll('~', '~0').replaceAll('/', '~1');
  function annotateOwners(node, pointer, inheritedOwner) {
    if (!node || typeof node !== 'object') return;
    const ownerPointer = ownersByPointer.has(pointer) ? pointer : inheritedOwner;
    if (ownerPointer) node['x-mcpdesc-owner-pointer'] = ownerPointer;
    for (const keyword of ['$defs', 'definitions', 'properties', 'patternProperties', 'dependentSchemas']) {
      const schemas = node[keyword];
      if (!schemas || typeof schemas !== 'object' || Array.isArray(schemas)) continue;
      for (const [key, child] of Object.entries(schemas)) {
        annotateOwners(child, `${pointer}/${keyword}/${escapePointer(key)}`, ownerPointer);
      }
    }
    for (const keyword of ['allOf', 'anyOf', 'oneOf', 'prefixItems']) {
      const schemas = node[keyword];
      if (!Array.isArray(schemas)) continue;
      schemas.forEach((child, index) => {
        annotateOwners(child, `${pointer}/${keyword}/${index}`, ownerPointer);
      });
    }
    for (const keyword of [
      'additionalItems',
      'additionalProperties',
      'contentSchema',
      'contains',
      'else',
      'if',
      'items',
      'not',
      'propertyNames',
      'then',
      'unevaluatedItems',
      'unevaluatedProperties',
    ]) {
      const child = node[keyword];
      if (child && typeof child === 'object' && !Array.isArray(child)) {
        annotateOwners(child, `${pointer}/${keyword}`, ownerPointer);
      }
    }
  }
  annotateOwners(standaloneSchema, '#', undefined);
  if (!ajv.getKeyword('x-mcpdesc-rule')) ajv.addKeyword({
    keyword: 'x-mcpdesc-rule',
    schemaType: 'string',
    errors: false,
    code(cxt) {
      const { gen, schemaCode, it } = cxt;
      gen.code(_`recordDraft4Evaluation(${schemaCode}, ${strConcat(codegenNames.instancePath, it.errorPath)})`);
    },
  });
  const instrumentedId = `https://mcpdesc.invalid/standalone/${selector}/document-schema`;
  ajv.addSchema({ ...standaloneSchema, $id: instrumentedId }, instrumentedId);
  const exportName = `documentSchema${instrumentedSchemas.length + 1}`;
  validatorExports[exportName] = instrumentedId;
  instrumentedSchemas.push({ schema: instrumentedSchema, exportName });
}
for (const [index, schema] of schemas.entries()) {
  ajv.addSchema({ ...schema, $id: `urn:mcpdesc:standalone:${selectors[index]}` }, selectors[index]);
}
const generatedValidators = `${standaloneCode(ajv, validatorExports)}
let draft4EvaluationRecorder;
export function setDraft4EvaluationRecorder(recorder) {
  draft4EvaluationRecorder = recorder;
}
function recordDraft4Evaluation(rule, instancePath) {
  draft4EvaluationRecorder?.(rule, instancePath);
}
export const validatorsBySchema = new Map([
${schemas.map((schema, index) => `  [${JSON.stringify(JSON.stringify(schema))}, snapshot${index + 1}]`).join(',\n')}
${instrumentedSchemas.map(({ schema, exportName }) => `,  [${JSON.stringify(JSON.stringify(schema))}, ${exportName}]`).join('\n')}
]);
`;
const ajvDraft7 = new Ajv({ allErrors: true, strict: false, code: { source: true, esm: true } });
addFormats(ajvDraft7);
const generatedMetaDraft7 = standaloneCode(ajvDraft7, ajvDraft7.getSchema('http://json-schema.org/draft-07/schema#'));
const generatedMetaDraft2020 = standaloneCode(ajv, ajv.getSchema('https://json-schema.org/draft/2020-12/schema'));

const standaloneValidatorsPlugin = {
  name: 'standalone-validators',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^#standalone-(?:validators|meta-draft7|meta-draft2020)$/ }, (args) => ({ path: args.path, namespace: 'standalone' }));
    pluginBuild.onLoad({ filter: /.*/, namespace: 'standalone' }, (args) => ({
      contents: args.path === '#standalone-validators'
        ? generatedValidators
        : args.path === '#standalone-meta-draft7'
          ? generatedMetaDraft7
          : generatedMetaDraft2020,
      loader: 'js'
    }));
  }
};
const cspAdaptersPlugin = {
  name: 'csp-adapters',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^ajv$/ }, () => ({ path: draft7Adapter }));
    pluginBuild.onResolve({ filter: /^ajv\/dist\/2020\.js$/ }, () => ({ path: draft2020Adapter }));
    pluginBuild.onResolve({ filter: /^ajv-formats$/ }, () => ({ path: formatsAdapter }));
    pluginBuild.onResolve({ filter: /^(?:ajv|ajv-formats)\/dist\//, namespace: 'standalone' }, (args) => {
      const resolved = fileURLToPath(import.meta.resolve(args.path));
      return { path: fs.existsSync(resolved) ? resolved : `${resolved}.js` };
    });
  }
};

await build({
  entryPoints: [path.join(packageRoot, 'src/index.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  outfile: output,
  external: ['@cfworker/json-schema'],
  minify: true,
  logLevel: 'silent',
  plugins: [cspAdaptersPlugin, standaloneValidatorsPlugin]
});

console.log(`Built ${path.relative(packageRoot, output)} (${fs.statSync(output).size} bytes).`);