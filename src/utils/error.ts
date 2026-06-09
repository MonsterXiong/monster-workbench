export interface NormalizedError {
  message: string;
  name?: string;
  code?: string;
  stack?: string;
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
    message: getErrorMessage(error, fallback),
  };
}

export function normalizeErrors(errors: readonly unknown[], fallback = "Unknown error"): NormalizedError[] {
  return errors.map((error) => normalizeError(error, fallback));
}

export function formatErrorCodeMessage(error: unknown, fallback = "Unknown error"): string {
  const normalizedError = normalizeError(error, fallback);
  return normalizedError.code ? `[${normalizedError.code}] ${normalizedError.message}` : normalizedError.message;
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

export function hasLogLevel(value: string, level: unknown): boolean {
  const normalizedLevel = normalizeLogLevel(level);
  return normalizedLevel ? getLogLevelFromText(value) === normalizedLevel : false;
}

export function filterLogLinesByLevel(lines: readonly string[], level: unknown): string[] {
  const normalizedLevel = normalizeLogLevel(level);
  return normalizedLevel ? lines.filter((line) => hasLogLevel(line, normalizedLevel)) : [...lines];
}

export function getTextAfterLogLevel(value: string, level?: unknown): string {
  const normalizedLevel = normalizeLogLevel(level ?? getLogLevelFromText(value));

  if (!normalizedLevel) {
    return "";
  }

  const parsedLine = parseLogLine(value);
  return parsedLine.level === normalizedLevel ? parsedLine.message : "";
}
