import { isPlainObject, type AnyRecord } from "./object";

export interface JsonParseResult<T> {
  ok: boolean;
  data: T | null;
  error: Error | null;
}

export function stripJsonBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
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
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  const result = tryJsonParse<T>(value);
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

export function safeJsonStringify(value: unknown, fallback = ""): string {
  try {
    const result = JSON.stringify(value);
    return typeof result === "string" ? result : fallback;
  } catch {
    return fallback;
  }
}

export function safeJsonStringifyPretty(value: unknown, fallback = "", spacing = 2): string {
  try {
    const result = JSON.stringify(value, null, spacing);
    return typeof result === "string" ? result : fallback;
  } catch {
    return fallback;
  }
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

export function formatJsonText(value: string, spacing = 2): string {
  return JSON.stringify(JSON.parse(stripJsonBom(value)), null, spacing);
}

export function minifyJsonText(value: string): string {
  return JSON.stringify(JSON.parse(stripJsonBom(value)));
}
