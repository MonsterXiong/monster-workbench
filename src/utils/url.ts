export type QueryValue = string | number | boolean | null | undefined;

export interface BuildUrlOptions {
  baseUrl?: string;
  params?: Record<string, QueryValue>;
}

export function stringifyQuery(params: Record<string, QueryValue>, prefix = true): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();

  if (!query) {
    return "";
  }

  return prefix ? `?${query}` : query;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
  const nextUrl = new URL(url, window.location.origin);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      nextUrl.searchParams.set(key, String(value));
    }
  }

  if (/^https?:\/\//.test(url)) {
    return nextUrl.toString();
  }

  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
}

export function buildUrlWithQuery(input: string, options: BuildUrlOptions = {}): string {
  const baseUrl = options.baseUrl || window.location.origin;
  const nextUrl = input.startsWith("http") ? new URL(input) : new URL(input, baseUrl);

  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null && value !== "") {
        nextUrl.searchParams.set(key, String(value));
      }
    }
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

export function getQueryParam(url: string, key: string, fallback = ""): string {
  try {
    return new URL(url, window.location.origin).searchParams.get(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function removeQueryParams(url: string, keys: readonly string[]): string {
  const nextUrl = new URL(url, window.location.origin);

  for (const key of keys) {
    nextUrl.searchParams.delete(key);
  }

  if (/^https?:\/\//.test(url)) {
    return nextUrl.toString();
  }

  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
}

export function cleanQuery(url: string): string {
  const nextUrl = new URL(url, window.location.origin);

  Array.from(nextUrl.searchParams.entries()).forEach(([key, value]) => {
    if (value === "") {
      nextUrl.searchParams.delete(key);
    }
  });

  if (/^https?:\/\//.test(url)) {
    return nextUrl.toString();
  }

  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
}

export function joinUrl(...parts: string[]): string {
  const normalizedParts = parts
    .filter((part) => part.trim().length > 0)
    .map((part, index) => (index === 0 ? part.replace(/\/+$/g, "") : part.replace(/^\/+|\/+$/g, "")));

  return normalizedParts.join("/");
}
