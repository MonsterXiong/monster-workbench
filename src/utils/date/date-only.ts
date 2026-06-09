import { isDateValuePresent, toDate } from "./core";
import { formatDateOnly } from "./format";
import type { DateInput, DateRangeLike } from "./types";

const STRICT_DATE_ONLY_REGEXP = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

export function normalizeDateInputText(value: string): string {
  return value.trim().replace(/[\\/]+/g, "-").replace(/\s+/g, " ");
}

export function parseDateInput(value: string): Date | null {
  return toDate(normalizeDateInputText(value));
}

export function parseDateOnlyInput(value: string): Date | null {
  const match = STRICT_DATE_ONLY_REGEXP.exec(normalizeDateInputText(value));

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function toDateOnly(value: DateInput | null | undefined | ""): Date | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = typeof value === "string" ? parseDateOnlyInput(value) : toDate(value);
  return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : null;
}

export function parseDateOnlyValue(value: DateInput | null | undefined | ""): Date | null {
  return toDateOnly(value);
}

export function isDateOnlyText(value: string): boolean {
  return parseDateOnlyInput(value) !== null;
}

export function normalizeDateOnlyValue(value: DateInput | null | undefined | "", fallback = ""): string {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const date = parseDateOnlyValue(value);
  return date ? formatDateOnly(date, fallback) : String(value).trim();
}

export function compareDateOnlyValues(
  left: DateInput | null | undefined | "",
  right: DateInput | null | undefined | "",
  fallback = 0
): number {
  const leftDate = parseDateOnlyValue(left);
  const rightDate = parseDateOnlyValue(right);
  return leftDate && rightDate ? leftDate.getTime() - rightDate.getTime() : fallback;
}

export function isDateOnlyValueInRange(
  value: DateInput | null | undefined | "",
  start?: DateInput | null,
  end?: DateInput | null,
  inclusive = true
): boolean {
  const date = parseDateOnlyValue(value);

  if (!date) {
    return false;
  }

  if (start !== undefined && start !== null) {
    const comparison = compareDateOnlyValues(date, start);
    if (inclusive ? comparison < 0 : comparison <= 0) {
      return false;
    }
  }

  if (end !== undefined && end !== null) {
    const comparison = compareDateOnlyValues(date, end);
    if (inclusive ? comparison > 0 : comparison >= 0) {
      return false;
    }
  }

  return true;
}

export function isDateOnlyRangeOrdered(range: DateRangeLike<DateInput | null | undefined | "">, inclusive = true): boolean {
  if (!isDateValuePresent(range.start) || !isDateValuePresent(range.end)) {
    return true;
  }

  const startDate = parseDateOnlyValue(range.start);
  const endDate = parseDateOnlyValue(range.end);

  if (!startDate || !endDate) {
    return false;
  }

  return inclusive ? startDate.getTime() <= endDate.getTime() : startDate.getTime() < endDate.getTime();
}

export function parseDateValue(value: DateInput | null | undefined): Date | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return typeof value === "string" ? parseDateInput(value) : toDate(value);
}

export function normalizeDateValue(value: DateInput | null | undefined, fallback = ""): string {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const date = parseDateValue(value);
  return date ? formatDateOnly(date, fallback) : String(value);
}
