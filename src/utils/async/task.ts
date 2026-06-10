import { getCurrentTimestampMs } from "../date";
import type { AsyncTaskReport, AsyncTaskResult, AsyncTaskResultSummary, RunWithLoadingOptions } from "./types";

function getAsyncErrorMessage(error: unknown, fallback = ""): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "string") {
    return error || fallback;
  }

  return error === undefined || error === null ? fallback : String(error);
}

export function createAsyncTaskResult<T>(ok: true, value: T): AsyncTaskResult<T>;
export function createAsyncTaskResult<T>(ok: false, value: T | undefined, error: unknown): AsyncTaskResult<T>;
export function createAsyncTaskResult<T>(ok: boolean, value?: T, error?: unknown): AsyncTaskResult<T> {
  return {
    ok,
    ...(value === undefined ? {} : { value }),
    ...(error === undefined ? {} : { error }),
  };
}

export function summarizeAsyncTaskResult<T>(result: AsyncTaskResult<T>): AsyncTaskResultSummary {
  return {
    ok: result.ok,
    failed: !result.ok,
    hasValue: result.value !== undefined,
    hasError: result.error !== undefined,
    errorMessage: getAsyncErrorMessage(result.error),
  };
}

export function createAsyncTaskReport<T>(
  result: AsyncTaskResult<T>,
  startedAtMs: number,
  endedAtMs = getCurrentTimestampMs()
): AsyncTaskReport<T> {
  return {
    result,
    summary: summarizeAsyncTaskResult(result),
    startedAtMs,
    endedAtMs,
    durationMs: Math.max(0, endedAtMs - startedAtMs),
  };
}

export async function runAsyncTask<T>(task: () => Promise<T>, fallback?: T): Promise<AsyncTaskResult<T>> {
  try {
    return createAsyncTaskResult(true, await task());
  } catch (error) {
    return createAsyncTaskResult(false, fallback, error);
  }
}

export async function runAsyncTaskWithReport<T>(task: () => Promise<T>, fallback?: T): Promise<AsyncTaskReport<T>> {
  const startedAtMs = getCurrentTimestampMs();
  const result = await runAsyncTask(task, fallback);
  return createAsyncTaskReport(result, startedAtMs);
}

export async function runWithLoading<T>(
  task: () => Promise<T>,
  options: RunWithLoadingOptions<T>
): Promise<AsyncTaskResult<T>> {
  options.setLoading(true);

  if (options.clearErrorBeforeRun ?? true) {
    options.setError?.(null);
  }

  try {
    const value = await task();
    return {
      ok: true,
      value,
    };
  } catch (error) {
    options.setError?.(error);

    if (options.rethrow) {
      throw error;
    }

    return {
      ok: false,
      ...(options.fallback === undefined ? {} : { value: options.fallback }),
      error,
    };
  } finally {
    options.setLoading(false);
  }
}
