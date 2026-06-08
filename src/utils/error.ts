export interface NormalizedError {
  message: string;
  name?: string;
  code?: string;
  stack?: string;
}

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

export const LOG_LEVELS: readonly LogLevel[] = ["ERROR", "WARN", "INFO", "DEBUG"];

const LOG_LEVEL_REGEXP = /\[(ERROR|WARN|INFO|DEBUG)\]/i;

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

export function normalizeError(error: unknown, fallback = "Unknown error"): NormalizedError {
  if (error instanceof Error) {
    return {
      message: error.message || fallback,
      name: error.name,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    const value = error as Record<string, unknown>;

    return {
      message: getErrorMessage(error, fallback),
      name: typeof value.name === "string" ? value.name : undefined,
      code: typeof value.code === "string" || typeof value.code === "number" ? String(value.code) : undefined,
      stack: typeof value.stack === "string" ? value.stack : undefined,
    };
  }

  return {
    message: getErrorMessage(error, fallback),
  };
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

export function formatLogLevelTag(level: unknown): string {
  const normalizedLevel = normalizeLogLevel(level);
  return normalizedLevel ? `[${normalizedLevel}]` : "";
}

export function getLogLevelFromText(value: string): LogLevel | null {
  const match = value.match(LOG_LEVEL_REGEXP);
  return normalizeLogLevel(match?.[1]);
}

export function hasLogLevel(value: string, level: unknown): boolean {
  const normalizedLevel = normalizeLogLevel(level);
  return normalizedLevel ? getLogLevelFromText(value) === normalizedLevel : false;
}

export function getTextAfterLogLevel(value: string, level?: unknown): string {
  const normalizedLevel = normalizeLogLevel(level ?? getLogLevelFromText(value));

  if (!normalizedLevel) {
    return "";
  }

  const match = new RegExp(`\\[${normalizedLevel}\\]`, "i").exec(value);
  return match ? value.slice(match.index + match[0].length).trim() : "";
}
