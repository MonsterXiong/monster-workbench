import { mapNonNullable } from "../array";
import { normalizeModuloIndex, toIntegerAtLeast } from "../number";
import { toDate } from "./core";
import { formatDateOnly } from "./format";
import { startOfMonth } from "./boundary";
import { diffDays } from "./compare";
import type { DateInput, DateListSummary, WeekdayLabelOptions } from "./types";

export function minDate(values: readonly DateInput[]): Date | null {
  const dates = mapNonNullable(values, toDate);
  return dates.length > 0 ? new Date(Math.min(...dates.map((date) => date.getTime()))) : null;
}

export function maxDate(values: readonly DateInput[]): Date | null {
  const dates = mapNonNullable(values, toDate);
  return dates.length > 0 ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
}

export function summarizeDateList(values: readonly (DateInput | null | undefined)[]): DateListSummary {
  const dates = mapNonNullable(values, (value) => (value === null || value === undefined ? null : toDate(value)));
  const earliest = dates.length > 0 ? new Date(Math.min(...dates.map((date) => date.getTime()))) : null;
  const latest = dates.length > 0 ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
  const rangeDays = earliest && latest ? diffDays(earliest, latest) : null;

  return {
    totalCount: values.length,
    validCount: dates.length,
    invalidCount: values.length - dates.length,
    empty: values.length === 0,
    earliest,
    latest,
    earliestValue: earliest ? formatDateOnly(earliest, "") : "",
    latestValue: latest ? formatDateOnly(latest, "") : "",
    rangeDays,
    dates,
  };
}

export function getMonthCalendarDates(value: DateInput, firstDayOfWeek = 1, weekCount = 6): Date[] {
  const firstDay = startOfMonth(value);

  if (!firstDay) {
    return [];
  }

  const safeFirstDayOfWeek = normalizeModuloIndex(firstDayOfWeek, 7);
  const safeWeekCount = toIntegerAtLeast(weekCount, 1);
  const offset = (firstDay.getDay() - safeFirstDayOfWeek + 7) % 7;
  const cursor = new Date(firstDay);
  cursor.setDate(firstDay.getDate() - offset);

  return Array.from({ length: safeWeekCount * 7 }, (_, index) => {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() + index);
    return date;
  });
}

export function getWeekdayLabels(locale = "zh-CN", options: WeekdayLabelOptions = {}): string[] {
  const firstDayOfWeek = normalizeModuloIndex(options.firstDayOfWeek ?? 1, 7);
  const stripZhWeekPrefix = options.stripZhWeekPrefix ?? true;
  const labels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2026, 5, 7 + index);
    const label = new Intl.DateTimeFormat(locale, { weekday: options.format ?? "short" }).format(date);
    return stripZhWeekPrefix ? label.replace(/^周/, "") : label;
  });

  if (firstDayOfWeek === 0) {
    return labels;
  }

  return [...labels.slice(firstDayOfWeek), ...labels.slice(0, firstDayOfWeek)];
}
