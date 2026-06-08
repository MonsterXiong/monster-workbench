import { defineStore } from "pinia";
import {
  nativeEventService,
  type TauriEventCallback,
  type TauriUnlistenFn,
} from "../services/native-event.service";

export const useNativeEventStore = defineStore("native-event", () => {
  async function listenEvent<T = unknown>(
    eventName: string,
    callback: TauriEventCallback<T>
  ): Promise<TauriUnlistenFn | null> {
    return nativeEventService.listenEvent<T>(eventName, callback);
  }

  return {
    listenEvent,
  };
});

export type { TauriEventCallback, TauriUnlistenFn };
