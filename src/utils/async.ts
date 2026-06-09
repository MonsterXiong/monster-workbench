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

export interface RetryOptionsSummary {
  retries: number;
  maxAttempts: number;
  delayMs: number;
  hasDelay: boolean;
  hasRetryPredicate: boolean;
}

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

export interface PollOptions<T> {
  intervalMs?: number;
  timeoutMs?: number;
  isDone?: (value: T, attempt: number) => boolean;
}

export interface TimeoutResult<T> {
  timedOut: boolean;
  value?: T;
  error?: unknown;
}

export interface AsyncTaskResult<T> {
  ok: boolean;
  value?: T;
  error?: unknown;
}

export interface AsyncTaskResultSummary {
  ok: boolean;
  failed: boolean;
  hasValue: boolean;
  hasError: boolean;
  errorMessage: string;
}

export interface AsyncTaskReport<T> {
  result: AsyncTaskResult<T>;
  summary: AsyncTaskResultSummary;
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
}

export interface RunWithLoadingOptions<T> {
  setLoading: (loading: boolean) => void;
  setError?: (error: unknown | null) => void;
  fallback?: T;
  clearErrorBeforeRun?: boolean;
  rethrow?: boolean;
}

export interface TimeoutResultSummary {
  timedOut: boolean;
  fulfilled: boolean;
  rejected: boolean;
  hasValue: boolean;
  hasError: boolean;
}

export interface SettledResultsSummary {
  totalCount: number;
  fulfilledCount: number;
  rejectedCount: number;
  fulfilledRatio: number;
  rejectedRatio: number;
  fulfilledPercent: number;
  rejectedPercent: number;
  allFulfilled: boolean;
  hasRejected: boolean;
  empty: boolean;
}

export interface FormatSettledResultsSummaryOptions {
  emptyText?: string;
  fulfilledLabel?: string;
  rejectedLabel?: string;
  allFulfilledText?: string;
  separator?: string;
  includePercent?: boolean;
}

export interface AsyncBatchPlanSummary {
  itemCount: number;
  requestedConcurrency: number;
  concurrency: number;
  workerCount: number;
  sequential: boolean;
  parallel: boolean;
  empty: boolean;
}

export interface FormatAsyncBatchPlanSummaryOptions {
  emptyText?: string;
  itemLabel?: string;
  workerLabel?: string;
  separator?: string;
  includeConcurrency?: boolean;
}

export interface SettledResultsReport<T> {
  results: Array<PromiseSettledResult<T>>;
  fulfilledValues: T[];
  rejectedReasons: unknown[];
  summary: SettledResultsSummary;
}

export interface AsyncBatchReport<T> {
  report: SettledResultsReport<T>;
  plan: AsyncBatchPlanSummary;
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
  success: boolean;
  failed: boolean;
}

export interface SettledResultEntry<T> {
  index: number;
  result: PromiseSettledResult<T>;
  fulfilled: boolean;
  rejected: boolean;
  value?: T;
  reason?: unknown;
}

export interface AbortableSleepOptions {
  signal?: AbortSignal | null;
  message?: string;
}

export interface DebouncedFunction<T extends AnyFunction> {
  (this: ThisParameterType<T>, ...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
  pending: () => boolean;
}

export function normalizeDelayMs(delayMs: number): number {
  return Number.isFinite(delayMs) ? Math.max(0, delayMs) : 0;
}

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

export function getRemainingDelayMs(startedAtMs: number, durationMs: number, nowMs = getCurrentTimestampMs()): number {
  return normalizeDelayMs(durationMs - Math.max(0, nowMs - startedAtMs));
}

export function createDeferred<T = void>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  let reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
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

export function createAbortError(message = "Operation aborted"): Error {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

export function sleepWithSignal(ms: number, options: AbortableSleepOptions = {}): Promise<void> {
  const signal = options.signal ?? null;

  if (signal?.aborted) {
    return Promise.reject(createAbortError(options.message));
  }

  return new Promise((resolve, reject) => {
    let timer: TimeoutHandle | null = null;
    const abort = () => {
      clearTimeoutHandle(timer);
      reject(createAbortError(options.message));
    };

    timer = createTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);

    signal?.addEventListener("abort", abort, { once: true });
  });
}

export function sleepUntil(timestampMs: number): Promise<void> {
  return sleep(Math.max(0, timestampMs - getCurrentTimestampMs()));
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

export function createDebouncedFunction<T extends AnyFunction>(fn: T, delay = 300): DebouncedFunction<T> {
  let timer: TimeoutHandle | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: ThisParameterType<T> | undefined;

  const clearPending = () => {
    clearTimeoutHandle(timer);
    timer = null;
  };

  const invoke = (): ReturnType<T> | undefined => {
    if (!lastArgs) {
      return undefined;
    }

    const args = lastArgs;
    const context = lastThis;
    lastArgs = null;
    lastThis = undefined;
    clearPending();
    return fn.apply(context, args) as ReturnType<T>;
  };

  const debounced = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;
    clearPending();
    timer = createTimeout(invoke, delay);
  } as DebouncedFunction<T>;

  debounced.cancel = () => {
    lastArgs = null;
    lastThis = undefined;
    clearPending();
  };
  debounced.flush = invoke;
  debounced.pending = () => timer !== null;

  return debounced;
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

export async function withTimeoutResult<T>(task: Promise<T>, timeoutMs: number, message = "Operation timed out"): Promise<TimeoutResult<T>> {
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

export function normalizeConcurrency(concurrency: number, itemCount?: number): number {
  const safeConcurrency = toIntegerAtLeast(concurrency, 1);

  if (itemCount === undefined) {
    return safeConcurrency;
  }

  const safeItemCount = toNonNegativeInteger(itemCount);
  return safeItemCount === 0 ? 1 : Math.min(safeConcurrency, safeItemCount);
}

export function summarizeAsyncBatchPlan(itemCount: unknown, concurrency = 4): AsyncBatchPlanSummary {
  const safeItemCount = toNonNegativeInteger(itemCount);
  const requestedConcurrency = toIntegerAtLeast(concurrency, 1);
  const workerCount = normalizeConcurrency(requestedConcurrency, safeItemCount);

  return {
    itemCount: safeItemCount,
    requestedConcurrency,
    concurrency: workerCount,
    workerCount,
    sequential: safeItemCount <= 1 || workerCount <= 1,
    parallel: safeItemCount > 1 && workerCount > 1,
    empty: safeItemCount === 0,
  };
}

export function formatAsyncBatchPlanSummary(
  summary: AsyncBatchPlanSummary,
  options: FormatAsyncBatchPlanSummaryOptions = {}
): string {
  if (summary.empty) {
    return options.emptyText ?? "0 tasks";
  }

  const separator = options.separator ?? " / ";
  const itemLabel = options.itemLabel ?? "tasks";
  const workerLabel = options.workerLabel ?? "workers";
  const parts = [`${summary.itemCount} ${itemLabel}`, `${summary.workerCount} ${workerLabel}`];

  if (options.includeConcurrency && summary.requestedConcurrency !== summary.workerCount) {
    parts.push(`requested ${summary.requestedConcurrency}`);
  }

  return parts.join(separator);
}

export function createAsyncBatchReport<T>(
  results: readonly PromiseSettledResult<T>[],
  plan: AsyncBatchPlanSummary,
  startedAtMs: number,
  endedAtMs = getCurrentTimestampMs()
): AsyncBatchReport<T> {
  const report = createSettledResultsReport(results);

  return {
    report,
    plan,
    startedAtMs,
    endedAtMs,
    durationMs: Math.max(0, endedAtMs - startedAtMs),
    success: report.summary.allFulfilled,
    failed: report.summary.hasRejected,
  };
}

export async function runAllSettled<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> {
  return Promise.allSettled(items.map((item, index) => task(item, index)));
}

export async function runAllSettledWithSummary<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>
): Promise<SettledResultsReport<R>> {
  return createSettledResultsReport(await runAllSettled(items, task));
}

export async function runAllSettledWithReport<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>
): Promise<AsyncBatchReport<R>> {
  const startedAtMs = getCurrentTimestampMs();
  const results = await runAllSettled(items, task);
  return createAsyncBatchReport(results, summarizeAsyncBatchPlan(items.length, items.length || 1), startedAtMs);
}

export function isFulfilledResult<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === "fulfilled";
}

export function isRejectedResult<T>(result: PromiseSettledResult<T>): result is PromiseRejectedResult {
  return result.status === "rejected";
}

export function getFulfilledValues<T>(results: readonly PromiseSettledResult<T>[]): T[] {
  return results.filter(isFulfilledResult).map((result) => result.value);
}

export function getRejectedReasons<T>(results: readonly PromiseSettledResult<T>[]): unknown[] {
  return results.filter(isRejectedResult).map((result) => result.reason);
}

export function mapSettledResultEntries<T>(results: readonly PromiseSettledResult<T>[]): Array<SettledResultEntry<T>> {
  return results.map((result, index) => ({
    index,
    result,
    fulfilled: isFulfilledResult(result),
    rejected: isRejectedResult(result),
    value: isFulfilledResult(result) ? result.value : undefined,
    reason: isRejectedResult(result) ? result.reason : undefined,
  }));
}

export function getFulfilledResultEntries<T>(results: readonly PromiseSettledResult<T>[]): Array<SettledResultEntry<T>> {
  return mapSettledResultEntries(results).filter((entry) => entry.fulfilled);
}

export function getRejectedResultEntries<T>(results: readonly PromiseSettledResult<T>[]): Array<SettledResultEntry<T>> {
  return mapSettledResultEntries(results).filter((entry) => entry.rejected);
}

export function summarizeSettledResults<T>(results: readonly PromiseSettledResult<T>[]): SettledResultsSummary {
  const fulfilledCount = results.filter(isFulfilledResult).length;
  const rejectedCount = results.length - fulfilledCount;
  const fulfilledRatio = results.length > 0 ? fulfilledCount / results.length : 0;
  const rejectedRatio = results.length > 0 ? rejectedCount / results.length : 0;

  return {
    totalCount: results.length,
    fulfilledCount,
    rejectedCount,
    fulfilledRatio,
    rejectedRatio,
    fulfilledPercent: fulfilledRatio * 100,
    rejectedPercent: rejectedRatio * 100,
    allFulfilled: results.length > 0 && rejectedCount === 0,
    hasRejected: rejectedCount > 0,
    empty: results.length === 0,
  };
}

function formatSettledResultsPercent(value: number): string {
  return `${Number(value.toFixed(1))}%`;
}

export function formatSettledResultsSummary(
  summary: SettledResultsSummary,
  options: FormatSettledResultsSummaryOptions = {}
): string {
  if (summary.empty) {
    return options.emptyText ?? "0 settled";
  }

  if (summary.allFulfilled && options.allFulfilledText) {
    return options.includePercent
      ? `${options.allFulfilledText} (${formatSettledResultsPercent(summary.fulfilledPercent)})`
      : options.allFulfilledText;
  }

  const fulfilledLabel = options.fulfilledLabel ?? "fulfilled";
  const rejectedLabel = options.rejectedLabel ?? "rejected";
  const separator = options.separator ?? " · ";
  const fulfilledText = `${summary.fulfilledCount}/${summary.totalCount} ${fulfilledLabel}`;
  const rejectedText = summary.rejectedCount > 0 ? `${summary.rejectedCount} ${rejectedLabel}` : "";
  const percentText = options.includePercent ? formatSettledResultsPercent(summary.fulfilledPercent) : "";

  return [fulfilledText, rejectedText, percentText].filter(Boolean).join(separator);
}

export function formatSettledResults<T>(
  results: readonly PromiseSettledResult<T>[],
  options: FormatSettledResultsSummaryOptions = {}
): string {
  return formatSettledResultsSummary(summarizeSettledResults(results), options);
}

export function createSettledResultsReport<T>(results: readonly PromiseSettledResult<T>[]): SettledResultsReport<T> {
  return {
    results: [...results],
    fulfilledValues: getFulfilledValues(results),
    rejectedReasons: getRejectedReasons(results),
    summary: summarizeSettledResults(results),
  };
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

export async function runSequentialSettledWithSummary<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>
): Promise<SettledResultsReport<R>> {
  return createSettledResultsReport(await runSequentialSettled(items, task));
}

export async function runSequentialSettledWithReport<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>
): Promise<AsyncBatchReport<R>> {
  const startedAtMs = getCurrentTimestampMs();
  const results = await runSequentialSettled(items, task);
  return createAsyncBatchReport(results, summarizeAsyncBatchPlan(items.length, 1), startedAtMs);
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

export async function runConcurrentSettledWithSummary<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>,
  concurrency = 4
): Promise<SettledResultsReport<R>> {
  return createSettledResultsReport(await runConcurrentSettled(items, task, concurrency));
}

export async function runConcurrentSettledWithReport<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>,
  concurrency = 4
): Promise<AsyncBatchReport<R>> {
  const startedAtMs = getCurrentTimestampMs();
  const results = await runConcurrentSettled(items, task, concurrency);
  return createAsyncBatchReport(results, summarizeAsyncBatchPlan(items.length, concurrency), startedAtMs);
}

export async function runBatchSettledWithReport<T, R>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<R>,
  concurrency = 4
): Promise<AsyncBatchReport<R>> {
  const plan = summarizeAsyncBatchPlan(items.length, concurrency);
  const startedAtMs = getCurrentTimestampMs();
  const results = plan.sequential
    ? await runSequentialSettled(items, task)
    : await runConcurrentSettled(items, task, plan.concurrency);

  return createAsyncBatchReport(results, plan, startedAtMs);
}
