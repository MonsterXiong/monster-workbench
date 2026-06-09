import { toFiniteNumber, toInteger } from "../number";
import { isNonEmptyValue, parseBoolean, parseEnum, parseOptionalEnum } from "../value";
import type { QueryParamArrayOptions, QueryParamValueOptions, QueryPrimitiveValue, QueryValue } from "./types";

export function isNonEmptyQueryValue(value: QueryPrimitiveValue): value is string | number | boolean {
  return isNonEmptyValue(value);
}

export function normalizeQueryValues(value: QueryValue): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter(isNonEmptyQueryValue)
    .map(String);
}

export function getQueryParamValue(value: unknown, options: QueryParamValueOptions = {}): string {
  const fallback = options.fallback ?? "";

  if (typeof value === "string") {
    return value;
  }

  if (!Array.isArray(value)) {
    return fallback;
  }

  const stringValues = value.filter((item): item is string => typeof item === "string");

  if (stringValues.length === 0) {
    return fallback;
  }

  const arrayMode = options.arrayMode ?? "first";

  if (arrayMode === "fallback") {
    return fallback;
  }

  if (arrayMode === "last") {
    return stringValues[stringValues.length - 1] ?? fallback;
  }

  if (arrayMode === "join") {
    return stringValues.join(options.separator ?? ",");
  }

  return stringValues[0] ?? fallback;
}

export function getQueryParamArray(value: unknown, options: QueryParamArrayOptions = {}): string[] {
  const fallback = options.fallback ?? [];
  const trim = options.trim ?? true;
  let values: string[];

  if (Array.isArray(value)) {
    values = value.filter((item): item is string => typeof item === "string");
  } else if (typeof value === "string") {
    values = options.separator ? value.split(options.separator) : [value];
  } else {
    return [...fallback];
  }

  const normalizedValues = values
    .map((item) => (trim ? item.trim() : item))
    .filter(isNonEmptyValue);

  return normalizedValues.length > 0 ? normalizedValues : [...fallback];
}

export function getQueryParamEnum<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T,
  options: QueryParamValueOptions = {}
): T {
  return parseEnum(getQueryParamValue(value, options), values, fallback);
}

export function getQueryParamEnumArray<T extends string>(
  value: unknown,
  values: readonly T[],
  options: QueryParamArrayOptions = {}
): T[] {
  return getQueryParamArray(value, options).flatMap((item) => {
    const enumValue = parseOptionalEnum(item, values);
    return enumValue === undefined ? [] : [enumValue];
  });
}

export function getQueryParamBoolean(value: unknown, fallback = false, options: QueryParamValueOptions = {}): boolean {
  return parseBoolean(getQueryParamValue(value, options), fallback);
}

export function getQueryParamNumber(value: unknown, fallback = 0, options: QueryParamValueOptions = {}): number {
  return toFiniteNumber(getQueryParamValue(value, options), fallback);
}

export function getQueryParamInteger(value: unknown, fallback = 0, options: QueryParamValueOptions = {}): number {
  return toInteger(getQueryParamValue(value, options), fallback);
}
