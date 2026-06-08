import { toFiniteNumber } from "./number";
import { joinNonEmptyStrings } from "./string";

export interface FormatBytesOptions {
  base?: 1000 | 1024;
  decimals?: number;
  units?: readonly string[];
}

export interface FormatPercentOptions {
  decimals?: number;
  fallback?: string;
}

export interface FormatDurationOptions {
  maxUnits?: number;
  fallback?: string;
}

export interface FormatRelativeTimeOptions {
  now?: number | Date;
  fallback?: string;
}

const DEFAULT_BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;
const DURATION_UNITS = [
  { label: "d", value: 86_400_000 },
  { label: "h", value: 3_600_000 },
  { label: "m", value: 60_000 },
  { label: "s", value: 1_000 },
] as const;

const RELATIVE_TIME_UNITS = [
  { unit: "day", value: 86_400_000 },
  { unit: "hour", value: 3_600_000 },
  { unit: "minute", value: 60_000 },
  { unit: "second", value: 1_000 },
] as const;

export function formatBytes(bytes: number, options: FormatBytesOptions = {}): string {
  const base = options.base ?? 1024;
  const decimals = options.decimals ?? 2;
  const units = options.units ?? DEFAULT_BYTE_UNITS;
  const safeBytes = Math.max(0, toFiniteNumber(bytes));

  if (safeBytes === 0) {
    return `0 ${units[0]}`;
  }

  const unitIndex = Math.min(Math.floor(Math.log(safeBytes) / Math.log(base)), units.length - 1);
  const value = safeBytes / base ** unitIndex;
  const formattedValue = Number(value.toFixed(decimals)).toString();
  return `${formattedValue} ${units[unitIndex]}`;
}

export function formatNumber(value: number, locale = "zh-CN", options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(locale, options).format(toFiniteNumber(value));
}

export function formatCurrency(value: number, currency = "CNY", locale = "zh-CN", options: Intl.NumberFormatOptions = {}): string {
  return formatNumber(value, locale, {
    style: "currency",
    currency,
    ...options,
  });
}

export function formatPercent(value: number, options: FormatPercentOptions = {}): string {
  const safeValue = toFiniteNumber(value, Number.NaN);

  if (Number.isNaN(safeValue)) {
    return options.fallback ?? "--";
  }

  return `${safeValue.toFixed(options.decimals ?? 0)}%`;
}

export function formatFileCount(count: number, unit = "items"): string {
  return `${formatNumber(count)} ${unit}`;
}

export function formatDuration(ms: number, options: FormatDurationOptions = {}): string {
  const safeMs = Math.max(0, toFiniteNumber(ms, Number.NaN));

  if (Number.isNaN(safeMs)) {
    return options.fallback ?? "--";
  }

  if (safeMs < 1000) {
    return `${Math.round(safeMs)}ms`;
  }

  const maxUnits = Math.max(1, Math.floor(options.maxUnits ?? 2));
  let remaining = safeMs;
  const parts: string[] = [];

  for (const unit of DURATION_UNITS) {
    const value = Math.floor(remaining / unit.value);

    if (value > 0) {
      parts.push(`${value}${unit.label}`);
      remaining -= value * unit.value;
    }

    if (parts.length >= maxUnits) {
      break;
    }
  }

  return parts.join(" ") || "0ms";
}

export function formatRelativeTime(value: number | Date, options: FormatRelativeTimeOptions = {}): string {
  const timestamp = value instanceof Date ? value.getTime() : value;
  const now = options.now instanceof Date ? options.now.getTime() : options.now ?? Date.now();

  if (!Number.isFinite(timestamp) || !Number.isFinite(now)) {
    return options.fallback ?? "--";
  }

  const diff = timestamp - now;
  const absDiff = Math.abs(diff);

  for (const item of RELATIVE_TIME_UNITS) {
    if (absDiff >= item.value) {
      return new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" }).format(
        Math.round(diff / item.value),
        item.unit as Intl.RelativeTimeFormatUnit
      );
    }
  }

  return new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" }).format(0, "second");
}

export function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  const safeCount = toFiniteNumber(count);
  return `${formatNumber(safeCount)} ${safeCount === 1 ? singular : plural}`;
}

export function formatNullable(value: unknown, fallback = "--"): string {
  if (value === undefined || value === null) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

export function formatList(values: readonly unknown[], separator = "\u3001", fallback = "--"): string {
  const text = joinNonEmptyStrings(values, separator);
  return text || fallback;
}

export function formatRange(start: unknown, end: unknown, separator = " - ", fallback = "--"): string {
  const startText = formatNullable(start, "");
  const endText = formatNullable(end, "");

  if (!startText && !endText) {
    return fallback;
  }

  if (!startText || !endText) {
    return startText || endText;
  }

  return `${startText}${separator}${endText}`;
}

export function formatTemplate(template: string, params: Record<string, string | number | boolean | null | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined || value === null ? match : String(value);
  });
}
