import { isFiniteNumber, toFiniteNumber } from "../number";
import { joinNonEmptyStrings } from "../string";
import { DEFAULT_BYTE_UNITS } from "./constants";
import type {
  FormatBytesOptions,
  FormatBytesProgressOptions,
  FormatFileTypeSizeOptions,
  FormatOptionalBytesOptions,
} from "./types";

export function formatBytes(bytes: number, options: FormatBytesOptions = {}): string {
  const base = options.base ?? 1024;
  const decimals = options.decimals ?? 2;
  const units = options.units ?? DEFAULT_BYTE_UNITS;
  const safeBytes = Math.max(0, toFiniteNumber(bytes));

  if (safeBytes === 0) {
    return `0 ${units[0]}`;
  }

  const unitIndex = Math.min(Math.floor(Math.log(safeBytes) / Math.log(base)), units.length - 1);
  const value = safeBytes / base ** unitIndex;
  const formattedValue = Number(value.toFixed(decimals)).toString();
  return `${formattedValue} ${units[unitIndex]}`;
}

export function formatOptionalBytes(value: unknown, options: FormatOptionalBytesOptions = {}): string {
  const { fallback = "--", ...bytesOptions } = options;
  const safeValue = toFiniteNumber(value, Number.NaN);
  return isFiniteNumber(safeValue) ? formatBytes(safeValue, bytesOptions) : fallback;
}

export function formatBytesProgress(currentBytes: number, totalBytes: number, options: FormatBytesProgressOptions = {}): string {
  const { separator = " / ", ...bytesOptions } = options;
  return `${formatBytes(currentBytes, bytesOptions)}${separator}${formatBytes(totalBytes, bytesOptions)}`;
}

export function formatBytesRate(bytesPerSecond: number, options: FormatBytesOptions = {}): string {
  return `${formatBytes(bytesPerSecond, options)}/s`;
}

export function formatFileTypeSize(
  type: unknown,
  sizeBytes: unknown,
  options: FormatFileTypeSizeOptions = {}
): string {
  const { separator = " · ", fallback = "", ...bytesOptions } = options;
  const typeText = String(type ?? "").trim();
  const safeSizeBytes = toFiniteNumber(sizeBytes, Number.NaN);
  const sizeText = isFiniteNumber(safeSizeBytes) ? formatBytes(safeSizeBytes, bytesOptions) : "";

  return joinNonEmptyStrings([typeText, sizeText], separator) || fallback;
}
