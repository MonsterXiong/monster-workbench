import type { FileNameSanitizeSummary } from "./types";

const FILE_NAME_UNSAFE_CHAR_REGEXP = /[<>:"/\\|?*\u0000-\u001F]/;
const FILE_NAME_UNSAFE_CHAR_GLOBAL_REGEXP = /[<>:"/\\|?*\u0000-\u001F]/g;

export function sanitizeFileName(value: string, replacement = "_"): string {
  return value.replace(FILE_NAME_UNSAFE_CHAR_GLOBAL_REGEXP, replacement).replace(/\s+/g, " ").trim();
}

export function isSafeFileName(value: string): boolean {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 && !FILE_NAME_UNSAFE_CHAR_REGEXP.test(trimmedValue);
}

/** 内部核心工具方法。 */
export function sanitizeFileNameWithFallback(value: string, fallback = "untitled", replacement = "_"): string {
  return sanitizeFileName(value, replacement) || fallback;
}

export function summarizeFileNameSanitize(
  value: string,
  fallback = "untitled",
  replacement = "_"
): FileNameSanitizeSummary {
  const sanitizedName = sanitizeFileNameWithFallback(value, fallback, replacement);

  return {
    originalName: value,
    sanitizedName,
    fallbackUsed: sanitizeFileName(value, replacement).length === 0,
    changed: value !== sanitizedName,
    safe: isSafeFileName(sanitizedName),
  };
}
