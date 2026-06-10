import { objectEntries } from "../object";
import { createUrl, formatUrlForInput } from "./core";
import { getUrlSearchParams } from "./path";
import { getQueryParamArray, getQueryParamBoolean, getQueryParamEnum, getQueryParamEnumArray, getQueryParamInteger, getQueryParamNumber } from "./query-value";
import { createQueryKey, deleteSearchParams, filterSearchParams, getSearchParamFirstValue, hasAnySearchParam, hasEverySearchParam, removeEmptySearchParams, searchParamsToArrayRecord, searchParamsToRecord, setSearchParam, setSearchParamIfPresent, setSearchParamsFromRecord, stringifySearchParams, normalizeSearchParams } from "./search-params";
import { diffSearchParams, formatUrlQuerySummary, summarizeSearchParams } from "./query-summary";
import { tryCreateUrl } from "./core";
import type { BuildUrlOptions, FilterUrlQueryParamsOptions, FormatUrlQuerySummaryOptions, MergeQueryParamsOptions, NormalizeUrlQueryOptions, QueryParamArrayOptions, QueryParamValueOptions, QueryRecordOptions, QueryValue, UrlParseOptions, UrlQueryDiffSummary, UrlQueryMutationPreview, UrlQuerySummary } from "./types";

/** 内部核心工具方法。 */
export function appendQuery(url: string, params: Record<string, QueryValue>): string {
  const nextUrl = createUrl(url);
  setSearchParamsFromRecord(nextUrl.searchParams, params);
  return formatUrlForInput(nextUrl, url);
}

export function mergeQueryParams(
  url: string,
  params: Record<string, QueryValue>,
  options: MergeQueryParamsOptions = {}
): string {
  const nextUrl = createUrl(url, { baseUrl: options.baseUrl });

  for (const [key, value] of objectEntries(params)) {
    setSearchParam(nextUrl.searchParams, key, value);
  }

  if (options.removeEmpty) {
    removeEmptySearchParams(nextUrl.searchParams);
  }

  return formatUrlForInput(nextUrl, url);
}

export function setQueryParams(url: string, params: Record<string, QueryValue>): string {
  const nextUrl = createUrl(url);

  for (const [key, value] of objectEntries(params)) {
    setSearchParam(nextUrl.searchParams, key, value);
  }

  return formatUrlForInput(nextUrl, url);
}

export function buildUrlWithQuery(input: string, options: BuildUrlOptions = {}): string {
  const nextUrl = createUrl(input, { baseUrl: options.baseUrl });

  if (options.params) {
    setSearchParamsFromRecord(nextUrl.searchParams, options.params);
  }

  return nextUrl.toString();
}

export function parseQuery(query: string): Record<string, string> {
  const normalizedQuery = query.startsWith("?") ? query.slice(1) : query;
  return searchParamsToRecord(new URLSearchParams(normalizedQuery));
}

export function parseQueryArrays(query: string): Record<string, string[]> {
  const normalizedQuery = query.startsWith("?") ? query.slice(1) : query;
  return searchParamsToArrayRecord(new URLSearchParams(normalizedQuery));
}

export function getQueryParam(url: string, key: string, fallback = ""): string {
  return tryCreateUrl(url)?.searchParams.get(key) ?? fallback;
}

export function getFirstQueryParam(url: string, keys: readonly string[], fallback = ""): string {
  return getSearchParamFirstValue(getUrlSearchParams(url), keys, fallback);
}

export function getUrlQueryRecord(url: string, options: QueryRecordOptions & UrlParseOptions = {}): Record<string, string> {
  const nextUrl = tryCreateUrl(url, { baseUrl: options.baseUrl });
  return nextUrl ? searchParamsToRecord(nextUrl.searchParams, options) : {};
}

export function getUrlQueryArrayRecord(url: string, options: UrlParseOptions = {}): Record<string, string[]> {
  const nextUrl = tryCreateUrl(url, options);
  return nextUrl ? searchParamsToArrayRecord(nextUrl.searchParams) : {};
}

export function summarizeUrlQuery(url: string, options: UrlParseOptions = {}): UrlQuerySummary {
  return summarizeSearchParams(tryCreateUrl(url, options)?.searchParams ?? new URLSearchParams());
}

export function diffUrlQuery(beforeUrl: string, afterUrl: string, options: UrlParseOptions = {}): UrlQueryDiffSummary {
  return diffSearchParams(
    tryCreateUrl(beforeUrl, options)?.searchParams ?? new URLSearchParams(),
    tryCreateUrl(afterUrl, options)?.searchParams ?? new URLSearchParams()
  );
}

export function previewUrlQueryMutation(
  url: string,
  mutate: (searchParams: URLSearchParams) => void,
  options: UrlParseOptions = {}
): UrlQueryMutationPreview {
  const nextUrl = createUrl(url, options);
  const beforeUrl = formatUrlForInput(nextUrl, url);
  const beforeSearchParams = new URLSearchParams(nextUrl.searchParams);
  mutate(nextUrl.searchParams);
  const afterUrl = formatUrlForInput(nextUrl, url);

  return {
    beforeUrl,
    afterUrl,
    beforeQuery: summarizeSearchParams(beforeSearchParams),
    afterQuery: summarizeSearchParams(nextUrl.searchParams),
    diff: diffSearchParams(beforeSearchParams, nextUrl.searchParams),
  };
}

export function previewSetUrlQueryParams(
  url: string,
  params: Record<string, QueryValue>,
  options: MergeQueryParamsOptions = {}
): UrlQueryMutationPreview {
  return previewUrlQueryMutation(url, (searchParams) => {
    for (const [key, value] of objectEntries(params)) {
      setSearchParam(searchParams, key, value);
    }

    if (options.removeEmpty) {
      removeEmptySearchParams(searchParams);
    }
  }, options);
}

export function previewRemoveUrlQueryParams(
  url: string,
  keys: readonly string[],
  options: UrlParseOptions = {}
): UrlQueryMutationPreview {
  return previewUrlQueryMutation(url, (searchParams) => {
    deleteSearchParams(searchParams, keys);
  }, options);
}

export function formatUrlQuery(
  url: string,
  options: FormatUrlQuerySummaryOptions = {},
  parseOptions: UrlParseOptions = {}
): string {
  return formatUrlQuerySummary(summarizeUrlQuery(url, parseOptions), options);
}

export function hasQueryParam(url: string, key: string): boolean {
  return tryCreateUrl(url)?.searchParams.has(key) ?? false;
}

export function hasAnyQueryParam(url: string, keys: readonly string[]): boolean {
  return hasAnySearchParam(getUrlSearchParams(url), keys);
}

export function hasEveryQueryParam(url: string, keys: readonly string[]): boolean {
  return hasEverySearchParam(getUrlSearchParams(url), keys);
}

export function getQueryParamValues(url: string, key: string): string[] {
  return tryCreateUrl(url)?.searchParams.getAll(key) ?? [];
}

export function getUrlQueryParamArray(url: string, key: string, options: QueryParamArrayOptions & UrlParseOptions = {}): string[] {
  const nextUrl = tryCreateUrl(url, { baseUrl: options.baseUrl });
  return nextUrl ? getQueryParamArray(nextUrl.searchParams.getAll(key), options) : [...(options.fallback ?? [])];
}

export function getUrlQueryParamEnum<T extends string>(
  url: string,
  key: string,
  values: readonly T[],
  fallback: T,
  options: QueryParamValueOptions & UrlParseOptions = {}
): T {
  return getQueryParamEnum(getQueryParam(url, key, ""), values, fallback, options);
}

export function getUrlQueryParamEnumArray<T extends string>(
  url: string,
  key: string,
  values: readonly T[],
  options: QueryParamArrayOptions & UrlParseOptions = {}
): T[] {
  return getQueryParamEnumArray(getUrlQueryParamArray(url, key, options), values, options);
}

export function getUrlQueryParamBoolean(url: string, key: string, fallback = false): boolean {
  return getQueryParamBoolean(getQueryParam(url, key, ""), fallback);
}

export function getUrlQueryParamNumber(url: string, key: string, fallback = 0): number {
  return getQueryParamNumber(getQueryParam(url, key, ""), fallback);
}

export function getUrlQueryParamInteger(url: string, key: string, fallback = 0): number {
  return getQueryParamInteger(getQueryParam(url, key, ""), fallback);
}

export function removeQueryParams(url: string, keys: readonly string[]): string {
  const nextUrl = createUrl(url);
  deleteSearchParams(nextUrl.searchParams, keys);
  return formatUrlForInput(nextUrl, url);
}

export function removeQueryParam(url: string, key: string): string {
  return removeQueryParams(url, [key]);
}

export function setQueryParam(url: string, key: string, value: QueryValue): string {
  return setQueryParams(url, { [key]: value });
}

export function setQueryParamsIfPresent(url: string, params: Record<string, QueryValue>): string {
  const nextUrl = createUrl(url);

  for (const [key, value] of objectEntries(params)) {
    setSearchParamIfPresent(nextUrl.searchParams, key, value);
  }

  return formatUrlForInput(nextUrl, url);
}

export function setQueryParamIfPresent(url: string, key: string, value: QueryValue): string {
  return setQueryParamsIfPresent(url, { [key]: value });
}

export function toggleQueryParam(url: string, key: string, value: QueryValue = "1", enabled?: boolean): string {
  const shouldSet = enabled ?? !hasQueryParam(url, key);
  return shouldSet ? setQueryParam(url, key, value) : removeQueryParam(url, key);
}

export function clearQuery(url: string): string {
  const nextUrl = createUrl(url);
  nextUrl.search = "";
  return formatUrlForInput(nextUrl, url);
}

export function cleanQuery(url: string): string {
  const nextUrl = createUrl(url);
  removeEmptySearchParams(nextUrl.searchParams);
  return formatUrlForInput(nextUrl, url);
}

/** 内部核心工具方法。 */
export function normalizeUrlQuery(url: string, options: NormalizeUrlQueryOptions = {}): string {
  const nextUrl = createUrl(url, { baseUrl: options.baseUrl });
  nextUrl.search = stringifySearchParams(normalizeSearchParams(nextUrl.searchParams, options), false);
  return formatUrlForInput(nextUrl, url);
}

export function createUrlQueryKey(url: string, options: NormalizeUrlQueryOptions = {}): string {
  return createQueryKey(tryCreateUrl(url, { baseUrl: options.baseUrl })?.searchParams ?? new URLSearchParams(), options);
}

/** 内部核心工具方法。 */
export function filterUrlQueryParams(url: string, options: FilterUrlQueryParamsOptions = {}): string {
  const nextUrl = createUrl(url, { baseUrl: options.baseUrl });
  nextUrl.search = stringifySearchParams(filterSearchParams(nextUrl.searchParams, options), false);
  return formatUrlForInput(nextUrl, url);
}
