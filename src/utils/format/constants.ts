import type { StatusTone } from "./types";

export const DEFAULT_BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

export const TEMPLATE_TOKEN_REGEXP = /\{(\w+)\}/g;

export const DURATION_UNITS = [
  { label: "d", value: 86_400_000 },
  { label: "h", value: 3_600_000 },
  { label: "m", value: 60_000 },
  { label: "s", value: 1_000 },
] as const;

export const RELATIVE_TIME_UNITS = [
  { unit: "day", value: 86_400_000 },
  { unit: "hour", value: 3_600_000 },
  { unit: "minute", value: 60_000 },
  { unit: "second", value: 1_000 },
] as const;

export const STATUS_TONES: readonly StatusTone[] = ["neutral", "success", "warning", "danger", "info"];
