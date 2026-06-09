import { getGreatestCommonDivisor, isPositiveFiniteNumber, maxNumber, minNumber, toFiniteNumber } from "../number";
import type { Dimensions, FormatAspectRatioOptions } from "./types";

export function parseDimensionsText(value: unknown, fallback: Dimensions | null = null): Dimensions | null {
  const [rawWidth, rawHeight] = String(value ?? "").trim().split(/\s*[xX×]\s*/);
  const width = toFiniteNumber(rawWidth, Number.NaN);
  const height = toFiniteNumber(rawHeight, Number.NaN);

  if (!isPositiveFiniteNumber(width) || !isPositiveFiniteNumber(height)) {
    return fallback;
  }

  return { width, height };
}

export function formatDimensions(value: Dimensions | null | undefined, separator = "x", fallback = ""): string {
  return value ? `${value.width}${separator}${value.height}` : fallback;
}

export function isValidDimensions(value: Dimensions | null | undefined): value is Dimensions {
  return Boolean(value && isPositiveFiniteNumber(value.width) && isPositiveFiniteNumber(value.height));
}

export function getDimensionsMaxSide(value: Dimensions | null | undefined, fallback = 0): number {
  return isValidDimensions(value) ? maxNumber([value.width, value.height], fallback) : fallback;
}

export function getDimensionsMinSide(value: Dimensions | null | undefined, fallback = 0): number {
  return isValidDimensions(value) ? minNumber([value.width, value.height], fallback) : fallback;
}

export function getDimensionsArea(value: Dimensions | null | undefined, fallback = 0): number {
  return isValidDimensions(value) ? value.width * value.height : fallback;
}

export function getDimensionsRatio(value: Dimensions | null | undefined, fallback = 1): number {
  return isValidDimensions(value) ? value.width / value.height : fallback;
}

export function reduceDimensions(value: Dimensions | null | undefined): Dimensions | null {
  if (!isValidDimensions(value)) {
    return null;
  }

  const divisor = getGreatestCommonDivisor(value.width, value.height) || 1;
  return {
    width: value.width / divisor,
    height: value.height / divisor,
  };
}

export function formatAspectRatio(
  value: Dimensions | null | undefined,
  fallbackOrOptions: string | FormatAspectRatioOptions = "1 / 1"
): string {
  const options = typeof fallbackOrOptions === "string" ? { fallback: fallbackOrOptions } : fallbackOrOptions;
  const separator = options.separator ?? " / ";

  if (!value) {
    return options.fallback ?? "1 / 1";
  }

  const dimensions = options.reduced ? reduceDimensions(value) : value;
  return dimensions ? `${dimensions.width}${separator}${dimensions.height}` : options.fallback ?? "1 / 1";
}

export function formatReducedAspectRatio(
  value: Dimensions | null | undefined,
  separator = ":",
  fallback = "1:1"
): string {
  return formatAspectRatio(value, { reduced: true, separator, fallback });
}

export function formatDimensionsAspectRatio(
  value: unknown,
  options: FormatAspectRatioOptions = {}
): string {
  return formatAspectRatio(parseDimensionsText(value), {
    reduced: options.reduced ?? true,
    separator: options.separator ?? ":",
    fallback: options.fallback ?? "1:1",
  });
}
