import { getCurrentTimestampMs } from "../date";
import type { AnimationFrameHandle, Deferred, IntervalHandle, TimeoutHandle } from "./types";

export function normalizeDelayMs(delayMs: number): number {
  return Number.isFinite(delayMs) ? Math.max(0, delayMs) : 0;
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
