import type { EmptyValue } from "./types";

export function withDefault<T>(value: T | null | undefined, fallback: T): T {
  return value === null || value === undefined ? fallback : value;
}

export function withNonEmptyDefault<T>(value: T | EmptyValue, fallback: Exclude<T, EmptyValue>): Exclude<T, EmptyValue> {
  return value === null || value === undefined || value === "" ? fallback : (value as Exclude<T, EmptyValue>);
}

export function coalesce<T>(...values: readonly (T | null | undefined)[]): T | undefined {
  return values.find((value) => value !== null && value !== undefined);
}

export function coalesceWithDefault<T>(values: readonly (T | null | undefined)[], fallback: T): T {
  return coalesce(...values) ?? fallback;
}

export function coalesceNonEmpty<T>(...values: readonly (T | EmptyValue)[]): Exclude<T, EmptyValue> | undefined {
  return values.find((value) => value !== null && value !== undefined && value !== "") as Exclude<T, EmptyValue> | undefined;
}

export function coalesceNonEmptyWithDefault<T>(
  values: readonly (T | EmptyValue)[],
  fallback: Exclude<T, EmptyValue>
): Exclude<T, EmptyValue> {
  return coalesceNonEmpty(...values) ?? fallback;
}

export function isOneOf<T extends string | number>(value: unknown, options: readonly T[]): value is T {
  return options.includes(value as T);
}

export function coerceEmptyToNull(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

export function coerceEmptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

export function coerceEmptyValuesToNull(values: readonly unknown[]): unknown[] {
  return values.map(coerceEmptyToNull);
}

export function coerceEmptyValuesToUndefined(values: readonly unknown[]): unknown[] {
  return values.map(coerceEmptyToUndefined);
}
