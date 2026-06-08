export type AnyRecord = Record<string, unknown>;
export type ObjectPath = readonly (string | number)[];
export type ObjectPathInput = string | ObjectPath;

export interface ObjectDiffEntry {
  type: "added" | "removed" | "changed";
  path: string[];
  before?: unknown;
  after?: unknown;
}

export interface ObjectDiffStats {
  added: number;
  removed: number;
  changed: number;
  total: number;
}

export type ObjectDiffGroups = Record<ObjectDiffEntry["type"], ObjectDiffEntry[]>;

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
