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
  migrateMcpDescription07ToDraft4,
  migrateMcpDescription07ToRc1,
  migrateMcpDescription07ToRc2,
  serializeMcpDescriptionMigrationReport,
  type McpDescriptionMigrationChange,
  type McpDescriptionMigrationDefault,
  type McpDescriptionMigrationReport,
  type McpDescriptionMigrationResult,
  type MigrateMcpDescription07Options,
  type MigrateMcpDescription07ToRc1Options,
  type MigrateMcpDescription07ToRc2Options,
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
  DRAFT_4_SCHEMA_URI,
  DRAFT_4_SPECIFICATION,
  RC_1_SCHEMA_URI,
  RC_1_SPECIFICATION,
  RC_2_SCHEMA_URI,
  RC_2_SPECIFICATION,
  draft4Snapshot,
  rc1Snapshot,
  rc2Snapshot,
  type SupportedCoreSpecification,
} from './snapshot.js';
