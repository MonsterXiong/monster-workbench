import { clearTimeoutHandle, createTimeout } from "./timer";
import type { TimeoutHandle, TimeoutResult, TimeoutResultSummary } from "./types";

export async function withTimeout<T>(task: Promise<T>, timeoutMs: number, message = "Operation timed out"): Promise<T> {
  let timer: TimeoutHandle | null = null;

  try {
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = createTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeoutHandle(timer);
  }
}

export async function withTimeoutResult<T>(
  task: Promise<T>,
  timeoutMs: number,
  message = "Operation timed out"
): Promise<TimeoutResult<T>> {
  let timer: TimeoutHandle | null = null;
  const timeoutErrors = new WeakSet<object>();

  try {
    const value = await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = createTimeout(() => {
          const error = new Error(message);
          timeoutErrors.add(error);
          reject(error);
        }, timeoutMs);
      }),
    ]);

    return {
      timedOut: false,
      value,
    };
  } catch (error) {
    return {
      timedOut: typeof error === "object" && error !== null && timeoutErrors.has(error),
      error,
    };
  } finally {
    clearTimeoutHandle(timer);
  }
}

export function summarizeTimeoutResult<T>(result: TimeoutResult<T>): TimeoutResultSummary {
  return {
    timedOut: result.timedOut,
    fulfilled: !result.timedOut && result.error === undefined,
    rejected: result.error !== undefined,
    hasValue: result.value !== undefined,
    hasError: result.error !== undefined,
  };
}

export function getTimeoutResultValue<T>(result: TimeoutResult<T>, fallback: T): T {
  return result.error === undefined && result.value !== undefined ? result.value : fallback;
}

export function getTimeoutResultError(result: TimeoutResult<unknown>): unknown {
  return result.error;
}
