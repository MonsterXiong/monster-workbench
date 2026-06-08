import { isBetween, toFiniteNumber } from "./number";
import { getPathSegments, normalizeSlashes } from "./path";
import { isHttpUrl } from "./url";

const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IPV4_REGEXP = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

export function isEmail(value: string): boolean {
  return EMAIL_REGEXP.test(value.trim());
}

export function isPort(value: unknown): boolean {
  const port = typeof value === "number" ? value : Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

export function isIpv4(value: string): boolean {
  return IPV4_REGEXP.test(value.trim());
}

export function isLocalhost(value: string): boolean {
  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue === "localhost" || normalizedValue === "127.0.0.1" || normalizedValue === "::1";
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidHttpUrl(value: string): boolean {
  return isHttpUrl(value.trim());
}

export function isValidFileName(value: string): boolean {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 && !/[<>:"/\\|?*\u0000-\u001F]/.test(trimmedValue);
}

export function isLengthBetween(value: string | readonly unknown[], min: number, max: number, inclusive = true): boolean {
  return isBetween(value.length, min, max, inclusive);
}

export function isNumberInRange(value: unknown, min: number, max: number, inclusive = true): boolean {
  const numericValue = toFiniteNumber(value, Number.NaN);
  return Number.isFinite(numericValue) && isBetween(numericValue, min, max, inclusive);
}

export function isSafeRelativePath(value: string): boolean {
  const normalizedPath = normalizeSlashes(value.trim());

  if (!normalizedPath || normalizedPath.startsWith("/") || /^[a-zA-Z]:\//.test(normalizedPath)) {
    return false;
  }

  if (/[\u0000-\u001F]/.test(normalizedPath)) {
    return false;
  }

  return getPathSegments(normalizedPath).every((segment) => segment !== "." && segment !== "..");
}
