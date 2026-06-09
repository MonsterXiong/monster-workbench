export type ClipboardCopyMethod = "clipboard-api" | "textarea" | "none";

export interface CopyTextOptions {
  fallbackOnClipboardError?: boolean;
  allowEmpty?: boolean;
}

export interface ClipboardCopyResult {
  success: boolean;
  method: ClipboardCopyMethod;
  textLength: number;
  error?: unknown;
}

export interface ReadClipboardTextOptions {
  fallback?: string;
}

export function canUseClipboardWrite(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function";
}

export function canUseClipboardRead(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function";
}

export function createClipboardCopyResult(
  success: boolean,
  method: ClipboardCopyMethod,
  text: string,
  error?: unknown
): ClipboardCopyResult {
  return {
    success,
    method,
    textLength: text.length,
    ...(error === undefined ? {} : { error }),
  };
}

export function copyTextUsingTextarea(text: string): boolean {
  if (typeof document === "undefined" || !document.body) {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";

  try {
    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

export async function copyTextToClipboardResult(text: string, options: CopyTextOptions = {}): Promise<ClipboardCopyResult> {
  if (!options.allowEmpty && !text) {
    return createClipboardCopyResult(false, "none", text);
  }

  const fallbackOnClipboardError = options.fallbackOnClipboardError ?? true;
  let clipboardError: unknown;

  if (canUseClipboardWrite()) {
    try {
      await navigator.clipboard.writeText(text);
      return createClipboardCopyResult(true, "clipboard-api", text);
    } catch (error) {
      clipboardError = error;
      if (!fallbackOnClipboardError) {
        return createClipboardCopyResult(false, "clipboard-api", text, error);
      }
    }
  }

  try {
    const success = copyTextUsingTextarea(text);
    return createClipboardCopyResult(success, success ? "textarea" : "none", text, success ? undefined : clipboardError);
  } catch (error) {
    return createClipboardCopyResult(false, "textarea", text, error);
  }
}

export async function copyTextToClipboard(text: string, options: CopyTextOptions = {}): Promise<boolean> {
  const result = await copyTextToClipboardResult(text, options);

  if (result.error && !result.success && options.fallbackOnClipboardError === false) {
    throw result.error;
  }

  return result.success;
}

export async function readClipboardText(): Promise<string> {
  if (!canUseClipboardRead()) {
    throw new Error("Clipboard read is not available");
  }

  return navigator.clipboard.readText();
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
