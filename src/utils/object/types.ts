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

export type ObjectPathContainer = AnyRecord | unknown[];

export interface ObjectPathBracketSegment {
  value: string;
  endIndex: number;
}
