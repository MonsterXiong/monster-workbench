import { isPlainObject } from "./core";
import { compareObjectDiffApplyEntries, deepEqual, deleteByPath, flattenObject, objectPathToString, parseObjectPath, setByPath } from "./path";
import { objectEntries, objectKeys, objectKeySet } from "./record";
import { AnyRecord, ApplyObjectDiffPatchOptions, FormatObjectDiffEntryOptions, FormatObjectDiffOptions, ObjectDeepDiffByPathsOptions, ObjectDeepDiffOptions, ObjectDiffChangeSet, ObjectDiffDashboard, ObjectDiffDisplayEntry, ObjectDiffEntry, ObjectDiffEntryType, ObjectDiffGroups, ObjectDiffImpactSummary, ObjectDiffPatchOptions, ObjectDiffPathFilterOptions, ObjectDiffPathMatchSummary, ObjectDiffReport, ObjectDiffStats, ObjectDiffSummary, ObjectDiffTopLevelGroups, ObjectDiffTypeSummary, ObjectKeyDiff, ObjectPathInput, ObjectPathValueEntry } from "./types";

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

export function normalizeObjectDiffPathList(paths: readonly ObjectPathInput[] | undefined): string[][] {
  return (paths ?? []).map(parseObjectPath);
}

export function isNormalizedObjectPathEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export function isNormalizedObjectPathPrefix(path: readonly string[], prefix: readonly string[]): boolean {
  if (prefix.length > path.length) {
    return false;
  }

  return prefix.every((item, index) => item === path[index]);
}

export function objectDiffPathMatches(
  path: readonly string[],
  targetPath: readonly string[],
  includeChildren: boolean
): boolean {
  return includeChildren ? isNormalizedObjectPathPrefix(path, targetPath) : isNormalizedObjectPathEqual(path, targetPath);
}

export function objectDiffPathIntersects(left: readonly string[], right: readonly string[]): boolean {
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

export function stringifyObjectDiffValue(value: unknown): string {
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

export function shouldSkipDeepObjectDiffPath(path: readonly string[], ignoredPaths: readonly string[][]): boolean {
  return ignoredPaths.some((ignoredPath) => isNormalizedObjectPathPrefix(path, ignoredPath));
}

export function shouldVisitDeepObjectDiffPath(path: readonly string[], includePaths: readonly string[][]): boolean {
  return includePaths.length === 0 || includePaths.some((includePath) => objectDiffPathIntersects(path, includePath));
}

export function shouldEmitDeepObjectDiffPath(path: readonly string[], includePaths: readonly string[][]): boolean {
  return includePaths.length === 0 || includePaths.some((includePath) => objectDiffPathIntersects(path, includePath));
}

export function createDeepObjectDiffEntry(
  entry: ObjectDiffEntry,
  includePaths: readonly string[][],
  ignoredPaths: readonly string[][]
): ObjectDiffEntry[] {
  if (shouldSkipDeepObjectDiffPath(entry.path, ignoredPaths) || !shouldEmitDeepObjectDiffPath(entry.path, includePaths)) {
    return [];
  }

  return [entry];
}

export function diffObjectsDeepInternal(
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
