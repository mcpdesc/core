import {
  supportedProtocolVersions,
  validateMcpdesc08Document
} from './semantic.js';

export const specification = '0.8.0-rc.4';
export const snapshotTag = 'v0.8.0-rc.4';
export const schemaSha256 = 'd38e54db859813b63be2a5c91dde91250035f18bcb5910208cf71fa6875d6eef';
export { supportedProtocolVersions };

export function validate(document) {
  const diagnostics = validateMcpdesc08Document(document);
  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    diagnostics
  };
}
