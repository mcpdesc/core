import {
  supportedProtocolVersions,
  validateDocumentWithResults
} from './semantic.js';

export const specification = '0.9.0-draft.4';
export const snapshotTag = 'v0.9.0-draft.4';
export const schemaSha256 = '34dea6d14f72a72de7b6e648f4254a50307d74786843b4c0e3a435e8c10ec14a';
export { supportedProtocolVersions };

export function validate(document) {
  return validateDocumentWithResults(document);
}
