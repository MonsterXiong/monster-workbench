import type { ClipboardAvailabilitySummary } from "./types";

export function canUseClipboardWrite(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function";
}

export function canUseClipboardRead(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function";
}

export function summarizeClipboardAvailability(): ClipboardAvailabilitySummary {
  const canRead = canUseClipboardRead();
  const canWrite = canUseClipboardWrite();

  return {
    canRead,
    canWrite,
    available: canRead || canWrite,
    readOnly: canRead && !canWrite,
    writeOnly: canWrite && !canRead,
    unavailable: !canRead && !canWrite,
  };
}
