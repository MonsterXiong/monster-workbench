import { invoke } from "@tauri-apps/api/core";
import { ensureBrowserMessage, isTauriRuntime } from "./runtime";

export async function callTauri<T = unknown>(
  command: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  if (!isTauriRuntime()) {
    throw new Error(ensureBrowserMessage("原生能力"));
  }

  try {
    if (import.meta.env.DEV) {
      console.log(`[IPC] ${command}`, args);
    }

    return await invoke<T>(command, args);
  } catch (error) {
    let message = "原生调用失败";

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
