import { isJsonArrayText, isJsonObjectText, isJsonText } from "../json";
import { isBetween, isFiniteNumber, toFiniteNumber } from "../number";
import { isSafeRelativePathText } from "../path";
import { isHttpUrl } from "../url";
import { isNonEmptyValue } from "../value";
import { EMAIL_REGEXP, IPV4_REGEXP, UUID_REGEXP } from "./constants";

export function isRequiredValue(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length > 0 : isNonEmptyValue(value);
}

export function isEmail(value: string): boolean {
  return EMAIL_REGEXP.test(value.trim());
}

export function isIntegerInRange(value: unknown, min: number, max: number, inclusive = true): boolean {
  const numericValue = toFiniteNumber(value, Number.NaN);
  return Number.isInteger(numericValue) && isBetween(numericValue, min, max, inclusive);
}

export function isPort(value: unknown): boolean {
  return isIntegerInRange(value, 1, 65535);
}

export function isIpv4(value: string): boolean {
  return IPV4_REGEXP.test(value.trim());
}

export function isUuid(value: string): boolean {
  return UUID_REGEXP.test(value.trim());
}

export function isLocalhost(value: string): boolean {
  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue === "localhost" || normalizedValue === "127.0.0.1" || normalizedValue === "::1";
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isBlankString(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
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

export function isMinLength(value: string | readonly unknown[], min: number, inclusive = true): boolean {
  return inclusive ? value.length >= min : value.length > min;
}

export function isMaxLength(value: string | readonly unknown[], max: number, inclusive = true): boolean {
  return inclusive ? value.length <= max : value.length < max;
}

export function isNumberInRange(value: unknown, min: number, max: number, inclusive = true): boolean {
  const numericValue = toFiniteNumber(value, Number.NaN);
  return isFiniteNumber(numericValue) && isBetween(numericValue, min, max, inclusive);
}

export function isSafeRelativePath(value: string): boolean {
  return isSafeRelativePathText(value);
}

export { isJsonArrayText, isJsonObjectText, isJsonText };
