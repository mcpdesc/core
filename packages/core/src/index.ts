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
export type {
  McpDescriptionDiagnosticDetail,
  McpDescriptionRelatedLocation,
} from '@mcpdesc/validator';
export {
  convertMcpDescriptionVersion,
  type McpDescriptionConversionFix,
  type McpDescriptionConversionFixKind,
  type McpDescriptionConversionOptions,
  type McpDescriptionConversionResult,
  type McpDescriptionJsonPatchOperation,
} from './conversion.js';
export {
  resolveMcpDescriptionComponentReferences,
  type McpDescriptionComponentReferenceProvenance,
  type ResolveMcpDescriptionComponentReferencesOptions,
  type ResolveMcpDescriptionComponentReferencesResult,
} from './components.js';
export {
  migrateMcpDescription07To08,
  serializeMcpDescriptionMigrationReport,
  type McpDescriptionMigrationChange,
  type McpDescriptionMigrationDefault,
  type McpDescriptionMigrationReport,
  type McpDescriptionMigrationResult,
  type MigrateMcpDescription07To08Options,
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
  projectMcpNativeValue,
  type McpNativeKind,
  type ProjectEffectiveProtocolViewOptions,
  type ProjectMcpNativeValueOptions,
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
  V0_8_SCHEMA_URI,
  V0_8_SPECIFICATION,
  V0_8_REV_20261021_SPECIFICATION,
  V0_9_RC_3_SCHEMA_URI,
  V0_9_RC_3_SPECIFICATION,
  deprecatedCoreSpecifications,
  v0_8Snapshot,
  v0_9Rc3Snapshot,
  type CoreSelectorOptions,
  type SupportedCoreSpecification,
} from './snapshot.js';
