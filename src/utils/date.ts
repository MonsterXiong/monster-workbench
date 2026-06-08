export type DateInput = Date | string | number;

export interface DateRangeLike<T = DateInput | null | undefined> {
  start?: T;
  end?: T;
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

export function isSameDay(left: DateInput, right: DateInput): boolean {
  const leftDate = toDate(left);
  const rightDate = toDate(right);

  if (!leftDate || !rightDate) {
    return false;
  }

  return formatDateOnly(leftDate) === formatDateOnly(rightDate);
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

export function formatUnixTimestamp(
  value: number,
  unit: "second" | "millisecond" = "second",
  pattern = "YYYY-MM-DD HH:mm:ss",
  fallback = "--"
): string {
  const date = fromUnixTimestamp(value, unit);
  return date ? formatDate(date, pattern, fallback) : fallback;
}
