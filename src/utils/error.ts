export interface NormalizedError {
  message: string;
  name?: string;
  code?: string;
  stack?: string;
}

export interface ErrorSummary {
  errors: NormalizedError[];
  messages: string[];
  codes: string[];
  names: string[];
  codeCounts: Record<string, number>;
  count: number;
  firstMessage: string;
  hasErrors: boolean;
}

export interface ErrorWithCode extends Error {
  code?: string;
}

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

export const LOG_LEVELS: readonly LogLevel[] = ["ERROR", "WARN", "INFO", "DEBUG"];
export const LOG_LEVEL_WEIGHTS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export interface ParsedLogLine {
  rawLine: string;
  time: string;
  level: LogLevel | null;
  message: string;
}

export interface LogLinesSummary {
  lines: ParsedLogLine[];
  totalCount: number;
  levelCounts: Record<LogLevel, number>;
  unknownLevelCount: number;
  minLevel: LogLevel | null;
  maxLevel: LogLevel | null;
  hasErrors: boolean;
  hasWarnings: boolean;
  messages: string[];
}

export interface FormatLogLinesSummaryOptions {
  emptyText?: string;
  separator?: string;
  includeUnknown?: boolean;
}

export interface ErrorDisplayReportOptions {
  fallbackMessage?: string;
  includeCode?: boolean;
  includeName?: boolean;
  includeStack?: boolean;
  separator?: string;
}

export interface ErrorDisplayReport {
  error: NormalizedError;
  message: string;
  code: string;
  name: string;
  stack: string;
  title: string;
  displayText: string;
  searchableText: string;
  abort: boolean;
}

export interface ErrorDisplayReportSummary {
  reports: ErrorDisplayReport[];
  totalCount: number;
  abortCount: number;
  uniqueMessages: string[];
  uniqueCodes: string[];
  uniqueNames: string[];
  firstDisplayText: string;
  hasErrors: boolean;
}

const LOG_LEVEL_REGEXP = /\[(ERROR|WARN|INFO|DEBUG)\]/i;
const LOG_TIME_REGEXP = /^\[(.*?)\]/;

export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isErrorLike(value: unknown): value is { message?: unknown; name?: unknown; code?: unknown; stack?: unknown } {
  return typeof value === "object" && value !== null && ("message" in value || "name" in value || "code" in value || "stack" in value);
}

export function getErrorMessage(error: unknown, fallback = "Unknown error"): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "string") {
    return error || fallback;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" && message ? message : fallback;
  }

  return fallback;
}

export function getErrorName(error: unknown, fallback = ""): string {
  if (error instanceof Error) {
    return error.name || fallback;
  }

  if (typeof error === "object" && error !== null && "name" in error) {
    const name = (error as { name?: unknown }).name;
    return typeof name === "string" && name ? name : fallback;
  }

  return fallback;
}

export function getErrorCode(error: unknown, fallback = ""): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" || typeof code === "number" ? String(code) : fallback;
  }

  return fallback;
}

export function getErrorStack(error: unknown, fallback = ""): string {
  if (error instanceof Error) {
    return error.stack || fallback;
  }

  if (typeof error === "object" && error !== null && "stack" in error) {
    const stack = (error as { stack?: unknown }).stack;
    return typeof stack === "string" && stack ? stack : fallback;
  }

  return fallback;
}

export function stringifyErrorMessage(error: unknown, fallback = "Unknown error"): string {
  const message = getErrorMessage(error, "");

  if (message) {
    return message;
  }

  if (error === undefined || error === null) {
    return fallback;
  }

  return String(error) || fallback;
}

export function toError(error: unknown, fallback = "Unknown error"): Error {
  return error instanceof Error ? error : new Error(stringifyErrorMessage(error, fallback));
}

export function createError(message: string, name = "Error"): Error {
  const error = new Error(message);
  error.name = name || "Error";
  return error;
}

export function createErrorWithCode(message: string, code: string, name = "Error"): ErrorWithCode {
  const error = createError(message, name) as ErrorWithCode;
  error.code = code;
  return error;
}

export function normalizeError(error: unknown, fallback = "Unknown error"): NormalizedError {
  if (error instanceof Error) {
    const code = getErrorCode(error);
    return {
      message: error.message || fallback,
      name: error.name,
      code: code || undefined,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    const value = error as Record<string, unknown>;

    return {
      message: getErrorMessage(error, fallback),
      name: getErrorName(value) || undefined,
      code: getErrorCode(value) || undefined,
      stack: typeof value.stack === "string" ? value.stack : undefined,
    };
  }

  return {
    message: stringifyErrorMessage(error, fallback),
  };
}

export function normalizeErrors(errors: readonly unknown[], fallback = "Unknown error"): NormalizedError[] {
  return errors.map((error) => normalizeError(error, fallback));
}

export function getErrorMessages(errors: readonly unknown[], fallback = "Unknown error"): string[] {
  return normalizeErrors(errors, fallback).map((error) => error.message);
}

export function getFirstErrorMessage(errors: readonly unknown[], fallback = "Unknown error"): string {
  return getErrorMessages(errors, fallback)[0] ?? fallback;
}

export function groupErrorsByCode(
  errors: readonly unknown[],
  fallback = "Unknown error",
  fallbackCode = "UNKNOWN"
): Record<string, NormalizedError[]> {
  return normalizeErrors(errors, fallback).reduce<Record<string, NormalizedError[]>>((groups, error) => {
    const code = error.code || fallbackCode;
    groups[code] = groups[code] ?? [];
    groups[code].push(error);
    return groups;
  }, {});
}

function groupNormalizedErrorsByCode(
  errors: readonly NormalizedError[],
  fallbackCode = "UNKNOWN"
): Record<string, NormalizedError[]> {
  return errors.reduce<Record<string, NormalizedError[]>>((groups, error) => {
    const code = error.code || fallbackCode;
    groups[code] = groups[code] ?? [];
    groups[code].push(error);
    return groups;
  }, {});
}

export function summarizeErrors(
  errors: readonly unknown[],
  fallback = "Unknown error",
  fallbackCode = "UNKNOWN"
): ErrorSummary {
  const normalizedErrors = normalizeErrors(errors, fallback);
  const groupedErrors = groupNormalizedErrorsByCode(normalizedErrors, fallbackCode);
  const codes = Object.keys(groupedErrors);
  const names = Array.from(new Set(normalizedErrors.map((error) => error.name).filter((name): name is string => Boolean(name))));

  return {
    errors: normalizedErrors,
    messages: normalizedErrors.map((error) => error.message),
    codes,
    names,
    codeCounts: Object.fromEntries(codes.map((code) => [code, groupedErrors[code].length])),
    count: normalizedErrors.length,
    firstMessage: normalizedErrors[0]?.message ?? "",
    hasErrors: normalizedErrors.length > 0,
  };
}

export function hasErrorCode(error: unknown, code: string): boolean {
  return Boolean(code) && getErrorCode(error) === code;
}

export function hasAnyErrorCode(error: unknown, codes: readonly string[]): boolean {
  const errorCode = getErrorCode(error);
  return Boolean(errorCode) && codes.includes(errorCode);
}

export function filterErrorsByCode(errors: readonly unknown[], code: string): NormalizedError[] {
  return normalizeErrors(errors).filter((error) => (error.code || "") === code);
}

export function filterErrorsByCodes(errors: readonly unknown[], codes: readonly string[]): NormalizedError[] {
  return normalizeErrors(errors).filter((error) => {
    const code = error.code || "";
    return Boolean(code) && codes.includes(code);
  });
}

export function filterErrorsByName(errors: readonly unknown[], name: string): NormalizedError[] {
  return normalizeErrors(errors).filter((error) => (error.name || "") === name);
}

export function filterErrorsByMessage(
  errors: readonly unknown[],
  keyword: string,
  ignoreCase = true
): NormalizedError[] {
  const normalizedKeyword = ignoreCase ? keyword.toLowerCase() : keyword;

  if (!normalizedKeyword) {
    return [];
  }

  return normalizeErrors(errors).filter((error) => {
    const message = ignoreCase ? error.message.toLowerCase() : error.message;
    return message.includes(normalizedKeyword);
  });
}

export function formatErrorSummary(summary: ErrorSummary, separator = "；", fallback = ""): string {
  if (!summary.hasErrors) {
    return fallback;
  }

  return summary.messages.filter(Boolean).join(separator) || fallback;
}

export function summarizeAndFormatErrors(
  errors: readonly unknown[],
  separator = "；",
  fallback = "",
  fallbackMessage = "Unknown error"
): string {
  return formatErrorSummary(summarizeErrors(errors, fallbackMessage), separator, fallback);
}

export function formatErrorCodeMessage(error: unknown, fallback = "Unknown error"): string {
  const normalizedError = normalizeError(error, fallback);
  return normalizedError.code ? `[${normalizedError.code}] ${normalizedError.message}` : normalizedError.message;
}

export function formatNormalizedErrorDisplay(error: NormalizedError, options: ErrorDisplayReportOptions = {}): string {
  const message = error.message || options.fallbackMessage || "Unknown error";
  const parts: string[] = [];

  if (options.includeCode ?? true) {
    if (error.code) {
      parts.push(`[${error.code}]`);
    }
  }

  if (options.includeName) {
    if (error.name) {
      parts.push(`[${error.name}]`);
    }
  }

  parts.push(message);

  if (options.includeStack) {
    if (error.stack) {
      parts.push(error.stack);
    }
  }

  return parts.filter(Boolean).join(options.separator ?? " ");
}

export function createErrorDisplayReport(error: unknown, options: ErrorDisplayReportOptions = {}): ErrorDisplayReport {
  const normalizedError = normalizeError(error, options.fallbackMessage);
  const message = normalizedError.message || options.fallbackMessage || "Unknown error";
  const code = normalizedError.code ?? "";
  const name = normalizedError.name ?? "";
  const stack = normalizedError.stack ?? "";
  const displayText = formatNormalizedErrorDisplay(normalizedError, options);

  return {
    error: normalizedError,
    message,
    code,
    name,
    stack,
    title: code || name || message,
    displayText,
    searchableText: [code, name, message, stack].filter(Boolean).join(" "),
    abort: isAbortError(normalizedError),
  };
}

export function createErrorDisplayReports(
  errors: readonly unknown[],
  options: ErrorDisplayReportOptions = {}
): ErrorDisplayReport[] {
  return errors.map((error) => createErrorDisplayReport(error, options));
}

export function summarizeErrorDisplayReports(
  errors: readonly unknown[],
  options: ErrorDisplayReportOptions = {}
): ErrorDisplayReportSummary {
  const reports = createErrorDisplayReports(errors, options);

  return {
    reports,
    totalCount: reports.length,
    abortCount: reports.filter((report) => report.abort).length,
    uniqueMessages: Array.from(new Set(reports.map((report) => report.message).filter(Boolean))),
    uniqueCodes: Array.from(new Set(reports.map((report) => report.code).filter(Boolean))),
    uniqueNames: Array.from(new Set(reports.map((report) => report.name).filter(Boolean))),
    firstDisplayText: reports[0]?.displayText ?? "",
    hasErrors: reports.length > 0,
  };
}

export function errorMessageIncludes(error: unknown, keyword: string, ignoreCase = true): boolean {
  const message = getErrorMessage(error, "");
  const normalizedMessage = ignoreCase ? message.toLowerCase() : message;
  const normalizedKeyword = ignoreCase ? keyword.toLowerCase() : keyword;
  return Boolean(normalizedKeyword) && normalizedMessage.includes(normalizedKeyword);
}

export function isAbortError(error: unknown): boolean {
  const normalizedError = normalizeError(error, "");
  return normalizedError.name === "AbortError" || normalizedError.code === "ABORT_ERR";
}

export function normalizeLogLevel(level: unknown): LogLevel | null {
  const normalizedLevel = String(level ?? "")
    .trim()
    .replace(/^\[|\]$/g, "")
    .toUpperCase();

  return (LOG_LEVELS as readonly string[]).includes(normalizedLevel) ? (normalizedLevel as LogLevel) : null;
}

export function getLogLevelWeight(level: unknown, fallback = -1): number {
  const normalizedLevel = normalizeLogLevel(level);
  return normalizedLevel ? LOG_LEVEL_WEIGHTS[normalizedLevel] : fallback;
}

export function compareLogLevels(left: unknown, right: unknown): number {
  return getLogLevelWeight(left) - getLogLevelWeight(right);
}

export function isLogLevelAtLeast(level: unknown, minLevel: unknown): boolean {
  const levelWeight = getLogLevelWeight(level);
  const minLevelWeight = getLogLevelWeight(minLevel);
  return levelWeight >= 0 && minLevelWeight >= 0 && levelWeight >= minLevelWeight;
}

export function formatLogLevelTag(level: unknown): string {
  const normalizedLevel = normalizeLogLevel(level);
  return normalizedLevel ? `[${normalizedLevel}]` : "";
}

export function getLogLevelFromText(value: string): LogLevel | null {
  const match = value.match(LOG_LEVEL_REGEXP);
  return normalizeLogLevel(match?.[1]);
}

export function parseLogLine(value: string): ParsedLogLine {
  const timeMatch = value.match(LOG_TIME_REGEXP);
  const levelMatch = LOG_LEVEL_REGEXP.exec(value);
  const level = normalizeLogLevel(levelMatch?.[1]);
  const message = levelMatch ? value.slice(levelMatch.index + levelMatch[0].length).trim() : value.trim();

  return {
    rawLine: value,
    time: timeMatch ? timeMatch[1] : "",
    level,
    message,
  };
}

export function summarizeLogLines(lines: readonly string[]): LogLinesSummary {
  const parsedLines = lines.map(parseLogLine);
  const levelCounts = LOG_LEVELS.reduce<Record<LogLevel, number>>((result, level) => {
    result[level] = 0;
    return result;
  }, {} as Record<LogLevel, number>);
  let minLevel: LogLevel | null = null;
  let maxLevel: LogLevel | null = null;

  for (const line of parsedLines) {
    if (!line.level) {
      continue;
    }

    levelCounts[line.level] += 1;

    if (minLevel === null || compareLogLevels(line.level, minLevel) < 0) {
      minLevel = line.level;
    }

    if (maxLevel === null || compareLogLevels(line.level, maxLevel) > 0) {
      maxLevel = line.level;
    }
  }

  return {
    lines: parsedLines,
    totalCount: parsedLines.length,
    levelCounts,
    unknownLevelCount: parsedLines.filter((line) => line.level === null).length,
    minLevel,
    maxLevel,
    hasErrors: levelCounts.ERROR > 0,
    hasWarnings: levelCounts.WARN > 0,
    messages: parsedLines.map((line) => line.message),
  };
}

export function formatLogLinesSummary(summary: LogLinesSummary, options: FormatLogLinesSummaryOptions = {}): string {
  if (summary.totalCount === 0) {
    return options.emptyText ?? "0 logs";
  }

  const parts = LOG_LEVELS
    .map((level) => [level, summary.levelCounts[level]] as const)
    .filter(([, count]) => count > 0)
    .map(([level, count]) => `${level}:${count}`);

  if (options.includeUnknown ?? true) {
    if (summary.unknownLevelCount > 0) {
      parts.push(`UNKNOWN:${summary.unknownLevelCount}`);
    }
  }

  return parts.join(options.separator ?? " / ") || String(summary.totalCount);
}

export function summarizeAndFormatLogLines(
  lines: readonly string[],
  options: FormatLogLinesSummaryOptions = {}
): string {
  return formatLogLinesSummary(summarizeLogLines(lines), options);
}

export function getLogMessagesByMinLevel(lines: readonly string[], minLevel: unknown): string[] {
  return filterLogLinesByMinLevel(lines, minLevel).map((line) => parseLogLine(line).message);
}

export function hasLogLevel(value: string, level: unknown): boolean {
  const normalizedLevel = normalizeLogLevel(level);
  return normalizedLevel ? getLogLevelFromText(value) === normalizedLevel : false;
}

export function filterLogLinesByLevel(lines: readonly string[], level: unknown): string[] {
  const normalizedLevel = normalizeLogLevel(level);
  return normalizedLevel ? lines.filter((line) => hasLogLevel(line, normalizedLevel)) : [...lines];
}

export function filterLogLinesByMinLevel(lines: readonly string[], minLevel: unknown): string[] {
  const normalizedMinLevel = normalizeLogLevel(minLevel);
  return normalizedMinLevel ? lines.filter((line) => isLogLevelAtLeast(getLogLevelFromText(line), normalizedMinLevel)) : [...lines];
}

export function getTextAfterLogLevel(value: string, level?: unknown): string {
  const normalizedLevel = normalizeLogLevel(level ?? getLogLevelFromText(value));

  if (!normalizedLevel) {
    return "";
  }

  const parsedLine = parseLogLine(value);
  return parsedLine.level === normalizedLevel ? parsedLine.message : "";
}
