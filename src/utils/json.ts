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

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonValueGuard<T> = (value: unknown) => value is T;

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
  return result.ok && result.data !== null ? result.data : fallback;
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
  return result.ok && result.data !== null ? result.data : fallback;
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

export function safeJsonParseJsonValue(value: string, fallback: JsonValue): JsonValue {
  return safeJsonParseWithGuard(value, isJsonValue, fallback);
}

export function safeJsonParseJsonRecord(value: string, fallback: Record<string, JsonValue> = {}): Record<string, JsonValue> {
  return safeJsonParseWithGuard(value, isJsonRecord, fallback);
}

export function safeJsonParseJsonArray(value: string, fallback: JsonValue[] = []): JsonValue[] {
  return safeJsonParseWithGuard(value, isJsonArray, fallback);
}

export function safeJsonStringifyJsonValue(value: unknown, fallback = ""): string {
  if (!isJsonValue(value)) {
    return fallback;
  }

  return safeJsonStringify(value, fallback);
}

export function safeJsonStringifyJsonValuePretty(value: unknown, fallback = "", spacing = 2): string {
  if (!isJsonValue(value)) {
    return fallback;
  }

  return safeJsonStringifyPretty(value, fallback, spacing);
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
  return result.ok && result.data !== null ? result.data : fallback;
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
