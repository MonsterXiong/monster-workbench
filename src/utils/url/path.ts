import { getFileExtension, getFileName } from "../path";
import { tryCreateUrl } from "./core";
import { normalizeHash } from "./hash";
import type { UrlParseOptions, UrlPathSegmentOptions } from "./types";

export function decodeUrlPathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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
