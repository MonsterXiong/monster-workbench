import { getCurrentWindow } from "@tauri-apps/api/window";
import { ensureBrowserMessage, isTauriRuntime } from "./runtime";

async function withWindow<T>(task: (appWindow: ReturnType<typeof getCurrentWindow>) => Promise<T>) {
  if (!isTauriRuntime()) {
    throw new Error("[ERR_WIN_CTRL] " + ensureBrowserMessage("窗口控制"));
  }

  return task(getCurrentWindow());
}

export const windowControl = {
  isAvailable(): boolean {
    return isTauriRuntime();
  },

  async minimize(): Promise<void> {
    await withWindow((appWindow) => appWindow.minimize());
  },

  async toggleMaximize(): Promise<void> {
    await withWindow(async (appWindow) => {
      const maximized = await appWindow.isMaximized();
      if (maximized) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
    });
  },

  async hide(): Promise<void> {
    await withWindow((appWindow) => appWindow.hide());
  },

  async close(): Promise<void> {
    await withWindow((appWindow) => appWindow.close());
  },

  async setAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
    await withWindow((appWindow) => appWindow.setAlwaysOnTop(alwaysOnTop));
  },
};
