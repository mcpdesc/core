import {
  supportedProtocolVersions,
  validateDocumentWithResults
} from './semantic.js';

export const specification = '0.9.0';
export const snapshotTag = 'v0.9.0';
export const schemaSha256 = '8e00472b1db1e0da30691c5a05a48be2dd3917f00698f907059a909696535f57';
export { supportedProtocolVersions };

export function validate(document) {
  return validateDocumentWithResults(document);
}
