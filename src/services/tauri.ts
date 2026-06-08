import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getVersion } from "@tauri-apps/api/app";
import { listen as tauriListen } from "@tauri-apps/api/event";
import type { EventCallback, UnlistenFn } from "@tauri-apps/api/event";
import { ensureBrowserMessage, isTauriRuntime } from "./runtime";
import { redactSensitiveObjectDeep } from "../utils";

export type TauriEventCallback<T = unknown> = EventCallback<T>;
export type TauriUnlistenFn = UnlistenFn;
export { convertFileSrc, getCurrentWebviewWindow, getVersion };
export const listen = tauriListen;

export async function callTauri<T = unknown>(
  command: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  if (!isTauriRuntime()) {
    if (import.meta.env.DEV) {
      const { mockCallTauri } = await import("./tauri.mock");
      return await mockCallTauri<T>(command, args);
    }
    throw new Error("[ERR_IPC_BROWSER] " + ensureBrowserMessage("底座原生能力"));
  }

  try {
    if (import.meta.env.DEV) {
      console.log(`[IPC] ${command}`, redactSensitiveObjectDeep(args));
    }

    return await invoke<T>(command, args);
  } catch (error) {
    let message = "[ERR_IPC_INVOKE] 底座原生方法调用失败";

    if (typeof error === "string") {
      message = error;
    } else if (error instanceof Error) {
      message = error.message;
    } else if (error && typeof error === "object" && "message" in error) {
      message = String((error as { message: unknown }).message);
    }

    throw new Error(message);
  }
}
