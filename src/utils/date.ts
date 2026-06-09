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

export interface DateRangeDurationOptions {
  inclusive?: boolean;
  absolute?: boolean;
}

export interface WeekdayLabelOptions {
  firstDayOfWeek?: number;
  stripZhWeekPrefix?: boolean;
  format?: Intl.DateTimeFormatOptions["weekday"];
}

export type TimestampMsFallback = number | (() => number);

const DATE_TOKEN_REGEXP = /YYYY|MM|DD|HH|mm|ss|SSS/g;

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

export function isSameMonth(left: DateInput, right: DateInput): boolean {
  const leftDate = toDate(left);
  const rightDate = toDate(right);

  if (!leftDate || !rightDate) {
    return false;
  }

  return leftDate.getFullYear() === rightDate.getFullYear() && leftDate.getMonth() === rightDate.getMonth();
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

export function getDateRangeBoundaryDates(range: DateRangeLike): DateRangeBoundaryDates {
  return {
    start: parseDateValue(range.start ?? null),
    end: parseDateValue(range.end ?? null),
  };
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

export function diffDays(left: DateInput, right: DateInput): number | null {
  const leftStart = startOfDay(left);
  const rightStart = startOfDay(right);

  if (!leftStart || !rightStart) {
    return null;
  }

  return Math.round((leftStart.getTime() - rightStart.getTime()) / 86_400_000);
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

function resolveTimestampMsFallback(fallback: TimestampMsFallback): number {
  return typeof fallback === "function" ? fallback() : fallback;
}

export function normalizeTimestampMs(value: unknown, fallback: TimestampMsFallback = getCurrentTimestampMs): number {
  return Number(value || resolveTimestampMsFallback(fallback));
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
