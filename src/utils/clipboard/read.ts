import { canUseClipboardRead } from "./availability";
import { createClipboardReadResult } from "./result";
import type { ClipboardReadResult, ReadClipboardTextOptions } from "./types";

export async function readClipboardText(): Promise<string> {
  if (!canUseClipboardRead()) {
    throw new Error("Clipboard read is not available");
  }

  return navigator.clipboard.readText();
}

export async function readClipboardTextResult(options: ReadClipboardTextOptions = {}): Promise<ClipboardReadResult> {
  try {
    return createClipboardReadResult(true, await readClipboardText());
  } catch (error) {
    return createClipboardReadResult(false, options.fallback ?? "", error);
  }
}

export async function tryReadClipboardText(): Promise<string | null> {
  try {
    return await readClipboardText();
  } catch {
    return null;
  }
}

export async function safeReadClipboardText(options: ReadClipboardTextOptions = {}): Promise<string> {
  return (await tryReadClipboardText()) ?? options.fallback ?? "";
}
