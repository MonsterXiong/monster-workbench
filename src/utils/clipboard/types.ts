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

export interface ClipboardReadResult {
  success: boolean;
  text: string;
  error?: unknown;
}

export interface ClipboardResultSummary {
  success: boolean;
  hasText: boolean;
  textLength: number;
  method?: ClipboardCopyMethod;
  error?: unknown;
}

export interface FormatClipboardResultSummaryOptions {
  successText?: string;
  emptyText?: string;
  failedText?: string;
  includeLength?: boolean;
}

export interface ClipboardAvailabilitySummary {
  canRead: boolean;
  canWrite: boolean;
  available: boolean;
  readOnly: boolean;
  writeOnly: boolean;
  unavailable: boolean;
}

export interface ClipboardResultReport<T extends ClipboardCopyResult | ClipboardReadResult = ClipboardCopyResult | ClipboardReadResult> {
  result: T;
  summary: ClipboardResultSummary;
  text: string;
}

export interface ReadClipboardTextOptions {
  fallback?: string;
}
