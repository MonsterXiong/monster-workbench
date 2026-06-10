import type { ClampOptions, NumberBounds, NormalizeSteppedNumberOptions, SteppedNumberSummary } from './types';

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isIntegerNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

export function isNaNNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isNaN(value);
}

export function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

export function isNonNegativeFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

export function toFiniteNumber(value: unknown, fallback = 0): number {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function parseFiniteFloat(value: unknown, fallback = 0): number {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function parseFormattedNumber(value: string, unit = ""): number {
  const normalizedText = unit ? value.replace(unit, "") : value;
  return Number(normalizedText.replace(/,/g, "").trim());
}

export function toInteger(value: unknown, fallback = 0): number {
  return Math.trunc(toFiniteNumber(value, fallback));
}

export function floorToInteger(value: unknown, fallback = 0): number {
  return Math.floor(toFiniteNumber(value, fallback));
}

export function ceilToInteger(value: unknown, fallback = 0): number {
  return Math.ceil(toFiniteNumber(value, fallback));
}

export function toNonNegativeNumber(value: unknown, fallback = 0): number {
  return Math.max(0, toFiniteNumber(value, fallback));
}

export function toPositiveNumber(value: unknown, fallback = 0): number {
  return toNonNegativeNumber(value, fallback);
}

export function toPositiveInteger(value: unknown, fallback = 0): number {
  return Math.max(0, toInteger(value, fallback));
}

export function toNonNegativeInteger(value: unknown, fallback = 0): number {
  return Math.max(0, floorToInteger(value, fallback));
}

export function toIntegerAtLeast(value: unknown, min: number, fallback = min): number {
  return Math.max(floorToInteger(min), floorToInteger(value, fallback));
}

export function toIntegerInRange(value: unknown, min: number, max: number, fallback = min): number {
  return clampNumber(value, min, max, fallback, 0);
}

export function floorIntegerInRange(value: unknown, min: number, max: number, fallback = min): number {
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  const integerValue = floorToInteger(value, fallback);
  return Math.min(normalizedMax, Math.max(normalizedMin, integerValue));
}

export function clamp(value: number, min: number, max: number, options: ClampOptions = {}): number {
  const safeValue = toFiniteNumber(value);
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  const clampedValue = Math.min(normalizedMax, Math.max(normalizedMin, safeValue));

  if (typeof options.precision !== "number") {
    return clampedValue;
  }

  return roundTo(clampedValue, options.precision);
}

export function clampNumber(value: unknown, min: number, max: number, fallback = 0, precision?: number): number {
  return clamp(toFiniteNumber(value, fallback), min, max, typeof precision === "number" ? { precision } : {});
}

export function clampNumberToBounds(value: unknown, min: number, max: number, fallback = 0, precision?: number): number {
  const clampedValue = Math.min(toFiniteNumber(max), Math.max(toFiniteNumber(min), toFiniteNumber(value, fallback)));
  return typeof precision === "number" ? roundTo(clampedValue, precision) : clampedValue;
}

export function normalizeNumberBounds(min: unknown, max: unknown, fallbackMin = 0, fallbackMax = fallbackMin): NumberBounds {
  const minValue = toFiniteNumber(min, fallbackMin);
  const maxValue = toFiniteNumber(max, fallbackMax);

  return {
    min: Math.min(minValue, maxValue),
    max: Math.max(minValue, maxValue),
  };
}

export function normalizeModuloIndex(index: unknown, length: unknown): number {
  const safeLength = toNonNegativeInteger(length);

  if (safeLength === 0) {
    return -1;
  }

  const safeIndex = floorToInteger(index);
  return ((safeIndex % safeLength) + safeLength) % safeLength;
}

export function getGreatestCommonDivisor(left: unknown, right: unknown): number {
  let a = Math.abs(floorToInteger(left));
  let b = Math.abs(floorToInteger(right));

  if (a === 0) return b;
  if (b === 0) return a;

  while (b > 0) {
    const next = a % b;
    a = b;
    b = next;
  }

  return a;
}

export function getLeastCommonMultiple(left: unknown, right: unknown): number {
  const a = Math.abs(floorToInteger(left));
  const b = Math.abs(floorToInteger(right));

  if (a === 0 || b === 0) {
    return 0;
  }

  return (a / getGreatestCommonDivisor(a, b)) * b;
}

export function roundTo(value: number, precision = 0): number {
  const safePrecision = toNonNegativeInteger(precision);
  const factor = 10 ** safePrecision;
  return Math.round(toFiniteNumber(value) * factor) / factor;
}

export function getNumberPrecision(value: unknown): number {
  const text = String(toFiniteNumber(value));
  const exponentMatch = text.match(/^(-?\d+)(?:\.(\d+))?e([+-]\d+)$/i);

  if (exponentMatch) {
    const decimalLength = exponentMatch[2]?.length ?? 0;
    const exponent = toInteger(exponentMatch[3]);
    return Math.max(0, decimalLength - exponent);
  }

  return text.includes(".") ? text.split(".")[1]?.length ?? 0 : 0;
}

export function normalizeNumberStep(step: unknown, fallback = 1): number {
  const safeFallback = toFiniteNumber(fallback, 1) > 0 ? toFiniteNumber(fallback, 1) : 1;
  const nextStep = toFiniteNumber(step, safeFallback);
  return nextStep > 0 ? nextStep : safeFallback;
}

export function snapNumberToStep(value: unknown, min = 0, step = 1): number {
  const safeMin = toFiniteNumber(min);
  const safeStep = normalizeNumberStep(step);
  const safeValue = toFiniteNumber(value, safeMin);
  const steppedValue = safeMin + Math.round((safeValue - safeMin) / safeStep) * safeStep;
  return roundTo(steppedValue, getNumberPrecision(safeStep));
}

export function normalizeSteppedNumber(value: unknown, options: NormalizeSteppedNumberOptions = {}): number {
  const min = toFiniteNumber(options.min);
  const max = toFiniteNumber(options.max, Number.MAX_SAFE_INTEGER);
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  const normalizedStep = normalizeNumberStep(options.step);
  const fallback = options.fallback ?? normalizedMin;
  const clampedValue = clampNumber(value, normalizedMin, normalizedMax, fallback);
  const steppedValue = snapNumberToStep(clampedValue, normalizedMin, normalizedStep);
  return clampNumber(steppedValue, normalizedMin, normalizedMax, clampedValue, getNumberPrecision(normalizedStep));
}

/** 执行结构化特征分析并返回报告。 */
export function summarizeSteppedNumber(value: unknown, options: NormalizeSteppedNumberOptions = {}): SteppedNumberSummary {
  const min = toFiniteNumber(options.min);
  const max = toFiniteNumber(options.max, Number.MAX_SAFE_INTEGER);
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  const step = normalizeNumberStep(options.step);
  const precision = getNumberPrecision(step);
  const safeValue = toFiniteNumber(value, options.fallback ?? normalizedMin);
  const clampedValue = clampNumber(safeValue, normalizedMin, normalizedMax, options.fallback ?? normalizedMin);
  const steppedValue = clampNumber(snapNumberToStep(clampedValue, normalizedMin, step), normalizedMin, normalizedMax, clampedValue, precision);

  return {
    min: normalizedMin,
    max: normalizedMax,
    value: safeValue,
    clampedValue,
    steppedValue,
    step,
    precision,
    changed: safeValue !== steppedValue,
    clamped: safeValue !== clampedValue,
    snapped: clampedValue !== steppedValue,
  };
}

export function safeDivide(dividend: unknown, divisor: unknown, fallback = 0): number {
  const safeDividend = toFiniteNumber(dividend, Number.NaN);
  const safeDivisor = toFiniteNumber(divisor, Number.NaN);

  if (!Number.isFinite(safeDividend) || !Number.isFinite(safeDivisor) || safeDivisor === 0) {
    return fallback;
  }

  return safeDividend / safeDivisor;
}

export function randomInt(min: number, max: number): number {
  const normalizedMin = Math.ceil(Math.min(min, max));
  const normalizedMax = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (normalizedMax - normalizedMin + 1)) + normalizedMin;
}

export function sortNumbers(values: Iterable<number>, direction: "asc" | "desc" = "asc"): number[] {
  const factor = direction === "asc" ? 1 : -1;
  return Array.from(values).sort((left, right) => (left - right) * factor);
}
