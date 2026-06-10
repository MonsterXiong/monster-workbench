import { getCurrentTimestampMs } from "../date";
import { isFiniteNumber, isNaNNumber, isPositiveFiniteNumber, toFiniteNumber, toIntegerAtLeast } from "../number";
import { DURATION_UNITS, RELATIVE_TIME_UNITS } from "./constants";
import type { FormatDurationOptions, FormatRelativeTimeOptions } from "./types";

/** 执行格式化逻辑并返回可展示字符串。 */
export function formatDuration(ms: number, options: FormatDurationOptions = {}): string {
  const safeMs = Math.max(0, toFiniteNumber(ms, Number.NaN));

  if (isNaNNumber(safeMs)) {
    return options.fallback ?? "--";
  }

  if (safeMs < 1000) {
    return `${Math.round(safeMs)}ms`;
  }

  const maxUnits = toIntegerAtLeast(options.maxUnits ?? 2, 1);
  let remaining = safeMs;
  const parts: string[] = [];

  for (const unit of DURATION_UNITS) {
    const value = Math.floor(remaining / unit.value);

    if (value > 0) {
      parts.push(`${value}${unit.label}`);
      remaining -= value * unit.value;
    }

    if (parts.length >= maxUnits) {
      break;
    }
  }

  return parts.join(" ") || "0ms";
}

export function formatPositiveDuration(value: unknown, options: FormatDurationOptions = {}): string {
  const safeMs = toFiniteNumber(value, Number.NaN);

  if (!isPositiveFiniteNumber(safeMs)) {
    return options.fallback ?? "";
  }

  return formatDuration(safeMs, options);
}

export function formatDurationClock(ms: number, includeHours = true, fallback = "00:00"): string {
  const safeMs = Math.max(0, toFiniteNumber(ms, Number.NaN));

  if (isNaNNumber(safeMs)) {
    return fallback;
  }

  const totalSeconds = Math.floor(safeMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const parts = includeHours || hours > 0
    ? [hours, minutes, seconds]
    : [minutes, seconds];

  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatRelativeTime(value: number | Date, options: FormatRelativeTimeOptions = {}): string {
  const timestamp = value instanceof Date ? value.getTime() : value;
  const now = options.now instanceof Date ? options.now.getTime() : options.now ?? getCurrentTimestampMs();

  if (!isFiniteNumber(timestamp) || !isFiniteNumber(now)) {
    return options.fallback ?? "--";
  }

  const diff = timestamp - now;
  const absDiff = Math.abs(diff);
  const formatter = new Intl.RelativeTimeFormat(options.locale ?? "zh-CN", { numeric: options.numeric ?? "auto" });

  for (const item of RELATIVE_TIME_UNITS) {
    if (absDiff >= item.value) {
      return formatter.format(Math.round(diff / item.value), item.unit as Intl.RelativeTimeFormatUnit);
    }
  }

  return formatter.format(0, "second");
}
