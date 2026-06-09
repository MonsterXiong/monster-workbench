import { floorToInteger, normalizeModuloIndex } from "../number";
import { toDate } from "./core";
import { formatDate, formatDateOnly } from "./format";
import type { DateBoundaryRange, DateGranularity, DateGranularityOptions, DateInput } from "./types";

export function addDays(value: DateInput, days: number): Date | null {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  date.setDate(date.getDate() + days);
  return date;
}

export function addWeeks(value: DateInput, weeks: number): Date | null {
  return addDays(value, floorToInteger(weeks) * 7);
}

export function addMonths(value: DateInput, months: number): Date | null {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDayOfTargetMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDayOfTargetMonth));
  return date;
}

export function addYears(value: DateInput, years: number): Date | null {
  return addMonths(value, floorToInteger(years) * 12);
}

export function startOfDay(value: DateInput): Date | null {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value: DateInput): Date | null {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  date.setHours(23, 59, 59, 999);
  return date;
}

export function startOfMonth(value: DateInput): Date | null {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(value: DateInput): Date | null {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function getQuarter(value: DateInput): number | null {
  const date = toDate(value);
  return date ? Math.floor(date.getMonth() / 3) + 1 : null;
}

export function startOfQuarter(value: DateInput): Date | null {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}

export function endOfQuarter(value: DateInput): Date | null {
  const start = startOfQuarter(value);

  if (!start) {
    return null;
  }

  return new Date(start.getFullYear(), start.getMonth() + 3, 0, 23, 59, 59, 999);
}

export function startOfYear(value: DateInput): Date | null {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  return new Date(date.getFullYear(), 0, 1);
}

export function endOfYear(value: DateInput): Date | null {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

export function startOfWeek(value: DateInput, firstDayOfWeek = 1): Date | null {
  const date = startOfDay(value);

  if (!date) {
    return null;
  }

  const safeFirstDayOfWeek = normalizeModuloIndex(firstDayOfWeek, 7);
  const offset = (date.getDay() - safeFirstDayOfWeek + 7) % 7;
  date.setDate(date.getDate() - offset);
  return date;
}

export function endOfWeek(value: DateInput, firstDayOfWeek = 1): Date | null {
  const start = startOfWeek(value, firstDayOfWeek);

  if (!start) {
    return null;
  }

  const end = addDays(start, 6);
  return end ? endOfDay(end) : null;
}

export function getWeekRange(value: DateInput, firstDayOfWeek = 1): DateBoundaryRange | null {
  const start = startOfWeek(value, firstDayOfWeek);
  const end = endOfWeek(value, firstDayOfWeek);
  return start && end ? { start, end } : null;
}

export function getMonthRange(value: DateInput): DateBoundaryRange | null {
  const start = startOfMonth(value);
  const end = endOfMonth(value);
  return start && end ? { start, end } : null;
}

export function getQuarterRange(value: DateInput): DateBoundaryRange | null {
  const start = startOfQuarter(value);
  const end = endOfQuarter(value);
  return start && end ? { start, end } : null;
}

export function getYearRange(value: DateInput): DateBoundaryRange | null {
  const start = startOfYear(value);
  const end = endOfYear(value);
  return start && end ? { start, end } : null;
}

export function getDateGranularityRange(
  value: DateInput,
  granularity: DateGranularity,
  options: DateGranularityOptions = {}
): DateBoundaryRange | null {
  if (granularity === "day") {
    const start = startOfDay(value);
    const end = endOfDay(value);
    return start && end ? { start, end } : null;
  }

  if (granularity === "week") {
    return getWeekRange(value, options.firstDayOfWeek);
  }

  if (granularity === "month") {
    return getMonthRange(value);
  }

  if (granularity === "quarter") {
    return getQuarterRange(value);
  }

  return getYearRange(value);
}

export function getDateBucketKey(
  value: DateInput,
  granularity: DateGranularity,
  options: DateGranularityOptions = {}
): string {
  const date = toDate(value);

  if (!date) {
    return "";
  }

  if (granularity === "day") {
    return formatDateOnly(date, "");
  }

  if (granularity === "week") {
    const range = getWeekRange(date, options.firstDayOfWeek);
    return range ? formatDateOnly(range.start, "") : "";
  }

  if (granularity === "month") {
    return formatDate(date, "YYYY-MM", "");
  }

  if (granularity === "quarter") {
    return `${date.getFullYear()}-Q${getQuarter(date) ?? ""}`;
  }

  return formatDate(date, "YYYY", "");
}
