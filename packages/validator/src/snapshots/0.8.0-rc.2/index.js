import {
  supportedProtocolVersions,
  validateMcpdesc08Document
} from './semantic.js';

export const specification = '0.8.0-rc.2';
export const snapshotTag = 'v0.8.0-rc.2';
export const schemaSha256 = '40f6775dde052224114e91d6aa484d826eecf56b77f7ac87b4cf707ffbcb6ce8';
export { supportedProtocolVersions };

export function validate(document) {
  const diagnostics = validateMcpdesc08Document(document);
  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    diagnostics
  };
}
