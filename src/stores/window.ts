import { defineStore } from "pinia";
import { ref } from "vue";
import { windowControl } from "../services/window-control";

export const useWindowStore = defineStore("window", () => {
  const isMaximized = ref(false);
  const isDesktopRuntime = ref(windowControl.isAvailable());

  async function minimize() {
    if (!isDesktopRuntime.value) return;
    await windowControl.minimize();
  }

  async function toggleMaximize() {
    if (!isDesktopRuntime.value) return;
    await windowControl.toggleMaximize();
    isMaximized.value = !isMaximized.value;
  }

  async function hide() {
    if (!isDesktopRuntime.value) return;
    await windowControl.hide();
  }

  async function close() {
    if (!isDesktopRuntime.value) return;
    await windowControl.close();
  }

  async function setAlwaysOnTop(alwaysOnTop: boolean) {
    if (!isDesktopRuntime.value) return;
    await windowControl.setAlwaysOnTop(alwaysOnTop);
  }

  return {
    isMaximized,
    isDesktopRuntime,
    minimize,
    toggleMaximize,
    hide,
    close,
    setAlwaysOnTop,
  };
});
