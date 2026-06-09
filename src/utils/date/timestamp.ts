import { floorToInteger, isFiniteNumber } from "../number";
import { toDate } from "./core";
import { formatDate } from "./format";
import type { DateInput, FormatOptionalUnixTimestampOptions, TimestampMsFallback } from "./types";

export function toUnixTimestamp(value: DateInput, unit: "second" | "millisecond" = "second"): number | null {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  return unit === "millisecond" ? date.getTime() : floorToInteger(date.getTime() / 1000);
}

export function getCurrentUnixTimestamp(unit: "second" | "millisecond" = "second"): number {
  return unit === "millisecond" ? Date.now() : floorToInteger(Date.now() / 1000);
}

export function getCurrentTimestampMs(): number {
  return Date.now();
}

export function secondsToMilliseconds(value: unknown, fallback = 0): number {
  if (value === undefined || value === null || typeof value === "boolean") {
    return fallback;
  }

  if (typeof value === "string" && value.trim() === "") {
    return fallback;
  }

  const seconds = Number(value);
  return isFiniteNumber(seconds) ? seconds * 1000 : fallback;
}

export function millisecondsToSeconds(value: unknown, fallback = 0): number {
  if (value === undefined || value === null || typeof value === "boolean") {
    return fallback;
  }

  if (typeof value === "string" && value.trim() === "") {
    return fallback;
  }

  const milliseconds = Number(value);
  return isFiniteNumber(milliseconds) ? milliseconds / 1000 : fallback;
}

function resolveTimestampMsFallback(fallback: TimestampMsFallback): number {
  return typeof fallback === "function" ? fallback() : fallback;
}

export function normalizeTimestampMs(value: unknown, fallback: TimestampMsFallback = getCurrentTimestampMs): number {
  const fallbackValue = resolveTimestampMsFallback(fallback);

  if (value === undefined || value === null || typeof value === "boolean") {
    return fallbackValue;
  }

  if (typeof value === "string" && value.trim() === "") {
    return fallbackValue;
  }

  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? timestamp : fallbackValue;
}

export function normalizeOptionalTimestampMs(value: unknown, fallback: number | null = null): number | null {
  if (value === undefined || value === null || typeof value === "boolean") {
    return fallback;
  }

  if (typeof value === "string" && value.trim() === "") {
    return fallback;
  }

  const timestamp = Number(value);
  return isFiniteNumber(timestamp) ? timestamp : fallback;
}

export function getElapsedMs(startTimestampMs: number, currentTimestampMs = getCurrentTimestampMs()): number {
  return Math.max(0, currentTimestampMs - startTimestampMs);
}

export function hasTimeElapsed(startTimestampMs: number, durationMs: number, currentTimestampMs = getCurrentTimestampMs()): boolean {
  return getElapsedMs(startTimestampMs, currentTimestampMs) >= Math.max(0, durationMs);
}

export function normalizeUnixTimestamp(value: number, unit: "second" | "millisecond" = "second"): number | null {
  if (!isFiniteNumber(value)) {
    return null;
  }

  if (unit === "millisecond") {
    return Math.abs(value) < 1_000_000_000_000 ? floorToInteger(value * 1000) : floorToInteger(value);
  }

  return Math.abs(value) >= 1_000_000_000_000 ? floorToInteger(value / 1000) : floorToInteger(value);
}

export function fromUnixTimestamp(value: number, unit: "second" | "millisecond" = "second"): Date | null {
  const timestamp = unit === "second" ? value * 1000 : value;
  return toDate(timestamp);
}

export function parseUnixTimestampInput(value: unknown): Date | null {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const timestamp = normalizeUnixTimestamp(Number(text));
  return timestamp === null ? null : fromUnixTimestamp(timestamp);
}

export function formatUnixTimestamp(
  value: number,
  unit: "second" | "millisecond" = "second",
  pattern = "YYYY-MM-DD HH:mm:ss",
  fallback = "--"
): string {
  const date = fromUnixTimestamp(value, unit);
  return date ? formatDate(date, pattern, fallback) : fallback;
}

export function formatOptionalUnixTimestamp(
  value: unknown,
  options: FormatOptionalUnixTimestampOptions = {}
): string {
  const fallback = options.fallback ?? "--";

  if (value === undefined || value === null || typeof value === "boolean") {
    return fallback;
  }

  if (typeof value === "string" && value.trim() === "") {
    return fallback;
  }

  const timestamp = Number(value);

  if (!isFiniteNumber(timestamp) || (options.zeroAsMissing && timestamp === 0)) {
    return fallback;
  }

  return formatUnixTimestamp(timestamp, options.unit ?? "second", options.pattern ?? "YYYY-MM-DD HH:mm:ss", fallback);
}
