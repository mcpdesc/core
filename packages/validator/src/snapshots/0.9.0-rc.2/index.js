import {
  supportedProtocolVersions,
  validateDocumentWithResults
} from './semantic.js';

export const specification = '0.9.0-rc.2';
export const snapshotTag = 'v0.9.0-rc.2';
export const schemaSha256 = '21c8c4ad5eccc761b91cf5e7d68b989fa10454be7649970bd0f0b0a22553dc29';
export { supportedProtocolVersions };

export function validate(document) {
  return validateDocumentWithResults(document);
}
