export interface ClampOptions {
  precision?: number;
}

export interface NormalizeSteppedNumberOptions {
  min?: number;
  max?: number;
  step?: number;
  fallback?: number;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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

export function toPositiveNumber(value: unknown, fallback = 0): number {
  return Math.max(0, toFiniteNumber(value, fallback));
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

export function toIntegerInRange(value: unknown, min: number, max: number, fallback = min): number {
  return clampNumber(value, min, max, fallback, 0);
}

export function floorIntegerInRange(value: unknown, min: number, max: number, fallback = min): number {
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  const integerValue = floorToInteger(value, fallback);
  return Math.min(normalizedMax, Math.max(normalizedMin, integerValue));
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

export function toRangePercent(value: number, min: number, max: number, precision = 0): number {
  if (min === max) {
    return 0;
  }

  const percent = ((toFiniteNumber(value) - min) / (max - min)) * 100;
  return clamp(percent, 0, 100, { precision });
}

export function normalizePage(page: number, totalPages: number): number {
  return clampNumber(page, 1, toIntegerAtLeast(totalPages, 1), 1, 0);
}

export function getTotalPages(total: number, pageSize: number): number {
  const safePageSize = toIntegerAtLeast(pageSize, 1, 1);
  return Math.max(1, Math.ceil(Math.max(0, toFiniteNumber(total)) / safePageSize));
}

export function getPaginationWindow(current: number, total: number, maxVisible = 5): number[] {
  const safeTotal = toIntegerAtLeast(total, 1);
  const safeVisible = toIntegerAtLeast(maxVisible, 1);
  const safeCurrent = normalizePage(current, safeTotal);
  const half = Math.floor(safeVisible / 2);
  const start = clampNumber(safeCurrent - half, 1, Math.max(1, safeTotal - safeVisible + 1), 1, 0);
  const end = Math.min(safeTotal, start + safeVisible - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function sortNumbers(values: Iterable<number>, direction: "asc" | "desc" = "asc"): number[] {
  const factor = direction === "asc" ? 1 : -1;
  return Array.from(values).sort((left, right) => (left - right) * factor);
}

export function getVisiblePageNumbers(current: number, total: number, siblingCount = 1, includeEdges = true): number[] {
  const safeTotal = toIntegerAtLeast(total, 1, 1);
  const safeCurrent = normalizePage(current, safeTotal);
  const safeSiblingCount = toNonNegativeInteger(siblingCount);
  const pages = new Set<number>([safeCurrent]);

  if (includeEdges) {
    pages.add(1);
    pages.add(safeTotal);
  }

  for (let offset = -safeSiblingCount; offset <= safeSiblingCount; offset += 1) {
    const page = safeCurrent + offset;
    if (page >= 1 && page <= safeTotal) {
      pages.add(page);
    }
  }

  return sortNumbers(pages);
}

export function randomInt(min: number, max: number): number {
  const normalizedMin = Math.ceil(Math.min(min, max));
  const normalizedMax = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (normalizedMax - normalizedMin + 1)) + normalizedMin;
}

export function isBetween(value: number, min: number, max: number, inclusive = true): boolean {
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  return inclusive
    ? value >= normalizedMin && value <= normalizedMax
    : value > normalizedMin && value < normalizedMax;
}

export function normalizePercent(value: unknown, fallback = 0, precision = 0): number {
  return clampNumber(value, 0, 100, fallback, precision);
}
