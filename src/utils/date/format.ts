import { getCurrentDate, toDate } from "./core";
import type { DateInput } from "./types";

const DATE_TOKEN_REGEXP = /YYYY|MM|DD|HH|mm|ss|SSS/g;

export function padNumber(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

export function formatDate(value: DateInput, pattern = "YYYY-MM-DD HH:mm:ss", fallback = "--"): string {
  const date = toDate(value);

  if (!date) {
    return fallback;
  }

  const tokenMap: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    MM: padNumber(date.getMonth() + 1),
    DD: padNumber(date.getDate()),
    HH: padNumber(date.getHours()),
    mm: padNumber(date.getMinutes()),
    ss: padNumber(date.getSeconds()),
    SSS: padNumber(date.getMilliseconds(), 3),
  };

  return pattern.replace(DATE_TOKEN_REGEXP, (token) => tokenMap[token] ?? token);
}

export function formatDateOnly(value: DateInput, fallback = "--"): string {
  return formatDate(value, "YYYY-MM-DD", fallback);
}

export function formatDateTime(value: DateInput, fallback = "--"): string {
  return formatDate(value, "YYYY-MM-DD HH:mm:ss", fallback);
}

export function formatCurrentDate(pattern = "YYYY-MM-DD HH:mm:ss", fallback = "--"): string {
  return formatDate(getCurrentDate(), pattern, fallback);
}

export function formatCurrentDateTime(fallback = "--"): string {
  return formatCurrentDate("YYYY-MM-DD HH:mm:ss", fallback);
}

export function formatLocaleDateTime(
  value: DateInput = getCurrentDate(),
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
  fallback = "--"
): string {
  const date = toDate(value);
  return date ? date.toLocaleString(locales, options) : fallback;
}

export function formatCurrentLocaleDateTime(
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
  fallback = "--"
): string {
  return formatLocaleDateTime(getCurrentDate(), locales, options, fallback);
}

export function formatMonthYear(
  value: DateInput = getCurrentDate(),
  locale = "zh-CN",
  options: Intl.DateTimeFormatOptions = {},
  fallback = "--"
): string {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", ...options }).format(date) : fallback;
}

export function formatTimeOnly(value: DateInput, fallback = "--"): string {
  return formatDate(value, "HH:mm:ss", fallback);
}

export function formatIsoString(value: DateInput = new Date(), fallback = ""): string {
  const date = toDate(value);
  return date ? date.toISOString() : fallback;
}

export function getCurrentIsoString(): string {
  return formatIsoString(new Date());
}

export function formatIsoDateTime(value: DateInput = new Date(), separator: "T" | " " = "T", fallback = ""): string {
  const isoText = formatIsoString(value, fallback);
  return isoText ? isoText.replace("T", separator).slice(0, 19) : fallback;
}

export function formatCurrentIsoDateTime(separator: "T" | " " = "T", fallback = ""): string {
  return formatIsoDateTime(getCurrentDate(), separator, fallback);
}

export function getTodayString(): string {
  return formatDateOnly(new Date());
}

export function getYearMonthPath(value: DateInput = new Date(), fallback = ""): string {
  return formatDate(value, "YYYY/MM", fallback);
}

export function buildDatedFileName(prefix: string, extension: string, value: DateInput = new Date(), pattern = "YYYY-MM-DD"): string {
  const normalizedPrefix = prefix.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
  const normalizedExtension = extension.trim().replace(/^\.+/, "");
  const dateText = formatDate(value, pattern, "");
  const suffix = normalizedExtension ? `.${normalizedExtension}` : "";
  return [normalizedPrefix, dateText].filter(Boolean).join("_") + suffix;
}
