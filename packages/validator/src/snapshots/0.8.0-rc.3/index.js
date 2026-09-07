import {
  supportedProtocolVersions,
  validateMcpdesc08Document
} from './semantic.js';

export const specification = '0.8.0-rc.3';
export const snapshotTag = 'v0.8.0-rc.3';
export const schemaSha256 = 'a9c3ff77ba37c72362909f538f6e957d055e6fdb372f8b3d529e3651af3fecf4';
export { supportedProtocolVersions };

export function validate(document) {
  const diagnostics = validateMcpdesc08Document(document);
  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    diagnostics
  };
}
