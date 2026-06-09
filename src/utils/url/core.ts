import type { UrlParseOptions } from "./types";

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

export function joinUrl(...parts: string[]): string {
  const normalizedParts = parts
    .filter((part) => part.trim().length > 0)
    .map((part, index) => (index === 0 ? part.replace(/\/+$/g, "") : part.replace(/^\/+|\/+$/g, "")));

  return normalizedParts.join("/");
}
