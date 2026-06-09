import { toError } from "./error";
import { isPlainObject, type AnyRecord } from "./object";

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

function getJsonValueDepth(value: unknown): number {
  if (Array.isArray(value)) {
    return value.length === 0 ? 1 : 1 + Math.max(...value.map(getJsonValueDepth));
  }

  if (isPlainObject(value)) {
    const values = Object.values(value);
    return values.length === 0 ? 1 : 1 + Math.max(...values.map(getJsonValueDepth));
  }

  return 0;
}

function getJsonValueSize(value: unknown): number {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (isPlainObject(value)) {
    return Object.keys(value).length;
  }

  return value === null || value === undefined || value === "" ? 0 : 1;
}

export function getJsonValueKind(value: unknown): JsonValueKind {
  if (!isJsonValue(value)) {
    return "invalid";
  }

  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (isPlainObject(value)) return "object";
  return typeof value as JsonValueKind;
}

export function stripJsonBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

export function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return value === null || typeof value === "string" || (typeof value === "number" && Number.isFinite(value)) || typeof value === "boolean";
}

function isJsonValueInner(value: unknown, seen: WeakSet<object>): value is JsonValue {
  if (isJsonPrimitive(value)) {
    return true;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return false;
    }

    seen.add(value);
    return value.every((item) => isJsonValueInner(item, seen));
  }

  if (!isPlainObject(value)) {
    return false;
  }

  if (seen.has(value)) {
    return false;
  }

  seen.add(value);
  return Object.values(value).every((item) => isJsonValueInner(item, seen));
}

export function isJsonValue(value: unknown): value is JsonValue {
  return isJsonValueInner(value, new WeakSet<object>());
}

export function isJsonArray(value: unknown): value is JsonValue[] {
  return Array.isArray(value) && isJsonValueInner(value, new WeakSet<object>());
}

export function isJsonRecord(value: unknown): value is Record<string, JsonValue> {
  return isPlainObject(value) && isJsonValueInner(value, new WeakSet<object>());
}

export function summarizeJsonValue(value: unknown): JsonValueSummary {
  const kind = getJsonValueKind(value);
  const object = kind === "object";
  const array = kind === "array";
  const size = getJsonValueSize(value);

  return {
    kind,
    valid: kind !== "invalid",
    empty: size === 0,
    primitive: ["null", "string", "number", "boolean"].includes(kind),
    array,
    object,
    size,
    keyCount: object ? Object.keys(value as Record<string, unknown>).length : 0,
    depth: getJsonValueDepth(value),
  };
}

export function tryJsonParse<T = unknown>(value: string): JsonParseResult<T> {
  try {
    return {
      ok: true,
      data: JSON.parse(stripJsonBom(value)) as T,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: toError(error),
    };
  }
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  const result = tryJsonParse<T>(value);
  return result.ok ? (result.data as T) : fallback;
}

export function summarizeJsonTexts<T = unknown>(values: readonly string[]): JsonBatchParseSummary<T> {
  const results = values.map((value) => tryJsonParse<T>(value));
  const data = results.flatMap((result) => (result.ok && result.data !== null ? [result.data] : []));
  const errors = results.flatMap((result) => (result.error ? [result.error] : []));
  const successCount = results.filter((result) => result.ok).length;

  return {
    results,
    successCount,
    failureCount: errors.length,
    totalCount: values.length,
    data,
    errors,
    allOk: values.length > 0 && successCount === values.length,
    hasFailures: errors.length > 0,
  };
}

export function summarizeJsonParseResult<T>(result: JsonParseResult<T>): JsonOperationSummary {
  return {
    ok: result.ok,
    hasData: result.data !== null,
    errorMessage: result.error?.message ?? "",
  };
}

export function summarizeJsonText(value: string, spacing = 2): JsonTextSummary {
  const result = tryJsonParse<unknown>(value);

  if (!result.ok) {
    return {
      ...summarizeJsonValue(undefined),
      textLength: value.length,
      parseOk: false,
      errorMessage: result.error?.message ?? "",
      formattedText: "",
      minifiedText: "",
    };
  }

  const data = result.data;

  return {
    ...summarizeJsonValue(data),
    textLength: value.length,
    parseOk: true,
    errorMessage: "",
    formattedText: safeJsonStringifyPretty(data, "", spacing),
    minifiedText: safeJsonStringify(data),
  };
}

export function formatJsonOperationSummary(
  summary: JsonOperationSummary,
  options: FormatJsonOperationSummaryOptions = {}
): string {
  if (!summary.ok) {
    const failedText = options.failedText ?? "failed";
    return options.includeError && summary.errorMessage
      ? [failedText, summary.errorMessage].join(options.separator ?? ": ")
      : failedText;
  }

  if (!summary.hasData) {
    return options.emptyText ?? "empty";
  }

  return options.successText ?? "ok";
}

export function formatJsonParseResult<T>(
  result: JsonParseResult<T>,
  options: FormatJsonOperationSummaryOptions = {}
): string {
  return formatJsonOperationSummary(summarizeJsonParseResult(result), options);
}

export function getJsonParseData<T>(result: JsonParseResult<T>, fallback: T): T {
  return result.ok && result.data !== null ? result.data : fallback;
}

export function getJsonParseErrorMessage<T>(result: JsonParseResult<T>, fallback = ""): string {
  return result.error?.message || fallback;
}

export function isJsonParseSuccess<T>(result: JsonParseResult<T>): result is JsonParseResult<T> & { ok: true; data: T } {
  return result.ok && result.data !== null;
}

export function isJsonParseFailure<T>(result: JsonParseResult<T>): result is JsonParseResult<T> & { ok: false; error: Error } {
  return !result.ok;
}

export function tryJsonParseWithGuard<T>(value: string, guard: JsonValueGuard<T>, errorMessage = "JSON value does not match expected shape"): JsonParseResult<T> {
  const result = tryJsonParse<unknown>(value);

  if (!result.ok) {
    return {
      ok: false,
      data: null,
      error: result.error,
    };
  }

  if (!guard(result.data)) {
    return {
      ok: false,
      data: null,
      error: new Error(errorMessage),
    };
  }

  return {
    ok: true,
    data: result.data,
    error: null,
  };
}

export function safeJsonParseWithGuard<T>(value: string, guard: JsonValueGuard<T>, fallback: T): T {
  const result = tryJsonParseWithGuard(value, guard);
  return result.ok ? (result.data as T) : fallback;
}

export function isJsonText(value: string): boolean {
  return tryJsonParse(value).ok;
}

export function tryJsonParseObject<T extends AnyRecord = AnyRecord>(value: string): JsonParseResult<T> {
  const result = tryJsonParse<unknown>(value);

  if (!result.ok) {
    return {
      ok: false,
      data: null,
      error: result.error,
    };
  }

  if (!isPlainObject(result.data)) {
    return {
      ok: false,
      data: null,
      error: new Error("JSON value is not an object"),
    };
  }

  return {
    ok: true,
    data: result.data as T,
    error: null,
  };
}

export function safeJsonParseObject<T extends AnyRecord = AnyRecord>(value: string, fallback: T): T {
  const result = tryJsonParseObject<T>(value);
  return result.ok && result.data !== null ? result.data : fallback;
}

export function isJsonObjectText(value: string): boolean {
  return tryJsonParseObject(value).ok;
}

export function tryJsonParseArray<T = unknown>(value: string): JsonParseResult<T[]> {
  const result = tryJsonParse<unknown>(value);

  if (!result.ok) {
    return {
      ok: false,
      data: null,
      error: result.error,
    };
  }

  if (!Array.isArray(result.data)) {
    return {
      ok: false,
      data: null,
      error: new Error("JSON value is not an array"),
    };
  }

  return {
    ok: true,
    data: result.data as T[],
    error: null,
  };
}

export function safeJsonParseArray<T = unknown>(value: string, fallback: T[]): T[] {
  const result = tryJsonParseArray<T>(value);
  return result.ok && result.data !== null ? result.data : fallback;
}

export function isJsonArrayText(value: string): boolean {
  return tryJsonParseArray(value).ok;
}

export function tryJsonParseArrayItemsWithGuard<T>(
  value: string,
  guard: JsonValueGuard<T>,
  errorMessage = "JSON array item does not match expected shape"
): JsonParseResult<T[]> {
  const result = tryJsonParseArray<unknown>(value);

  if (!result.ok) {
    return {
      ok: false,
      data: null,
      error: result.error,
    };
  }

  const data = result.data ?? [];
  const invalidIndex = data.findIndex((item) => !guard(item));

  if (invalidIndex >= 0) {
    return {
      ok: false,
      data: null,
      error: new Error(`${errorMessage} at index ${invalidIndex}`),
    };
  }

  return {
    ok: true,
    data: data as T[],
    error: null,
  };
}

export function safeJsonParseArrayItemsWithGuard<T>(
  value: string,
  guard: JsonValueGuard<T>,
  fallback: T[]
): T[] {
  const result = tryJsonParseArrayItemsWithGuard(value, guard);
  return result.ok && result.data !== null ? result.data : fallback;
}

export function tryJsonStringify(value: unknown, spacing?: number): JsonStringifyResult {
  try {
    const result = spacing === undefined ? JSON.stringify(value) : JSON.stringify(value, null, spacing);
    return typeof result === "string"
      ? { ok: true, data: result, error: null }
      : { ok: false, data: null, error: new Error("JSON value is not serializable") };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: toError(error),
    };
  }
}

export function safeJsonStringify(value: unknown, fallback = ""): string {
  const result = tryJsonStringify(value);
  return result.ok && result.data !== null ? result.data : fallback;
}

export function summarizeJsonStringifyResult(result: JsonStringifyResult): JsonOperationSummary {
  return {
    ok: result.ok,
    hasData: result.data !== null,
    errorMessage: result.error?.message ?? "",
  };
}

export function formatJsonStringifyResult(
  result: JsonStringifyResult,
  options: FormatJsonOperationSummaryOptions = {}
): string {
  return formatJsonOperationSummary(summarizeJsonStringifyResult(result), options);
}

export function getJsonStringifyData(result: JsonStringifyResult, fallback = ""): string {
  return result.ok && result.data !== null ? result.data : fallback;
}

export function getJsonStringifyErrorMessage(result: JsonStringifyResult, fallback = ""): string {
  return result.error?.message || fallback;
}

export function isJsonStringifySuccess(result: JsonStringifyResult): result is JsonStringifyResult & { ok: true; data: string } {
  return result.ok && result.data !== null;
}

export function isJsonStringifyFailure(result: JsonStringifyResult): result is JsonStringifyResult & { ok: false; error: Error } {
  return !result.ok;
}

export function isJsonSerializable(value: unknown): boolean {
  return tryJsonStringify(value).ok;
}

export function safeJsonStringifyOrNull(value: unknown): string | null {
  const result = tryJsonStringify(value);
  return result.ok ? result.data : null;
}

export function safeJsonStringifyPretty(value: unknown, fallback = "", spacing = 2): string {
  const result = tryJsonStringify(value, spacing);
  return result.ok && result.data !== null ? result.data : fallback;
}

export function safeJsonStringifyPrettyOrNull(value: unknown, spacing = 2): string | null {
  const result = tryJsonStringify(value, spacing);
  return result.ok ? result.data : null;
}

export function tryJsonParseJsonValue(value: string): JsonParseResult<JsonValue> {
  return tryJsonParseWithGuard(value, isJsonValue, "JSON value is not JSON-compatible");
}

export function tryJsonParseJsonRecord(value: string): JsonParseResult<Record<string, JsonValue>> {
  return tryJsonParseWithGuard(value, isJsonRecord, "JSON value is not a JSON object");
}

export function tryJsonParseJsonArray(value: string): JsonParseResult<JsonValue[]> {
  return tryJsonParseWithGuard(value, isJsonArray, "JSON value is not a JSON array");
}

export function safeJsonParseJsonValue(value: string, fallback: JsonValue): JsonValue {
  const result = tryJsonParseJsonValue(value);
  return result.ok ? (result.data as JsonValue) : fallback;
}

export function safeJsonParseJsonRecord(value: string, fallback: Record<string, JsonValue> = {}): Record<string, JsonValue> {
  const result = tryJsonParseJsonRecord(value);
  return result.ok && result.data !== null ? result.data : fallback;
}

export function safeJsonParseJsonArray(value: string, fallback: JsonValue[] = []): JsonValue[] {
  const result = tryJsonParseJsonArray(value);
  return result.ok && result.data !== null ? result.data : fallback;
}

export function tryJsonStringifyJsonValue(value: unknown, spacing?: number): JsonStringifyResult {
  if (!isJsonValue(value)) {
    return {
      ok: false,
      data: null,
      error: new Error("JSON value is not JSON-compatible"),
    };
  }

  return tryJsonStringify(value, spacing);
}

export function safeJsonStringifyJsonValue(value: unknown, fallback = ""): string {
  const result = tryJsonStringifyJsonValue(value);
  return result.ok && result.data !== null ? result.data : fallback;
}

export function safeJsonStringifyJsonValuePretty(value: unknown, fallback = "", spacing = 2): string {
  const result = tryJsonStringifyJsonValue(value, spacing);
  return result.ok && result.data !== null ? result.data : fallback;
}

export function parseJsonOrRaw<T = unknown>(value: string): T | string {
  const result = tryJsonParse<T>(value);
  return result.ok ? (result.data as T) : value;
}

export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function tryCloneJson<T>(value: T): JsonParseResult<T> {
  try {
    return {
      ok: true,
      data: cloneJson(value),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: toError(error),
    };
  }
}

export function safeCloneJson<T>(value: T, fallback: T): T {
  const result = tryCloneJson(value);
  return result.ok ? (result.data as T) : fallback;
}

export function formatJsonText(value: string, spacing = 2): string {
  return JSON.stringify(JSON.parse(stripJsonBom(value)), null, spacing);
}

export function minifyJsonText(value: string): string {
  return JSON.stringify(JSON.parse(stripJsonBom(value)));
}

export function tryFormatJsonText(value: string, spacing = 2): JsonParseResult<string> {
  try {
    return {
      ok: true,
      data: formatJsonText(value, spacing),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: toError(error),
    };
  }
}

export function safeFormatJsonText(value: string, fallback = "", spacing = 2): string {
  const result = tryFormatJsonText(value, spacing);
  return result.ok && result.data !== null ? result.data : fallback;
}

export function tryMinifyJsonText(value: string): JsonParseResult<string> {
  try {
    return {
      ok: true,
      data: minifyJsonText(value),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: toError(error),
    };
  }
}

export function safeMinifyJsonText(value: string, fallback = ""): string {
  const result = tryMinifyJsonText(value);
  return result.ok && result.data !== null ? result.data : fallback;
}
