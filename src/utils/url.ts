import { objectEntries } from "./object";
import { isNonEmptyValue, parseEnum } from "./value";

export type QueryPrimitiveValue = string | number | boolean | null | undefined;
export type QueryValue = QueryPrimitiveValue | readonly QueryPrimitiveValue[];
export type QueryParamValue = string | readonly string[] | null | undefined;
export type QueryParamArrayMode = "first" | "last" | "join" | "fallback";

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

export function getQueryParamEnum<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T,
  options: QueryParamValueOptions = {}
): T {
  return parseEnum(getQueryParamValue(value, options), values, fallback);
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

export function removeEmptySearchParams(searchParams: URLSearchParams): URLSearchParams {
  Array.from(searchParams.entries()).forEach(([key, value]) => {
    if (value === "") {
      searchParams.delete(key);
    }
  });

  return searchParams;
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

export function isSameOriginUrl(input: string, baseUrl?: string): boolean {
  const targetUrl = tryCreateUrl(input, { baseUrl });
  const base = createUrl(getDefaultBaseUrl(baseUrl));
  return Boolean(targetUrl && targetUrl.origin === base.origin);
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

export function buildUrlWithQuery(input: string, options: BuildUrlOptions = {}): string {
  const nextUrl = createUrl(input, { baseUrl: options.baseUrl });

  if (options.params) {
    setSearchParamsFromRecord(nextUrl.searchParams, options.params);
  }

  return nextUrl.toString();
}

export function parseQuery(query: string): Record<string, string> {
  const normalizedQuery = query.startsWith("?") ? query.slice(1) : query;
  const params = new URLSearchParams(normalizedQuery);
  const result: Record<string, string> = {};

  params.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

export function parseQueryArrays(query: string): Record<string, string[]> {
  const normalizedQuery = query.startsWith("?") ? query.slice(1) : query;
  const params = new URLSearchParams(normalizedQuery);
  const result: Record<string, string[]> = {};

  params.forEach((value, key) => {
    result[key] = [...(result[key] ?? []), value];
  });

  return result;
}

export function getQueryParam(url: string, key: string, fallback = ""): string {
  return tryCreateUrl(url)?.searchParams.get(key) ?? fallback;
}

export function getQueryParamValues(url: string, key: string): string[] {
  return tryCreateUrl(url)?.searchParams.getAll(key) ?? [];
}

export function removeQueryParams(url: string, keys: readonly string[]): string {
  const nextUrl = createUrl(url);
  deleteSearchParams(nextUrl.searchParams, keys);
  return formatUrlForInput(nextUrl, url);
}

export function cleanQuery(url: string): string {
  const nextUrl = createUrl(url);
  removeEmptySearchParams(nextUrl.searchParams);
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

export function joinUrl(...parts: string[]): string {
  const normalizedParts = parts
    .filter((part) => part.trim().length > 0)
    .map((part, index) => (index === 0 ? part.replace(/\/+$/g, "") : part.replace(/^\/+|\/+$/g, "")));

  return normalizedParts.join("/");
}
