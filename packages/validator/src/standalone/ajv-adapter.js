import { Validator } from '@cfworker/json-schema';
import {
  setDraft4EvaluationRecorder,
  validatorsBySchema
} from '#standalone-validators';
import validateDraft7Schema from '#standalone-meta-draft7';
import validateDraft2020Schema from '#standalone-meta-draft2020';
import { currentValidationSelector } from '../validation-context.js';

const ruleResultSelectors = new Set(['0.9.0-draft.4', '0.9.0-rc.1']);

function pointerToInstancePath(pointer) {
  return pointer === '#' ? '' : pointer.slice(1);
}

function quotedProperty(message) {
  return /"([^"]+)"/.exec(message)?.[1];
}

function toAjvError(error) {
  if (
    error.keyword === 'properties' &&
    /^Property ".*" does not match schema\.$/.test(error.error)
  ) {
    return undefined;
  }
  const params = {};
  if (error.keyword === 'required') params.missingProperty = quotedProperty(error.error);
  if (error.keyword === 'additionalProperties') params.additionalProperty = quotedProperty(error.error);
  const typeMismatch = /^Instance type ".+" is invalid\. Expected "(.+)"\.$/.exec(error.error);
  return {
    instancePath: pointerToInstancePath(error.instanceLocation),
    keyword: error.keyword,
    params,
    message: typeMismatch ? `must be ${typeMismatch[1]}` : error.error
  };
}

function schemaAtPointer(schema, pointer) {
  if (pointer === '#') return schema;
  if (typeof pointer !== 'string' || !pointer.startsWith('#/')) return undefined;
  return pointer.slice(2)
    .split('/')
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((node, segment) => node && typeof node === 'object' ? node[segment] : undefined, schema);
}

function canonicalSchema(value) {
  if (Array.isArray(value)) return value.map(canonicalSchema);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalSchema(child)]),
    );
  }
  return value;
}

function schemaByContent(schema, candidate, ownerPointer, schemaPath) {
  const { 'x-mcpdesc-owner-pointer': _ownerPointer, ...candidateSchema } = candidate;
  const expected = JSON.stringify(canonicalSchema(candidateSchema));
  const parentSchemaPath = schemaPath?.startsWith('#/')
    ? schemaPath.slice(0, schemaPath.lastIndexOf('/')) || '#'
    : schemaPath;
  for (const pointer of [
    ownerPointer && parentSchemaPath?.startsWith('#/')
      ? `${ownerPointer}${parentSchemaPath.slice(1)}`
      : undefined,
    parentSchemaPath,
  ]) {
    const match = pointer ? schemaAtPointer(schema, pointer) : undefined;
    if (
      match &&
      typeof match === 'object' &&
      JSON.stringify(canonicalSchema(match)) === expected
    ) {
      return match;
    }
  }
  const searchRoot = ownerPointer ? schemaAtPointer(schema, ownerPointer) : schema;
  let match;
  function visit(node) {
    if (match || !node || typeof node !== 'object') return;
    if (
      !Array.isArray(node) &&
      JSON.stringify(canonicalSchema(node)) === expected
    ) {
      match = node;
      return;
    }
    for (const child of Object.values(node)) visit(child);
  }
  visit(searchRoot);
  return match;
}

function bindRuntimeParentSchema(schema, error) {
  const ownerPointer = error.parentSchema?.['x-mcpdesc-owner-pointer'];
  const parentSchemaPath = error.schemaPath?.startsWith('#/')
    ? error.schemaPath.slice(0, error.schemaPath.lastIndexOf('/')) || '#'
    : error.schemaPath;
  const parentPointer = ownerPointer
    ? parentSchemaPath === '#'
      ? ownerPointer
      : parentSchemaPath?.startsWith('#/')
        ? `${ownerPointer}${parentSchemaPath.slice(1)}`
        : undefined
    : undefined;
  const pointerMatch = parentPointer
    ? schemaAtPointer(schema, parentPointer)
    : undefined;
  if (
    pointerMatch === false ||
    (pointerMatch && typeof pointerMatch === 'object' &&
      Object.hasOwn(pointerMatch, error.keyword))
  ) {
    return { ...error, parentSchema: pointerMatch };
  }
  const matchingSchema = schemaByContent(
    schema,
    error.parentSchema,
    ownerPointer,
    error.schemaPath,
  );
  if (matchingSchema) return { ...error, parentSchema: matchingSchema };
  const schemaPath = error.schemaPath;
  if (typeof schemaPath !== 'string') return error;
  const finalSlash = schemaPath.lastIndexOf('/');
  const schemaLocationParentPointer = finalSlash > 0 ? schemaPath.slice(0, finalSlash) : '#';
  const parentSchema = schemaAtPointer(schema, schemaLocationParentPointer);
  return parentSchema === undefined ? error : { ...error, parentSchema };
}

function assertLocalReferencesResolve(schema) {
  const anchors = new Set();
  const references = [];

  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.$anchor === 'string') anchors.add(value.$anchor);
    if (typeof value.$dynamicAnchor === 'string') anchors.add(value.$dynamicAnchor);
    for (const keyword of ['$ref', '$dynamicRef', '$recursiveRef']) {
      if (typeof value[keyword] === 'string') references.push(value[keyword]);
    }
    for (const child of Object.values(value)) visit(child);
  }

  visit(schema);
  for (const reference of references) {
    if (!reference.startsWith('#')) {
      throw new Error(`can't resolve reference ${reference}${ruleResultSelectors.has(currentValidationSelector()) ? ' from id #' : ''}`);
    }
    if (reference === '#' || reference === '#recursive') continue;
    if (!reference.startsWith('#/')) {
      if (!anchors.has(reference.slice(1))) throw new Error(`can't resolve reference ${reference}`);
      continue;
    }
    let target = schema;
    for (const segment of reference.slice(2).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))) {
      if (!target || typeof target !== 'object' || !Object.hasOwn(target, segment)) {
        throw new Error(`can't resolve reference ${reference}${ruleResultSelectors.has(currentValidationSelector()) ? ' from id #' : ''}`);
      }
      target = target[segment];
    }
  }
}

function compileSchema(schema, draft) {
  assertLocalReferencesResolve(schema);
  const validator = new Validator(schema, draft, false);
  const validate = (value) => {
    const result = validator.validate(value);
    validate.errors = result.valid ? null : result.errors.map(toAjvError).filter(Boolean);
    return result.valid;
  };
  validate.errors = null;
  return validate;
}

class AjvAdapter {
  constructor(_options = {}) {
    this.errors = null;
    this.draft4RuleKeyword = undefined;
  }

  addKeyword(definition) {
    if (definition?.keyword === 'x-mcpdesc-rule') {
      this.draft4RuleKeyword = definition;
    }
    return this;
  }

  compile(schema) {
    const standalone = validatorsBySchema.get(JSON.stringify(schema));
    if (standalone) {
      if (!this.draft4RuleKeyword) return standalone;
      const validate = (value) => {
        setDraft4EvaluationRecorder((rule, instancePath) => {
          this.draft4RuleKeyword.validate(rule, value, schema, { instancePath });
        });
        try {
          const valid = standalone(value);
          validate.errors = standalone.errors?.map((error) => bindRuntimeParentSchema(schema, error)) ?? null;
          return valid;
        } finally {
          setDraft4EvaluationRecorder(undefined);
        }
      };
      validate.errors = null;
      return validate;
    }
    return compileSchema(schema, this.constructor.draft);
  }

  validateSchema(schema, throwOrLogError = false) {
    const validate = this.constructor.draft === '7' ? validateDraft7Schema : validateDraft2020Schema;
    const valid = validate(schema);
    this.errors = validate.errors;
    if (!valid && throwOrLogError && ruleResultSelectors.has(currentValidationSelector())) {
      const details = (validate.errors ?? [])
        .map((error) => `data${error.instancePath || ''} ${error.message}`)
        .join('; ');
      throw new Error(`schema is invalid: ${details || 'unknown meta-schema error'}`);
    }
    return valid;
  }
}

export class AjvDraft7Adapter extends AjvAdapter {
  static draft = '7';
}

export class Ajv2020Adapter extends AjvAdapter {
  static draft = '2020-12';
}

export default AjvDraft7Adapter;