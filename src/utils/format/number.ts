import {
  isFiniteNumber,
  isNaNNumber,
  isPositiveFiniteNumber,
  summarizeNumberDelta,
  toFiniteNumber,
} from "../number";
import type {
  FormatBooleanOptions,
  FormatCountProgressOptions,
  FormatNumberDeltaOptions,
  FormatNumberRangeOptions,
  FormatOptionalNumberOptions,
  FormatPercentDeltaOptions,
  FormatPercentOptions,
  FormatRatioPercentOptions,
} from "./types";

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

export function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  const safeCount = toFiniteNumber(count);
  return `${formatNumber(safeCount)} ${safeCount === 1 ? singular : plural}`;
}
