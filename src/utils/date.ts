import { mapNonNullable } from "./array";
import { floorToInteger, isFiniteNumber, isNaNNumber, normalizeModuloIndex, toIntegerAtLeast } from "./number";

export type DateInput = Date | string | number;

export interface DateRangeLike<T = DateInput | null | undefined> {
  start?: T;
  end?: T;
}

export interface NormalizedDateRange {
  start: string;
  end: string;
}

export interface DateRangeBoundaryDates {
  start: Date | null;
  end: Date | null;
}

export interface DateRangeSummary {
  range: NormalizedDateRange;
  boundaryDates: DateRangeBoundaryDates;
  formatted: string;
  durationDays: number | null;
  complete: boolean;
  empty: boolean;
  partial: boolean;
  ordered: boolean;
}

export interface DateListSummary {
  totalCount: number;
  validCount: number;
  invalidCount: number;
  empty: boolean;
  earliest: Date | null;
  latest: Date | null;
  earliestValue: string;
  latestValue: string;
  rangeDays: number | null;
  dates: Date[];
}

export interface DateStatusSummary {
  value: string;
  valid: boolean;
  timestamp: number | null;
  today: boolean;
  past: boolean;
  future: boolean;
  weekend: boolean;
  sameWeek: boolean;
  sameMonth: boolean;
  sameYear: boolean;
  daysFromToday: number | null;
}

export interface FormatDateRangeSummaryOptions {
  emptyText?: string;
  partialPrefix?: string;
  unorderedSuffix?: string;
  durationUnit?: string;
  separator?: string;
  includeDuration?: boolean;
}

export interface FormatCompactDateRangeOptions {
  separator?: string;
  fallback?: string;
  sameDayPattern?: string;
  sameMonthStartPattern?: string;
  sameYearStartPattern?: string;
  endPattern?: string;
  fullPattern?: string;
}

export type DateRangePresetKey = "today" | "yesterday" | "last7Days" | "last30Days" | "thisWeek" | "thisMonth" | "thisQuarter" | "thisYear";
export type DateGranularity = "day" | "week" | "month" | "quarter" | "year";

export interface DateRangePresetDefinition {
  key: DateRangePresetKey;
  label: string;
  range: NormalizedDateRange;
}

export interface DateBoundaryRange {
  start: Date;
  end: Date;
}

export interface DateRangeDurationOptions {
  inclusive?: boolean;
  absolute?: boolean;
}

export interface DateGranularityOptions {
  firstDayOfWeek?: number;
}

export interface EnumerateDateRangeOptions {
  inclusive?: boolean;
  maxDays?: number;
}

export interface WeekdayLabelOptions {
  firstDayOfWeek?: number;
  stripZhWeekPrefix?: boolean;
  format?: Intl.DateTimeFormatOptions["weekday"];
}

export interface FormatOptionalUnixTimestampOptions {
  unit?: "second" | "millisecond";
  pattern?: string;
  fallback?: string;
  zeroAsMissing?: boolean;
}

export type TimestampMsFallback = number | (() => number);

const DATE_TOKEN_REGEXP = /YYYY|MM|DD|HH|mm|ss|SSS/g;
const STRICT_DATE_ONLY_REGEXP = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

export function toDate(value: DateInput): Date | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return isNaNNumber(date.getTime()) ? null : date;
}

export function getCurrentDate(): Date {
  return new Date();
}

export function isValidDate(value: unknown): value is DateInput {
  return value instanceof Date || typeof value === "string" || typeof value === "number"
    ? toDate(value) !== null
    : false;
}

export function padNumber(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

export function formatDate(value: DateInput, pattern = "YYYY-MM-DD HH:mm:ss", fallback = "--"): string {
  const date = toDate(value);

  if (!date) {
    return fallback;
  }

  const tokenMap: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    MM: padNumber(date.getMonth() + 1),
    DD: padNumber(date.getDate()),
    HH: padNumber(date.getHours()),
    mm: padNumber(date.getMinutes()),
    ss: padNumber(date.getSeconds()),
    SSS: padNumber(date.getMilliseconds(), 3),
  };

  return pattern.replace(DATE_TOKEN_REGEXP, (token) => tokenMap[token] ?? token);
}

export function formatDateOnly(value: DateInput, fallback = "--"): string {
  return formatDate(value, "YYYY-MM-DD", fallback);
}

export function formatDateTime(value: DateInput, fallback = "--"): string {
  return formatDate(value, "YYYY-MM-DD HH:mm:ss", fallback);
}

export function formatCurrentDate(pattern = "YYYY-MM-DD HH:mm:ss", fallback = "--"): string {
  return formatDate(getCurrentDate(), pattern, fallback);
}

export function formatCurrentDateTime(fallback = "--"): string {
  return formatCurrentDate("YYYY-MM-DD HH:mm:ss", fallback);
}

export function formatLocaleDateTime(
  value: DateInput = getCurrentDate(),
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
  fallback = "--"
): string {
  const date = toDate(value);
  return date ? date.toLocaleString(locales, options) : fallback;
}

export function formatCurrentLocaleDateTime(
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
  fallback = "--"
): string {
  return formatLocaleDateTime(getCurrentDate(), locales, options, fallback);
}

export function formatMonthYear(
  value: DateInput = getCurrentDate(),
  locale = "zh-CN",
  options: Intl.DateTimeFormatOptions = {},
  fallback = "--"
): string {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", ...options }).format(date) : fallback;
}

export function formatTimeOnly(value: DateInput, fallback = "--"): string {
  return formatDate(value, "HH:mm:ss", fallback);
}

export function formatIsoString(value: DateInput = new Date(), fallback = ""): string {
  const date = toDate(value);
  return date ? date.toISOString() : fallback;
}

export function getCurrentIsoString(): string {
  return formatIsoString(new Date());
}

export function formatIsoDateTime(value: DateInput = new Date(), separator: "T" | " " = "T", fallback = ""): string {
  const isoText = formatIsoString(value, fallback);
  return isoText ? isoText.replace("T", separator).slice(0, 19) : fallback;
}

export function formatCurrentIsoDateTime(separator: "T" | " " = "T", fallback = ""): string {
  return formatIsoDateTime(getCurrentDate(), separator, fallback);
}

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

export function getTodayString(): string {
  return formatDateOnly(new Date());
}

export function getYearMonthPath(value: DateInput = new Date(), fallback = ""): string {
  return formatDate(value, "YYYY/MM", fallback);
}

export function buildDatedFileName(prefix: string, extension: string, value: DateInput = new Date(), pattern = "YYYY-MM-DD"): string {
  const normalizedPrefix = prefix.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
  const normalizedExtension = extension.trim().replace(/^\.+/, "");
  const dateText = formatDate(value, pattern, "");
  const suffix = normalizedExtension ? `.${normalizedExtension}` : "";
  return [normalizedPrefix, dateText].filter(Boolean).join("_") + suffix;
}

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

export function isDateValuePresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

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

export function diffDays(left: DateInput, right: DateInput): number | null {
  const leftStart = startOfDay(left);
  const rightStart = startOfDay(right);

  if (!leftStart || !rightStart) {
    return null;
  }

  return Math.round((leftStart.getTime() - rightStart.getTime()) / 86_400_000);
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

export function toUnixTimestamp(value: DateInput, unit: "second" | "millisecond" = "second"): number | null {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  return unit === "millisecond" ? date.getTime() : floorToInteger(date.getTime() / 1000);
}

export function getCurrentUnixTimestamp(unit: "second" | "millisecond" = "second"): number {
  return unit === "millisecond" ? Date.now() : floorToInteger(Date.now() / 1000);
}

export function getCurrentTimestampMs(): number {
  return Date.now();
}

export function secondsToMilliseconds(value: unknown, fallback = 0): number {
  if (value === undefined || value === null || typeof value === "boolean") {
    return fallback;
  }

  if (typeof value === "string" && value.trim() === "") {
    return fallback;
  }

  const seconds = Number(value);
  return isFiniteNumber(seconds) ? seconds * 1000 : fallback;
}

export function millisecondsToSeconds(value: unknown, fallback = 0): number {
  if (value === undefined || value === null || typeof value === "boolean") {
    return fallback;
  }

  if (typeof value === "string" && value.trim() === "") {
    return fallback;
  }

  const milliseconds = Number(value);
  return isFiniteNumber(milliseconds) ? milliseconds / 1000 : fallback;
}

function resolveTimestampMsFallback(fallback: TimestampMsFallback): number {
  return typeof fallback === "function" ? fallback() : fallback;
}

export function normalizeTimestampMs(value: unknown, fallback: TimestampMsFallback = getCurrentTimestampMs): number {
  const fallbackValue = resolveTimestampMsFallback(fallback);

  if (value === undefined || value === null || typeof value === "boolean") {
    return fallbackValue;
  }

  if (typeof value === "string" && value.trim() === "") {
    return fallbackValue;
  }

  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? timestamp : fallbackValue;
}

export function normalizeOptionalTimestampMs(value: unknown, fallback: number | null = null): number | null {
  if (value === undefined || value === null || typeof value === "boolean") {
    return fallback;
  }

  if (typeof value === "string" && value.trim() === "") {
    return fallback;
  }

  const timestamp = Number(value);
  return isFiniteNumber(timestamp) ? timestamp : fallback;
}

export function getElapsedMs(startTimestampMs: number, currentTimestampMs = getCurrentTimestampMs()): number {
  return Math.max(0, currentTimestampMs - startTimestampMs);
}

export function hasTimeElapsed(startTimestampMs: number, durationMs: number, currentTimestampMs = getCurrentTimestampMs()): boolean {
  return getElapsedMs(startTimestampMs, currentTimestampMs) >= Math.max(0, durationMs);
}

export function normalizeUnixTimestamp(value: number, unit: "second" | "millisecond" = "second"): number | null {
  if (!isFiniteNumber(value)) {
    return null;
  }

  if (unit === "millisecond") {
    return Math.abs(value) < 1_000_000_000_000 ? floorToInteger(value * 1000) : floorToInteger(value);
  }

  return Math.abs(value) >= 1_000_000_000_000 ? floorToInteger(value / 1000) : floorToInteger(value);
}

export function fromUnixTimestamp(value: number, unit: "second" | "millisecond" = "second"): Date | null {
  const timestamp = unit === "second" ? value * 1000 : value;
  return toDate(timestamp);
}

export function parseUnixTimestampInput(value: unknown): Date | null {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const timestamp = normalizeUnixTimestamp(Number(text));
  return timestamp === null ? null : fromUnixTimestamp(timestamp);
}

export function formatUnixTimestamp(
  value: number,
  unit: "second" | "millisecond" = "second",
  pattern = "YYYY-MM-DD HH:mm:ss",
  fallback = "--"
): string {
  const date = fromUnixTimestamp(value, unit);
  return date ? formatDate(date, pattern, fallback) : fallback;
}

export function formatOptionalUnixTimestamp(
  value: unknown,
  options: FormatOptionalUnixTimestampOptions = {}
): string {
  const fallback = options.fallback ?? "--";

  if (value === undefined || value === null || typeof value === "boolean") {
    return fallback;
  }

  if (typeof value === "string" && value.trim() === "") {
    return fallback;
  }

  const timestamp = Number(value);

  if (!isFiniteNumber(timestamp) || (options.zeroAsMissing && timestamp === 0)) {
    return fallback;
  }

  return formatUnixTimestamp(timestamp, options.unit ?? "second", options.pattern ?? "YYYY-MM-DD HH:mm:ss", fallback);
}
