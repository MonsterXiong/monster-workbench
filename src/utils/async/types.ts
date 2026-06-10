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
