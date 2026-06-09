import { getCurrentTimestampMs } from "./date";
import { toIntegerAtLeast, toNonNegativeInteger } from "./number";

export type AnyFunction = (this: any, ...args: any[]) => unknown;
export type TimeoutHandle = ReturnType<typeof window.setTimeout>;
export type IntervalHandle = ReturnType<typeof window.setInterval>;
export type AnimationFrameHandle = ReturnType<typeof window.requestAnimationFrame>;

export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export function normalizeDelayMs(delayMs: number): number {
  return Math.max(0, delayMs);
}

export function createTimeout(callback: () => void, delayMs: number): TimeoutHandle {
  return window.setTimeout(callback, normalizeDelayMs(delayMs));
}

export function createInterval(callback: () => void, intervalMs: number): IntervalHandle {
  return window.setInterval(callback, normalizeDelayMs(intervalMs));
}

export function clearTimeoutHandle(timer: TimeoutHandle | null | undefined): void {
  if (timer !== null && timer !== undefined) {
    window.clearTimeout(timer);
  }
}

export function clearIntervalHandle(timer: IntervalHandle | null | undefined): void {
  if (timer !== null && timer !== undefined) {
    window.clearInterval(timer);
  }
}

export function createAnimationFrame(callback: FrameRequestCallback): AnimationFrameHandle {
  return window.requestAnimationFrame(callback);
}

export function clearAnimationFrameHandle(frame: AnimationFrameHandle | null | undefined): void {
  if (frame !== null && frame !== undefined) {
    window.cancelAnimationFrame(frame);
  }
}

export function resetTimeoutHandle(
  timer: TimeoutHandle | null | undefined,
  callback: () => void,
  delayMs: number
): TimeoutHandle {
  clearTimeoutHandle(timer);
  return createTimeout(callback, delayMs);
}

export function clearTimeoutMap<K>(timers: Map<K, TimeoutHandle>): void {
  timers.forEach((timer) => clearTimeoutHandle(timer));
  timers.clear();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => createTimeout(resolve, ms));
}

export function nextAnimationFrame(): Promise<number> {
  return new Promise((resolve) => createAnimationFrame(resolve));
}

export function debounce<T extends AnyFunction>(fn: T, delay = 300): (this: ThisParameterType<T>, ...args: Parameters<T>) => void {
  let timer: TimeoutHandle | null = null;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeoutHandle(timer);

    timer = createTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

export function throttle<T extends AnyFunction>(fn: T, interval = 300): (this: ThisParameterType<T>, ...args: Parameters<T>) => void {
  let lastRun = 0;
  let timer: TimeoutHandle | null = null;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const now = getCurrentTimestampMs();
    const remaining = normalizeDelayMs(interval - (now - lastRun));

    if (remaining === 0) {
      clearTimeoutHandle(timer);
      timer = null;

      lastRun = now;
      fn.apply(this, args);
      return;
    }

    if (!timer) {
      timer = createTimeout(() => {
        lastRun = getCurrentTimestampMs();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

export function throttleLeading<T extends AnyFunction>(fn: T, interval = 300): (this: ThisParameterType<T>, ...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (inThrottle) {
      return;
    }

    fn.apply(this, args);
    inThrottle = true;
    createTimeout(() => {
      inThrottle = false;
    }, interval);
  };
}

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

export function normalizeConcurrency(concurrency: number, itemCount?: number): number {
  const safeConcurrency = toIntegerAtLeast(concurrency, 1);

  if (itemCount === undefined) {
    return safeConcurrency;
  }

  const safeItemCount = toNonNegativeInteger(itemCount);
  return safeItemCount === 0 ? 1 : Math.min(safeConcurrency, safeItemCount);
}

export async function runAllSettled<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> {
  return Promise.allSettled(items.map((item, index) => task(item, index)));
}

export async function runSequential<T, R>(items: readonly T[], task: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = [];

  for (let index = 0; index < items.length; index += 1) {
    results.push(await task(items[index], index));
  }

  return results;
}

export async function runSequentialSettled<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = [];

  for (let index = 0; index < items.length; index += 1) {
    try {
      results.push({ status: "fulfilled", value: await task(items[index], index) });
    } catch (error) {
      results.push({ status: "rejected", reason: error });
    }
  }

  return results;
}

export async function runConcurrent<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>,
  concurrency = 4
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const workerCount = normalizeConcurrency(concurrency, items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

export async function runConcurrentSettled<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>,
  concurrency = 4
): Promise<Array<PromiseSettledResult<R>>> {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  const workerCount = normalizeConcurrency(concurrency, items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;

      try {
        results[index] = { status: "fulfilled", value: await task(items[index], index) };
      } catch (error) {
        results[index] = { status: "rejected", reason: error };
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}
