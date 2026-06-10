import { isPlainObject } from "../object";
import type { JsonPrimitive, JsonValue, JsonValueKind, JsonValueSummary } from "./types";

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
