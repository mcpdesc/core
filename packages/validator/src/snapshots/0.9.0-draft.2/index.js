import {
  supportedProtocolVersions,
  validateDocument
} from './semantic.js';

export const specification = '0.9.0-draft.2';
export const snapshotTag = 'v0.9.0-draft.2';
export const schemaSha256 = 'b3405c551db68f5a4efc625809b884d17bb248aba4d57b87463450ebf83efac6';
export { supportedProtocolVersions };

export function validate(document) {
  const diagnostics = validateDocument(document);
  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    diagnostics
  };
}
