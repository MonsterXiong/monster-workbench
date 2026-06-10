import { getCurrentTimestampMs } from "../date";
import { clearTimeoutHandle, createTimeout, normalizeDelayMs } from "./timer";
import type { AnyFunction, DebouncedFunction, TimeoutHandle } from "./types";

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
