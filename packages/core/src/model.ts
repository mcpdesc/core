import type {
  McpDescriptionDiagnosticSeverity,
  SupportedProtocolVersion,
} from '@mcpdesc/validator';

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type ProtocolScopedDeclaration = JsonObject & {
  protocolVersions?: string[];
};

export type McpDescriptionDocument = JsonObject & {
  $schema?: string;
  mcpdesc: string;
  info: JsonObject;
  protocolVersions: string[];
};

export type DiagnosticPhase = 'operation' | 'result' | 'source';

export interface CoreDiagnostic {
  readonly code: string;
  readonly severity: McpDescriptionDiagnosticSeverity;
  readonly message: string;
  readonly path: readonly (number | string)[];
  readonly phase: DiagnosticPhase;
  readonly protocolVersion?: SupportedProtocolVersion;
}

export type OperationResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
      readonly diagnostics: readonly CoreDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly CoreDiagnostic[];
    };
