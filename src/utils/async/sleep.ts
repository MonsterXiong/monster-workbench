import { getCurrentTimestampMs } from "../date";
import { clearTimeoutHandle, createAnimationFrame, createTimeout } from "./timer";
import type { AbortableSleepOptions, TimeoutHandle } from "./types";

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
