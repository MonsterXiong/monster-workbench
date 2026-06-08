import {
  listen,
  type TauriEventCallback,
  type TauriUnlistenFn,
} from "./tauri";
import { isTauriRuntime } from "./runtime";

async function listenEvent<T = unknown>(
  eventName: string,
  callback: TauriEventCallback<T>
): Promise<TauriUnlistenFn | null> {
  if (!isTauriRuntime()) return null;
  return listen<T>(eventName, callback);
}

export const nativeEventService = {
  listenEvent,
};

export type { TauriEventCallback, TauriUnlistenFn };
