import { floorIntegerInRange, normalizeModuloIndex, toIntegerAtLeast, toNonNegativeInteger } from "../number";
import { toReversedArray, windowArray } from "./core";
import { ArraySpan, ArrayWindow, ZipArrayOptions } from "./types";

export function takeRightReversed<T>(items: readonly T[], count: number): T[] {
  return toReversedArray(takeRight(items, count));
}

export function take<T>(items: readonly T[], count: number): T[] {
  return items.slice(0, toNonNegativeInteger(count));
}

export function takeRight<T>(items: readonly T[], count: number): T[] {
  const safeCount = toNonNegativeInteger(count);
  return safeCount === 0 ? [] : items.slice(-safeCount);
}

export function takeWhile<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): T[] {
  const result: T[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!predicate(item, index)) {
      break;
    }

    result.push(item);
  }

  return result;
}

export function dropWhile<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): T[] {
  let startIndex = 0;

  while (startIndex < items.length && predicate(items[startIndex], startIndex)) {
    startIndex += 1;
  }

  return items.slice(startIndex);
}

export function spanArray<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): ArraySpan<T> {
  const matched = takeWhile(items, predicate);

  return {
    matched,
    rest: items.slice(matched.length),
  };
}

export function getArrayWindow<T>(items: readonly T[], index: number, radius: number): ArrayWindow<T> {
  if (items.length === 0) {
    return {
      items: [],
      start: 0,
      end: 0,
      size: 0,
    };
  }

  const safeIndex = floorIntegerInRange(index, 0, items.length - 1, 0);
  const safeRadius = toNonNegativeInteger(radius);
  const start = Math.max(0, safeIndex - safeRadius);
  const end = Math.min(items.length, safeIndex + safeRadius + 1);
  const windowItems = items.slice(start, end);

  return {
    items: windowItems,
    start,
    end,
    size: windowItems.length,
  };
}

export function pairwiseArray<T>(items: readonly T[]): Array<[T, T]> {
  return windowArray(items, 2).map((windowItem) => [windowItem.items[0] as T, windowItem.items[1] as T]);
}

export function drop<T>(items: readonly T[], count: number): T[] {
  return items.slice(toNonNegativeInteger(count));
}

export function dropRight<T>(items: readonly T[], count: number): T[] {
  const safeCount = toNonNegativeInteger(count);
  return safeCount === 0 ? [...items] : items.slice(0, -safeCount);
}

export function rotateArray<T>(items: readonly T[], offset: number): T[] {
  if (items.length === 0) {
    return [];
  }

  const startIndex = normalizeModuloIndex(offset, items.length);
  return [...items.slice(startIndex), ...items.slice(0, startIndex)];
}

export function rotateArrayRight<T>(items: readonly T[], offset: number): T[] {
  return rotateArray(items, items.length - normalizeModuloIndex(offset, items.length));
}

export function chunkArray<T>(items: readonly T[], size: number): T[][] {
  const safeSize = toIntegerAtLeast(size, 1);
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += safeSize) {
    chunks.push(items.slice(index, index + safeSize));
  }

  return chunks;
}

export function splitArrayAt<T>(items: readonly T[], index: number): [T[], T[]] {
  const safeIndex = floorIntegerInRange(index, 0, items.length, 0);
  return [items.slice(0, safeIndex), items.slice(safeIndex)];
}

export function zipArrays<T, U>(
  left: readonly T[],
  right: readonly U[],
  options: ZipArrayOptions = {}
): Array<[T | undefined, U | undefined]> {
  const length = options.mode === "longest" ? Math.max(left.length, right.length) : Math.min(left.length, right.length);
  const result: Array<[T | undefined, U | undefined]> = [];

  for (let index = 0; index < length; index += 1) {
    result.push([left[index], right[index]]);
  }

  return result;
}

export function zipArraysWith<T, U, R>(
  left: readonly T[],
  right: readonly U[],
  mapper: (leftItem: T | undefined, rightItem: U | undefined, index: number) => R,
  options: ZipArrayOptions = {}
): R[] {
  return zipArrays(left, right, options).map(([leftItem, rightItem], index) => mapper(leftItem, rightItem, index));
}

export function unzipArrayPairs<T, U>(pairs: ReadonlyArray<readonly [T, U]>): [T[], U[]] {
  const left: T[] = [];
  const right: U[] = [];

  for (const [leftItem, rightItem] of pairs) {
    left.push(leftItem);
    right.push(rightItem);
  }

  return [left, right];
}
