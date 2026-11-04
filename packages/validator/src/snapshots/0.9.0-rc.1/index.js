import {
  supportedProtocolVersions,
  validateDocumentWithResults
} from './semantic.js';

export const specification = '0.9.0-rc.1';
export const snapshotTag = 'v0.9.0-rc.1';
export const schemaSha256 = '18e2349e767879c6ddef547ad93f3620f42d1f2f43e978de2d7cdac31bbe130a';
export { supportedProtocolVersions };

export function validate(document) {
  return validateDocumentWithResults(document);
}
