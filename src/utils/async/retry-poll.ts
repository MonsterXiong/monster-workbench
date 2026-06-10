import { getCurrentTimestampMs } from "../date";
import { toNonNegativeInteger } from "../number";
import { sleep } from "./sleep";
import { normalizeDelayMs } from "./timer";
import type { PollOptions, RetryOptions, RetryOptionsSummary } from "./types";

export function summarizeRetryOptions(options: RetryOptions = {}): RetryOptionsSummary {
  const retries = toNonNegativeInteger(options.retries ?? 2);
  const delayMs = normalizeDelayMs(options.delayMs ?? 300);

  return {
    retries,
    maxAttempts: retries + 1,
    delayMs,
    hasDelay: delayMs > 0,
    hasRetryPredicate: typeof options.shouldRetry === "function",
  };
}

export async function retry<T>(task: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = toNonNegativeInteger(options.retries ?? 2);
  const delayMs = normalizeDelayMs(options.delayMs ?? 300);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await task(attempt);
    } catch (error) {
      const canRetry = attempt < retries && (options.shouldRetry?.(error, attempt) ?? true);

      if (!canRetry) {
        throw error;
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  throw new Error("Retry failed");
}

export async function poll<T>(task: (attempt: number) => Promise<T>, options: PollOptions<T> = {}): Promise<T> {
  const intervalMs = normalizeDelayMs(options.intervalMs ?? 300);
  const timeoutMs = options.timeoutMs === undefined ? Number.POSITIVE_INFINITY : normalizeDelayMs(options.timeoutMs);
  const startedAt = getCurrentTimestampMs();
  let attempt = 0;

  while (true) {
    const value = await task(attempt);

    if (options.isDone?.(value, attempt) ?? Boolean(value)) {
      return value;
    }

    if (getCurrentTimestampMs() - startedAt >= timeoutMs) {
      throw new Error("Polling timed out");
    }

    attempt += 1;
    if (intervalMs > 0) {
      await sleep(intervalMs);
    }
  }
}

export function waitUntil(predicate: () => boolean | Promise<boolean>, options: Omit<PollOptions<boolean>, "isDone"> = {}): Promise<boolean> {
  return poll(() => Promise.resolve(predicate()), {
    ...options,
    isDone: (value) => value,
  });
}
