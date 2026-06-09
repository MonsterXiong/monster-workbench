import { toIntegerAtLeast } from "../number";
import { isDateValuePresent } from "./core";
import { formatDate, formatDateOnly } from "./format";
import { normalizeDateValue, parseDateValue } from "./date-only";
import { compareDates, diffDays, isSameDay, isSameMonth, isSameYear } from "./compare";
import { addDays, startOfDay } from "./boundary";
import type { DateRangeBoundaryDates, DateRangeDurationOptions, DateRangeLike, DateRangeSummary, EnumerateDateRangeOptions, FormatCompactDateRangeOptions, FormatDateRangeSummaryOptions, NormalizedDateRange } from "./types";

export function isDateRangeComplete(range: DateRangeLike): boolean {
  return isDateValuePresent(range.start) && isDateValuePresent(range.end);
}

export function isDateRangeEmpty(range: DateRangeLike): boolean {
  return !isDateValuePresent(range.start) && !isDateValuePresent(range.end);
}

export function isDateRangePartiallyFilled(range: DateRangeLike): boolean {
  return !isDateRangeEmpty(range) && !isDateRangeComplete(range);
}

export function normalizeDateRange(range: DateRangeLike, fallback = ""): NormalizedDateRange {
  return {
    start: normalizeDateValue(range.start ?? null, fallback),
    end: normalizeDateValue(range.end ?? null, fallback),
  };
}

export function formatDateRange(range: DateRangeLike, separator = " - ", fallback = ""): string {
  const normalizedRange = normalizeDateRange(range, "");

  if (!normalizedRange.start && !normalizedRange.end) {
    return fallback;
  }

  if (!normalizedRange.start || !normalizedRange.end) {
    return normalizedRange.start || normalizedRange.end;
  }

  return `${normalizedRange.start}${separator}${normalizedRange.end}`;
}

export function formatCompactDateRange(
  range: DateRangeLike,
  options: FormatCompactDateRangeOptions = {}
): string {
  const separator = options.separator ?? " - ";
  const fallback = options.fallback ?? "";
  const { start, end } = getDateRangeBoundaryDates(range);

  if (!start && !end) {
    return fallback;
  }

  if (!start || !end) {
    if (start) {
      return formatDateOnly(start, fallback);
    }

    return end ? formatDateOnly(end, fallback) : fallback;
  }

  if (isSameDay(start, end)) {
    return formatDate(start, options.sameDayPattern ?? options.fullPattern ?? "YYYY-MM-DD", fallback);
  }

  const fullPattern = options.fullPattern ?? "YYYY-MM-DD";
  const endPattern = options.endPattern ?? "MM-DD";
  const startPattern = isSameMonth(start, end)
    ? options.sameMonthStartPattern ?? "YYYY-MM-DD"
    : isSameYear(start, end)
      ? options.sameYearStartPattern ?? "YYYY-MM-DD"
      : fullPattern;
  const finalEndPattern = isSameYear(start, end) ? endPattern : fullPattern;

  return [
    formatDate(start, startPattern, fallback),
    formatDate(end, finalEndPattern, fallback),
  ].filter(Boolean).join(separator);
}

export function getDateRangeBoundaryDates(range: DateRangeLike): DateRangeBoundaryDates {
  return {
    start: parseDateValue(range.start ?? null),
    end: parseDateValue(range.end ?? null),
  };
}

export function hasDateRangeBoundaryDates(range: DateRangeLike): boolean {
  const { start, end } = getDateRangeBoundaryDates(range);
  return Boolean(start && end);
}

export function hasDateRangeStart(range: DateRangeLike): boolean {
  return Boolean(getDateRangeBoundaryDates(range).start);
}

export function hasDateRangeEnd(range: DateRangeLike): boolean {
  return Boolean(getDateRangeBoundaryDates(range).end);
}

export function getDateRangeStartTimestamp(range: DateRangeLike, fallback: number | null = null): number | null {
  return getDateRangeBoundaryDates(range).start?.getTime() ?? fallback;
}

export function getDateRangeEndTimestamp(range: DateRangeLike, fallback: number | null = null): number | null {
  return getDateRangeBoundaryDates(range).end?.getTime() ?? fallback;
}

export function isDateRangeOrdered(range: DateRangeLike, inclusive = true): boolean {
  if (!isDateRangeComplete(range)) {
    return true;
  }

  const { start, end } = getDateRangeBoundaryDates(range);

  if (!start || !end) {
    return false;
  }

  return inclusive ? start.getTime() <= end.getTime() : start.getTime() < end.getTime();
}

export function isSameDateRange<T extends DateRangeLike>(left: T, right: T): boolean {
  return left.start === right.start && left.end === right.end;
}

export function getDateRangeDurationDays(range: DateRangeLike, options: DateRangeDurationOptions = {}): number | null {
  if (!isDateRangeComplete(range)) {
    return null;
  }

  const { start, end } = getDateRangeBoundaryDates(range);

  if (!start || !end) {
    return null;
  }

  const diff = diffDays(end, start);
  if (diff === null) {
    return null;
  }

  const value = (options.absolute ?? true) ? Math.abs(diff) : diff;
  return value + (options.inclusive ? 1 : 0);
}

export function summarizeDateRange(
  range: DateRangeLike,
  separator = " - ",
  fallback = "",
  durationOptions: DateRangeDurationOptions = {}
): DateRangeSummary {
  return {
    range: normalizeDateRange(range, fallback),
    boundaryDates: getDateRangeBoundaryDates(range),
    formatted: formatDateRange(range, separator, fallback),
    durationDays: getDateRangeDurationDays(range, durationOptions),
    complete: isDateRangeComplete(range),
    empty: isDateRangeEmpty(range),
    partial: isDateRangePartiallyFilled(range),
    ordered: isDateRangeOrdered(range),
  };
}

export function formatDateRangeSummary(summary: DateRangeSummary, options: FormatDateRangeSummaryOptions = {}): string {
  if (summary.empty) {
    return options.emptyText ?? "";
  }

  const separator = options.separator ?? " · ";
  const parts = [summary.partial ? `${options.partialPrefix ?? "partial"} ${summary.formatted}` : summary.formatted];

  if (options.includeDuration && summary.durationDays !== null) {
    parts.push(`${summary.durationDays}${options.durationUnit ?? "d"}`);
  }

  if (!summary.ordered) {
    parts.push(options.unorderedSuffix ?? "unordered");
  }

  return parts.filter(Boolean).join(separator);
}

export function formatDateRangeWithSummary(
  range: DateRangeLike,
  options: FormatDateRangeSummaryOptions = {},
  separator = " - ",
  fallback = ""
): string {
  return formatDateRangeSummary(summarizeDateRange(range, separator, fallback), options);
}

export function enumerateDateRange(range: DateRangeLike, options: EnumerateDateRangeOptions = {}): Date[] {
  const { start, end } = getDateRangeBoundaryDates(range);

  if (!start || !end) {
    return [];
  }

  const ascending = start.getTime() <= end.getTime();
  const step = ascending ? 1 : -1;
  const maxDays = toIntegerAtLeast(options.maxDays ?? 366, 1);
  const inclusive = options.inclusive ?? true;
  const result: Date[] = [];
  let cursor = startOfDay(start);

  while (cursor && result.length < maxDays) {
    const comparison = compareDates(cursor, end);
    const inRange = inclusive
      ? ascending ? comparison <= 0 : comparison >= 0
      : ascending ? comparison < 0 : comparison > 0;

    if (!inRange) {
      break;
    }

    result.push(new Date(cursor.getTime()));
    cursor = addDays(cursor, step);
  }

  return result;
}

export function enumerateDateRangeValues(range: DateRangeLike, options: EnumerateDateRangeOptions = {}): string[] {
  return enumerateDateRange(range, options).map((date) => formatDateOnly(date, ""));
}
