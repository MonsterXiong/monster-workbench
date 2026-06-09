import { getCurrentDate, toDate } from "./core";
import { formatDateOnly } from "./format";
import { parseDateValue } from "./date-only";
import { getQuarter, getWeekRange, startOfDay } from "./boundary";
import type { DateInput, DateStatusSummary } from "./types";

export function isSameYear(left: DateInput, right: DateInput): boolean {
  const leftDate = toDate(left);
  const rightDate = toDate(right);

  if (!leftDate || !rightDate) {
    return false;
  }

  return leftDate.getFullYear() === rightDate.getFullYear();
}

export function isSameQuarter(left: DateInput, right: DateInput): boolean {
  const leftDate = toDate(left);
  const rightDate = toDate(right);

  if (!leftDate || !rightDate) {
    return false;
  }

  return leftDate.getFullYear() === rightDate.getFullYear() && getQuarter(leftDate) === getQuarter(rightDate);
}

export function isSameDay(left: DateInput, right: DateInput): boolean {
  const leftDate = toDate(left);
  const rightDate = toDate(right);

  if (!leftDate || !rightDate) {
    return false;
  }

  return formatDateOnly(leftDate) === formatDateOnly(rightDate);
}

export function isToday(value: DateInput): boolean {
  return isSameDay(value, new Date());
}

export function isWeekend(value: DateInput): boolean {
  const date = toDate(value);

  if (!date) {
    return false;
  }

  return date.getDay() === 0 || date.getDay() === 6;
}

export function isSameMonth(left: DateInput, right: DateInput): boolean {
  const leftDate = toDate(left);
  const rightDate = toDate(right);

  return Boolean(leftDate && rightDate && isSameYear(leftDate, rightDate) && leftDate.getMonth() === rightDate.getMonth());
}

export function compareDates(left: DateInput, right: DateInput, fallback = 0): number {
  const leftDate = toDate(left);
  const rightDate = toDate(right);

  if (!leftDate || !rightDate) {
    return fallback;
  }

  return leftDate.getTime() - rightDate.getTime();
}

export function isDateInRange(value: DateInput, start?: DateInput | null, end?: DateInput | null, inclusive = true): boolean {
  const date = parseDateValue(value);

  if (!date) {
    return false;
  }

  const timestamp = date.getTime();
  const startTime = parseDateValue(start)?.getTime();
  const endTime = parseDateValue(end)?.getTime();

  if (startTime !== null && startTime !== undefined && (inclusive ? timestamp < startTime : timestamp <= startTime)) {
    return false;
  }

  if (endTime !== null && endTime !== undefined && (inclusive ? timestamp > endTime : timestamp >= endTime)) {
    return false;
  }

  return true;
}

export function summarizeDateStatus(value: DateInput, baseDate: DateInput = getCurrentDate()): DateStatusSummary {
  const date = parseDateValue(value);
  const base = parseDateValue(baseDate) ?? getCurrentDate();
  const daysFromToday = date ? diffDays(date, base) : null;
  const weekRange = getWeekRange(base);

  return {
    value: date ? formatDateOnly(date, "") : "",
    valid: Boolean(date),
    timestamp: date?.getTime() ?? null,
    today: date ? isSameDay(date, base) : false,
    past: daysFromToday !== null && daysFromToday < 0,
    future: daysFromToday !== null && daysFromToday > 0,
    weekend: date ? isWeekend(date) : false,
    sameWeek: date ? Boolean(weekRange && isDateInRange(date, weekRange.start, weekRange.end)) : false,
    sameMonth: date ? isSameMonth(date, base) : false,
    sameYear: date ? isSameYear(date, base) : false,
    daysFromToday,
  };
}

export function diffDays(left: DateInput, right: DateInput): number | null {
  const leftStart = startOfDay(left);
  const rightStart = startOfDay(right);

  if (!leftStart || !rightStart) {
    return null;
  }

  return Math.round((leftStart.getTime() - rightStart.getTime()) / 86_400_000);
}

export function clampDate(value: DateInput, min?: DateInput | null, max?: DateInput | null): Date | null {
  const date = parseDateValue(value);

  if (!date) {
    return null;
  }

  const minDate = parseDateValue(min);
  const maxDate = parseDateValue(max);
  const timestamp = date.getTime();

  if (minDate && timestamp < minDate.getTime()) {
    return minDate;
  }

  if (maxDate && timestamp > maxDate.getTime()) {
    return maxDate;
  }

  return date;
}
