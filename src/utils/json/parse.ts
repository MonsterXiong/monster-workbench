import { toError } from "../error";
import { isPlainObject, type AnyRecord } from "../object";
import { safeJsonStringify, safeJsonStringifyPretty } from "./stringify";
import { isJsonArray, isJsonRecord, isJsonValue, stripJsonBom, summarizeJsonValue } from "./value";
import type {
  FormatJsonOperationSummaryOptions,
  JsonBatchParseSummary,
  JsonOperationSummary,
  JsonParseResult,
  JsonTextSummary,
  JsonValue,
  JsonValueGuard,
} from "./types";

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

export function tryFormatJsonText(value: string, spacing = 2): JsonParseResult<string> {
  const result = tryJsonParse<unknown>(value);

  if (!result.ok) {
    return result as JsonParseResult<string>;
  }

  return {
    ok: true,
    data: safeJsonStringifyPretty(result.data, "", spacing),
    error: null,
  };
}

export function tryMinifyJsonText(value: string): JsonParseResult<string> {
  const result = tryJsonParse<unknown>(value);

  if (!result.ok) {
    return result as JsonParseResult<string>;
  }

  return {
    ok: true,
    data: safeJsonStringify(result.data),
    error: null,
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

export function parseJsonOrRaw<T = unknown>(value: string): T | string {
  const result = tryJsonParse<T>(value);
  return result.ok && result.data !== null ? result.data : value;
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
