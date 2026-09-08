export type {
  CoreDiagnostic,
  DiagnosticPhase,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  McpDescComponentNamespace,
  McpDescComponentReference,
  McpDescComponentRegistries,
  McpDescPromptExampleComponentMap,
  McpDescResourceExampleComponentMap,
  McpDescResourceTemplateExampleComponentMap,
  McpDescSchemaComponentMap,
  McpDescToolExampleComponentMap,
  McpDescriptionDocument,
  OperationResult,
  ProtocolScopedDeclaration,
} from './model.js';
export {
  resolveMcpDescriptionComponentReferences,
  type McpDescriptionComponentReferenceProvenance,
  type ResolveMcpDescriptionComponentReferencesOptions,
  type ResolveMcpDescriptionComponentReferencesResult,
} from './components.js';
export {
  migrateMcpDescription07ToRc4,
  migrateMcpDescription07ToRc3,
  serializeMcpDescriptionMigrationReport,
  type McpDescriptionMigrationChange,
  type McpDescriptionMigrationDefault,
  type McpDescriptionMigrationReport,
  type McpDescriptionMigrationResult,
  type MigrateMcpDescription07ToRc4Options,
  type MigrateMcpDescription07ToRc3Options,
} from './migration.js';
export {
  parseMcpDescriptionSource,
  serializeMcpDescription,
  type DocumentSourceDiagnostic,
  type DocumentSourceFormat,
  type DocumentSourceLocation,
  type ParseMcpDescriptionSourceOptions,
  type ParseMcpDescriptionSourceResult,
  type SerializeMcpDescriptionOptions,
} from './documents.js';
export {
  projectEffectiveProtocolView,
  type ProjectEffectiveProtocolViewOptions,
} from './projection.js';
export {
  areMcpDescriptionDocumentsSemanticallyEquivalent,
  mergeEffectiveProtocolViews,
  type MergeEffectiveProtocolViewsOptions,
} from './merge.js';
export {
  selectMcpDescriptionDeclarations,
  type DeclarationSelections,
  type SelectMcpDescriptionDeclarationsOptions,
} from './selection.js';
export {
  RC_4_SCHEMA_URI,
  RC_4_SPECIFICATION,
  RC_3_SCHEMA_URI,
  RC_3_SPECIFICATION,
  deprecatedCoreSpecifications,
  rc4Snapshot,
  rc3Snapshot,
  type SupportedCoreSpecification,
} from './snapshot.js';
