import { floorIntegerInRange, floorToInteger } from "../number";
import { findIndexByValue, findLastIndex, hasByValue, hasEveryByValue, hasEveryItem } from "./core";
import { removeByValue, removeByValues } from "./filter";
import { mapBy, uniqueArray } from "./set-map";

export function removeFirstMatching<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): T[] {
  const targetIndex = items.findIndex(predicate);
  return targetIndex >= 0 ? removeAt(items, targetIndex) : [...items];
}

export function removeLastMatching<T>(items: readonly T[], predicate: (item: T, index: number) => boolean): T[] {
  const targetIndex = findLastIndex(items, predicate);
  return targetIndex >= 0 ? removeAt(items, targetIndex) : [...items];
}

export function moveItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  const nextItems = [...items];

  if (nextItems.length === 0) {
    return nextItems;
  }

  const from = floorIntegerInRange(fromIndex, 0, nextItems.length - 1, 0);
  const to = floorIntegerInRange(toIndex, 0, nextItems.length - 1, 0);
  const [item] = nextItems.splice(from, 1);

  if (item !== undefined) {
    nextItems.splice(to, 0, item);
  }

  return nextItems;
}

export function moveItemByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, index: number) => K,
  targetValue: K,
  toIndex: number
): T[] {
  const fromIndex = findIndexByValue(items, getValue, targetValue);
  return fromIndex >= 0 ? moveItem(items, fromIndex, toIndex) : [...items];
}

export function swapItems<T>(items: readonly T[], leftIndex: number, rightIndex: number): T[] {
  const nextItems = [...items];

  if (nextItems.length === 0) {
    return nextItems;
  }

  const left = floorIntegerInRange(leftIndex, 0, nextItems.length - 1, 0);
  const right = floorIntegerInRange(rightIndex, 0, nextItems.length - 1, 0);

  if (left === right) {
    return nextItems;
  }

  [nextItems[left], nextItems[right]] = [nextItems[right], nextItems[left]];
  return nextItems;
}

export function swapItemsByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, index: number) => K,
  leftValue: K,
  rightValue: K
): T[] {
  const leftIndex = findIndexByValue(items, getValue, leftValue);
  const rightIndex = findIndexByValue(items, getValue, rightValue);
  return leftIndex >= 0 && rightIndex >= 0 ? swapItems(items, leftIndex, rightIndex) : [...items];
}

export function insertAt<T>(items: readonly T[], index: number, item: T): T[] {
  const nextItems = [...items];
  const safeIndex = floorIntegerInRange(index, 0, nextItems.length, 0);
  nextItems.splice(safeIndex, 0, item);
  return nextItems;
}

export function insertManyAt<T>(items: readonly T[], index: number, nextItems: readonly T[]): T[] {
  if (nextItems.length === 0) {
    return [...items];
  }

  const safeIndex = floorIntegerInRange(index, 0, items.length, 0);
  return [...items.slice(0, safeIndex), ...nextItems, ...items.slice(safeIndex)];
}

export function removeAt<T>(items: readonly T[], index: number): T[] {
  if (index < 0 || index >= items.length) {
    return [...items];
  }

  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function removeAtMany<T>(items: readonly T[], indexes: readonly number[]): T[] {
  if (indexes.length === 0) {
    return [...items];
  }

  const indexSet = new Set(
    indexes
      .map((index) => floorToInteger(index, -1))
      .filter((index) => index >= 0 && index < items.length)
  );

  return items.filter((_, index) => !indexSet.has(index));
}

export function updateAt<T>(items: readonly T[], index: number, updater: (item: T, index: number) => T): T[] {
  if (index < 0 || index >= items.length) {
    return [...items];
  }

  return items.map((item, itemIndex) => (itemIndex === index ? updater(item, itemIndex) : item));
}

export function updateAtMany<T>(items: readonly T[], indexes: readonly number[], updater: (item: T, index: number) => T): T[] {
  if (indexes.length === 0) {
    return [...items];
  }

  const indexSet = new Set(
    indexes
      .map((index) => floorToInteger(index, -1))
      .filter((index) => index >= 0 && index < items.length)
  );

  return items.map((item, index) => (indexSet.has(index) ? updater(item, index) : item));
}

export function replaceBy<T, K extends PropertyKey>(items: readonly T[], nextItem: T, getKey: (item: T) => K): T[] {
  const nextKey = getKey(nextItem);
  return items.map((item) => (getKey(item) === nextKey ? nextItem : item));
}

export function upsertBy<T, K extends PropertyKey>(items: readonly T[], nextItem: T, getKey: (item: T) => K): T[] {
  const nextKey = getKey(nextItem);
  const exists = items.some((item) => getKey(item) === nextKey);
  return exists ? replaceBy(items, nextItem, getKey) : [...items, nextItem];
}

export function upsertManyBy<T, K extends PropertyKey>(items: readonly T[], nextItems: readonly T[], getKey: (item: T) => K): T[] {
  return nextItems.reduce<T[]>((result, item) => upsertBy(result, item, getKey), [...items]);
}

export function replaceManyBy<T, K extends PropertyKey>(
  items: readonly T[],
  nextItems: readonly T[],
  getKey: (item: T) => K
): T[] {
  if (nextItems.length === 0) {
    return [...items];
  }

  const nextItemMap = mapBy(nextItems, getKey);
  return items.map((item) => {
    const key = getKey(item);
    return nextItemMap.has(key) ? (nextItemMap.get(key) as T) : item;
  });
}

export function mergeArraysBy<T, K extends PropertyKey>(
  items: readonly T[],
  nextItems: readonly T[],
  getKey: (item: T) => K,
  merge: (current: T, next: T, key: K) => T = (_current, next) => next
): T[] {
  if (nextItems.length === 0) {
    return [...items];
  }

  const nextItemMap = mapBy(nextItems, getKey);
  const usedKeys = new Set<K>();
  const mergedItems = items.map((item) => {
    const key = getKey(item);

    if (!nextItemMap.has(key)) {
      return item;
    }

    const nextItem = nextItemMap.get(key) as T;
    usedKeys.add(key);
    return merge(item, nextItem, key);
  });
  const appendedItems: T[] = [];

  for (const item of nextItems) {
    const key = getKey(item);

    if (usedKeys.has(key)) {
      continue;
    }

    usedKeys.add(key);
    appendedItems.push(item);
  }

  return [...mergedItems, ...appendedItems];
}

export function removeBy<T, K extends PropertyKey>(items: readonly T[], target: T, getKey: (item: T) => K): T[] {
  const targetKey = getKey(target);
  return items.filter((item) => getKey(item) !== targetKey);
}

export function updateWhere<T>(items: readonly T[], predicate: (item: T, index: number) => boolean, updater: (item: T, index: number) => T): T[] {
  return items.map((item, index) => (predicate(item, index) ? updater(item, index) : item));
}

export function updateByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, index: number) => K,
  targetValue: K,
  updater: (item: T, index: number) => T
): T[] {
  return updateWhere(items, (item, index) => getValue(item, index) === targetValue, updater);
}

export function replaceByValue<T, K>(items: readonly T[], getValue: (item: T, index: number) => K, targetValue: K, nextItem: T): T[] {
  return updateByValue(items, getValue, targetValue, () => nextItem);
}

export function toggleItem<T>(items: readonly T[], item: T, exists = items.includes(item)): T[] {
  return exists ? items.filter((current) => current !== item) : [...items, item];
}

export function toggleItems<T>(items: readonly T[], nextItems: readonly T[], exists = hasEveryItem(items, nextItems)): T[] {
  if (nextItems.length === 0) {
    return [...items];
  }

  if (exists) {
    const nextItemSet = new Set(nextItems);
    return items.filter((item) => !nextItemSet.has(item));
  }

  return uniqueArray([...items, ...nextItems]);
}

export function toggleItemByValue<T, K>(
  items: readonly T[],
  item: T,
  getValue: (item: T, index: number) => K,
  exists?: boolean
): T[] {
  const targetValue = getValue(item, items.length);
  const shouldRemove = exists ?? hasByValue(items, getValue, targetValue);
  return shouldRemove ? removeByValue(items, getValue, targetValue) : [...items, item];
}

export function toggleItemsByValue<T, K>(
  items: readonly T[],
  nextItems: readonly T[],
  getValue: (item: T, index: number) => K,
  exists?: boolean
): T[] {
  if (nextItems.length === 0) {
    return [...items];
  }

  const targetValues = nextItems.map((item, index) => getValue(item, items.length + index));
  const shouldRemove = exists ?? hasEveryByValue(items, getValue, targetValues);

  if (shouldRemove) {
    return removeByValues(items, getValue, targetValues);
  }

  const currentValueSet = new Set(items.map((item, index) => getValue(item, index)));
  const nextValueSet = new Set<K>();
  const missingItems = nextItems.filter((item, index) => {
    const value = getValue(item, items.length + index);

    if (currentValueSet.has(value) || nextValueSet.has(value)) {
      return false;
    }

    nextValueSet.add(value);
    return true;
  });
  return [...items, ...missingItems];
}

export function insertBeforeByValue<T, K>(
  items: readonly T[],
  nextItem: T,
  getValue: (item: T, index: number) => K,
  targetValue: K
): T[] {
  const index = findIndexByValue(items, getValue, targetValue);
  return index >= 0 ? insertAt(items, index, nextItem) : [...items, nextItem];
}

export function insertAfterByValue<T, K>(
  items: readonly T[],
  nextItem: T,
  getValue: (item: T, index: number) => K,
  targetValue: K
): T[] {
  const index = findIndexByValue(items, getValue, targetValue);
  return index >= 0 ? insertAt(items, index + 1, nextItem) : [...items, nextItem];
}
