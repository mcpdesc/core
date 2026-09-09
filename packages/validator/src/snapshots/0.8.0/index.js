import {
  supportedProtocolVersions,
  validateMcpdesc08Document
} from './semantic.js';

export const specification = '0.8.0';
export const snapshotTag = 'v0.8.0';
export const schemaSha256 = '36686f92ba0cc98bde2c34eaad31c0304d6e5cebdd2c4d2be1be06aecef41119';
export { supportedProtocolVersions };

export function validate(document) {
  const diagnostics = validateMcpdesc08Document(document);
  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    diagnostics
  };
}
