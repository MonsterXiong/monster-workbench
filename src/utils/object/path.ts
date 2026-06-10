import { normalizeStringKey } from "../string";
import { isPlainObject, isRecord } from "./core";
import { isNormalizedObjectPathEqual, isNormalizedObjectPathPrefix } from "./diff";
import { ARRAY_INDEX_PATH_KEY_REGEXP, hasOwnKey, normalizeObjectPatch, OBJECT_PATH_IDENTIFIER_REGEXP, objectEntries, objectKeys } from "./record";
import { AnyRecord, ObjectDiffEntry, ObjectPatch, ObjectPathBracketSegment, ObjectPathContainer, ObjectPathInput, ObjectPathValueEntry, ObjectResolvedPathValue, ValueIdentity, ValueIdentityOptions } from "./types";

export function isArrayIndexPathKey(key: string): boolean {
  return ARRAY_INDEX_PATH_KEY_REGEXP.test(key);
}

export function findQuotedPathSegmentEnd(value: string, startIndex: number): number {
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

export function parseQuotedObjectPathSegment(value: string, startIndex: number): ObjectPathBracketSegment | null {
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

export function parseBracketObjectPathSegment(value: string, startIndex: number): ObjectPathBracketSegment | null {
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

export function pushObjectPathSegment(result: string[], segment: string): void {
  if (segment) {
    result.push(segment);
  }
}

export function parseObjectPathText(path: string): string[] {
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

export function toArrayIndexPathKey(key: string): number | null {
  return isArrayIndexPathKey(key) ? Number(key) : null;
}

export function cloneObjectPathContainer(value: unknown): ObjectPathContainer | null {
  if (Array.isArray(value)) {
    return [...value];
  }

  if (isPlainObject(value)) {
    return { ...value };
  }

  return null;
}

export function createObjectPathContainer(nextKey: string): ObjectPathContainer {
  return isArrayIndexPathKey(nextKey) ? [] : {};
}

export function getObjectPathContainerValue(container: ObjectPathContainer, key: string): unknown {
  return (container as Record<string, unknown>)[key];
}

export function setObjectPathContainerValue(container: ObjectPathContainer, key: string, value: unknown): void {
  (container as Record<string, unknown>)[key] = value;
}

export function deleteObjectPathContainerValue(container: ObjectPathContainer, key: string): void {
  const arrayIndex = toArrayIndexPathKey(key);

  if (Array.isArray(container) && arrayIndex !== null && arrayIndex < container.length) {
    container.splice(arrayIndex, 1);
    return;
  }

  delete (container as Record<string, unknown>)[key];
}

export function getObjectPathParentKey(path: readonly string[]): string {
  return path.slice(0, -1).join("\u0000");
}

export function getRemovedArrayIndexDiffSort(entry: ObjectDiffEntry): { parentKey: string; index: number } | null {
  if (entry.type !== "removed") {
    return null;
  }

  const index = toArrayIndexPathKey(entry.path[entry.path.length - 1] ?? "");
  return index === null ? null : { parentKey: getObjectPathParentKey(entry.path), index };
}

export function compareObjectDiffApplyEntries(
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

export function isObjectPathInput(value: ValueIdentityOptions | ObjectPathInput): value is ObjectPathInput {
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

  if (typeof rawValue === "number" || typeof rawValue === "boolean") {
    return rawValue;
  }

  if (rawValue === null) {
    return null;
  }

  if (rawValue === undefined) {
    return undefined;
  }

  return normalizeStringKey(String(rawValue));
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
