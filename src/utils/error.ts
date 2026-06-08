export interface NormalizedError {
  message: string;
  name?: string;
  code?: string;
  stack?: string;
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
