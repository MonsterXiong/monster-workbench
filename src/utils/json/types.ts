export interface JsonParseResult<T> {
  ok: boolean;
  data: T | null;
  error: Error | null;
}

export interface JsonStringifyResult {
  ok: boolean;
  data: string | null;
  error: Error | null;
}

export interface JsonOperationSummary {
  ok: boolean;
  hasData: boolean;
  errorMessage: string;
}

export interface FormatJsonOperationSummaryOptions {
  successText?: string;
  failedText?: string;
  emptyText?: string;
  includeError?: boolean;
  separator?: string;
}

export interface JsonBatchParseSummary<T = unknown> {
  results: Array<JsonParseResult<T>>;
  successCount: number;
  failureCount: number;
  totalCount: number;
  data: T[];
  errors: Error[];
  allOk: boolean;
  hasFailures: boolean;
}

export type JsonValueKind = "null" | "array" | "object" | "string" | "number" | "boolean" | "invalid";

export interface JsonValueSummary {
  kind: JsonValueKind;
  valid: boolean;
  empty: boolean;
  primitive: boolean;
  array: boolean;
  object: boolean;
  size: number;
  keyCount: number;
  depth: number;
}

export interface JsonTextSummary extends JsonValueSummary {
  textLength: number;
  parseOk: boolean;
  errorMessage: string;
  formattedText: string;
  minifiedText: string;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonValueGuard<T> = (value: unknown) => value is T;
