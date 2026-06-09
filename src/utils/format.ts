import { uniqueArray } from "./array";
import {
  getGreatestCommonDivisor,
  isFiniteNumber,
  isNaNNumber,
  isPositiveFiniteNumber,
  toFiniteNumber,
  toIntegerAtLeast,
  toNonNegativeInteger,
} from "./number";
import { joinNonEmptyStrings, normalizeStringList } from "./string";
import { getCurrentTimestampMs } from "./date";

export interface FormatBytesOptions {
  base?: 1000 | 1024;
  decimals?: number;
  units?: readonly string[];
}

export interface FormatBytesProgressOptions extends FormatBytesOptions {
  separator?: string;
}

export interface FormatPercentOptions {
  decimals?: number;
  fallback?: string;
}

export interface FormatRatioPercentOptions extends FormatPercentOptions {
  emptyTotalFallback?: string;
}

export interface FormatDurationOptions {
  maxUnits?: number;
  fallback?: string;
}

export interface FormatRelativeTimeOptions {
  now?: number | Date;
  fallback?: string;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface FormatAspectRatioOptions {
  fallback?: string;
  reduced?: boolean;
  separator?: string;
}

export interface FormatListSummaryOptions {
  maxItems?: number;
  separator?: string;
  fallback?: string;
  overflowFormatter?: (hiddenCount: number) => string;
}

export type TemplateParamValue = string | number | boolean | null | undefined;

export interface FormatTemplateOptions {
  keepMissing?: boolean;
  missingValue?: TemplateParamValue | ((key: string) => TemplateParamValue);
}

const DEFAULT_BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;
const TEMPLATE_TOKEN_REGEXP = /\{(\w+)\}/g;
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

export function formatBytesProgress(currentBytes: number, totalBytes: number, options: FormatBytesProgressOptions = {}): string {
  const { separator = " / ", ...bytesOptions } = options;
  return `${formatBytes(currentBytes, bytesOptions)}${separator}${formatBytes(totalBytes, bytesOptions)}`;
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

  if (isNaNNumber(safeValue)) {
    return options.fallback ?? "--";
  }

  return `${safeValue.toFixed(options.decimals ?? 0)}%`;
}

export function formatRatioPercent(current: number, total: number, options: FormatRatioPercentOptions = {}): string {
  const safeTotal = toFiniteNumber(total, Number.NaN);

  if (!isPositiveFiniteNumber(safeTotal)) {
    return options.emptyTotalFallback ?? options.fallback ?? "--";
  }

  return formatPercent((toFiniteNumber(current) / safeTotal) * 100, options);
}

export function formatFileCount(count: number, unit = "items"): string {
  return `${formatNumber(count)} ${unit}`;
}

export function formatDuration(ms: number, options: FormatDurationOptions = {}): string {
  const safeMs = Math.max(0, toFiniteNumber(ms, Number.NaN));

  if (isNaNNumber(safeMs)) {
    return options.fallback ?? "--";
  }

  if (safeMs < 1000) {
    return `${Math.round(safeMs)}ms`;
  }

  const maxUnits = toIntegerAtLeast(options.maxUnits ?? 2, 1);
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
  const now = options.now instanceof Date ? options.now.getTime() : options.now ?? getCurrentTimestampMs();

  if (!isFiniteNumber(timestamp) || !isFiniteNumber(now)) {
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

export function formatListSummary(values: readonly unknown[], options: FormatListSummaryOptions = {}): string {
  const items = normalizeStringList(values);
  const fallback = options.fallback ?? "--";

  if (items.length === 0) {
    return fallback;
  }

  const maxItems = options.maxItems === undefined ? items.length : toNonNegativeInteger(options.maxItems);
  const visibleItems = maxItems === 0 ? [] : items.slice(0, maxItems);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);
  const overflowText = hiddenCount > 0
    ? options.overflowFormatter?.(hiddenCount) ?? `+${hiddenCount}`
    : "";
  const text = joinNonEmptyStrings([...visibleItems, overflowText], options.separator ?? "\u3001");

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

export function parseDimensionsText(value: unknown, fallback: Dimensions | null = null): Dimensions | null {
  const [rawWidth, rawHeight] = String(value ?? "").trim().split(/\s*[xX×]\s*/);
  const width = toFiniteNumber(rawWidth, Number.NaN);
  const height = toFiniteNumber(rawHeight, Number.NaN);

  if (!isPositiveFiniteNumber(width) || !isPositiveFiniteNumber(height)) {
    return fallback;
  }

  return { width, height };
}

export function formatDimensions(value: Dimensions | null | undefined, separator = "x", fallback = ""): string {
  return value ? `${value.width}${separator}${value.height}` : fallback;
}

export function reduceDimensions(value: Dimensions | null | undefined): Dimensions | null {
  if (!value || !isPositiveFiniteNumber(value.width) || !isPositiveFiniteNumber(value.height)) {
    return null;
  }

  const divisor = getGreatestCommonDivisor(value.width, value.height) || 1;
  return {
    width: value.width / divisor,
    height: value.height / divisor,
  };
}

export function formatAspectRatio(
  value: Dimensions | null | undefined,
  fallbackOrOptions: string | FormatAspectRatioOptions = "1 / 1"
): string {
  const options = typeof fallbackOrOptions === "string" ? { fallback: fallbackOrOptions } : fallbackOrOptions;
  const separator = options.separator ?? " / ";

  if (!value) {
    return options.fallback ?? "1 / 1";
  }

  const dimensions = options.reduced ? reduceDimensions(value) : value;
  return dimensions ? `${dimensions.width}${separator}${dimensions.height}` : options.fallback ?? "1 / 1";
}

export function formatReducedAspectRatio(
  value: Dimensions | null | undefined,
  separator = ":",
  fallback = "1:1"
): string {
  return formatAspectRatio(value, { reduced: true, separator, fallback });
}

export function formatDimensionsAspectRatio(
  value: unknown,
  options: FormatAspectRatioOptions = {}
): string {
  return formatAspectRatio(parseDimensionsText(value), {
    reduced: options.reduced ?? true,
    separator: options.separator ?? ":",
    fallback: options.fallback ?? "1:1",
  });
}

function getMissingTemplateValue(key: string, options: FormatTemplateOptions): TemplateParamValue {
  return typeof options.missingValue === "function" ? options.missingValue(key) : options.missingValue;
}

export function getTemplateKeys(template: string): string[] {
  return uniqueArray(Array.from(template.matchAll(TEMPLATE_TOKEN_REGEXP), (match) => match[1]));
}

export function hasTemplateKey(template: string, key: string): boolean {
  return getTemplateKeys(template).includes(key);
}

export function hasTemplatePlaceholders(template: string): boolean {
  return getTemplateKeys(template).length > 0;
}

export function getMissingTemplateKeys(template: string, params: Record<string, TemplateParamValue>): string[] {
  return getTemplateKeys(template).filter((key) => params[key] === undefined || params[key] === null);
}

export function hasMissingTemplateKeys(template: string, params: Record<string, TemplateParamValue>): boolean {
  return getMissingTemplateKeys(template, params).length > 0;
}

export function formatTemplate(
  template: string,
  params: Record<string, TemplateParamValue>,
  options: FormatTemplateOptions = {}
): string {
  const keepMissing = options.keepMissing ?? true;

  return template.replace(TEMPLATE_TOKEN_REGEXP, (match, key: string) => {
    const value = params[key];

    if (value !== undefined && value !== null) {
      return String(value);
    }

    const missingValue = getMissingTemplateValue(key, options);
    if (missingValue !== undefined && missingValue !== null) {
      return String(missingValue);
    }

    return keepMissing ? match : "";
  });
}

export function createTemplateFormatter(
  template: string,
  options: FormatTemplateOptions = {}
): (params: Record<string, TemplateParamValue>) => string {
  return (params) => formatTemplate(template, params, options);
}
