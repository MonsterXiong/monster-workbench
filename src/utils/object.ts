import { uniqueArray } from "./array";
import { normalizeStringKey } from "./string";
import { isEmptyValue, isNonEmptyValue } from "./value";

export type AnyRecord = Record<string, unknown>;
export type ObjectPath = readonly (string | number)[];
export type ObjectPathInput = string | ObjectPath;

export interface ObjectPathValueEntry {
  path: ObjectPathInput;
  value: unknown;
}

export interface ObjectResolvedPathValue {
  path: string[];
  pathText: string;
  value: unknown;
  exists: boolean;
}

export interface ObjectDiffEntry {
  type: "added" | "removed" | "changed";
  path: string[];
  before?: unknown;
  after?: unknown;
}

export type ObjectDiffEntryType = ObjectDiffEntry["type"];

export interface ObjectDiffStats {
  added: number;
  removed: number;
  changed: number;
  total: number;
}

export type ObjectDiffGroups = Record<ObjectDiffEntry["type"], ObjectDiffEntry[]>;
export type ObjectDiffTopLevelGroups = Record<string, ObjectDiffEntry[]>;

export interface ObjectDiffSummary {
  entries: ObjectDiffEntry[];
  groups: ObjectDiffGroups;
  stats: ObjectDiffStats;
  paths: string[];
  hasChanges: boolean;
}

export interface ObjectDiffChangeSet {
  addedPaths: string[];
  removedPaths: string[];
  changedPaths: string[];
  paths: string[];
  topLevelKeys: string[];
  topLevelStats: Record<string, ObjectDiffStats>;
  stats: ObjectDiffStats;
  hasChanges: boolean;
}

export interface ObjectDiffReport {
  entries: ObjectDiffEntry[];
  summary: ObjectDiffSummary;
  changeSet: ObjectDiffChangeSet;
  patch: AnyRecord;
  inversePatch: AnyRecord;
  hasChanges: boolean;
}

export interface ObjectDiffTypeSummary {
  types: ObjectDiffEntryType[];
  stats: ObjectDiffStats;
  hasAdded: boolean;
  hasRemoved: boolean;
  hasChanged: boolean;
  onlyAdded: boolean;
  onlyRemoved: boolean;
  onlyChanged: boolean;
  hasChanges: boolean;
}

export interface ObjectDiffImpactSummary {
  stats: ObjectDiffStats;
  topLevelKeys: string[];
  topLevelCount: number;
  deepestPathDepth: number;
  rootChanged: boolean;
  onlyAdditive: boolean;
  destructive: boolean;
  hasChanges: boolean;
}

export interface ObjectDiffPathMatchSummary {
  paths: string[];
  matchedPaths: string[];
  missingPaths: string[];
  matchedEntries: ObjectDiffEntry[];
  hasAnyPath: boolean;
  hasEveryPath: boolean;
}

export interface ObjectDiffDisplayEntry {
  type: ObjectDiffEntryType;
  path: string[];
  pathText: string;
  topLevelKey: string;
  before?: unknown;
  after?: unknown;
}

export interface ObjectDiffDashboard {
  report: ObjectDiffReport;
  impact: ObjectDiffImpactSummary;
  displayEntries: ObjectDiffDisplayEntry[];
  entryMap: Map<string, ObjectDiffEntry>;
  entryRecord: Record<string, ObjectDiffEntry>;
  changedPathSet: Set<string>;
  destructivePathSet: Set<string>;
}

export interface FormatObjectDiffEntryOptions {
  showValues?: boolean;
  stringifyValue?: (value: unknown) => string;
  typeLabels?: Partial<Record<ObjectDiffEntryType, string>>;
}

export interface FormatObjectDiffOptions extends FormatObjectDiffEntryOptions {
  separator?: string;
  fallback?: string;
}

export interface ObjectPatchChangeSummary<T extends object> {
  patch: Partial<T>;
  changedKeys: Array<keyof T>;
  unchangedKeys: Array<keyof T>;
  hasChanges: boolean;
}

export interface ObjectChangedValues<T extends AnyRecord> {
  before: Partial<T>;
  after: Partial<T>;
  changedKeys: Array<keyof T>;
  unchangedKeys: Array<keyof T>;
  hasChanges: boolean;
}

export interface ObjectDirtySummary<T extends AnyRecord> {
  patch: Partial<T>;
  baselineValues: Partial<T>;
  currentValues: Partial<T>;
  dirtyKeys: Array<keyof T>;
  pristineKeys: Array<keyof T>;
  totalCount: number;
  dirtyCount: number;
  pristineCount: number;
  dirty: boolean;
  pristine: boolean;
}

export interface ObjectValueSummary<T extends AnyRecord = AnyRecord> {
  keys: Array<keyof T>;
  emptyKeys: Array<keyof T>;
  nonEmptyKeys: Array<keyof T>;
  nullishKeys: Array<keyof T>;
  truthyKeys: Array<keyof T>;
  falsyKeys: Array<keyof T>;
  keyCount: number;
  emptyValueCount: number;
  nonEmptyValueCount: number;
  nullishValueCount: number;
  truthyValueCount: number;
  falsyValueCount: number;
  empty: boolean;
  hasNonEmptyValues: boolean;
}

export interface ObjectCompactionReport<T extends AnyRecord> {
  value: Partial<T>;
  keptKeys: Array<keyof T>;
  removedKeys: Array<keyof T>;
  originalKeyCount: number;
  keptCount: number;
  removedCount: number;
  hasRemovedValues: boolean;
}

export interface ObjectPartitionSummary<T extends AnyRecord> {
  matched: Partial<T>;
  unmatched: Partial<T>;
  matchedKeys: Array<keyof T>;
  unmatchedKeys: Array<keyof T>;
  matchedCount: number;
  unmatchedCount: number;
  totalCount: number;
  allMatched: boolean;
  hasMatched: boolean;
  hasUnmatched: boolean;
  empty: boolean;
}

export interface NormalizeRecordEmptyValuesOptions {
  replacement?: unknown;
  trimStrings?: boolean;
  normalizeNullish?: boolean;
}

export interface NormalizeRecordEmptyValuesReport<T extends AnyRecord> {
  value: Record<keyof T, unknown>;
  normalizedKeys: Array<keyof T>;
  unchangedKeys: Array<keyof T>;
  totalCount: number;
  normalizedCount: number;
  unchangedCount: number;
  hasNormalizedValues: boolean;
}

export interface ObjectCleanupOptions extends NormalizeRecordEmptyValuesOptions {
  removeEmptyValues?: boolean;
}

export interface ObjectCleanupReport<T extends AnyRecord> {
  value: Partial<Record<keyof T, unknown>>;
  normalized: NormalizeRecordEmptyValuesReport<T>;
  compaction: ObjectCompactionReport<Record<keyof T, unknown>>;
  removedKeys: Array<keyof T>;
  changedKeys: Array<keyof T>;
  totalCount: number;
  changedCount: number;
  removedCount: number;
  hasChanges: boolean;
}

export interface ObjectDefaultsOptions {
  useDefaultForUndefined?: boolean;
  useDefaultForNull?: boolean;
  useDefaultForEmptyString?: boolean;
}

export interface ObjectDefaultsReport<T extends AnyRecord> {
  value: T;
  defaultedKeys: Array<keyof T>;
  providedKeys: Array<keyof T>;
  totalCount: number;
  defaultedCount: number;
  providedCount: number;
  hasDefaultedValues: boolean;
}

export interface MergeRecordsOptions<T extends AnyRecord> {
  merge?: (current: T[keyof T], next: T[keyof T], key: keyof T) => T[keyof T];
}

export interface MergeRecordsReport<T extends AnyRecord> {
  record: T;
  addedKeys: Array<keyof T>;
  overwrittenKeys: Array<keyof T>;
  unchangedKeys: Array<keyof T>;
  keyCount: number;
  addedCount: number;
  overwrittenCount: number;
  unchangedCount: number;
  hasChanges: boolean;
}

export interface ObjectKeyDiff {
  addedKeys: string[];
  removedKeys: string[];
  changedKeys: string[];
  unchangedKeys: string[];
  total: number;
  hasChanges: boolean;
}

export interface ObjectDiffPatchOptions {
  includeRemoved?: boolean;
  removedValue?: unknown;
}

export interface ApplyObjectDiffPatchOptions {
  removedValue?: unknown;
}

export type ObjectPatch<T extends object> = Partial<T> | null | undefined;

export interface ObjectDiffPathFilterOptions {
  includeChildren?: boolean;
  type?: ObjectDiffEntryType | readonly ObjectDiffEntryType[];
}

export interface ObjectDeepDiffOptions {
  compareArraysByIndex?: boolean;
  includePaths?: readonly ObjectPathInput[];
  ignorePaths?: readonly ObjectPathInput[];
  equals?: (before: unknown, after: unknown, path: string[]) => boolean;
}

export type ObjectDeepDiffByPathsOptions = Omit<ObjectDeepDiffOptions, "includePaths">;

export interface RedactSensitiveOptions {
  replacement?: string;
  sensitiveKeys?: readonly string[];
}

export type ValueIdentity = string | number | boolean | null | undefined;

export interface ValueIdentityOptions {
  valueKey?: ObjectPathInput;
}

const ARRAY_INDEX_PATH_KEY_REGEXP = /^(0|[1-9]\d*)$/;
const OBJECT_PATH_IDENTIFIER_REGEXP = /^[A-Za-z_$][\w$]*$/;
const DEFAULT_SENSITIVE_KEYS = ["key", "token", "secret", "password", "authorization", "credential"];

export function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isPlainObject(value: unknown): value is AnyRecord {
  if (!isRecord(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function pick<T extends AnyRecord, K extends keyof T>(value: T, keys: readonly K[]): Pick<T, K> {
  return keys.reduce<Pick<T, K>>((result, key) => {
    result[key] = value[key];
    return result;
  }, {} as Pick<T, K>);
}

export function omit<T extends AnyRecord, K extends keyof T>(value: T, keys: readonly K[]): Omit<T, K> {
  const ignoredKeys = new Set<keyof T>(keys);
  const result = { ...value };

  for (const key of ignoredKeys) {
    delete result[key];
  }

  return result as Omit<T, K>;
}

export function removeEmptyValues<T extends AnyRecord>(value: T): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, item] of objectEntries(value)) {
    if (isNonEmptyValue(item)) {
      result[key] = item;
    }
  }

  return result;
}

export function compactRecordValues<T extends AnyRecord>(value: T): Partial<T> {
  return removeEmptyValues(value);
}

export function createObjectCompactionReport<T extends AnyRecord>(value: T): ObjectCompactionReport<T> {
  const compactedValue = removeEmptyValues(value);
  const keptKeys = objectKeys(compactedValue as T);
  const removedKeys = objectKeys(value).filter((key) => !keptKeys.includes(key));

  return {
    value: compactedValue,
    keptKeys,
    removedKeys,
    originalKeyCount: objectKeyCount(value),
    keptCount: keptKeys.length,
    removedCount: removedKeys.length,
    hasRemovedValues: removedKeys.length > 0,
  };
}

export function removeEmptyValuesDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeEmptyValuesDeep(item))
      .filter(isNonEmptyValue) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result: AnyRecord = {};

  for (const [key, item] of objectEntries(value)) {
    const nextValue = removeEmptyValuesDeep(item);

    if (isNonEmptyValue(nextValue) && (!isPlainObject(nextValue) || objectKeyCount(nextValue) > 0)) {
      result[String(key)] = nextValue;
    }
  }

  return result as T;
}

export function removeNullishValues<T extends AnyRecord>(value: T): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, item] of objectEntries(value)) {
    if (item !== undefined && item !== null) {
      result[key] = item;
    }
  }

  return result;
}

export function mapObjectValues<T extends AnyRecord, R>(
  value: T,
  mapper: (item: T[keyof T], key: keyof T) => R
): Record<keyof T, R> {
  return objectEntries(value).reduce<Record<keyof T, R>>((result, [key, item]) => {
    result[key] = mapper(item, key);
    return result;
  }, {} as Record<keyof T, R>);
}

export function mapObjectNonNullableValues<T extends AnyRecord, R>(
  value: T,
  mapper: (item: T[keyof T], key: keyof T) => R | null | undefined
): Partial<Record<keyof T, NonNullable<R>>> {
  const result: Partial<Record<keyof T, NonNullable<R>>> = {};

  for (const [key, item] of objectEntries(value)) {
    const mappedValue = mapper(item, key);

    if (mappedValue !== undefined && mappedValue !== null) {
      result[key] = mappedValue as NonNullable<R>;
    }
  }

  return result;
}

export function compactMapObjectValues<T extends AnyRecord, R>(
  value: T,
  mapper: (item: T[keyof T], key: keyof T) => R | null | undefined | false | ""
): Partial<Record<keyof T, R>> {
  const result: Partial<Record<keyof T, R>> = {};

  for (const [key, item] of objectEntries(value)) {
    const mappedValue = mapper(item, key);

    if (mappedValue !== undefined && mappedValue !== null && mappedValue !== false && mappedValue !== "") {
      result[key] = mappedValue;
    }
  }

  return result;
}

export function filterObject<T extends AnyRecord>(
  value: T,
  predicate: (item: T[keyof T], key: keyof T) => boolean
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, item] of objectEntries(value)) {
    if (predicate(item, key)) {
      result[key] = item;
    }
  }

  return result;
}

export function pickByValue<T extends AnyRecord>(
  value: T,
  predicate: (item: T[keyof T], key: keyof T) => boolean
): Partial<T> {
  return filterObject(value, predicate);
}

export function omitByValue<T extends AnyRecord>(
  value: T,
  predicate: (item: T[keyof T], key: keyof T) => boolean
): Partial<T> {
  return filterObject(value, (item, key) => !predicate(item, key));
}

export function partitionObject<T extends AnyRecord>(
  value: T,
  predicate: (item: T[keyof T], key: keyof T) => boolean
): [Partial<T>, Partial<T>] {
  const matched: Partial<T> = {};
  const unmatched: Partial<T> = {};

  for (const [key, item] of objectEntries(value)) {
    if (predicate(item, key)) {
      matched[key] = item;
    } else {
      unmatched[key] = item;
    }
  }

  return [matched, unmatched];
}

export function summarizeObjectPartition<T extends AnyRecord>(
  value: T,
  predicate: (item: T[keyof T], key: keyof T) => boolean
): ObjectPartitionSummary<T> {
  const [matched, unmatched] = partitionObject(value, predicate);
  const matchedKeys = objectKeys(matched as T);
  const unmatchedKeys = objectKeys(unmatched as T);
  const totalCount = objectKeyCount(value);

  return {
    matched,
    unmatched,
    matchedKeys,
    unmatchedKeys,
    matchedCount: matchedKeys.length,
    unmatchedCount: unmatchedKeys.length,
    totalCount,
    allMatched: totalCount > 0 && unmatchedKeys.length === 0,
    hasMatched: matchedKeys.length > 0,
    hasUnmatched: unmatchedKeys.length > 0,
    empty: totalCount === 0,
  };
}

export function objectKeys<T extends AnyRecord>(value: T): Array<keyof T> {
  return Object.keys(value) as Array<keyof T>;
}

export function objectEntries<T extends AnyRecord>(value: T): Array<[keyof T, T[keyof T]]> {
  return Object.entries(value) as Array<[keyof T, T[keyof T]]>;
}

export function objectValues<T extends AnyRecord>(value: T): Array<T[keyof T]> {
  return Object.values(value) as Array<T[keyof T]>;
}

export function objectKeySet<T extends AnyRecord>(value: T): Set<keyof T> {
  return new Set(objectKeys(value));
}

export function objectKeyCount(value: unknown): number {
  return isRecord(value) ? Object.keys(value).length : 0;
}

export function countObjectValues<T extends AnyRecord>(
  value: T,
  predicate: (item: T[keyof T], key: keyof T) => boolean
): number {
  return objectEntries(value).reduce((count, [key, item]) => count + (predicate(item, key) ? 1 : 0), 0);
}

export function summarizeObjectValues<T extends AnyRecord>(value: T): ObjectValueSummary<T> {
  const keys = objectKeys(value);
  const emptyKeys: Array<keyof T> = [];
  const nonEmptyKeys: Array<keyof T> = [];
  const nullishKeys: Array<keyof T> = [];
  const truthyKeys: Array<keyof T> = [];
  const falsyKeys: Array<keyof T> = [];

  for (const [key, item] of objectEntries(value)) {
    if (isEmptyValue(item)) {
      emptyKeys.push(key);
    } else {
      nonEmptyKeys.push(key);
    }

    if (item === null || item === undefined) {
      nullishKeys.push(key);
    }

    if (item) {
      truthyKeys.push(key);
    } else {
      falsyKeys.push(key);
    }
  }

  return {
    keys,
    emptyKeys,
    nonEmptyKeys,
    nullishKeys,
    truthyKeys,
    falsyKeys,
    keyCount: keys.length,
    emptyValueCount: emptyKeys.length,
    nonEmptyValueCount: nonEmptyKeys.length,
    nullishValueCount: nullishKeys.length,
    truthyValueCount: truthyKeys.length,
    falsyValueCount: falsyKeys.length,
    empty: keys.length === 0,
    hasNonEmptyValues: nonEmptyKeys.length > 0,
  };
}

export function objectFromEntries<K extends PropertyKey, V>(entries: readonly (readonly [K, V])[]): Record<K, V> {
  const result = {} as Record<K, V>;

  for (const [key, value] of entries) {
    result[key] = value;
  }

  return result;
}

export function mergeObjectEntries<K extends PropertyKey, V>(
  entries: readonly (readonly [K, V])[],
  merge: (current: V, next: V, key: K) => V
): Record<K, V> {
  const result = {} as Record<K, V>;

  for (const [key, value] of entries) {
    result[key] = hasOwnKey(result, key) ? merge(result[key], value, key) : value;
  }

  return result;
}

export function mergeRecords<T extends AnyRecord>(
  left: T,
  right: Partial<T>,
  options: MergeRecordsOptions<T> = {}
): T {
  const result = { ...left } as T;

  for (const [key, nextValue] of objectEntries(right as T)) {
    result[key] = hasOwnKey(result, key) && options.merge
      ? options.merge(result[key], nextValue, key)
      : nextValue;
  }

  return result;
}

export function createMergeRecordsReport<T extends AnyRecord>(
  left: T,
  right: Partial<T>,
  options: MergeRecordsOptions<T> = {}
): MergeRecordsReport<T> {
  const record = mergeRecords(left, right, options);
  const addedKeys: Array<keyof T> = [];
  const overwrittenKeys: Array<keyof T> = [];
  const unchangedKeys: Array<keyof T> = [];

  for (const [key, nextValue] of objectEntries(right as T)) {
    if (!hasOwnKey(left, key)) {
      addedKeys.push(key);
      continue;
    }

    if (deepEqual(left[key], nextValue)) {
      unchangedKeys.push(key);
    } else {
      overwrittenKeys.push(key);
    }
  }

  return {
    record,
    addedKeys,
    overwrittenKeys,
    unchangedKeys,
    keyCount: objectKeyCount(record),
    addedCount: addedKeys.length,
    overwrittenCount: overwrittenKeys.length,
    unchangedCount: unchangedKeys.length,
    hasChanges: addedKeys.length > 0 || overwrittenKeys.length > 0,
  };
}

export function objectFromKeys<K extends PropertyKey, V>(keys: readonly K[], getValue: (key: K, index: number) => V): Record<K, V> {
  const result = {} as Record<K, V>;

  keys.forEach((key, index) => {
    result[key] = getValue(key, index);
  });

  return result;
}

export function mapObjectEntries<T extends AnyRecord, K extends PropertyKey, V>(
  value: T,
  mapper: (item: T[keyof T], key: keyof T) => readonly [K, V]
): Record<K, V> {
  return objectFromEntries(objectEntries(value).map(([key, item]) => mapper(item, key)));
}

export function mapRecordKeys<T extends AnyRecord, K extends PropertyKey>(
  value: T,
  mapper: (key: keyof T, item: T[keyof T]) => K
): Record<K, T[keyof T]> {
  return objectFromEntries(objectEntries(value).map(([key, item]) => [mapper(key, item), item] as const));
}

export function invertRecord<K extends PropertyKey, V extends PropertyKey>(value: Record<K, V>): Record<V, K> {
  const result = {} as Record<V, K>;

  for (const [key, item] of objectEntries(value)) {
    result[item as V] = key as K;
  }

  return result;
}

export function hasOwnKey<T extends object, K extends PropertyKey>(value: T, key: K): key is K & keyof T {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function hasAnyOwnKey(value: unknown, keys: readonly PropertyKey[]): value is AnyRecord {
  return isRecord(value) && keys.some((key) => hasOwnKey(value, key));
}

export function hasEveryOwnKey(value: unknown, keys: readonly PropertyKey[]): value is AnyRecord {
  return isRecord(value) && keys.every((key) => hasOwnKey(value, key));
}

export function pickExisting<T extends AnyRecord, K extends keyof T>(value: T, keys: readonly K[]): Partial<Pick<T, K>> {
  const result: Partial<Pick<T, K>> = {};

  for (const key of keys) {
    if (hasOwnKey(value, key)) {
      result[key] = value[key];
    }
  }

  return result;
}

export function objectEntriesByKeys<T extends AnyRecord, K extends keyof T>(value: T, keys: readonly K[]): Array<[K, T[K]]> {
  const result: Array<[K, T[K]]> = [];

  for (const key of keys) {
    if (hasOwnKey(value, key)) {
      result.push([key, value[key]]);
    }
  }

  return result;
}

export function objectValuesByKeys<T extends AnyRecord, K extends keyof T>(value: T, keys: readonly K[]): Array<T[K]> {
  return objectEntriesByKeys(value, keys).map(([, item]) => item);
}

export function renameObjectKeys<T extends AnyRecord>(
  value: T,
  keyMap: Partial<Record<keyof T, PropertyKey>>
): AnyRecord {
  const result: AnyRecord = {};

  for (const [key, item] of objectEntries(value)) {
    const nextKey = keyMap[key] ?? key;
    result[String(nextKey)] = item;
  }

  return result;
}

export function getRecordValue<T = unknown>(value: unknown, key: PropertyKey, fallback?: T): T | undefined {
  if (!isRecord(value) || !hasOwnKey(value, key)) {
    return fallback;
  }

  const item = value[key];
  return item === undefined || item === null ? fallback : (item as T);
}

export function getFirstRecordValue<T = unknown>(value: unknown, keys: readonly PropertyKey[], fallback?: T): T | undefined {
  for (const key of keys) {
    const item = getRecordValue<T>(value, key);
    if (item !== undefined) {
      return item;
    }
  }

  return fallback;
}

export function getFirstTruthyRecordValue<T = unknown>(value: unknown, keys: readonly PropertyKey[], fallback?: T): T | undefined {
  for (const key of keys) {
    const item = getRecordValue<T>(value, key);
    if (item) {
      return item;
    }
  }

  return fallback;
}

function shouldUseObjectDefault(value: unknown, options: ObjectDefaultsOptions): boolean {
  if (value === undefined) {
    return options.useDefaultForUndefined ?? true;
  }

  if (value === null) {
    return options.useDefaultForNull ?? false;
  }

  if (value === "") {
    return options.useDefaultForEmptyString ?? false;
  }

  return false;
}

export function applyObjectDefaults<T extends AnyRecord>(
  value: Partial<T> | null | undefined,
  defaults: T,
  options: ObjectDefaultsOptions = {}
): T {
  const normalizedValue = (value ?? {}) as Partial<T>;
  const result = { ...defaults } as Record<PropertyKey, unknown>;

  for (const key of objectKeys(defaults)) {
    const nextValue = normalizedValue[key];
    if (!shouldUseObjectDefault(nextValue, options)) {
      result[key] = nextValue as T[keyof T];
    }
  }

  for (const key of objectKeys(normalizedValue as AnyRecord) as Array<keyof T>) {
    if (!hasOwnKey(defaults, key)) {
      result[key] = normalizedValue[key] as T[keyof T];
    }
  }

  return result as T;
}

export function createObjectDefaultsReport<T extends AnyRecord>(
  value: Partial<T> | null | undefined,
  defaults: T,
  options: ObjectDefaultsOptions = {}
): ObjectDefaultsReport<T> {
  const normalizedValue = (value ?? {}) as Partial<T>;
  const result = applyObjectDefaults(normalizedValue, defaults, options);
  const keys = uniqueArray([...objectKeys(defaults), ...(objectKeys(normalizedValue as AnyRecord) as Array<keyof T>)]);
  const defaultedKeys = keys.filter((key) => hasOwnKey(defaults, key) && shouldUseObjectDefault(normalizedValue[key], options));
  const providedKeys = keys.filter((key) => !defaultedKeys.includes(key));

  return {
    value: result,
    defaultedKeys,
    providedKeys,
    totalCount: keys.length,
    defaultedCount: defaultedKeys.length,
    providedCount: providedKeys.length,
    hasDefaultedValues: defaultedKeys.length > 0,
  };
}

export function normalizeRecordEmptyValues<T extends AnyRecord>(
  value: T,
  options: NormalizeRecordEmptyValuesOptions = {}
): Record<keyof T, unknown> {
  const replacement = options.replacement ?? null;
  const trimStrings = options.trimStrings ?? true;
  const normalizeNullish = options.normalizeNullish ?? true;

  return mapObjectValues(value, (item) => {
    if (typeof item === "string") {
      const text = trimStrings ? item.trim() : item;
      return text.length === 0 ? replacement : text;
    }

    if (normalizeNullish && (item === null || item === undefined)) {
      return replacement;
    }

    return item;
  });
}

export function createNormalizeRecordEmptyValuesReport<T extends AnyRecord>(
  value: T,
  options: NormalizeRecordEmptyValuesOptions = {}
): NormalizeRecordEmptyValuesReport<T> {
  const normalizedValue = normalizeRecordEmptyValues(value, options);
  const keys = objectKeys(value);
  const normalizedKeys = keys.filter((key) => !deepEqual(value[key], normalizedValue[key]));
  const unchangedKeys = keys.filter((key) => !normalizedKeys.includes(key));

  return {
    value: normalizedValue,
    normalizedKeys,
    unchangedKeys,
    totalCount: keys.length,
    normalizedCount: normalizedKeys.length,
    unchangedCount: unchangedKeys.length,
    hasNormalizedValues: normalizedKeys.length > 0,
  };
}

export function createObjectCleanupReport<T extends AnyRecord>(
  value: T,
  options: ObjectCleanupOptions = {}
): ObjectCleanupReport<T> {
  const normalized = createNormalizeRecordEmptyValuesReport(value, options);
  const shouldRemoveEmptyValues = options.removeEmptyValues ?? true;
  const compaction = shouldRemoveEmptyValues
    ? createObjectCompactionReport(normalized.value)
    : {
        value: normalized.value,
        keptKeys: objectKeys(normalized.value),
        removedKeys: [],
        originalKeyCount: objectKeyCount(normalized.value),
        keptCount: objectKeyCount(normalized.value),
        removedCount: 0,
        hasRemovedValues: false,
      };
  const changedKeys = uniqueArray([...normalized.normalizedKeys, ...(compaction.removedKeys as Array<keyof T>)]);

  return {
    value: compaction.value,
    normalized,
    compaction,
    removedKeys: compaction.removedKeys as Array<keyof T>,
    changedKeys,
    totalCount: objectKeyCount(value),
    changedCount: changedKeys.length,
    removedCount: compaction.removedCount,
    hasChanges: normalized.hasNormalizedValues || compaction.hasRemovedValues,
  };
}

export function isEmptyObject(value: unknown): boolean {
  return isPlainObject(value) && objectKeyCount(value) === 0;
}

export function isNonEmptyObject(value: unknown): value is AnyRecord {
  return isPlainObject(value) && objectKeyCount(value) > 0;
}

export function getChangedKeys<T extends AnyRecord>(before: T, after: T, keys: readonly (keyof T)[] = objectKeys(after)): Array<keyof T> {
  return keys.filter((key) => !deepEqual(before[key], after[key]));
}

export function hasChangedKeys<T extends AnyRecord>(before: T, after: T, keys?: readonly (keyof T)[]): boolean {
  return getChangedKeys(before, after, keys ?? objectKeys(after)).length > 0;
}

export function getUnchangedKeys<T extends AnyRecord>(before: T, after: T, keys: readonly (keyof T)[] = objectKeys(after)): Array<keyof T> {
  return keys.filter((key) => deepEqual(before[key], after[key]));
}

export function isShallowObjectEqual<T extends AnyRecord>(
  left: T,
  right: T,
  keys: readonly (keyof T)[] = uniqueArray([...objectKeys(left), ...objectKeys(right)])
): boolean {
  return keys.every((key) => Object.is(left[key], right[key]));
}

export function getObjectChangedValues<T extends AnyRecord>(
  before: T,
  after: T,
  keys: readonly (keyof T)[] = uniqueArray([...objectKeys(before), ...objectKeys(after)])
): ObjectChangedValues<T> {
  const changedKeys = getChangedKeys(before, after, keys);
  const unchangedKeys = getUnchangedKeys(before, after, keys);
  const beforeValues: Partial<T> = {};
  const afterValues: Partial<T> = {};

  for (const key of changedKeys) {
    beforeValues[key] = before[key];
    afterValues[key] = after[key];
  }

  return {
    before: beforeValues,
    after: afterValues,
    changedKeys,
    unchangedKeys,
    hasChanges: changedKeys.length > 0,
  };
}

export function summarizeObjectDirty<T extends AnyRecord>(
  baseline: T,
  current: T,
  keys: readonly (keyof T)[] = uniqueArray([...objectKeys(baseline), ...objectKeys(current)])
): ObjectDirtySummary<T> {
  const dirtyKeys = getChangedKeys(baseline, current, keys);
  const pristineKeys = getUnchangedKeys(baseline, current, keys);
  const baselineValues: Partial<T> = {};
  const currentValues: Partial<T> = {};

  for (const key of dirtyKeys) {
    if (hasOwnKey(baseline, key)) {
      baselineValues[key] = baseline[key];
    }

    if (hasOwnKey(current, key)) {
      currentValues[key] = current[key];
    }
  }

  return {
    patch: createObjectPatch(baseline, current, dirtyKeys),
    baselineValues,
    currentValues,
    dirtyKeys,
    pristineKeys,
    totalCount: keys.length,
    dirtyCount: dirtyKeys.length,
    pristineCount: pristineKeys.length,
    dirty: dirtyKeys.length > 0,
    pristine: dirtyKeys.length === 0,
  };
}

export function isObjectDirty<T extends AnyRecord>(
  baseline: T,
  current: T,
  keys?: readonly (keyof T)[]
): boolean {
  return summarizeObjectDirty(baseline, current, keys ?? uniqueArray([...objectKeys(baseline), ...objectKeys(current)])).dirty;
}

export function getObjectDirtyKeys<T extends AnyRecord>(
  baseline: T,
  current: T,
  keys?: readonly (keyof T)[]
): Array<keyof T> {
  return summarizeObjectDirty(baseline, current, keys ?? uniqueArray([...objectKeys(baseline), ...objectKeys(current)])).dirtyKeys;
}

export function createObjectPatch<T extends AnyRecord>(before: T, after: T, keys?: readonly (keyof T)[]): Partial<T> {
  const result: Partial<T> = {};

  for (const key of getChangedKeys(before, after, keys ?? objectKeys(after))) {
    result[key] = after[key];
  }

  return result;
}

export function normalizeObjectPatch<T extends object>(patch: ObjectPatch<T>): Partial<T> {
  return patch ?? {};
}

export function getObjectPatchKeys<T extends object>(patch: ObjectPatch<T>): Array<keyof T> {
  return Object.keys(normalizeObjectPatch(patch)) as Array<keyof T>;
}

export function hasObjectPatch<T extends object>(patch: ObjectPatch<T>): boolean {
  return getObjectPatchKeys(patch).length > 0;
}

export function filterChangedObjectPatch<T extends AnyRecord>(before: T, patch: ObjectPatch<T>): Partial<T> {
  const normalizedPatch = normalizeObjectPatch(patch) as Partial<T>;
  const result: Partial<T> = {};

  for (const key of objectKeys(normalizedPatch as AnyRecord) as Array<keyof T>) {
    if (!deepEqual(before[key], normalizedPatch[key])) {
      result[key] = normalizedPatch[key];
    }
  }

  return result;
}

export function summarizeObjectPatchChanges<T extends AnyRecord>(before: T, patch: ObjectPatch<T>): ObjectPatchChangeSummary<T> {
  const normalizedPatch = normalizeObjectPatch(patch) as Partial<T>;
  const patchKeys = objectKeys(normalizedPatch as AnyRecord) as Array<keyof T>;
  const changedKeys = patchKeys.filter((key) => !deepEqual(before[key], normalizedPatch[key]));
  const unchangedKeys = patchKeys.filter((key) => deepEqual(before[key], normalizedPatch[key]));

  return {
    patch: filterChangedObjectPatch(before, normalizedPatch),
    changedKeys,
    unchangedKeys,
    hasChanges: changedKeys.length > 0,
  };
}

export function applyObjectPatch<T extends object>(value: T, patch: ObjectPatch<T>): T {
  return {
    ...value,
    ...normalizeObjectPatch(patch),
  };
}

export function applyObjectPatches<T extends object>(value: T, ...patches: readonly ObjectPatch<T>[]): T {
  return patches.reduce<T>((result, patch) => applyObjectPatch(result, patch), value);
}

export function createObjectResetPatch<T extends AnyRecord>(
  baseline: T,
  current: T,
  keys?: readonly (keyof T)[]
): Partial<T> {
  const dirtyKeys = keys ?? getObjectDirtyKeys(baseline, current);
  const patch: Partial<T> = {};

  for (const key of dirtyKeys) {
    if (hasOwnKey(baseline, key)) {
      patch[key] = baseline[key];
    }
  }

  return patch;
}

export function resetObjectKeys<T extends AnyRecord>(
  current: T,
  baseline: T,
  keys?: readonly (keyof T)[]
): T {
  const result = { ...current };
  const resetKeys = keys ?? getObjectDirtyKeys(baseline, current);

  for (const key of resetKeys) {
    if (hasOwnKey(baseline, key)) {
      result[key] = baseline[key];
    } else {
      delete result[key];
    }
  }

  return result;
}

export function resetObjectDirtyKeys<T extends AnyRecord>(current: T, baseline: T): T {
  return resetObjectKeys(current, baseline);
}

export function resetObjectDirtySummary<T extends AnyRecord>(
  current: T,
  summary: Pick<ObjectDirtySummary<T>, "dirtyKeys" | "baselineValues">
): T {
  const result = { ...current };

  for (const key of summary.dirtyKeys) {
    if (hasOwnKey(summary.baselineValues, key)) {
      result[key] = summary.baselineValues[key] as T[keyof T];
    } else {
      delete result[key];
    }
  }

  return result;
}

export function isSensitiveObjectKey(key: string, sensitiveKeys: readonly string[] = DEFAULT_SENSITIVE_KEYS): boolean {
  const normalizedKey = key.toLowerCase();
  return sensitiveKeys.some((item) => normalizedKey.includes(item.toLowerCase()));
}

export function redactSensitiveObjectDeep(value: unknown, options: RedactSensitiveOptions = {}): unknown {
  const replacement = options.replacement ?? "[DESENSITIZED]";
  const sensitiveKeys = options.sensitiveKeys ?? DEFAULT_SENSITIVE_KEYS;

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveObjectDeep(item, options));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    objectEntries(value).map(([key, item]) => {
      if (isSensitiveObjectKey(key, sensitiveKeys)) {
        return [key, replacement];
      }

      return [key, redactSensitiveObjectDeep(item, options)];
    })
  );
}

type ObjectPathContainer = AnyRecord | unknown[];

interface ObjectPathBracketSegment {
  value: string;
  endIndex: number;
}

function isArrayIndexPathKey(key: string): boolean {
  return ARRAY_INDEX_PATH_KEY_REGEXP.test(key);
}

function findQuotedPathSegmentEnd(value: string, startIndex: number): number {
  for (let index = startIndex + 1; index < value.length; index += 1) {
    if (value[index] !== "\"") continue;

    let backslashCount = 0;
    for (let cursor = index - 1; cursor >= startIndex && value[cursor] === "\\"; cursor -= 1) {
      backslashCount += 1;
    }

    if (backslashCount % 2 === 0) {
      return index;
    }
  }

  return -1;
}

function parseQuotedObjectPathSegment(value: string, startIndex: number): ObjectPathBracketSegment | null {
  const quoteEnd = findQuotedPathSegmentEnd(value, startIndex);
  if (quoteEnd < 0) {
    return null;
  }

  let closeIndex = quoteEnd + 1;
  while (closeIndex < value.length && /\s/.test(value[closeIndex])) {
    closeIndex += 1;
  }

  if (value[closeIndex] !== "]") {
    return null;
  }

  try {
    return {
      value: String(JSON.parse(value.slice(startIndex, quoteEnd + 1))),
      endIndex: closeIndex,
    };
  } catch {
    return null;
  }
}

function parseBracketObjectPathSegment(value: string, startIndex: number): ObjectPathBracketSegment | null {
  let cursor = startIndex + 1;
  while (cursor < value.length && /\s/.test(value[cursor])) {
    cursor += 1;
  }

  if (value[cursor] === "\"") {
    return parseQuotedObjectPathSegment(value, cursor);
  }

  const closeIndex = value.indexOf("]", cursor);
  if (closeIndex < 0) {
    return null;
  }

  return {
    value: value.slice(startIndex + 1, closeIndex),
    endIndex: closeIndex,
  };
}

function pushObjectPathSegment(result: string[], segment: string): void {
  if (segment) {
    result.push(segment);
  }
}

function parseObjectPathText(path: string): string[] {
  const result: string[] = [];
  let segment = "";

  for (let index = 0; index < path.length; index += 1) {
    const char = path[index];

    if (char === ".") {
      pushObjectPathSegment(result, segment);
      segment = "";
      continue;
    }

    if (char === "[") {
      pushObjectPathSegment(result, segment);
      segment = "";

      const bracketSegment = parseBracketObjectPathSegment(path, index);
      if (bracketSegment) {
        pushObjectPathSegment(result, bracketSegment.value);
        index = bracketSegment.endIndex;
      }
      continue;
    }

    if (char === "]") {
      pushObjectPathSegment(result, segment);
      segment = "";
      continue;
    }

    segment += char;
  }

  pushObjectPathSegment(result, segment);
  return result;
}

export function parseObjectPath(path: ObjectPathInput): string[] {
  if (typeof path === "string") {
    return parseObjectPathText(path);
  }

  return path.map(String).filter(Boolean);
}

export function joinObjectPath(...paths: readonly ObjectPathInput[]): string[] {
  return paths.flatMap((path) => parseObjectPath(path));
}

export function appendObjectPath(path: ObjectPathInput, ...segments: readonly (string | number)[]): string[] {
  return joinObjectPath(path, segments);
}

export function getObjectPathDepth(path: ObjectPathInput): number {
  return parseObjectPath(path).length;
}

export function isObjectPathEmpty(path: ObjectPathInput): boolean {
  return getObjectPathDepth(path) === 0;
}

export function getObjectPathKey(path: ObjectPathInput): string | undefined {
  const normalizedPath = parseObjectPath(path);
  return normalizedPath[normalizedPath.length - 1];
}

export function getObjectParentPath(path: ObjectPathInput): string[] {
  return parseObjectPath(path).slice(0, -1);
}

function toArrayIndexPathKey(key: string): number | null {
  return isArrayIndexPathKey(key) ? Number(key) : null;
}

function cloneObjectPathContainer(value: unknown): ObjectPathContainer | null {
  if (Array.isArray(value)) {
    return [...value];
  }

  if (isPlainObject(value)) {
    return { ...value };
  }

  return null;
}

function createObjectPathContainer(nextKey: string): ObjectPathContainer {
  return isArrayIndexPathKey(nextKey) ? [] : {};
}

function getObjectPathContainerValue(container: ObjectPathContainer, key: string): unknown {
  return (container as Record<string, unknown>)[key];
}

function setObjectPathContainerValue(container: ObjectPathContainer, key: string, value: unknown): void {
  (container as Record<string, unknown>)[key] = value;
}

function deleteObjectPathContainerValue(container: ObjectPathContainer, key: string): void {
  const arrayIndex = toArrayIndexPathKey(key);

  if (Array.isArray(container) && arrayIndex !== null && arrayIndex < container.length) {
    container.splice(arrayIndex, 1);
    return;
  }

  delete (container as Record<string, unknown>)[key];
}

function getObjectPathParentKey(path: readonly string[]): string {
  return path.slice(0, -1).join("\u0000");
}

function getRemovedArrayIndexDiffSort(entry: ObjectDiffEntry): { parentKey: string; index: number } | null {
  if (entry.type !== "removed") {
    return null;
  }

  const index = toArrayIndexPathKey(entry.path[entry.path.length - 1] ?? "");
  return index === null ? null : { parentKey: getObjectPathParentKey(entry.path), index };
}

function compareObjectDiffApplyEntries(
  left: { entry: ObjectDiffEntry; index: number },
  right: { entry: ObjectDiffEntry; index: number }
): number {
  const leftArrayRemoval = getRemovedArrayIndexDiffSort(left.entry);
  const rightArrayRemoval = getRemovedArrayIndexDiffSort(right.entry);

  if (leftArrayRemoval && rightArrayRemoval) {
    const parentOrder = leftArrayRemoval.parentKey.localeCompare(rightArrayRemoval.parentKey);
    return parentOrder || rightArrayRemoval.index - leftArrayRemoval.index || left.index - right.index;
  }

  if (leftArrayRemoval || rightArrayRemoval) {
    return leftArrayRemoval ? 1 : -1;
  }

  return left.index - right.index;
}

function isObjectPathInput(value: ValueIdentityOptions | ObjectPathInput): value is ObjectPathInput {
  return typeof value === "string" || Array.isArray(value);
}

export function objectPathToString(path: ObjectPathInput): string {
  return parseObjectPath(path).join(".");
}

export function escapeObjectPathSegment(segment: string | number): string {
  const normalizedSegment = String(segment);

  if (isArrayIndexPathKey(normalizedSegment)) {
    return `[${normalizedSegment}]`;
  }

  if (OBJECT_PATH_IDENTIFIER_REGEXP.test(normalizedSegment)) {
    return normalizedSegment;
  }

  return `[${JSON.stringify(normalizedSegment)}]`;
}

export function unescapeObjectPathSegment(segment: string): string {
  const trimmedSegment = segment.trim();

  if (!trimmedSegment.startsWith("[") || !trimmedSegment.endsWith("]")) {
    return segment;
  }

  const content = trimmedSegment.slice(1, -1).trim();

  if (!content) {
    return "";
  }

  if (isArrayIndexPathKey(content)) {
    return content;
  }

  try {
    const parsedValue = JSON.parse(content);
    return typeof parsedValue === "string" ? parsedValue : String(parsedValue ?? "");
  } catch {
    return content;
  }
}

export function formatObjectPath(path: ObjectPathInput): string {
  return parseObjectPath(path).reduce((result, segment) => {
    const escapedSegment = escapeObjectPathSegment(segment);

    if (!result) {
      return escapedSegment;
    }

    return escapedSegment.startsWith("[") ? `${result}${escapedSegment}` : `${result}.${escapedSegment}`;
  }, "");
}

export function isObjectPathEqual(left: ObjectPathInput, right: ObjectPathInput): boolean {
  return isNormalizedObjectPathEqual(parseObjectPath(left), parseObjectPath(right));
}

export function isObjectPathPrefix(path: ObjectPathInput, prefix: ObjectPathInput): boolean {
  return isNormalizedObjectPathPrefix(parseObjectPath(path), parseObjectPath(prefix));
}

export function flattenObject(value: unknown, prefix: ObjectPathInput = [], separator = "."): Record<string, unknown> {
  if (!isPlainObject(value)) {
    return {};
  }

  const result: Record<string, unknown> = {};
  const basePath = parseObjectPath(prefix);

  for (const [key, item] of objectEntries(value)) {
    const path = [...basePath, key];
    const pathText = path.join(separator);

    if (isPlainObject(item)) {
      Object.assign(result, flattenObject(item, path, separator));
    } else {
      result[pathText] = item;
    }
  }

  return result;
}

export function unflattenObject(value: AnyRecord, separator = "."): AnyRecord {
  return objectEntries(value).reduce<AnyRecord>((result, [key, item]) => {
    return setByPath(result, key.split(separator), item);
  }, {});
}

export function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    return left.every((item, index) => deepEqual(item, right[index]));
  }

  if (!isPlainObject(left) || !isPlainObject(right)) {
    return false;
  }

  const leftKeys = objectKeys(left);
  const rightKeys = objectKeys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && deepEqual(left[key], right[key]));
}

export function getByPath<T = unknown>(value: unknown, path: ObjectPathInput, fallback?: T): T | undefined {
  let current = value;

  for (const key of parseObjectPath(path)) {
    if (!isRecord(current) && !Array.isArray(current)) {
      return fallback;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current === undefined ? fallback : (current as T);
}

export function getValueIdentity(value: unknown, options: ValueIdentityOptions | ObjectPathInput = {}): ValueIdentity {
  const valueKey = isObjectPathInput(options) ? options : options.valueKey;
  const rawValue = valueKey && value && typeof value === "object" && !Array.isArray(value)
    ? getByPath(value, valueKey)
    : value;

  if (typeof rawValue === "string") {
    return normalizeStringKey(rawValue);
  }

  if (typeof rawValue === "number" || typeof rawValue === "boolean" || rawValue === null || rawValue === undefined) {
    return rawValue;
  }

  return normalizeStringKey(rawValue);
}

export function isSameValueIdentity(
  left: unknown,
  right: unknown,
  options: ValueIdentityOptions | ObjectPathInput = {}
): boolean {
  return Object.is(getValueIdentity(left, options), getValueIdentity(right, options));
}

export function hasByPath(value: unknown, path: ObjectPathInput): boolean {
  const normalizedPath = parseObjectPath(path);

  if (normalizedPath.length === 0) {
    return value !== undefined;
  }

  let current = value;

  for (const key of normalizedPath) {
    if (!isRecord(current) && !Array.isArray(current)) {
      return false;
    }

    if (!hasOwnKey(current, key)) {
      return false;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return true;
}

export function hasAnyByPath(value: unknown, paths: readonly ObjectPathInput[]): boolean {
  return paths.some((path) => hasByPath(value, path));
}

export function hasEveryByPath(value: unknown, paths: readonly ObjectPathInput[]): boolean {
  return paths.every((path) => hasByPath(value, path));
}

export function setByPath<T extends AnyRecord>(value: T, path: ObjectPathInput, nextValue: unknown): T {
  const normalizedPath = parseObjectPath(path);

  if (normalizedPath.length === 0) {
    return value;
  }

  const result = { ...value } as T;
  let current: ObjectPathContainer = result;

  for (const [index, key] of normalizedPath.entries()) {
    if (index === normalizedPath.length - 1) {
      setObjectPathContainerValue(current, key, nextValue);
      break;
    }

    const existing = getObjectPathContainerValue(current, key);
    const nextContainer = cloneObjectPathContainer(existing) ?? createObjectPathContainer(normalizedPath[index + 1]);
    setObjectPathContainerValue(current, key, nextContainer);
    current = nextContainer;
  }

  return result;
}

export function deleteByPath<T extends AnyRecord>(value: T, path: ObjectPathInput): T {
  const normalizedPath = parseObjectPath(path);

  if (normalizedPath.length === 0) {
    return value;
  }

  const result = { ...value } as T;
  let current: ObjectPathContainer = result;

  for (const [index, key] of normalizedPath.entries()) {
    if (index === normalizedPath.length - 1) {
      deleteObjectPathContainerValue(current, key);
      break;
    }

    const existing = getObjectPathContainerValue(current, key);
    const nextContainer = cloneObjectPathContainer(existing);

    if (!nextContainer) {
      break;
    }

    setObjectPathContainerValue(current, key, nextContainer);
    current = nextContainer;
  }

  return result;
}

export function updateByPath<T extends AnyRecord>(
  value: T,
  path: ObjectPathInput,
  updater: (currentValue: unknown) => unknown
): T {
  return setByPath(value, path, updater(getByPath(value, path)));
}

export function setByPaths<T extends AnyRecord>(value: T, entries: readonly ObjectPathValueEntry[]): T {
  return entries.reduce<T>((result, entry) => setByPath(result, entry.path, entry.value), { ...value });
}

export function deleteByPaths<T extends AnyRecord>(value: T, paths: readonly ObjectPathInput[]): T {
  return paths.reduce<T>((result, path) => deleteByPath(result, path), { ...value });
}

export function resetObjectPaths<T extends AnyRecord>(
  current: T,
  baseline: T,
  paths: readonly ObjectPathInput[]
): T {
  const baselineValues = getObjectPathValues(baseline, paths);

  return baselineValues.reduce<T>((result, entry) => {
    return entry.exists ? setByPath(result, entry.path, entry.value) : deleteByPath(result, entry.path);
  }, { ...current });
}

export function updateByPaths<T extends AnyRecord>(
  value: T,
  paths: readonly ObjectPathInput[],
  updater: (currentValue: unknown, path: string[], index: number) => unknown
): T {
  return paths.reduce<T>((result, path, index) => {
    const normalizedPath = parseObjectPath(path);
    return setByPath(result, normalizedPath, updater(getByPath(result, normalizedPath), normalizedPath, index));
  }, { ...value });
}

export function getObjectPathValues(value: unknown, paths: readonly ObjectPathInput[]): ObjectResolvedPathValue[] {
  return paths.map((path) => {
    const normalizedPath = parseObjectPath(path);
    const exists = hasByPath(value, normalizedPath);

    return {
      path: normalizedPath,
      pathText: objectPathToString(normalizedPath),
      value: getByPath(value, normalizedPath),
      exists,
    };
  });
}

export function pickByPaths(value: unknown, paths: readonly ObjectPathInput[]): AnyRecord {
  const entries = getObjectPathValues(value, paths)
    .filter((entry) => entry.exists)
    .map<ObjectPathValueEntry>((entry) => ({ path: entry.path, value: entry.value }));

  return setByPaths({}, entries);
}

export function omitByPaths<T extends AnyRecord>(value: T, paths: readonly ObjectPathInput[]): T {
  return deleteByPaths(value, paths);
}

export function mergeDeep<T extends AnyRecord>(target: T, ...sources: AnyRecord[]): T {
  return sources.reduce<T>((result, source) => {
    for (const [key, value] of objectEntries(source)) {
      const currentValue = result[key];
      result[key as keyof T] = isPlainObject(currentValue) && isPlainObject(value)
        ? (mergeDeep({ ...currentValue }, value) as T[keyof T])
        : (value as T[keyof T]);
    }

    return result;
  }, { ...target });
}

export function applyDeepObjectPatch<T extends AnyRecord>(value: T, patch: ObjectPatch<AnyRecord>): T {
  return mergeDeep(value, normalizeObjectPatch(patch) as AnyRecord);
}

export function hasObjectDiff(before: unknown, after: unknown): boolean {
  return !deepEqual(before, after);
}

export function filterObjectDiffEntries(
  entries: readonly ObjectDiffEntry[],
  typeOrTypes: ObjectDiffEntryType | readonly ObjectDiffEntryType[]
): ObjectDiffEntry[] {
  return entries.filter((entry) => objectDiffEntryMatches(entry, typeOrTypes));
}

export function partitionObjectDiffEntries(
  entries: readonly ObjectDiffEntry[],
  typeOrTypes: ObjectDiffEntryType | readonly ObjectDiffEntryType[]
): [ObjectDiffEntry[], ObjectDiffEntry[]] {
  const matched: ObjectDiffEntry[] = [];
  const unmatched: ObjectDiffEntry[] = [];

  for (const entry of entries) {
    if (objectDiffEntryMatches(entry, typeOrTypes)) {
      matched.push(entry);
    } else {
      unmatched.push(entry);
    }
  }

  return [matched, unmatched];
}

export function hasObjectDiffEntry(entries: readonly ObjectDiffEntry[], type?: ObjectDiffEntryType): boolean {
  return type ? entries.some((entry) => entry.type === type) : entries.length > 0;
}

export function getObjectDiffTypeSummary(entries: readonly ObjectDiffEntry[]): ObjectDiffTypeSummary {
  const stats = getObjectDiffStats(entries);
  const types = (["added", "removed", "changed"] as const).filter((type) => hasObjectDiffEntry(entries, type));

  return {
    types,
    stats,
    hasAdded: stats.added > 0,
    hasRemoved: stats.removed > 0,
    hasChanged: stats.changed > 0,
    onlyAdded: stats.added > 0 && stats.removed === 0 && stats.changed === 0,
    onlyRemoved: stats.removed > 0 && stats.added === 0 && stats.changed === 0,
    onlyChanged: stats.changed > 0 && stats.added === 0 && stats.removed === 0,
    hasChanges: stats.total > 0,
  };
}

function normalizeObjectDiffPathList(paths: readonly ObjectPathInput[] | undefined): string[][] {
  return (paths ?? []).map(parseObjectPath);
}

function isNormalizedObjectPathEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function isNormalizedObjectPathPrefix(path: readonly string[], prefix: readonly string[]): boolean {
  if (prefix.length > path.length) {
    return false;
  }

  return prefix.every((item, index) => item === path[index]);
}

function objectDiffPathMatches(
  path: readonly string[],
  targetPath: readonly string[],
  includeChildren: boolean
): boolean {
  return includeChildren ? isNormalizedObjectPathPrefix(path, targetPath) : isNormalizedObjectPathEqual(path, targetPath);
}

function objectDiffPathIntersects(left: readonly string[], right: readonly string[]): boolean {
  return isNormalizedObjectPathPrefix(left, right) || isNormalizedObjectPathPrefix(right, left);
}

export function filterObjectDiffEntriesByPath(
  entries: readonly ObjectDiffEntry[],
  path: ObjectPathInput,
  options: ObjectDiffPathFilterOptions = {}
): ObjectDiffEntry[] {
  const targetPath = parseObjectPath(path);
  const filteredEntries = options.type ? filterObjectDiffEntries(entries, options.type) : [...entries];
  const includeChildren = options.includeChildren ?? false;

  return filteredEntries.filter((entry) => objectDiffPathMatches(entry.path, targetPath, includeChildren));
}

export function filterObjectDiffEntriesByPaths(
  entries: readonly ObjectDiffEntry[],
  paths: readonly ObjectPathInput[],
  options: ObjectDiffPathFilterOptions = {}
): ObjectDiffEntry[] {
  const normalizedPaths = normalizeObjectDiffPathList(paths);
  const filteredEntries = options.type ? filterObjectDiffEntries(entries, options.type) : [...entries];
  const includeChildren = options.includeChildren ?? true;

  if (normalizedPaths.length === 0) {
    return filteredEntries;
  }

  return filteredEntries.filter((entry) =>
    normalizedPaths.some((path) => objectDiffPathMatches(entry.path, path, includeChildren))
  );
}

export function filterObjectDiffEntriesByIgnoredPaths(
  entries: readonly ObjectDiffEntry[],
  ignoredPaths: readonly ObjectPathInput[],
  options: ObjectDiffPathFilterOptions = {}
): ObjectDiffEntry[] {
  const normalizedPaths = normalizeObjectDiffPathList(ignoredPaths);
  const filteredEntries = options.type ? filterObjectDiffEntries(entries, options.type) : [...entries];
  const includeChildren = options.includeChildren ?? true;

  if (normalizedPaths.length === 0) {
    return filteredEntries;
  }

  return filteredEntries.filter((entry) =>
    normalizedPaths.every((path) => !objectDiffPathMatches(entry.path, path, includeChildren))
  );
}

export function findObjectDiffEntryByPath(
  entries: readonly ObjectDiffEntry[],
  path: ObjectPathInput,
  options: ObjectDiffPathFilterOptions = {}
): ObjectDiffEntry | undefined {
  return filterObjectDiffEntriesByPath(entries, path, options)[0];
}

export function hasObjectDiffPath(
  entries: readonly ObjectDiffEntry[],
  path: ObjectPathInput,
  options: ObjectDiffPathFilterOptions = {}
): boolean {
  return findObjectDiffEntryByPath(entries, path, options) !== undefined;
}

export function hasAnyObjectDiffPath(
  entries: readonly ObjectDiffEntry[],
  paths: readonly ObjectPathInput[],
  options: ObjectDiffPathFilterOptions = {}
): boolean {
  return paths.some((path) => hasObjectDiffPath(entries, path, options));
}

export function hasEveryObjectDiffPath(
  entries: readonly ObjectDiffEntry[],
  paths: readonly ObjectPathInput[],
  options: ObjectDiffPathFilterOptions = {}
): boolean {
  return paths.every((path) => hasObjectDiffPath(entries, path, options));
}

export function summarizeObjectDiffPathMatches(
  entries: readonly ObjectDiffEntry[],
  paths: readonly ObjectPathInput[],
  options: ObjectDiffPathFilterOptions = {}
): ObjectDiffPathMatchSummary {
  const pathOptions = { ...options, includeChildren: options.includeChildren ?? true };
  const matchedEntries = filterObjectDiffEntriesByPaths(entries, paths, pathOptions);
  const matchedPaths = paths
    .filter((path) => hasObjectDiffPath(entries, path, pathOptions))
    .map((path) => formatObjectDiffPath(path));
  const missingPaths = paths
    .filter((path) => !hasObjectDiffPath(entries, path, pathOptions))
    .map((path) => formatObjectDiffPath(path));

  return {
    paths: paths.map((path) => formatObjectDiffPath(path)),
    matchedPaths,
    missingPaths,
    matchedEntries,
    hasAnyPath: matchedPaths.length > 0,
    hasEveryPath: missingPaths.length === 0,
  };
}

export function getObjectDiffTopLevelKey(entry: ObjectDiffEntry, fallback = "root"): string {
  return entry.path[0] || fallback;
}

export function groupObjectDiffEntries(entries: readonly ObjectDiffEntry[]): ObjectDiffGroups {
  return {
    added: entries.filter((entry) => entry.type === "added"),
    removed: entries.filter((entry) => entry.type === "removed"),
    changed: entries.filter((entry) => entry.type === "changed"),
  };
}

export function groupObjectDiffEntriesByTopLevelKey(entries: readonly ObjectDiffEntry[]): ObjectDiffTopLevelGroups {
  return entries.reduce<ObjectDiffTopLevelGroups>((groups, entry) => {
    const key = getObjectDiffTopLevelKey(entry);
    groups[key] = groups[key] ?? [];
    groups[key].push(entry);
    return groups;
  }, {});
}

export function filterObjectDiffEntriesByTopLevelKey(
  entries: readonly ObjectDiffEntry[],
  key: string,
  type?: ObjectDiffEntryType
): ObjectDiffEntry[] {
  return entries.filter((entry) => getObjectDiffTopLevelKey(entry) === key && (!type || entry.type === type));
}

export function hasObjectDiffTopLevelKey(entries: readonly ObjectDiffEntry[], key: string, type?: ObjectDiffEntryType): boolean {
  return filterObjectDiffEntriesByTopLevelKey(entries, key, type).length > 0;
}

export function getObjectDiffTopLevelStats(entries: readonly ObjectDiffEntry[]): Record<string, ObjectDiffStats> {
  const groups = groupObjectDiffEntriesByTopLevelKey(entries);
  const result: Record<string, ObjectDiffStats> = {};

  for (const [key, groupEntries] of Object.entries(groups)) {
    result[key] = getObjectDiffStats(groupEntries);
  }

  return result;
}

export function getObjectDiffStats(entries: readonly ObjectDiffEntry[]): ObjectDiffStats {
  const groups = groupObjectDiffEntries(entries);

  return {
    added: groups.added.length,
    removed: groups.removed.length,
    changed: groups.changed.length,
    total: entries.length,
  };
}

export function summarizeObjectDiffImpact(entries: readonly ObjectDiffEntry[]): ObjectDiffImpactSummary {
  const stats = getObjectDiffStats(entries);
  const topLevelKeys = getObjectDiffTopLevelKeys(entries);
  const deepestPathDepth = entries.reduce((depth, entry) => Math.max(depth, entry.path.length), 0);

  return {
    stats,
    topLevelKeys,
    topLevelCount: topLevelKeys.length,
    deepestPathDepth,
    rootChanged: entries.some((entry) => entry.path.length === 0),
    onlyAdditive: entries.length > 0 && entries.every((entry) => entry.type === "added"),
    destructive: entries.some((entry) => entry.type === "removed" || entry.type === "changed"),
    hasChanges: entries.length > 0,
  };
}

export function formatObjectDiffPath(path: ObjectPathInput, fallback = "root"): string {
  const pathText = objectPathToString(path);
  return pathText || fallback;
}

export function getObjectDiffPaths(entries: readonly ObjectDiffEntry[], type?: ObjectDiffEntry["type"]): string[] {
  return entries
    .filter((entry) => (type ? entry.type === type : true))
    .map((entry) => formatObjectDiffPath(entry.path));
}

export function getObjectDiffPathSet(entries: readonly ObjectDiffEntry[], type?: ObjectDiffEntry["type"]): Set<string> {
  return new Set(getObjectDiffPaths(entries, type));
}

export function getObjectDiffPathGroups(entries: readonly ObjectDiffEntry[]): Record<ObjectDiffEntryType, string[]> {
  return {
    added: getObjectDiffPaths(entries, "added"),
    removed: getObjectDiffPaths(entries, "removed"),
    changed: getObjectDiffPaths(entries, "changed"),
  };
}

export function getObjectDiffChangedPaths(entries: readonly ObjectDiffEntry[]): string[] {
  return getObjectDiffPaths(entries, "changed");
}

export function getObjectDiffAddedPaths(entries: readonly ObjectDiffEntry[]): string[] {
  return getObjectDiffPaths(entries, "added");
}

export function getObjectDiffRemovedPaths(entries: readonly ObjectDiffEntry[]): string[] {
  return getObjectDiffPaths(entries, "removed");
}

function stringifyObjectDiffValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined) {
    return "undefined";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function formatObjectDiffEntry(entry: ObjectDiffEntry, options: FormatObjectDiffEntryOptions = {}): string {
  const typeLabel = options.typeLabels?.[entry.type] ?? entry.type;
  const pathText = formatObjectDiffPath(entry.path);

  if (!options.showValues) {
    return `${typeLabel}: ${pathText}`;
  }

  const stringifyValue = options.stringifyValue ?? stringifyObjectDiffValue;

  if (entry.type === "added") {
    return `${typeLabel}: ${pathText} = ${stringifyValue(entry.after)}`;
  }

  if (entry.type === "removed") {
    return `${typeLabel}: ${pathText} = ${stringifyValue(entry.before)}`;
  }

  return `${typeLabel}: ${pathText} ${stringifyValue(entry.before)} -> ${stringifyValue(entry.after)}`;
}

export function formatObjectDiff(entries: readonly ObjectDiffEntry[], options: FormatObjectDiffOptions = {}): string {
  const text = entries.map((entry) => formatObjectDiffEntry(entry, options)).join(options.separator ?? "\n");
  return text || options.fallback || "";
}

export function toObjectDiffDisplayEntry(entry: ObjectDiffEntry): ObjectDiffDisplayEntry {
  return {
    type: entry.type,
    path: [...entry.path],
    pathText: formatObjectDiffPath(entry.path),
    topLevelKey: getObjectDiffTopLevelKey(entry),
    before: entry.before,
    after: entry.after,
  };
}

export function toObjectDiffDisplayEntries(entries: readonly ObjectDiffEntry[]): ObjectDiffDisplayEntry[] {
  return entries.map(toObjectDiffDisplayEntry);
}

export function getObjectDiffTopLevelKeys(entries: readonly ObjectDiffEntry[], type?: ObjectDiffEntry["type"]): string[] {
  const keys: string[] = [];
  const seenKeys = new Set<string>();

  for (const entry of entries) {
    if (type && entry.type !== type) {
      continue;
    }

    const key = getObjectDiffTopLevelKey(entry);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      keys.push(key);
    }
  }

  return keys;
}

export function objectDiffEntryKey(entry: ObjectDiffEntry): string {
  return objectPathToString(entry.path);
}

export function sortObjectDiffEntries(entries: readonly ObjectDiffEntry[]): ObjectDiffEntry[] {
  const typeOrder: Record<ObjectDiffEntryType, number> = {
    removed: 0,
    changed: 1,
    added: 2,
  };

  return [...entries].sort((left, right) => {
    const pathOrder = objectDiffEntryKey(left).localeCompare(objectDiffEntryKey(right));
    return pathOrder || typeOrder[left.type] - typeOrder[right.type];
  });
}

export function objectDiffEntryMatches(entry: ObjectDiffEntry, typeOrTypes: ObjectDiffEntryType | readonly ObjectDiffEntryType[]): boolean {
  const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
  return types.includes(entry.type);
}

export function getObjectDiffEntryMap(entries: readonly ObjectDiffEntry[]): Map<string, ObjectDiffEntry> {
  const result = new Map<string, ObjectDiffEntry>();

  for (const entry of entries) {
    result.set(objectDiffEntryKey(entry), entry);
  }

  return result;
}

export function getObjectDiffEntryRecord(entries: readonly ObjectDiffEntry[]): Record<string, ObjectDiffEntry> {
  const result: Record<string, ObjectDiffEntry> = {};

  for (const entry of entries) {
    result[objectDiffEntryKey(entry)] = entry;
  }

  return result;
}

export function hasOnlyObjectDiffEntries(
  entries: readonly ObjectDiffEntry[],
  typeOrTypes: ObjectDiffEntryType | readonly ObjectDiffEntryType[]
): boolean {
  return entries.length > 0 && entries.every((entry) => objectDiffEntryMatches(entry, typeOrTypes));
}

export function hasOnlyAddedObjectDiffEntries(entries: readonly ObjectDiffEntry[]): boolean {
  return hasOnlyObjectDiffEntries(entries, "added");
}

export function hasOnlyRemovedObjectDiffEntries(entries: readonly ObjectDiffEntry[]): boolean {
  return hasOnlyObjectDiffEntries(entries, "removed");
}

export function hasOnlyChangedObjectDiffEntries(entries: readonly ObjectDiffEntry[]): boolean {
  return hasOnlyObjectDiffEntries(entries, "changed");
}

export function applyObjectDiff<T extends AnyRecord>(value: T, entries: readonly ObjectDiffEntry[]): T {
  const orderedEntries = entries
    .map((entry, index) => ({ entry, index }))
    .sort(compareObjectDiffApplyEntries);

  return orderedEntries.reduce<T>((result, { entry }) => {
    if (entry.type === "removed") {
      return deleteByPath(result, entry.path);
    }

    return setByPath(result, entry.path, entry.after);
  }, { ...value });
}

export function createObjectDiffPatch(entries: readonly ObjectDiffEntry[], options: ObjectDiffPatchOptions = {}): AnyRecord {
  return entries.reduce<AnyRecord>((result, entry) => {
    if (entry.type === "removed") {
      return options.includeRemoved ? setByPath(result, entry.path, options.removedValue) : result;
    }

    return setByPath(result, entry.path, entry.after);
  }, {});
}

export function applyObjectDiffPatch<T extends AnyRecord>(
  value: T,
  patch: AnyRecord,
  options: ApplyObjectDiffPatchOptions = {}
): T {
  const removedValue = options.removedValue;
  const pathSeparator = "\u0000";
  const entries = objectEntries(flattenObject(patch, [], pathSeparator))
    .map<ObjectPathValueEntry>((entry) => ({ path: entry[0].split(pathSeparator), value: entry[1] }))
    .sort((left, right) => right.path.length - left.path.length);

  return entries.reduce<T>((result, entry) => {
    return Object.is(entry.value, removedValue)
      ? deleteByPath(result, entry.path)
      : setByPath(result, entry.path, entry.value);
  }, { ...value });
}

export function createDeepObjectPatch(before: unknown, after: unknown, options: ObjectDiffPatchOptions = {}): AnyRecord {
  return createObjectDiffPatch(diffObjects(before, after), options);
}

export function createDeepObjectPatchByPaths(
  before: unknown,
  after: unknown,
  paths: readonly ObjectPathInput[],
  options: ObjectDiffPatchOptions = {}
): AnyRecord {
  return createObjectDiffPatch(diffObjectsByPaths(before, after, paths), options);
}

export function summarizeObjectDiff(entries: readonly ObjectDiffEntry[]): ObjectDiffSummary {
  return {
    entries: [...entries],
    groups: groupObjectDiffEntries(entries),
    stats: getObjectDiffStats(entries),
    paths: getObjectDiffPaths(entries),
    hasChanges: entries.length > 0,
  };
}

export function createObjectDiffChangeSet(entries: readonly ObjectDiffEntry[]): ObjectDiffChangeSet {
  const pathGroups = getObjectDiffPathGroups(entries);

  return {
    addedPaths: pathGroups.added,
    removedPaths: pathGroups.removed,
    changedPaths: pathGroups.changed,
    paths: getObjectDiffPaths(entries),
    topLevelKeys: getObjectDiffTopLevelKeys(entries),
    topLevelStats: getObjectDiffTopLevelStats(entries),
    stats: getObjectDiffStats(entries),
    hasChanges: entries.length > 0,
  };
}

export function createObjectDiffReportFromEntries(
  entries: readonly ObjectDiffEntry[],
  options: ObjectDiffPatchOptions = {}
): ObjectDiffReport {
  const normalizedEntries = [...entries];

  return {
    entries: normalizedEntries,
    summary: summarizeObjectDiff(normalizedEntries),
    changeSet: createObjectDiffChangeSet(normalizedEntries),
    patch: createObjectDiffPatch(normalizedEntries, options),
    inversePatch: createObjectDiffPatch(invertObjectDiff(normalizedEntries), options),
    hasChanges: normalizedEntries.length > 0,
  };
}

export function createObjectDiffDashboardFromEntries(
  entries: readonly ObjectDiffEntry[],
  options: ObjectDiffPatchOptions = {}
): ObjectDiffDashboard {
  const sortedEntries = sortObjectDiffEntries(entries);
  const destructiveEntries = sortedEntries.filter((entry) => entry.type === "removed" || entry.type === "changed");

  return {
    report: createObjectDiffReportFromEntries(sortedEntries, options),
    impact: summarizeObjectDiffImpact(sortedEntries),
    displayEntries: toObjectDiffDisplayEntries(sortedEntries),
    entryMap: getObjectDiffEntryMap(sortedEntries),
    entryRecord: getObjectDiffEntryRecord(sortedEntries),
    changedPathSet: getObjectDiffPathSet(sortedEntries),
    destructivePathSet: getObjectDiffPathSet(destructiveEntries),
  };
}

export function createInverseObjectDiffReportFromEntries(
  entries: readonly ObjectDiffEntry[],
  options: ObjectDiffPatchOptions = {}
): ObjectDiffReport {
  return createObjectDiffReportFromEntries(invertObjectDiff(entries), options);
}

export function diffObjectKeys(before: AnyRecord, after: AnyRecord): ObjectKeyDiff {
  const beforeKeys = objectKeySet(before);
  const afterKeys = objectKeySet(after);
  const addedKeys: string[] = [];
  const removedKeys: string[] = [];
  const changedKeys: string[] = [];
  const unchangedKeys: string[] = [];

  for (const key of afterKeys) {
    if (!beforeKeys.has(key)) {
      addedKeys.push(key);
      continue;
    }

    if (deepEqual(before[key], after[key])) {
      unchangedKeys.push(key);
    } else {
      changedKeys.push(key);
    }
  }

  for (const key of beforeKeys) {
    if (!afterKeys.has(key)) {
      removedKeys.push(key);
    }
  }

  return {
    addedKeys,
    removedKeys,
    changedKeys,
    unchangedKeys,
    total: addedKeys.length + removedKeys.length + changedKeys.length,
    hasChanges: addedKeys.length > 0 || removedKeys.length > 0 || changedKeys.length > 0,
  };
}

export function createObjectDiffSummary(before: unknown, after: unknown, basePath: string[] = []): ObjectDiffSummary {
  return summarizeObjectDiff(diffObjects(before, after, basePath));
}

export function createObjectDiffReport(
  before: unknown,
  after: unknown,
  options: ObjectDiffPatchOptions = {},
  basePath: string[] = []
): ObjectDiffReport {
  return createObjectDiffReportFromEntries(diffObjects(before, after, basePath), options);
}

export function createObjectDiffDashboard(
  before: unknown,
  after: unknown,
  options: ObjectDiffPatchOptions = {},
  basePath: string[] = []
): ObjectDiffDashboard {
  return createObjectDiffDashboardFromEntries(diffObjects(before, after, basePath), options);
}

export function createInverseObjectDiffReport(
  before: unknown,
  after: unknown,
  options: ObjectDiffPatchOptions = {},
  basePath: string[] = []
): ObjectDiffReport {
  return createInverseObjectDiffReportFromEntries(diffObjects(before, after, basePath), options);
}

export function getObjectDiff(before: unknown, after: unknown, basePath: string[] = []): ObjectDiffSummary {
  return createObjectDiffSummary(before, after, basePath);
}

export function diffObjectsByPaths(
  before: unknown,
  after: unknown,
  paths: readonly ObjectPathInput[],
  basePath: string[] = [],
  options: ObjectDiffPathFilterOptions = {}
): ObjectDiffEntry[] {
  return filterObjectDiffEntriesByPaths(diffObjects(before, after, basePath), paths, options);
}

export function hasObjectDiffByPaths(
  before: unknown,
  after: unknown,
  paths: readonly ObjectPathInput[],
  basePath: string[] = [],
  options: ObjectDiffPathFilterOptions = {}
): boolean {
  return diffObjectsByPaths(before, after, paths, basePath, options).length > 0;
}

export function createObjectDiffSummaryByPaths(
  before: unknown,
  after: unknown,
  paths: readonly ObjectPathInput[],
  basePath: string[] = [],
  options: ObjectDiffPathFilterOptions = {}
): ObjectDiffSummary {
  return summarizeObjectDiff(diffObjectsByPaths(before, after, paths, basePath, options));
}

export function createObjectDiffReportByPaths(
  before: unknown,
  after: unknown,
  paths: readonly ObjectPathInput[],
  patchOptions: ObjectDiffPatchOptions = {},
  basePath: string[] = [],
  filterOptions: ObjectDiffPathFilterOptions = {}
): ObjectDiffReport {
  return createObjectDiffReportFromEntries(diffObjectsByPaths(before, after, paths, basePath, filterOptions), patchOptions);
}

function shouldSkipDeepObjectDiffPath(path: readonly string[], ignoredPaths: readonly string[][]): boolean {
  return ignoredPaths.some((ignoredPath) => isNormalizedObjectPathPrefix(path, ignoredPath));
}

function shouldVisitDeepObjectDiffPath(path: readonly string[], includePaths: readonly string[][]): boolean {
  return includePaths.length === 0 || includePaths.some((includePath) => objectDiffPathIntersects(path, includePath));
}

function shouldEmitDeepObjectDiffPath(path: readonly string[], includePaths: readonly string[][]): boolean {
  return includePaths.length === 0 || includePaths.some((includePath) => objectDiffPathIntersects(path, includePath));
}

function createDeepObjectDiffEntry(
  entry: ObjectDiffEntry,
  includePaths: readonly string[][],
  ignoredPaths: readonly string[][]
): ObjectDiffEntry[] {
  if (shouldSkipDeepObjectDiffPath(entry.path, ignoredPaths) || !shouldEmitDeepObjectDiffPath(entry.path, includePaths)) {
    return [];
  }

  return [entry];
}

function diffObjectsDeepInternal(
  before: unknown,
  after: unknown,
  options: Required<Pick<ObjectDeepDiffOptions, "compareArraysByIndex">> & Pick<ObjectDeepDiffOptions, "equals">,
  basePath: string[],
  includePaths: readonly string[][],
  ignoredPaths: readonly string[][]
): ObjectDiffEntry[] {
  if (shouldSkipDeepObjectDiffPath(basePath, ignoredPaths) || !shouldVisitDeepObjectDiffPath(basePath, includePaths)) {
    return [];
  }

  const isEqual = options.equals ? options.equals(before, after, basePath) : deepEqual(before, after);

  if (isEqual) {
    return [];
  }

  if (isPlainObject(before) && isPlainObject(after)) {
    const entries: ObjectDiffEntry[] = [];
    const keys = new Set([...objectKeys(before), ...objectKeys(after)]);

    for (const key of keys) {
      const path = [...basePath, key];
      const hasBefore = Object.prototype.hasOwnProperty.call(before, key);
      const hasAfter = Object.prototype.hasOwnProperty.call(after, key);

      if (!hasBefore) {
        entries.push(...createDeepObjectDiffEntry({ type: "added", path, after: after[key] }, includePaths, ignoredPaths));
        continue;
      }

      if (!hasAfter) {
        entries.push(...createDeepObjectDiffEntry({ type: "removed", path, before: before[key] }, includePaths, ignoredPaths));
        continue;
      }

      entries.push(...diffObjectsDeepInternal(before[key], after[key], options, path, includePaths, ignoredPaths));
    }

    return entries;
  }

  if (options.compareArraysByIndex && Array.isArray(before) && Array.isArray(after)) {
    const entries: ObjectDiffEntry[] = [];
    const length = Math.max(before.length, after.length);

    for (let index = 0; index < length; index += 1) {
      const path = [...basePath, String(index)];
      const hasBefore = index < before.length;
      const hasAfter = index < after.length;

      if (!hasBefore) {
        entries.push(...createDeepObjectDiffEntry({ type: "added", path, after: after[index] }, includePaths, ignoredPaths));
        continue;
      }

      if (!hasAfter) {
        entries.push(...createDeepObjectDiffEntry({ type: "removed", path, before: before[index] }, includePaths, ignoredPaths));
        continue;
      }

      entries.push(...diffObjectsDeepInternal(before[index], after[index], options, path, includePaths, ignoredPaths));
    }

    return entries;
  }

  return createDeepObjectDiffEntry({ type: "changed", path: basePath, before, after }, includePaths, ignoredPaths);
}

export function diffObjectsDeep(
  before: unknown,
  after: unknown,
  options: ObjectDeepDiffOptions = {},
  basePath: string[] = []
): ObjectDiffEntry[] {
  return diffObjectsDeepInternal(
    before,
    after,
    {
      compareArraysByIndex: options.compareArraysByIndex ?? false,
      equals: options.equals,
    },
    basePath,
    normalizeObjectDiffPathList(options.includePaths),
    normalizeObjectDiffPathList(options.ignorePaths)
  );
}

export function createDeepObjectDiffSummary(
  before: unknown,
  after: unknown,
  options: ObjectDeepDiffOptions = {},
  basePath: string[] = []
): ObjectDiffSummary {
  return summarizeObjectDiff(diffObjectsDeep(before, after, options, basePath));
}

export function createDeepObjectDiffReport(
  before: unknown,
  after: unknown,
  diffOptions: ObjectDeepDiffOptions = {},
  patchOptions: ObjectDiffPatchOptions = {},
  basePath: string[] = []
): ObjectDiffReport {
  return createObjectDiffReportFromEntries(diffObjectsDeep(before, after, diffOptions, basePath), patchOptions);
}

export function diffObjectsDeepByPaths(
  before: unknown,
  after: unknown,
  paths: readonly ObjectPathInput[],
  options: ObjectDeepDiffByPathsOptions = {},
  basePath: string[] = []
): ObjectDiffEntry[] {
  return diffObjectsDeep(before, after, { ...options, includePaths: paths }, basePath);
}

export function hasDeepObjectDiffByPaths(
  before: unknown,
  after: unknown,
  paths: readonly ObjectPathInput[],
  options: ObjectDeepDiffByPathsOptions = {},
  basePath: string[] = []
): boolean {
  return diffObjectsDeepByPaths(before, after, paths, options, basePath).length > 0;
}

export function createDeepObjectDiffSummaryByPaths(
  before: unknown,
  after: unknown,
  paths: readonly ObjectPathInput[],
  options: ObjectDeepDiffByPathsOptions = {},
  basePath: string[] = []
): ObjectDiffSummary {
  return summarizeObjectDiff(diffObjectsDeepByPaths(before, after, paths, options, basePath));
}

export function createDeepObjectDiffReportByPaths(
  before: unknown,
  after: unknown,
  paths: readonly ObjectPathInput[],
  diffOptions: ObjectDeepDiffByPathsOptions = {},
  patchOptions: ObjectDiffPatchOptions = {},
  basePath: string[] = []
): ObjectDiffReport {
  return createObjectDiffReportFromEntries(diffObjectsDeepByPaths(before, after, paths, diffOptions, basePath), patchOptions);
}

export function invertObjectDiff(entries: readonly ObjectDiffEntry[]): ObjectDiffEntry[] {
  return entries.map((entry) => {
    if (entry.type === "added") {
      return {
        type: "removed",
        path: entry.path,
        before: entry.after,
      };
    }

    if (entry.type === "removed") {
      return {
        type: "added",
        path: entry.path,
        after: entry.before,
      };
    }

    return {
      type: "changed",
      path: entry.path,
      before: entry.after,
      after: entry.before,
    };
  });
}

export function revertObjectDiff<T extends AnyRecord>(value: T, entries: readonly ObjectDiffEntry[]): T {
  return applyObjectDiff(value, invertObjectDiff(entries));
}

export function diffObjects(before: unknown, after: unknown, basePath: string[] = []): ObjectDiffEntry[] {
  if (deepEqual(before, after)) {
    return [];
  }

  if (!isPlainObject(before) || !isPlainObject(after)) {
    return [{ type: "changed", path: basePath, before, after }];
  }

  const entries: ObjectDiffEntry[] = [];
  const keys = new Set([...objectKeys(before), ...objectKeys(after)]);

  for (const key of keys) {
    const path = [...basePath, key];
    const hasBefore = Object.prototype.hasOwnProperty.call(before, key);
    const hasAfter = Object.prototype.hasOwnProperty.call(after, key);

    if (!hasBefore) {
      entries.push({ type: "added", path, after: after[key] });
      continue;
    }

    if (!hasAfter) {
      entries.push({ type: "removed", path, before: before[key] });
      continue;
    }

    entries.push(...diffObjects(before[key], after[key], path));
  }

  return entries;
}
