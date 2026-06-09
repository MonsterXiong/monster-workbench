import { getCurrentDate } from "./core";
import { formatDateOnly } from "./format";
import { addDays, getMonthRange, getQuarterRange, getWeekRange, getYearRange, startOfDay } from "./boundary";
import type { DateBoundaryRange, DateInput, DateRangePresetDefinition, DateRangePresetKey, NormalizedDateRange } from "./types";

function normalizeDateBoundaryRange(range: DateBoundaryRange | null, fallback = ""): NormalizedDateRange {
  return {
    start: range ? formatDateOnly(range.start, fallback) : fallback,
    end: range ? formatDateOnly(range.end, fallback) : fallback,
  };
}

export function getDateRangePresetValue(key: DateRangePresetKey, baseDate: DateInput = getCurrentDate()): NormalizedDateRange {
  const today = startOfDay(baseDate) ?? getCurrentDate();

  if (key === "today") {
    return normalizeDateBoundaryRange({ start: today, end: today });
  }

  if (key === "yesterday") {
    const yesterday = addDays(today, -1) ?? today;
    return normalizeDateBoundaryRange({ start: yesterday, end: yesterday });
  }

  if (key === "last7Days") {
    return normalizeDateBoundaryRange({ start: addDays(today, -6) ?? today, end: today });
  }

  if (key === "last30Days") {
    return normalizeDateBoundaryRange({ start: addDays(today, -29) ?? today, end: today });
  }

  if (key === "thisWeek") {
    return normalizeDateBoundaryRange(getWeekRange(today));
  }

  if (key === "thisMonth") {
    return normalizeDateBoundaryRange(getMonthRange(today));
  }

  if (key === "thisQuarter") {
    return normalizeDateBoundaryRange(getQuarterRange(today));
  }

  return normalizeDateBoundaryRange(getYearRange(today));
}

export function createDateRangePreset(
  key: DateRangePresetKey,
  label: string,
  baseDate: DateInput = getCurrentDate()
): DateRangePresetDefinition {
  return {
    key,
    label,
    range: getDateRangePresetValue(key, baseDate),
  };
}

export function createDateRangePresets(
  items: readonly (DateRangePresetKey | readonly [DateRangePresetKey, string])[],
  baseDate: DateInput = getCurrentDate()
): DateRangePresetDefinition[] {
  return items.map((item) => {
    const [key, label] = Array.isArray(item) ? item : [item, item];
    return createDateRangePreset(key, label, baseDate);
  });
}
