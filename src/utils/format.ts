import { uniqueArray } from "./array";
import {
  getGreatestCommonDivisor,
  isFiniteNumber,
  isNaNNumber,
  isPositiveFiniteNumber,
  maxNumber,
  minNumber,
  summarizeNumberDelta,
  toFiniteNumber,
  toIntegerAtLeast,
  toNonNegativeInteger,
} from "./number";
import { joinMappedNonEmptyStrings, joinNonEmptyStrings, normalizeStringList, normalizeWhitespace, truncateText } from "./string";
import { getCurrentTimestampMs } from "./date";

export interface FormatBytesOptions {
  base?: 1000 | 1024;
  decimals?: number;
  units?: readonly string[];
}

export interface FormatOptionalBytesOptions extends FormatBytesOptions {
  fallback?: string;
}

export interface FormatBytesProgressOptions extends FormatBytesOptions {
  separator?: string;
}

export interface FormatFileTypeSizeOptions extends FormatBytesOptions {
  separator?: string;
  fallback?: string;
}

export interface FormatPercentOptions {
  decimals?: number;
  fallback?: string;
}

export interface FormatRatioPercentOptions extends FormatPercentOptions {
  emptyTotalFallback?: string;
}

export interface FormatCountProgressOptions {
  unit?: string;
  separator?: string;
  showPercent?: boolean;
  percentDecimals?: number;
  fallback?: string;
}

export interface FormatDurationOptions {
  maxUnits?: number;
  fallback?: string;
}

export interface FormatRelativeTimeOptions {
  now?: number | Date;
  locale?: string;
  numeric?: Intl.RelativeTimeFormatNumeric;
  fallback?: string;
}

export interface FormatBooleanOptions {
  trueText?: string;
  falseText?: string;
  fallback?: string;
}

export interface FormatNumberRangeOptions extends Intl.NumberFormatOptions {
  locale?: string;
  separator?: string;
  fallback?: string;
}

export interface FormatNumberDeltaOptions extends Intl.NumberFormatOptions {
  locale?: string;
  fallback?: string;
  showPlusSign?: boolean;
  precision?: number;
}

export interface FormatPercentDeltaOptions extends FormatPercentOptions {
  fallback?: string;
  showPlusSign?: boolean;
}

export interface FormatOptionalNumberOptions extends Intl.NumberFormatOptions {
  locale?: string;
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

export interface FormatMappedListOptions {
  separator?: string;
  fallback?: string;
}

export interface FormatKeyValueListOptions {
  separator?: string;
  pairSeparator?: string;
  fallback?: string;
  skipEmpty?: boolean;
}

export interface FormatListCountOptions {
  unit?: string;
  locale?: string;
  fallback?: string;
}

export interface FormatIdentifierOptions {
  maxLength?: number;
  fallback?: string;
  suffix?: string;
  normalizeWhitespace?: boolean;
}

export type TemplateParamValue = string | number | boolean | null | undefined;

export interface FormatTemplateOptions {
  keepMissing?: boolean;
  missingValue?: TemplateParamValue | ((key: string) => TemplateParamValue);
}

export interface TemplateSummary {
  template: string;
  keys: string[];
  keyCount: number;
  hasPlaceholders: boolean;
  duplicateKeys: string[];
}

export interface TemplateFormatReport {
  template: string;
  output: string;
  keys: string[];
  missingKeys: string[];
  hasMissingKeys: boolean;
  changed: boolean;
}

export interface SummaryItem<TMeta = unknown> {
  key: string;
  label: string;
  value: string;
  meta?: TMeta;
}

export interface SummaryItemInput<TMeta = unknown> {
  key: string;
  label: unknown;
  value: unknown;
  meta?: TMeta;
  visible?: boolean;
}

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface StatusSummaryItem<TMeta = unknown> extends SummaryItem<TMeta> {
  tone: StatusTone;
  active: boolean;
}

export interface StatusSummaryItemInput<TMeta = unknown> extends SummaryItemInput<TMeta> {
  tone?: StatusTone;
  active?: boolean;
}

export interface CreateSummaryItemsOptions {
  skipEmpty?: boolean;
  fallback?: string;
}

export interface FormatSummaryItemsOptions<TMeta = unknown> extends FormatKeyValueListOptions {
  labelFormatter?: (item: SummaryItem<TMeta>, index: number) => unknown;
  valueFormatter?: (item: SummaryItem<TMeta>, index: number) => unknown;
}

export interface CreateSummaryItemsReportOptions<TMeta = unknown> extends CreateSummaryItemsOptions {
  format?: FormatSummaryItemsOptions<TMeta>;
}

export interface SummaryItemsSummary {
  sourceCount: number;
  itemCount: number;
  skippedCount: number;
  keys: string[];
  duplicateKeys: string[];
  hasDuplicateKeys: boolean;
  empty: boolean;
}

export interface SummaryItemsReport<TMeta = unknown> {
  items: Array<SummaryItem<TMeta>>;
  itemMap: Map<string, SummaryItem<TMeta>>;
  itemRecord: Record<string, string>;
  formattedText: string;
  summary: SummaryItemsSummary;
}

export interface StatusSummaryItemsSummary extends SummaryItemsSummary {
  activeCount: number;
  inactiveCount: number;
  toneCounts: Record<StatusTone, number>;
  activeToneCounts: Record<StatusTone, number>;
  hasActive: boolean;
  hasInactive: boolean;
}

export interface StatusSummaryItemsReport<TMeta = unknown> {
  items: Array<StatusSummaryItem<TMeta>>;
  activeItems: Array<StatusSummaryItem<TMeta>>;
  inactiveItems: Array<StatusSummaryItem<TMeta>>;
  itemsByTone: Record<StatusTone, Array<StatusSummaryItem<TMeta>>>;
  itemMap: Map<string, StatusSummaryItem<TMeta>>;
  itemRecord: Record<string, string>;
  formattedText: string;
  summary: StatusSummaryItemsSummary;
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
const STATUS_TONES: readonly StatusTone[] = ["neutral", "success", "warning", "danger", "info"];

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

export function formatOptionalBytes(value: unknown, options: FormatOptionalBytesOptions = {}): string {
  const { fallback = "--", ...bytesOptions } = options;
  const safeValue = toFiniteNumber(value, Number.NaN);
  return isFiniteNumber(safeValue) ? formatBytes(safeValue, bytesOptions) : fallback;
}

export function formatBytesProgress(currentBytes: number, totalBytes: number, options: FormatBytesProgressOptions = {}): string {
  const { separator = " / ", ...bytesOptions } = options;
  return `${formatBytes(currentBytes, bytesOptions)}${separator}${formatBytes(totalBytes, bytesOptions)}`;
}

export function formatBytesRate(bytesPerSecond: number, options: FormatBytesOptions = {}): string {
  return `${formatBytes(bytesPerSecond, options)}/s`;
}

export function formatFileTypeSize(
  type: unknown,
  sizeBytes: unknown,
  options: FormatFileTypeSizeOptions = {}
): string {
  const { separator = " · ", fallback = "", ...bytesOptions } = options;
  const typeText = String(type ?? "").trim();
  const safeSizeBytes = toFiniteNumber(sizeBytes, Number.NaN);
  const sizeText = isFiniteNumber(safeSizeBytes) ? formatBytes(safeSizeBytes, bytesOptions) : "";

  return joinNonEmptyStrings([typeText, sizeText], separator) || fallback;
}

export function formatNumber(value: number, locale = "zh-CN", options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(locale, options).format(toFiniteNumber(value));
}

export function formatOptionalNumber(value: unknown, options: FormatOptionalNumberOptions = {}): string {
  const { locale = "zh-CN", fallback = "--", ...numberOptions } = options;
  const safeValue = toFiniteNumber(value, Number.NaN);
  return isFiniteNumber(safeValue) ? formatNumber(safeValue, locale, numberOptions) : fallback;
}

export function formatCurrency(value: number, currency = "CNY", locale = "zh-CN", options: Intl.NumberFormatOptions = {}): string {
  return formatNumber(value, locale, {
    style: "currency",
    currency,
    ...options,
  });
}

export function formatCompactNumber(value: number, locale = "zh-CN", options: Intl.NumberFormatOptions = {}): string {
  return formatNumber(value, locale, {
    notation: "compact",
    maximumFractionDigits: 1,
    ...options,
  });
}

export function formatSignedNumber(value: number, locale = "zh-CN", options: Intl.NumberFormatOptions = {}): string {
  const safeValue = toFiniteNumber(value);
  const sign = safeValue > 0 ? "+" : "";
  return `${sign}${formatNumber(safeValue, locale, options)}`;
}

export function formatNumberDelta(value: unknown, options: FormatNumberDeltaOptions = {}): string {
  const { locale = "zh-CN", fallback = "--", showPlusSign = true, precision: _precision, ...numberOptions } = options;
  const safeValue = toFiniteNumber(value, Number.NaN);

  if (!isFiniteNumber(safeValue)) {
    return fallback;
  }

  const sign = showPlusSign && safeValue > 0 ? "+" : "";
  return `${sign}${formatNumber(safeValue, locale, numberOptions)}`;
}

export function formatNumberDeltaBetween(before: unknown, after: unknown, options: FormatNumberDeltaOptions = {}): string {
  const precision = options.precision ?? options.maximumFractionDigits ?? 2;
  return formatNumberDelta(summarizeNumberDelta(before, after, precision).delta, options);
}

export function formatPercent(value: number, options: FormatPercentOptions = {}): string {
  const safeValue = toFiniteNumber(value, Number.NaN);

  if (isNaNNumber(safeValue)) {
    return options.fallback ?? "--";
  }

  return `${safeValue.toFixed(options.decimals ?? 0)}%`;
}

export function formatOptionalPercent(value: unknown, options: FormatPercentOptions = {}): string {
  const safeValue = toFiniteNumber(value, Number.NaN);
  return isFiniteNumber(safeValue) ? formatPercent(safeValue, options) : options.fallback ?? "--";
}

export function formatPercentDelta(value: unknown, options: FormatPercentDeltaOptions = {}): string {
  const { showPlusSign = true, ...percentOptions } = options;
  const safeValue = toFiniteNumber(value, Number.NaN);

  if (!isFiniteNumber(safeValue)) {
    return percentOptions.fallback ?? "--";
  }

  const sign = showPlusSign && safeValue > 0 ? "+" : "";
  return `${sign}${formatPercent(safeValue, percentOptions)}`;
}

export function formatPercentDeltaBetween(before: unknown, after: unknown, options: FormatPercentDeltaOptions = {}): string {
  const percentChange = summarizeNumberDelta(before, after, options.decimals ?? 2).percentChange;
  return percentChange === null ? options.fallback ?? "--" : formatPercentDelta(percentChange, options);
}

export function formatBoolean(value: unknown, options: FormatBooleanOptions = {}): string {
  if (typeof value !== "boolean") {
    return options.fallback ?? "--";
  }

  return value ? options.trueText ?? "Yes" : options.falseText ?? "No";
}

export function formatNumberRange(start: unknown, end: unknown, options: FormatNumberRangeOptions = {}): string {
  const { locale = "zh-CN", separator = " - ", fallback = "--", ...numberOptions } = options;
  const startValue = toFiniteNumber(start, Number.NaN);
  const endValue = toFiniteNumber(end, Number.NaN);
  const hasStart = isFiniteNumber(startValue);
  const hasEnd = isFiniteNumber(endValue);

  if (!hasStart && !hasEnd) {
    return fallback;
  }

  if (!hasStart || !hasEnd) {
    return formatNumber(hasStart ? startValue : endValue, locale, numberOptions);
  }

  return `${formatNumber(startValue, locale, numberOptions)}${separator}${formatNumber(endValue, locale, numberOptions)}`;
}

export function formatRatioPercent(current: number, total: number, options: FormatRatioPercentOptions = {}): string {
  const safeTotal = toFiniteNumber(total, Number.NaN);

  if (!isPositiveFiniteNumber(safeTotal)) {
    return options.emptyTotalFallback ?? options.fallback ?? "--";
  }

  return formatPercent((toFiniteNumber(current) / safeTotal) * 100, options);
}

export function formatCountProgress(current: number, total: number, options: FormatCountProgressOptions = {}): string {
  const safeCurrent = Math.max(0, toFiniteNumber(current, Number.NaN));
  const safeTotal = Math.max(0, toFiniteNumber(total, Number.NaN));

  if (!isFiniteNumber(safeCurrent) || !isFiniteNumber(safeTotal)) {
    return options.fallback ?? "--";
  }

  const unitText = options.unit ? ` ${options.unit}` : "";
  const countText = `${formatNumber(safeCurrent)}${options.separator ?? " / "}${formatNumber(safeTotal)}${unitText}`;

  if (!options.showPercent) {
    return countText;
  }

  return `${countText} (${formatRatioPercent(safeCurrent, safeTotal, {
    decimals: options.percentDecimals ?? 0,
  })})`;
}

export function formatSelectedCount(selectedCount: number, totalCount: number, unit = "items"): string {
  return formatCountProgress(selectedCount, totalCount, { unit, showPercent: true });
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

export function formatPositiveDuration(value: unknown, options: FormatDurationOptions = {}): string {
  const safeMs = toFiniteNumber(value, Number.NaN);

  if (!isPositiveFiniteNumber(safeMs)) {
    return options.fallback ?? "";
  }

  return formatDuration(safeMs, options);
}

export function formatDurationClock(ms: number, includeHours = true, fallback = "00:00"): string {
  const safeMs = Math.max(0, toFiniteNumber(ms, Number.NaN));

  if (isNaNNumber(safeMs)) {
    return fallback;
  }

  const totalSeconds = Math.floor(safeMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const parts = includeHours || hours > 0
    ? [hours, minutes, seconds]
    : [minutes, seconds];

  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatRelativeTime(value: number | Date, options: FormatRelativeTimeOptions = {}): string {
  const timestamp = value instanceof Date ? value.getTime() : value;
  const now = options.now instanceof Date ? options.now.getTime() : options.now ?? getCurrentTimestampMs();

  if (!isFiniteNumber(timestamp) || !isFiniteNumber(now)) {
    return options.fallback ?? "--";
  }

  const diff = timestamp - now;
  const absDiff = Math.abs(diff);
  const formatter = new Intl.RelativeTimeFormat(options.locale ?? "zh-CN", { numeric: options.numeric ?? "auto" });

  for (const item of RELATIVE_TIME_UNITS) {
    if (absDiff >= item.value) {
      return formatter.format(Math.round(diff / item.value), item.unit as Intl.RelativeTimeFormatUnit);
    }
  }

  return formatter.format(0, "second");
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

export function formatIdentifier(value: unknown, options: FormatIdentifierOptions = {}): string {
  const fallback = options.fallback ?? "";
  const rawText = String(value ?? "").trim();
  const text = options.normalizeWhitespace ?? true ? normalizeWhitespace(rawText) : rawText;

  if (!text) {
    return fallback;
  }

  const maxLength = options.maxLength === undefined ? text.length : toNonNegativeInteger(options.maxLength);
  return truncateText(text, maxLength, options.suffix ?? "...");
}

export function formatShortIdentifier(value: unknown, maxLength = 18, fallback = ""): string {
  return formatIdentifier(value, { maxLength, fallback });
}

export function formatCodeLikeValue(value: unknown, fallback = "-"): string {
  return formatIdentifier(value, { fallback, normalizeWhitespace: false });
}

export function formatList(values: readonly unknown[], separator = "\u3001", fallback = "--"): string {
  const text = joinNonEmptyStrings(values, separator);
  return text || fallback;
}

export function formatOptionalList(
  values: readonly unknown[] | null | undefined,
  separator = "\u3001",
  fallback = "--"
): string {
  return values ? formatList(values, separator, fallback) : fallback;
}

export function formatMappedList<T>(
  values: readonly T[],
  mapper: (value: T, index: number) => unknown,
  options: FormatMappedListOptions = {}
): string {
  const text = joinMappedNonEmptyStrings(values, mapper, options.separator ?? "\u3001");
  return text || (options.fallback ?? "--");
}

export function formatKeyValueList(
  entries: readonly (readonly [unknown, unknown])[],
  options: FormatKeyValueListOptions = {}
): string {
  const pairSeparator = options.pairSeparator ?? ": ";
  const parts = entries.flatMap(([key, value]) => {
    const keyText = formatNullable(key, "");
    const valueText = formatNullable(value, "");

    if ((options.skipEmpty ?? true) && (!keyText || !valueText)) {
      return [];
    }

    return [`${keyText}${pairSeparator}${valueText}`];
  });

  return formatList(parts, options.separator ?? "\u3001", options.fallback ?? "--");
}

export function formatRecordList(
  record: Record<string, unknown>,
  options: FormatKeyValueListOptions = {}
): string {
  return formatKeyValueList(Object.entries(record), options);
}

export function createSummaryItem<TMeta = unknown>(
  input: SummaryItemInput<TMeta>,
  options: CreateSummaryItemsOptions = {}
): SummaryItem<TMeta> | null {
  if (input.visible === false) {
    return null;
  }

  const label = formatNullable(input.label, "");
  const fallback = options.fallback ?? "";
  const value = formatNullable(input.value, fallback);

  if ((options.skipEmpty ?? true) && (!label || !value)) {
    return null;
  }

  return {
    key: input.key,
    label,
    value,
    ...(input.meta === undefined ? {} : { meta: input.meta }),
  };
}

export function createSummaryItems<TMeta = unknown>(
  items: readonly SummaryItemInput<TMeta>[],
  options: CreateSummaryItemsOptions = {}
): Array<SummaryItem<TMeta>> {
  return items.flatMap((item) => {
    const summaryItem = createSummaryItem(item, options);
    return summaryItem ? [summaryItem] : [];
  });
}

export function createStatusSummaryItem<TMeta = unknown>(
  input: StatusSummaryItemInput<TMeta>,
  options: CreateSummaryItemsOptions = {}
): StatusSummaryItem<TMeta> | null {
  const item = createSummaryItem(input, options);

  if (!item) {
    return null;
  }

  return {
    ...item,
    tone: input.tone ?? "neutral",
    active: input.active ?? true,
  };
}

export function createStatusSummaryItems<TMeta = unknown>(
  items: readonly StatusSummaryItemInput<TMeta>[],
  options: CreateSummaryItemsOptions = {}
): Array<StatusSummaryItem<TMeta>> {
  return items.flatMap((item) => {
    const summaryItem = createStatusSummaryItem(item, options);
    return summaryItem ? [summaryItem] : [];
  });
}

export function getSummaryItemKeys<TItem extends SummaryItem<unknown>>(items: readonly TItem[]): string[] {
  return items.map((item) => item.key);
}

export function getDuplicateSummaryItemKeys<TItem extends SummaryItem<unknown>>(items: readonly TItem[]): string[] {
  const duplicateKeys: string[] = [];
  const seenKeys = new Set<string>();

  for (const key of getSummaryItemKeys(items)) {
    if (seenKeys.has(key)) {
      if (!duplicateKeys.includes(key)) {
        duplicateKeys.push(key);
      }
      continue;
    }

    seenKeys.add(key);
  }

  return duplicateKeys;
}

export function hasDuplicateSummaryItemKeys<TItem extends SummaryItem<unknown>>(items: readonly TItem[]): boolean {
  return getDuplicateSummaryItemKeys(items).length > 0;
}

export function createSummaryItemMap<TItem extends SummaryItem<unknown>>(items: readonly TItem[]): Map<string, TItem> {
  return new Map(items.map((item) => [item.key, item]));
}

export function createSummaryItemRecord<TItem extends SummaryItem<unknown>>(items: readonly TItem[]): Record<string, string> {
  return items.reduce<Record<string, string>>((record, item) => {
    record[item.key] = item.value;
    return record;
  }, {});
}

export function summarizeSummaryItems<TItem extends SummaryItem<unknown>>(
  items: readonly TItem[],
  sourceCount = items.length
): SummaryItemsSummary {
  const duplicateKeys = getDuplicateSummaryItemKeys(items);

  return {
    sourceCount,
    itemCount: items.length,
    skippedCount: Math.max(0, sourceCount - items.length),
    keys: getSummaryItemKeys(items),
    duplicateKeys,
    hasDuplicateKeys: duplicateKeys.length > 0,
    empty: items.length === 0,
  };
}

export function formatSummaryItems<TMeta = unknown>(
  items: readonly SummaryItem<TMeta>[],
  options: FormatSummaryItemsOptions<TMeta> = {}
): string {
  const entries = items.map((item, index) => [
    options.labelFormatter?.(item, index) ?? item.label,
    options.valueFormatter?.(item, index) ?? item.value,
  ] as const);

  return formatKeyValueList(entries, options);
}

export function createSummaryItemsReport<TMeta = unknown>(
  inputs: readonly SummaryItemInput<TMeta>[],
  options: CreateSummaryItemsReportOptions<TMeta> = {}
): SummaryItemsReport<TMeta> {
  const items = createSummaryItems(inputs, options);

  return {
    items,
    itemMap: createSummaryItemMap(items),
    itemRecord: createSummaryItemRecord(items),
    formattedText: formatSummaryItems(items, options.format),
    summary: summarizeSummaryItems(items, inputs.length),
  };
}

function createEmptyStatusToneCounts(): Record<StatusTone, number> {
  return STATUS_TONES.reduce<Record<StatusTone, number>>((counts, tone) => {
    counts[tone] = 0;
    return counts;
  }, {
    neutral: 0,
    success: 0,
    warning: 0,
    danger: 0,
    info: 0,
  });
}

export function getActiveStatusSummaryItems<TMeta = unknown>(
  items: readonly StatusSummaryItem<TMeta>[]
): Array<StatusSummaryItem<TMeta>> {
  return items.filter((item) => item.active);
}

export function getInactiveStatusSummaryItems<TMeta = unknown>(
  items: readonly StatusSummaryItem<TMeta>[]
): Array<StatusSummaryItem<TMeta>> {
  return items.filter((item) => !item.active);
}

export function groupStatusSummaryItemsByTone<TMeta = unknown>(
  items: readonly StatusSummaryItem<TMeta>[]
): Record<StatusTone, Array<StatusSummaryItem<TMeta>>> {
  return STATUS_TONES.reduce<Record<StatusTone, Array<StatusSummaryItem<TMeta>>>>((groups, tone) => {
    groups[tone] = items.filter((item) => item.tone === tone);
    return groups;
  }, {
    neutral: [],
    success: [],
    warning: [],
    danger: [],
    info: [],
  });
}

export function summarizeStatusSummaryItems<TMeta = unknown>(
  items: readonly StatusSummaryItem<TMeta>[],
  sourceCount = items.length
): StatusSummaryItemsSummary {
  const baseSummary = summarizeSummaryItems(items, sourceCount);
  const activeItems = getActiveStatusSummaryItems(items);
  const toneCounts = createEmptyStatusToneCounts();
  const activeToneCounts = createEmptyStatusToneCounts();

  for (const item of items) {
    toneCounts[item.tone] += 1;

    if (item.active) {
      activeToneCounts[item.tone] += 1;
    }
  }

  return {
    ...baseSummary,
    activeCount: activeItems.length,
    inactiveCount: items.length - activeItems.length,
    toneCounts,
    activeToneCounts,
    hasActive: activeItems.length > 0,
    hasInactive: activeItems.length < items.length,
  };
}

export function createStatusSummaryItemsReport<TMeta = unknown>(
  inputs: readonly StatusSummaryItemInput<TMeta>[],
  options: CreateSummaryItemsReportOptions<TMeta> = {}
): StatusSummaryItemsReport<TMeta> {
  const items = createStatusSummaryItems(inputs, options);

  return {
    items,
    activeItems: getActiveStatusSummaryItems(items),
    inactiveItems: getInactiveStatusSummaryItems(items),
    itemsByTone: groupStatusSummaryItemsByTone(items),
    itemMap: createSummaryItemMap(items),
    itemRecord: createSummaryItemRecord(items),
    formattedText: formatSummaryItems(items, options.format),
    summary: summarizeStatusSummaryItems(items, inputs.length),
  };
}

export function formatListCount(values: readonly unknown[] | null | undefined, options: FormatListCountOptions = {}): string {
  if (!values) {
    return options.fallback ?? "--";
  }

  const unitText = options.unit ? ` ${options.unit}` : "";
  return `${formatNumber(values.length, options.locale ?? "zh-CN")}${unitText}`;
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

export function isValidDimensions(value: Dimensions | null | undefined): value is Dimensions {
  return Boolean(value && isPositiveFiniteNumber(value.width) && isPositiveFiniteNumber(value.height));
}

export function getDimensionsMaxSide(value: Dimensions | null | undefined, fallback = 0): number {
  return isValidDimensions(value) ? maxNumber([value.width, value.height], fallback) : fallback;
}

export function getDimensionsMinSide(value: Dimensions | null | undefined, fallback = 0): number {
  return isValidDimensions(value) ? minNumber([value.width, value.height], fallback) : fallback;
}

export function getDimensionsArea(value: Dimensions | null | undefined, fallback = 0): number {
  return isValidDimensions(value) ? value.width * value.height : fallback;
}

export function getDimensionsRatio(value: Dimensions | null | undefined, fallback = 1): number {
  return isValidDimensions(value) ? value.width / value.height : fallback;
}

export function reduceDimensions(value: Dimensions | null | undefined): Dimensions | null {
  if (!isValidDimensions(value)) {
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

export function summarizeTemplate(template: string): TemplateSummary {
  const allKeys = Array.from(template.matchAll(TEMPLATE_TOKEN_REGEXP), (match) => match[1]);
  const keys = uniqueArray(allKeys);
  const duplicateKeys = keys.filter((key) => allKeys.filter((item) => item === key).length > 1);

  return {
    template,
    keys,
    keyCount: keys.length,
    hasPlaceholders: keys.length > 0,
    duplicateKeys,
  };
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

export function formatTemplateWithReport(
  template: string,
  params: Record<string, TemplateParamValue>,
  options: FormatTemplateOptions = {}
): TemplateFormatReport {
  const output = formatTemplate(template, params, options);
  const keys = getTemplateKeys(template);
  const missingKeys = getMissingTemplateKeys(template, params);

  return {
    template,
    output,
    keys,
    missingKeys,
    hasMissingKeys: missingKeys.length > 0,
    changed: output !== template,
  };
}

export function createTemplateFormatter(
  template: string,
  options: FormatTemplateOptions = {}
): (params: Record<string, TemplateParamValue>) => string {
  return (params) => formatTemplate(template, params, options);
}
