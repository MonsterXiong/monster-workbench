export interface ClampOptions {
  precision?: number;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function toFiniteNumber(value: unknown, fallback = 0): number {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function parseFormattedNumber(value: string, unit = ""): number {
  const normalizedText = unit ? value.replace(unit, "") : value;
  return Number(normalizedText.replace(/,/g, "").trim());
}

export function toInteger(value: unknown, fallback = 0): number {
  return Math.trunc(toFiniteNumber(value, fallback));
}

export function toPositiveNumber(value: unknown, fallback = 0): number {
  return Math.max(0, toFiniteNumber(value, fallback));
}

export function toPositiveInteger(value: unknown, fallback = 0): number {
  return Math.max(0, toInteger(value, fallback));
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

export function roundTo(value: number, precision = 0): number {
  const safePrecision = Math.max(0, Math.floor(toFiniteNumber(precision)));
  const factor = 10 ** safePrecision;
  return Math.round(toFiniteNumber(value) * factor) / factor;
}

export function toRangePercent(value: number, min: number, max: number, precision = 0): number {
  if (min === max) {
    return 0;
  }

  const percent = ((toFiniteNumber(value) - min) / (max - min)) * 100;
  return clamp(percent, 0, 100, { precision });
}

export function normalizePage(page: number, totalPages: number): number {
  return clampNumber(page, 1, Math.max(1, Math.floor(totalPages)), 1, 0);
}

export function getTotalPages(total: number, pageSize: number): number {
  const safePageSize = Math.max(1, Math.floor(toFiniteNumber(pageSize, 1)));
  return Math.max(1, Math.ceil(Math.max(0, toFiniteNumber(total)) / safePageSize));
}

export function getPaginationWindow(current: number, total: number, maxVisible = 5): number[] {
  const safeTotal = Math.max(1, Math.floor(total));
  const safeVisible = Math.max(1, Math.floor(maxVisible));
  const safeCurrent = normalizePage(current, safeTotal);
  const half = Math.floor(safeVisible / 2);
  const start = clampNumber(safeCurrent - half, 1, Math.max(1, safeTotal - safeVisible + 1), 1, 0);
  const end = Math.min(safeTotal, start + safeVisible - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function getVisiblePageNumbers(current: number, total: number, siblingCount = 1, includeEdges = true): number[] {
  const safeTotal = Math.max(1, Math.floor(toFiniteNumber(total, 1)));
  const safeCurrent = normalizePage(current, safeTotal);
  const safeSiblingCount = Math.max(0, Math.floor(toFiniteNumber(siblingCount)));
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

  return Array.from(pages).sort((left, right) => left - right);
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
