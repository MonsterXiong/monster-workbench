import { storeToRefs } from "pinia";
import { useWindowStore } from "../stores/window";

export function useWindowState() {
  const windowStore = useWindowStore();
  const { isMaximized } = storeToRefs(windowStore);

  const minimize = async () => {
    await windowStore.minimize();
  };

  const toggleMaximize = async () => {
    await windowStore.toggleMaximize();
  };

  const hide = async () => {
    await windowStore.hide();
  };

  const close = async () => {
    await windowStore.close();
  };

  return {
    isMaximized,
    minimize,
    toggleMaximize,
    hide,
    close,
  };
}
