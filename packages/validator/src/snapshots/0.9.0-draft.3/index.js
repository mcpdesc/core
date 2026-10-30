import {
  supportedProtocolVersions,
  validateDocument
} from './semantic.js';

export const specification = '0.9.0-draft.3';
export const snapshotTag = 'v0.9.0-draft.3';
export const schemaSha256 = 'b81249f92c0583fd996a6eefa0928d0a29e012a5b8fbda9af580cf164ab8654d';
export { supportedProtocolVersions };

export function validate(document) {
  const diagnostics = validateDocument(document);
  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    diagnostics
  };
}
