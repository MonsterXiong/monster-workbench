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

  for (const [key, item] of Object.entries(value) as Array<[keyof T, T[keyof T]]>) {
    if (item !== undefined && item !== null && item !== "") {
      result[key] = item;
    }
  }

  return result;
}

export function removeNullishValues<T extends AnyRecord>(value: T): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, item] of Object.entries(value) as Array<[keyof T, T[keyof T]]>) {
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
  return (Object.entries(value) as Array<[keyof T, T[keyof T]]>).reduce<Record<keyof T, R>>((result, [key, item]) => {
    result[key] = mapper(item, key);
    return result;
  }, {} as Record<keyof T, R>);
}

export function filterObject<T extends AnyRecord>(
  value: T,
  predicate: (item: T[keyof T], key: keyof T) => boolean
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, item] of Object.entries(value) as Array<[keyof T, T[keyof T]]>) {
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

export function objectFromEntries<K extends PropertyKey, V>(entries: readonly (readonly [K, V])[]): Record<K, V> {
  const result = {} as Record<K, V>;

  for (const [key, value] of entries) {
    result[key] = value;
  }

  return result;
}

export function hasOwnKey<T extends object, K extends PropertyKey>(value: T, key: K): key is K & keyof T {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function isEmptyObject(value: unknown): boolean {
  return isPlainObject(value) && Object.keys(value).length === 0;
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

export function hasObjectPatch<T extends object>(patch: Partial<T>): boolean {
  return Object.keys(patch).length > 0;
}

export function applyObjectPatch<T extends object>(value: T, patch: Partial<T>): T {
  return {
    ...value,
    ...patch,
  };
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
    Object.entries(value).map(([key, item]) => {
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

  for (const [key, item] of Object.entries(value)) {
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
  return Object.entries(value).reduce<AnyRecord>((result, [key, item]) => {
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

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

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

export function setByPath<T extends AnyRecord>(value: T, path: ObjectPathInput, nextValue: unknown): T {
  const normalizedPath = parseObjectPath(path);

  if (normalizedPath.length === 0) {
    return value;
  }

  const result = { ...value };
  let current: AnyRecord = result;

  normalizedPath.forEach((key, index) => {
    if (index === normalizedPath.length - 1) {
      current[key] = nextValue;
      return;
    }

    const existing = current[key];
    current[key] = isPlainObject(existing) ? { ...existing } : {};
    current = current[key] as AnyRecord;
  });

  return result;
}

export function deleteByPath<T extends AnyRecord>(value: T, path: ObjectPathInput): T {
  const normalizedPath = parseObjectPath(path);

  if (normalizedPath.length === 0) {
    return value;
  }

  const result = { ...value };
  let current: AnyRecord = result;

  normalizedPath.forEach((key, index) => {
    if (index === normalizedPath.length - 1) {
      delete current[key];
      return;
    }

    const existing = current[key];

    if (!isPlainObject(existing)) {
      return;
    }

    current[key] = { ...existing };
    current = current[key] as AnyRecord;
  });

  return result;
}

export function mergeDeep<T extends AnyRecord>(target: T, ...sources: AnyRecord[]): T {
  return sources.reduce<T>((result, source) => {
    for (const [key, value] of Object.entries(source)) {
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
  const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
  const typeSet = new Set<ObjectDiffEntryType>(types);
  return entries.filter((entry) => typeSet.has(entry.type));
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

export function groupObjectDiffEntries(entries: readonly ObjectDiffEntry[]): ObjectDiffGroups {
  return {
    added: entries.filter((entry) => entry.type === "added"),
    removed: entries.filter((entry) => entry.type === "removed"),
    changed: entries.filter((entry) => entry.type === "changed"),
  };
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
  const beforeKeys = new Set(Object.keys(before));
  const afterKeys = new Set(Object.keys(after));
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
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

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
