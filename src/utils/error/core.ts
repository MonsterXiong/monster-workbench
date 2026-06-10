import type { ErrorWithCode, NormalizedError } from "./types";

export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isErrorLike(value: unknown): value is { message?: unknown; name?: unknown; code?: unknown; stack?: unknown } {
  return typeof value === "object" && value !== null && ("message" in value || "name" in value || "code" in value || "stack" in value);
}

/** 智能从任意 error 载荷提取可读的 message 文本。 */
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
    const errorCode = error.code || "";
    return Boolean(errorCode) && codes.includes(errorCode);
  });
}

export function filterErrorsByName(errors: readonly unknown[], name: string): NormalizedError[] {
  return normalizeErrors(errors).filter((error) => (error.name || "") === name);
}

export function filterErrorsByMessage(errors: readonly unknown[], keyword: string, ignoreCase = true): NormalizedError[] {
  const normalizedKeyword = ignoreCase ? keyword.toLowerCase() : keyword;

  if (!normalizedKeyword) {
    return [];
  }

  return normalizeErrors(errors).filter((error) => {
    const message = ignoreCase ? error.message.toLowerCase() : error.message;
    return message.includes(normalizedKeyword);
  });
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
