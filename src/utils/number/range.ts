import { clamp, clampNumber, normalizeNumberBounds, roundTo, safeDivide, toFiniteNumber } from './core';
import type { NumberBounds, NumberDeltaSummary, NumberRangeIntersectionSummary, NumberRangeSummary, PercentSummary, ProgressRatioSummary } from './types';

export function mapNumberRange(
  value: unknown,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number,
  fallback = toMin
): number {
  if (fromMin === fromMax) {
    return fallback;
  }

  const ratio = safeDivide(toFiniteNumber(value, fromMin) - fromMin, fromMax - fromMin, Number.NaN);
  return Number.isFinite(ratio) ? toMin + ratio * (toMax - toMin) : fallback;
}

export function toRangePercent(value: number, min: number, max: number, precision = 0): number {
  if (min === max) {
    return 0;
  }

  const percent = ((toFiniteNumber(value) - min) / (max - min)) * 100;
  return clamp(percent, 0, 100, { precision });
}

export function fromRangePercent(percent: unknown, min: number, max: number, precision?: number): number {
  const value = mapNumberRange(clampNumber(percent, 0, 100), 0, 100, min, max, min);
  return typeof precision === "number" ? roundTo(value, precision) : value;
}

export function intersectNumberRanges(left: NumberBounds, right: NumberBounds): NumberRangeIntersectionSummary {
  const leftBounds = normalizeNumberBounds(left.min, left.max);
  const rightBounds = normalizeNumberBounds(right.min, right.max);
  const min = Math.max(leftBounds.min, rightBounds.min);
  const max = Math.min(leftBounds.max, rightBounds.max);
  const overlaps = min < max;
  const touches = min === max;
  const empty = min > max;

  return {
    min,
    max,
    left: leftBounds,
    right: rightBounds,
    span: empty ? 0 : max - min,
    overlaps,
    touches,
    empty,
  };
}

export function doNumberRangesOverlap(left: NumberBounds, right: NumberBounds, inclusive = true): boolean {
  const summary = intersectNumberRanges(left, right);
  return inclusive ? !summary.empty : summary.overlaps;
}

/** 执行结构化特征分析并返回报告。 */
export function summarizeNumberRange(value: unknown, min: unknown, max: unknown, precision = 0): NumberRangeSummary {
  const bounds = normalizeNumberBounds(min, max);
  const safeValue = toFiniteNumber(value, bounds.min);
  const clampedValue = clamp(safeValue, bounds.min, bounds.max, { precision });

  return {
    ...bounds,
    value: safeValue,
    clampedValue,
    percent: toRangePercent(clampedValue, bounds.min, bounds.max, precision),
    inRange: safeValue >= bounds.min && safeValue <= bounds.max,
    belowMin: safeValue < bounds.min,
    aboveMax: safeValue > bounds.max,
  };
}

export function summarizePercent(value: unknown, fallback = 0, precision = 0): PercentSummary {
  const normalized = normalizePercent(value, fallback, precision);

  return {
    value: toFiniteNumber(value, fallback),
    normalized,
    ratio: normalized / 100,
    label: `${normalized}%`,
  };
}

/** 执行结构化特征分析并返回报告。 */
export function summarizeProgressRatio(current: unknown, total: unknown, precision = 0): ProgressRatioSummary {
  const currentValue = toFiniteNumber(current);
  const totalValue = Math.max(0, toFiniteNumber(total));
  const clampedCurrent = clamp(currentValue, 0, totalValue);
  const ratio = totalValue > 0 ? roundTo(clampedCurrent / totalValue, precision + 2) : 0;
  const percent = normalizePercent(ratio * 100, 0, precision);

  return {
    current: currentValue,
    total: totalValue,
    clampedCurrent,
    remaining: Math.max(0, totalValue - clampedCurrent),
    ratio,
    percent,
    label: `${percent}%`,
    empty: totalValue === 0,
    started: currentValue > 0 && totalValue > 0,
    complete: totalValue > 0 && currentValue >= totalValue,
    overComplete: totalValue > 0 && currentValue > totalValue,
  };
}

export function summarizeNumberDelta(before: unknown, after: unknown, precision = 2): NumberDeltaSummary {
  const beforeValue = toFiniteNumber(before);
  const afterValue = toFiniteNumber(after);
  const delta = roundTo(afterValue - beforeValue, precision);
  const absoluteDelta = Math.abs(delta);
  const ratioChange = beforeValue === 0 ? null : roundTo(delta / Math.abs(beforeValue), precision);
  const percentChange = ratioChange === null ? null : roundTo(ratioChange * 100, precision);

  return {
    before: beforeValue,
    after: afterValue,
    delta,
    absoluteDelta,
    ratioChange,
    percentChange,
    increased: delta > 0,
    decreased: delta < 0,
    unchanged: delta === 0,
  };
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
