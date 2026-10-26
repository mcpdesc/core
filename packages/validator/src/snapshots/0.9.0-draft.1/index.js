import {
  supportedProtocolVersions,
  validateDocument
} from './semantic.js';

export const specification = '0.9.0-draft.1';
export const snapshotTag = 'v0.9.0-draft.1';
export const schemaSha256 = '058e1fe3c976a41588ec81b9c8c17400f868698d8bd154ef5755cc69a4494c74';
export { supportedProtocolVersions };

export function validate(document) {
  const diagnostics = validateDocument(document);
  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    diagnostics
  };
}
