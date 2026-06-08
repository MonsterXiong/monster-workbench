export type AnyFunction = (this: any, ...args: any[]) => unknown;

export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)));
}

export function debounce<T extends AnyFunction>(fn: T, delay = 300): (this: ThisParameterType<T>, ...args: Parameters<T>) => void {
  let timer: ReturnType<typeof window.setTimeout> | null = null;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (timer) {
      window.clearTimeout(timer);
    }

    timer = window.setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, Math.max(0, delay));
  };
}

export function throttle<T extends AnyFunction>(fn: T, interval = 300): (this: ThisParameterType<T>, ...args: Parameters<T>) => void {
  let lastRun = 0;
  let timer: ReturnType<typeof window.setTimeout> | null = null;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = Math.max(0, interval - (now - lastRun));

    if (remaining === 0) {
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }

      lastRun = now;
      fn.apply(this, args);
      return;
    }

    if (!timer) {
      timer = window.setTimeout(() => {
        lastRun = Date.now();
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
    window.setTimeout(() => {
      inThrottle = false;
    }, Math.max(0, interval));
  };
}

export async function withTimeout<T>(task: Promise<T>, timeoutMs: number, message = "Operation timed out"): Promise<T> {
  let timer: ReturnType<typeof window.setTimeout> | null = null;

  try {
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(message)), Math.max(0, timeoutMs));
      }),
    ]);
  } finally {
    if (timer) {
      window.clearTimeout(timer);
    }
  }
}

export async function retry<T>(task: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = Math.max(0, Math.floor(options.retries ?? 2));
  const delayMs = Math.max(0, options.delayMs ?? 300);

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

export async function runSequential<T, R>(items: readonly T[], task: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = [];

  for (let index = 0; index < items.length; index += 1) {
    results.push(await task(items[index], index));
  }

  return results;
}

export async function runConcurrent<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>,
  concurrency = 4
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const workerCount = Math.max(1, Math.min(items.length, Math.floor(concurrency)));
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
