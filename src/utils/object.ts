import { isNonEmptyValue } from "./value";

export type AnyRecord = Record<string, unknown>;
export type ObjectPath = readonly (string | number)[];
export type ObjectPathInput = string | ObjectPath;

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

export type ObjectPatch<T extends object> = Partial<T> | null | undefined;

export interface ObjectDiffPathFilterOptions {
  includeChildren?: boolean;
  type?: ObjectDiffEntryType | readonly ObjectDiffEntryType[];
}

export interface RedactSensitiveOptions {
  replacement?: string;
  sensitiveKeys?: readonly string[];
}

const PATH_TOKEN_REGEXP = /[^.[\]]+/g;
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

export function objectFromEntries<K extends PropertyKey, V>(entries: readonly (readonly [K, V])[]): Record<K, V> {
  const result = {} as Record<K, V>;

  for (const [key, value] of entries) {
    result[key] = value;
  }

  return result;
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

export function applyObjectPatch<T extends object>(value: T, patch: ObjectPatch<T>): T {
  return {
    ...value,
    ...normalizeObjectPatch(patch),
  };
}

export function applyObjectPatches<T extends object>(value: T, ...patches: readonly ObjectPatch<T>[]): T {
  return patches.reduce<T>((result, patch) => applyObjectPatch(result, patch), value);
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

export function parseObjectPath(path: ObjectPathInput): string[] {
  if (typeof path === "string") {
    return path.match(PATH_TOKEN_REGEXP) ?? [];
  }

  return path.map(String).filter(Boolean);
}

export function objectPathToString(path: ObjectPathInput): string {
  return parseObjectPath(path).join(".");
}

export function isObjectPathEqual(left: ObjectPathInput, right: ObjectPathInput): boolean {
  const leftPath = parseObjectPath(left);
  const rightPath = parseObjectPath(right);
  return leftPath.length === rightPath.length && leftPath.every((item, index) => item === rightPath[index]);
}

export function isObjectPathPrefix(path: ObjectPathInput, prefix: ObjectPathInput): boolean {
  const normalizedPath = parseObjectPath(path);
  const normalizedPrefix = parseObjectPath(prefix);

  if (normalizedPrefix.length > normalizedPath.length) {
    return false;
  }

  return normalizedPrefix.every((item, index) => item === normalizedPath[index]);
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

export function setByPath<T extends AnyRecord>(value: T, path: ObjectPathInput, nextValue: unknown): T {
  const normalizedPath = parseObjectPath(path);

  if (normalizedPath.length === 0) {
    return value;
  }

  const result = { ...value };
  let current: AnyRecord = result;

  for (const [index, key] of normalizedPath.entries()) {
    if (index === normalizedPath.length - 1) {
      current[key] = nextValue;
      break;
    }

    const existing = current[key];
    current[key] = isPlainObject(existing) ? { ...existing } : {};
    current = current[key] as AnyRecord;
  }

  return result;
}

export function deleteByPath<T extends AnyRecord>(value: T, path: ObjectPathInput): T {
  const normalizedPath = parseObjectPath(path);

  if (normalizedPath.length === 0) {
    return value;
  }

  const result = { ...value };
  let current: AnyRecord = result;

  for (const [index, key] of normalizedPath.entries()) {
    if (index === normalizedPath.length - 1) {
      delete current[key];
      break;
    }

    const existing = current[key];

    if (!isPlainObject(existing)) {
      break;
    }

    current[key] = { ...existing };
    current = current[key] as AnyRecord;
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

export function pickByPaths(value: unknown, paths: readonly ObjectPathInput[]): AnyRecord {
  return paths.reduce<AnyRecord>((result, path) => {
    if (!hasByPath(value, path)) {
      return result;
    }

    return setByPath(result, path, getByPath(value, path));
  }, {});
}

export function omitByPaths<T extends AnyRecord>(value: T, paths: readonly ObjectPathInput[]): T {
  return paths.reduce<T>((result, path) => deleteByPath(result, path), { ...value });
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

export function hasObjectDiff(before: unknown, after: unknown): boolean {
  return !deepEqual(before, after);
}

export function filterObjectDiffEntries(
  entries: readonly ObjectDiffEntry[],
  typeOrTypes: ObjectDiffEntryType | readonly ObjectDiffEntryType[]
): ObjectDiffEntry[] {
  return entries.filter((entry) => objectDiffEntryMatches(entry, typeOrTypes));
}

export function hasObjectDiffEntry(entries: readonly ObjectDiffEntry[], type?: ObjectDiffEntryType): boolean {
  return type ? entries.some((entry) => entry.type === type) : entries.length > 0;
}

export function filterObjectDiffEntriesByPath(
  entries: readonly ObjectDiffEntry[],
  path: ObjectPathInput,
  options: ObjectDiffPathFilterOptions = {}
): ObjectDiffEntry[] {
  const filteredEntries = options.type ? filterObjectDiffEntries(entries, options.type) : [...entries];
  const matchesPath = options.includeChildren
    ? (entry: ObjectDiffEntry) => isObjectPathPrefix(entry.path, path)
    : (entry: ObjectDiffEntry) => isObjectPathEqual(entry.path, path);

  return filteredEntries.filter(matchesPath);
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

export function formatObjectDiffPath(path: ObjectPathInput, fallback = "root"): string {
  const pathText = objectPathToString(path);
  return pathText || fallback;
}

export function getObjectDiffPaths(entries: readonly ObjectDiffEntry[], type?: ObjectDiffEntry["type"]): string[] {
  return entries
    .filter((entry) => (type ? entry.type === type : true))
    .map((entry) => formatObjectDiffPath(entry.path));
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

export function hasOnlyObjectDiffEntries(
  entries: readonly ObjectDiffEntry[],
  typeOrTypes: ObjectDiffEntryType | readonly ObjectDiffEntryType[]
): boolean {
  return entries.length > 0 && entries.every((entry) => objectDiffEntryMatches(entry, typeOrTypes));
}

export function applyObjectDiff<T extends AnyRecord>(value: T, entries: readonly ObjectDiffEntry[]): T {
  return entries.reduce<T>((result, entry) => {
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

export function createDeepObjectPatch(before: unknown, after: unknown, options: ObjectDiffPatchOptions = {}): AnyRecord {
  return createObjectDiffPatch(diffObjects(before, after), options);
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

export function getObjectDiff(before: unknown, after: unknown, basePath: string[] = []): ObjectDiffSummary {
  return createObjectDiffSummary(before, after, basePath);
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
