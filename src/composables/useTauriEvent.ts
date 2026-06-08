import { onUnmounted } from "vue";
import {
  useNativeEventStore,
  type TauriEventCallback,
  type TauriUnlistenFn,
} from "../stores/native-event";

export function useTauriEvent<T = any>(
  eventName: string,
  callback: TauriEventCallback<T>
) {
  const nativeEventStore = useNativeEventStore();
  let unlistenFn: TauriUnlistenFn | null = null;

  const registerListener = async () => {
    try {
      unlistenFn = await nativeEventStore.listenEvent<T>(eventName, callback);
    } catch (err) {
      console.error(`[ERR_TAURI_EVENT] 监听 Tauri 事件 ${eventName} 异常:`, err);
    }
  };

  registerListener();

  onUnmounted(() => {
    if (unlistenFn) {
      unlistenFn();
    }
  });
}
