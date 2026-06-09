import { createUrl, formatUrlForInput } from "./core";

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
