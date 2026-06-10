import { objectEntries } from "../object";
import { getQueryParamValue, normalizeQueryValues } from "./query-value";
import type { FilterSearchParamsOptions, NormalizeSearchParamsOptions, QueryRecordOptions, QueryValue, SearchParamsInput, StringifyNormalizedQueryOptions } from "./types";

export function getSearchParam(searchParams: URLSearchParams, key: string, fallback = ""): string {
  return searchParams.get(key) ?? fallback;
}

export function getSearchParamValues(searchParams: URLSearchParams, key: string): string[] {
  return searchParams.getAll(key);
}

export function getSearchParamFirstValue(searchParams: URLSearchParams, keys: readonly string[], fallback = ""): string {
  for (const key of keys) {
    const value = searchParams.get(key);

    if (value !== null) {
      return value;
    }
  }

  return fallback;
}

export function hasAnySearchParam(searchParams: URLSearchParams, keys: readonly string[]): boolean {
  return keys.some((key) => searchParams.has(key));
}

export function hasEverySearchParam(searchParams: URLSearchParams, keys: readonly string[]): boolean {
  return keys.every((key) => searchParams.has(key));
}

export function setSearchParamIfPresent(searchParams: URLSearchParams, key: string, value: QueryValue): URLSearchParams {
  const values = normalizeQueryValues(value);

  if (values.length > 0) {
    searchParams.delete(key);
    for (const item of values) {
      searchParams.append(key, item);
    }
  }

  return searchParams;
}

export function setSearchParam(searchParams: URLSearchParams, key: string, value: QueryValue): URLSearchParams {
  searchParams.delete(key);
  const values = normalizeQueryValues(value);

  for (const item of values) {
    searchParams.append(key, item);
  }

  return searchParams;
}

export function setSearchParamsFromRecord(searchParams: URLSearchParams, params: Record<string, QueryValue>): URLSearchParams {
  for (const [key, value] of objectEntries(params)) {
    setSearchParamIfPresent(searchParams, key, value);
  }

  return searchParams;
}

export function deleteSearchParams(searchParams: URLSearchParams, keys: readonly string[]): URLSearchParams {
  for (const key of keys) {
    searchParams.delete(key);
  }

  return searchParams;
}

export function hasSearchParam(searchParams: URLSearchParams, key: string): boolean {
  return searchParams.has(key);
}

export function removeEmptySearchParams(searchParams: URLSearchParams): URLSearchParams {
  const entries: Array<[string, string]> = [];
  searchParams.forEach((value, key) => entries.push([key, value]));

  entries.forEach(([key, value]) => {
    if (value === "") {
      searchParams.delete(key);
    }
  });

  return searchParams;
}

export function searchParamsToArrayRecord(searchParams: URLSearchParams): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  searchParams.forEach((value, key) => {
    result[key] = [...(result[key] ?? []), value];
  });

  return result;
}

export function searchParamsToRecord(
  searchParams: URLSearchParams,
  options: QueryRecordOptions = {}
): Record<string, string> {
  const arrayRecord = searchParamsToArrayRecord(searchParams);
  const result: Record<string, string> = {};

  for (const [key, values] of objectEntries(arrayRecord)) {
    result[key] = getQueryParamValue(values, {
      ...options,
      arrayMode: options.arrayMode ?? "last",
    });
  }

  return result;
}

export function toSearchParams(input: SearchParamsInput): URLSearchParams {
  if (!input) {
    return new URLSearchParams();
  }

  if (input instanceof URLSearchParams) {
    return new URLSearchParams(input);
  }

  if (typeof input === "string") {
    return new URLSearchParams(input.startsWith("?") ? input.slice(1) : input);
  }

  return setSearchParamsFromRecord(new URLSearchParams(), input);
}

export function normalizeSearchParams(
  input: SearchParamsInput,
  options: NormalizeSearchParamsOptions = {}
): URLSearchParams {
  const removeEmpty = options.removeEmpty ?? true;
  const dedupeValues = options.dedupeValues ?? false;
  const sortKeys = options.sortKeys ?? true;
  const sortValues = options.sortValues ?? false;
  const trimKeys = options.trimKeys ?? true;
  const trimValues = options.trimValues ?? true;
  const source = toSearchParams(input);
  const valuesByKey = new Map<string, string[]>();

  source.forEach((value, key) => {
    const normalizedKey = trimKeys ? key.trim() : key;

    if (removeEmpty && normalizedKey.length === 0) {
      return;
    }

    valuesByKey.set(normalizedKey, [...(valuesByKey.get(normalizedKey) ?? []), value]);
  });

  const normalizedKeys = Array.from(valuesByKey.keys());
  if (sortKeys) {
    normalizedKeys.sort((left, right) => left.localeCompare(right));
  }

  const result = new URLSearchParams();

  for (const key of normalizedKeys) {
    const values = (valuesByKey.get(key) ?? [])
      .map((value) => (trimValues ? value.trim() : value))
      .filter((value) => !removeEmpty || value.length > 0);
    const uniqueValues = dedupeValues ? Array.from(new Set(values)) : values;
    const normalizedValues = sortValues ? [...uniqueValues].sort((left, right) => left.localeCompare(right)) : uniqueValues;

    for (const value of normalizedValues) {
      result.append(key, value);
    }
  }

  return result;
}

export function stringifySearchParams(searchParams: URLSearchParams, prefix = true): string {
  const query = searchParams.toString();

  if (!query) {
    return "";
  }

  return prefix ? `?${query}` : query;
}

export function stringifyNormalizedQuery(
  input: SearchParamsInput,
  options: StringifyNormalizedQueryOptions = {}
): string {
  return stringifySearchParams(normalizeSearchParams(input, options), options.prefix ?? true);
}

export function createQueryKey(input: SearchParamsInput, options: NormalizeSearchParamsOptions = {}): string {
  return stringifyNormalizedQuery(input, { ...options, prefix: false });
}

export function filterSearchParams(
  input: SearchParamsInput,
  options: FilterSearchParamsOptions = {}
): URLSearchParams {
  const source = toSearchParams(input);
  const arrayRecord = searchParamsToArrayRecord(source);
  const includeKeys = options.includeKeys ? new Set(options.includeKeys) : null;
  const excludeKeys = new Set(options.excludeKeys ?? []);
  const result = new URLSearchParams();

  for (const [key, values] of objectEntries(arrayRecord)) {
    if (includeKeys && !includeKeys.has(key)) {
      continue;
    }

    if (excludeKeys.has(key)) {
      continue;
    }

    values.forEach((value, index) => {
      if (!options.predicate || options.predicate(key, value, index, values)) {
        result.append(key, value);
      }
    });
  }

  return result;
}

export function stringifyQuery(params: Record<string, QueryValue>, prefix = true): string {
  const searchParams = setSearchParamsFromRecord(new URLSearchParams(), params);

  const query = searchParams.toString();

  if (!query) {
    return "";
  }

  return prefix ? `?${query}` : query;
}
