import {
  supportedProtocolVersions,
  validateDocumentWithResults
} from './semantic.js';

export const specification = '0.9.0-rc.3';
export const snapshotTag = 'v0.9.0-rc.3';
export const schemaSha256 = 'c7e4378ea39aa67ae11642a5be612ee120d13e180073649938d54bc63764a5aa';
export { supportedProtocolVersions };

export function validate(document) {
  return validateDocumentWithResults(document);
}
