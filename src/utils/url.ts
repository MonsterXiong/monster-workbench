import { objectEntries } from "./object";
import { toFiniteNumber, toInteger } from "./number";
import { getFileExtension, getFileName } from "./path";
import { isNonEmptyValue, parseBoolean, parseEnum, parseOptionalEnum } from "./value";

export type QueryPrimitiveValue = string | number | boolean | null | undefined;
export type QueryValue = QueryPrimitiveValue | readonly QueryPrimitiveValue[];
export type QueryParamValue = string | readonly string[] | null | undefined;
export type QueryParamArrayMode = "first" | "last" | "join" | "fallback";
export type SearchParamsInput = string | URLSearchParams | Record<string, QueryValue> | null | undefined;

export interface BuildUrlOptions {
  baseUrl?: string;
  params?: Record<string, QueryValue>;
}

export interface UrlParseOptions {
  baseUrl?: string;
}

export interface QueryParamValueOptions {
  fallback?: string;
  arrayMode?: QueryParamArrayMode;
  separator?: string;
}

export interface QueryRecordOptions extends QueryParamValueOptions {
  arrayMode?: QueryParamArrayMode;
}

export interface QueryParamArrayOptions {
  fallback?: string[];
  separator?: string | RegExp;
  trim?: boolean;
}

export interface NormalizeSearchParamsOptions {
  removeEmpty?: boolean;
  dedupeValues?: boolean;
  sortKeys?: boolean;
  sortValues?: boolean;
  trimKeys?: boolean;
  trimValues?: boolean;
}

export interface StringifyNormalizedQueryOptions extends NormalizeSearchParamsOptions {
  prefix?: boolean;
}

export type SearchParamPredicate = (key: string, value: string, index: number, values: readonly string[]) => boolean;

export interface FilterSearchParamsOptions {
  includeKeys?: readonly string[];
  excludeKeys?: readonly string[];
  predicate?: SearchParamPredicate;
}

export interface MergeQueryParamsOptions extends UrlParseOptions {
  removeEmpty?: boolean;
}

export interface NormalizeUrlQueryOptions extends UrlParseOptions, NormalizeSearchParamsOptions {}

export interface FilterUrlQueryParamsOptions extends UrlParseOptions, FilterSearchParamsOptions {}

export interface UrlPathSegmentOptions extends UrlParseOptions {
  decode?: boolean;
}

export interface UrlSummaryOptions extends UrlParseOptions, UrlPathSegmentOptions, QueryRecordOptions {
  includeQueryArrayRecord?: boolean;
}

export interface UrlSummary {
  valid: boolean;
  input: string;
  href: string;
  origin: string;
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  hashValue: string;
  pathSegments: string[];
  pathDepth: number;
  lastPathSegment: string;
  fileName: string;
  extension: string;
  queryRecord: Record<string, string>;
  queryArrayRecord: Record<string, string[]>;
  queryCount: number;
  hasQuery: boolean;
  hasHash: boolean;
  isHttp: boolean;
  isHttps: boolean;
}

export interface UrlQuerySummary {
  keys: string[];
  keyCount: number;
  valueCount: number;
  emptyValueCount: number;
  duplicatedKeys: string[];
  hasQuery: boolean;
  hasDuplicateKeys: boolean;
}

export interface UrlQueryDiffSummary {
  addedKeys: string[];
  removedKeys: string[];
  changedKeys: string[];
  unchangedKeys: string[];
  addedCount: number;
  removedCount: number;
  changedCount: number;
  unchangedCount: number;
  hasChanges: boolean;
}

export interface UrlQueryMutationPreview {
  beforeUrl: string;
  afterUrl: string;
  beforeQuery: UrlQuerySummary;
  afterQuery: UrlQuerySummary;
  diff: UrlQueryDiffSummary;
}

export interface UrlListSummary {
  totalCount: number;
  validCount: number;
  invalidCount: number;
  httpCount: number;
  httpsCount: number;
  queryCount: number;
  hashCount: number;
  hostnames: string[];
  hostnameCounts: Record<string, number>;
  protocols: string[];
  protocolCounts: Record<string, number>;
  extensions: string[];
  extensionCounts: Record<string, number>;
}

export interface FormatUrlQuerySummaryOptions {
  emptyText?: string;
  keyUnit?: string;
  valueUnit?: string;
  duplicateLabel?: string;
  separator?: string;
  includeValues?: boolean;
  includeDuplicates?: boolean;
}

export function getDefaultBaseUrl(baseUrl?: string): string {
  if (baseUrl) {
    return baseUrl;
  }

  return typeof window !== "undefined" ? window.location.origin : "http://localhost";
}

export function createUrl(input: string, options: UrlParseOptions = {}): URL {
  return new URL(input, getDefaultBaseUrl(options.baseUrl));
}

export function tryCreateUrl(input: string, options: UrlParseOptions = {}): URL | null {
  try {
    return createUrl(input, options);
  } catch {
    return null;
  }
}

export function tryCreateAbsoluteUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function decodeUrlPathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function formatUrlForInput(url: URL, input: string): string {
  if (isAbsoluteHttpUrl(input)) {
    return url.toString();
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

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
  Array.from(searchParams.entries()).forEach(([key, value]) => {
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

export function summarizeSearchParams(searchParams: URLSearchParams): UrlQuerySummary {
  const arrayRecord = searchParamsToArrayRecord(searchParams);
  const keys = Object.keys(arrayRecord);
  const duplicatedKeys = keys.filter((key) => arrayRecord[key].length > 1);
  const values = Object.values(arrayRecord).flat();

  return {
    keys,
    keyCount: keys.length,
    valueCount: values.length,
    emptyValueCount: values.filter((value) => value === "").length,
    duplicatedKeys,
    hasQuery: keys.length > 0,
    hasDuplicateKeys: duplicatedKeys.length > 0,
  };
}

function areQueryParamValuesEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function diffSearchParams(before: URLSearchParams, after: URLSearchParams): UrlQueryDiffSummary {
  const beforeRecord = searchParamsToArrayRecord(before);
  const afterRecord = searchParamsToArrayRecord(after);
  const keys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]);
  const addedKeys: string[] = [];
  const removedKeys: string[] = [];
  const changedKeys: string[] = [];
  const unchangedKeys: string[] = [];

  for (const key of keys) {
    const beforeValues = beforeRecord[key];
    const afterValues = afterRecord[key];

    if (!beforeValues) {
      addedKeys.push(key);
    } else if (!afterValues) {
      removedKeys.push(key);
    } else if (areQueryParamValuesEqual(beforeValues, afterValues)) {
      unchangedKeys.push(key);
    } else {
      changedKeys.push(key);
    }
  }

  return {
    addedKeys,
    removedKeys,
    changedKeys,
    unchangedKeys,
    addedCount: addedKeys.length,
    removedCount: removedKeys.length,
    changedCount: changedKeys.length,
    unchangedCount: unchangedKeys.length,
    hasChanges: addedKeys.length > 0 || removedKeys.length > 0 || changedKeys.length > 0,
  };
}

export function formatUrlQuerySummary(summary: UrlQuerySummary, options: FormatUrlQuerySummaryOptions = {}): string {
  if (!summary.hasQuery) {
    return options.emptyText ?? "0 query";
  }

  const separator = options.separator ?? " · ";
  const parts = [`${summary.keyCount} ${options.keyUnit ?? "keys"}`];

  if (options.includeValues ?? true) {
    parts.push(`${summary.valueCount} ${options.valueUnit ?? "values"}`);
  }

  if ((options.includeDuplicates ?? true) && summary.hasDuplicateKeys) {
    parts.push(`${options.duplicateLabel ?? "duplicates"}: ${summary.duplicatedKeys.join(", ")}`);
  }

  return parts.join(separator);
}

export function stringifyQuery(params: Record<string, QueryValue>, prefix = true): string {
  const searchParams = setSearchParamsFromRecord(new URLSearchParams(), params);

  const query = searchParams.toString();

  if (!query) {
    return "";
  }

  return prefix ? `?${query}` : query;
}

export function isHttpUrl(value: string): boolean {
  const url = tryCreateAbsoluteUrl(value);
  return url !== null && (url.protocol === "http:" || url.protocol === "https:");
}

export function isHttpsUrl(value: string): boolean {
  return tryCreateAbsoluteUrl(value)?.protocol === "https:";
}

export function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim()) && isHttpUrl(value);
}

export function getUrlOrigin(input: string, options: UrlParseOptions = {}): string {
  return tryCreateUrl(input, options)?.origin ?? "";
}

export function getUrlProtocol(input: string, options: UrlParseOptions = {}): string {
  return tryCreateUrl(input, options)?.protocol ?? "";
}

export function getUrlHostname(input: string, options: UrlParseOptions = {}): string {
  return tryCreateUrl(input, options)?.hostname ?? "";
}

export function getUrlPathname(input: string, options: UrlParseOptions = {}): string {
  return tryCreateUrl(input, options)?.pathname ?? "";
}

export function getUrlSearch(input: string, options: UrlParseOptions = {}): string {
  return tryCreateUrl(input, options)?.search ?? "";
}

export function getUrlSearchParams(input: string, options: UrlParseOptions = {}): URLSearchParams {
  return new URLSearchParams(getUrlSearch(input, options));
}

export function getUrlPathSegments(input: string, options: UrlPathSegmentOptions = {}): string[] {
  return getUrlPathname(input, options)
    .split("/")
    .map((segment) => segment.trim())
    .map((segment) => (options.decode ? decodeUrlPathSegment(segment) : segment))
    .filter(Boolean);
}

export function getUrlPathDepth(input: string, options: UrlPathSegmentOptions = {}): number {
  return getUrlPathSegments(input, options).length;
}

export function getUrlLastPathSegment(input: string, options: UrlPathSegmentOptions = {}): string {
  const segments = getUrlPathSegments(input, options);
  return segments[segments.length - 1] ?? "";
}

export function getUrlFileName(input: string, options: UrlParseOptions = {}): string {
  return getFileName(getUrlPathname(input, options));
}

export function getUrlFileExtension(input: string, options: UrlParseOptions = {}): string {
  return getFileExtension(getUrlFileName(input, options));
}

export function getUrlHash(input: string, options: UrlParseOptions = {}): string {
  return tryCreateUrl(input, options)?.hash ?? "";
}

export function getUrlHashValue(input: string, options: UrlParseOptions = {}): string {
  return normalizeHash(getUrlHash(input, options), false);
}

export function hasUrlHash(input: string, options: UrlParseOptions = {}): boolean {
  return getUrlHashValue(input, options).length > 0;
}

export function isSameOriginUrl(input: string, baseUrl?: string): boolean {
  const targetUrl = tryCreateUrl(input, { baseUrl });
  const base = tryCreateUrl(getDefaultBaseUrl(baseUrl));
  return Boolean(targetUrl && base && targetUrl.origin === base.origin);
}

export function isExternalHttpUrl(input: string, baseUrl?: string): boolean {
  return isHttpUrl(input) && !isSameOriginUrl(input, baseUrl);
}

export function openExternalUrl(url: string, target = "_blank"): Window | null {
  return window.open(url, target, "noopener,noreferrer");
}

export function ensureHttpProtocol(value: string, protocol: "http" | "https" = "https"): string {
  const trimmedValue = value.trim();

  if (!trimmedValue || /^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `${protocol}://${trimmedValue}`;
}

export function normalizeHttpUrlInput(value: string, protocol: "http" | "https" = "https"): string {
  return ensureHttpProtocol(value, protocol).replace(/\s+/g, "");
}

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

export function summarizeUrl(input: string, options: UrlSummaryOptions = {}): UrlSummary {
  const nextUrl = tryCreateUrl(input, { baseUrl: options.baseUrl });

  if (!nextUrl) {
    return {
      valid: false,
      input,
      href: "",
      origin: "",
      protocol: "",
      hostname: "",
      port: "",
      pathname: "",
      search: "",
      hash: "",
      hashValue: "",
      pathSegments: [],
      pathDepth: 0,
      lastPathSegment: "",
      fileName: "",
      extension: "",
      queryRecord: {},
      queryArrayRecord: {},
      queryCount: 0,
      hasQuery: false,
      hasHash: false,
      isHttp: false,
      isHttps: false,
    };
  }

  const pathSegments = nextUrl.pathname
    .split("/")
    .map((segment) => segment.trim())
    .map((segment) => (options.decode ? decodeUrlPathSegment(segment) : segment))
    .filter(Boolean);
  const fileName = getFileName(nextUrl.pathname);
  const queryArrayRecord = options.includeQueryArrayRecord === false ? {} : searchParamsToArrayRecord(nextUrl.searchParams);
  const queryRecord = searchParamsToRecord(nextUrl.searchParams, options);
  const queryCount = Array.from(nextUrl.searchParams.keys()).length;
  const hashValue = normalizeHash(nextUrl.hash, false);

  return {
    valid: true,
    input,
    href: nextUrl.href,
    origin: nextUrl.origin,
    protocol: nextUrl.protocol,
    hostname: nextUrl.hostname,
    port: nextUrl.port,
    pathname: nextUrl.pathname,
    search: nextUrl.search,
    hash: nextUrl.hash,
    hashValue,
    pathSegments,
    pathDepth: pathSegments.length,
    lastPathSegment: pathSegments[pathSegments.length - 1] ?? "",
    fileName,
    extension: getFileExtension(fileName),
    queryRecord,
    queryArrayRecord,
    queryCount,
    hasQuery: queryCount > 0,
    hasHash: hashValue.length > 0,
    isHttp: nextUrl.protocol === "http:" || nextUrl.protocol === "https:",
    isHttps: nextUrl.protocol === "https:",
  };
}

export function summarizeUrls(inputs: readonly string[], options: UrlSummaryOptions = {}): UrlListSummary {
  const summaries = inputs.map((input) => summarizeUrl(input, options));
  const validSummaries = summaries.filter((summary) => summary.valid);
  const hostnameCounts: Record<string, number> = {};
  const protocolCounts: Record<string, number> = {};
  const extensionCounts: Record<string, number> = {};

  validSummaries.forEach((summary) => {
    if (summary.hostname) {
      hostnameCounts[summary.hostname] = (hostnameCounts[summary.hostname] ?? 0) + 1;
    }

    if (summary.protocol) {
      protocolCounts[summary.protocol] = (protocolCounts[summary.protocol] ?? 0) + 1;
    }

    if (summary.extension) {
      extensionCounts[summary.extension] = (extensionCounts[summary.extension] ?? 0) + 1;
    }
  });

  return {
    totalCount: inputs.length,
    validCount: validSummaries.length,
    invalidCount: inputs.length - validSummaries.length,
    httpCount: validSummaries.filter((summary) => summary.isHttp).length,
    httpsCount: validSummaries.filter((summary) => summary.isHttps).length,
    queryCount: validSummaries.filter((summary) => summary.hasQuery).length,
    hashCount: validSummaries.filter((summary) => summary.hasHash).length,
    hostnames: Object.keys(hostnameCounts),
    hostnameCounts,
    protocols: Object.keys(protocolCounts),
    protocolCounts,
    extensions: Object.keys(extensionCounts),
    extensionCounts,
  };
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

export function normalizeUrlQuery(url: string, options: NormalizeUrlQueryOptions = {}): string {
  const nextUrl = createUrl(url, { baseUrl: options.baseUrl });
  nextUrl.search = stringifySearchParams(normalizeSearchParams(nextUrl.searchParams, options), false);
  return formatUrlForInput(nextUrl, url);
}

export function createUrlQueryKey(url: string, options: NormalizeUrlQueryOptions = {}): string {
  return createQueryKey(tryCreateUrl(url, { baseUrl: options.baseUrl })?.searchParams ?? new URLSearchParams(), options);
}

export function filterUrlQueryParams(url: string, options: FilterUrlQueryParamsOptions = {}): string {
  const nextUrl = createUrl(url, { baseUrl: options.baseUrl });
  nextUrl.search = stringifySearchParams(filterSearchParams(nextUrl.searchParams, options), false);
  return formatUrlForInput(nextUrl, url);
}

export function normalizeHash(value: string, prefix = true): string {
  const normalizedValue = value.trim().replace(/^#+/g, "");

  if (!normalizedValue) {
    return "";
  }

  return prefix ? `#${normalizedValue}` : normalizedValue;
}

export function setUrlHash(url: string, hash: string): string {
  const nextUrl = createUrl(url);
  nextUrl.hash = normalizeHash(hash, false);
  return formatUrlForInput(nextUrl, url);
}

export function clearUrlHash(url: string): string {
  const nextUrl = createUrl(url);
  nextUrl.hash = "";
  return formatUrlForInput(nextUrl, url);
}

export function removeUrlHash(url: string): string {
  return clearUrlHash(url);
}

export function joinUrl(...parts: string[]): string {
  const normalizedParts = parts
    .filter((part) => part.trim().length > 0)
    .map((part, index) => (index === 0 ? part.replace(/\/+$/g, "") : part.replace(/^\/+|\/+$/g, "")));

  return normalizedParts.join("/");
}
