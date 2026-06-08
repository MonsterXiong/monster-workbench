export type DateInput = Date | string | number;

export interface DateRangeLike<T = DateInput | null | undefined> {
  start?: T;
  end?: T;
}

export interface WeekdayLabelOptions {
  firstDayOfWeek?: number;
  stripZhWeekPrefix?: boolean;
  format?: Intl.DateTimeFormatOptions["weekday"];
}

const DATE_TOKEN_REGEXP = /YYYY|MM|DD|HH|mm|ss|SSS/g;

export function toDate(value: DateInput): Date | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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

export function normalizeDateInputText(value: string): string {
  return value.trim().replace(/[\\/]+/g, "-").replace(/\s+/g, " ");
}

export function parseDateInput(value: string): Date | null {
  return toDate(normalizeDateInputText(value));
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
  const date = toDate(value);

  if (!date) {
    return false;
  }

  const timestamp = date.getTime();
  const startTime = start === undefined || start === null ? null : toDate(start)?.getTime();
  const endTime = end === undefined || end === null ? null : toDate(end)?.getTime();

  if (startTime !== null && startTime !== undefined && (inclusive ? timestamp < startTime : timestamp <= startTime)) {
    return false;
  }

  if (endTime !== null && endTime !== undefined && (inclusive ? timestamp > endTime : timestamp >= endTime)) {
    return false;
  }

  return true;
}

export function isDateRangeComplete(range: DateRangeLike): boolean {
  return range.start !== undefined && range.start !== null && range.start !== "" && range.end !== undefined && range.end !== null && range.end !== "";
}

export function isDateRangeOrdered(range: DateRangeLike, inclusive = true): boolean {
  if (!isDateRangeComplete(range)) {
    return true;
  }

  const start = toDate(range.start as DateInput);
  const end = toDate(range.end as DateInput);

  if (!start || !end) {
    return false;
  }

  return inclusive ? start.getTime() <= end.getTime() : start.getTime() < end.getTime();
}

export function isSameDateRange<T extends DateRangeLike>(left: T, right: T): boolean {
  return left.start === right.start && left.end === right.end;
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

  const safeFirstDayOfWeek = ((Math.floor(firstDayOfWeek) % 7) + 7) % 7;
  const safeWeekCount = Math.max(1, Math.floor(weekCount));
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
  const firstDayOfWeek = ((Math.floor(options.firstDayOfWeek ?? 1) % 7) + 7) % 7;
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

  return unit === "millisecond" ? date.getTime() : Math.floor(date.getTime() / 1000);
}

export function getCurrentUnixTimestamp(unit: "second" | "millisecond" = "second"): number {
  return unit === "millisecond" ? Date.now() : Math.floor(Date.now() / 1000);
}

export function normalizeUnixTimestamp(value: number, unit: "second" | "millisecond" = "second"): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  if (unit === "millisecond") {
    return Math.abs(value) < 1_000_000_000_000 ? Math.floor(value * 1000) : Math.floor(value);
  }

  return Math.abs(value) >= 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
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
