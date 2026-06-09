import type { ArrayKeyedChangeReport } from "../array";

export type FileKind = "image" | "text" | "document" | "archive" | "audio" | "video" | "code" | "file";
export type UploadFileType = "image" | "file";
export type FileAcceptInput = string | readonly string[] | null | undefined;
export type FileIdentityMode = "name" | "name-size" | "name-size-type" | "name-size-last-modified" | "name-size-type-last-modified";
export type FileValidationRejectReason = "accept" | "max-files" | "max-size";
export type FileValidationRejectGroups<T extends FileLike = File> = Record<FileValidationRejectReason, T[]>;

export interface FileNameLike {
  name: string;
}

export interface FileLike extends FileNameLike {
  size?: number;
  type?: string;
  lastModified?: number;
}

export interface FileValidationOptions {
  accept?: FileAcceptInput;
  maxFiles?: number;
  maxSize?: number;
  multiple?: boolean;
}

export interface FileValidationResult<T extends FileLike = File> {
  valid: boolean;
  files: T[];
  rejectedFiles: T[];
  reason: FileValidationRejectReason | null;
}

export interface FileValidationSummary {
  valid: boolean;
  totalCount: number;
  acceptedCount: number;
  rejectedCount: number;
  acceptRejectedCount: number;
  maxFilesRejectedCount: number;
  maxSizeRejectedCount: number;
  reason: FileValidationRejectReason | null;
}

export interface FileValidationReport<T extends FileLike = File> {
  result: FileValidationResult<T>;
  summary: FileValidationSummary;
  rejectEntries: Array<FileValidationRejectEntry<T>>;
  rejectGroups: FileValidationRejectGroups<T>;
  acceptedFiles: T[];
}

export interface FileValidationRejectEntry<T extends FileLike = File> {
  file: T;
  reason: FileValidationRejectReason;
}

export interface FileSelectionIntakeSummary {
  valid: boolean;
  totalCount: number;
  acceptedCount: number;
  rejectedCount: number;
  acceptRejectedCount: number;
  maxFilesRejectedCount: number;
  maxSizeRejectedCount: number;
  partial: boolean;
  empty: boolean;
}

export interface FileSelectionIntakeReport<T extends FileLike = File> {
  files: T[];
  acceptedFiles: T[];
  rejectedFiles: T[];
  rejectEntries: Array<FileValidationRejectEntry<T>>;
  rejectGroups: FileValidationRejectGroups<T>;
  summary: FileSelectionIntakeSummary;
  fileSummary: FileListSummary;
  sizeSummary: FileSizeSummary<T>;
}

export interface FileListSummary {
  totalCount: number;
  totalSize: number;
  empty: boolean;
  names: string[];
  kinds: FileKind[];
  kindCounts: Record<FileKind, number>;
}

export interface FileSizeSummary<T extends FileLike = File> {
  totalCount: number;
  totalSize: number;
  minSize: number;
  maxSize: number;
  averageSize: number;
  empty: boolean;
  smallestFile: T | undefined;
  largestFile: T | undefined;
}

export interface FileDisplaySummary extends FileListSummary {
  label: string;
  sizeLabel: string;
  kindLabel: string;
}

export interface FileAcceptSummary {
  rules: string[];
  acceptAll: boolean;
  nativeAccept: string | undefined;
  extensionRules: string[];
  mimeRules: string[];
  wildcardMimeRules: string[];
  extensionCount: number;
  mimeCount: number;
  wildcardMimeCount: number;
}

export interface FileIdentityOptions {
  mode?: FileIdentityMode;
  ignoreCase?: boolean;
}

export interface FileDeduplicateOptions extends FileIdentityOptions {
  keep?: "first" | "last";
}

export interface FileDuplicateGroup<T extends FileLike = File> {
  key: string;
  files: T[];
  indexes: number[];
  firstFile: T;
  duplicateFiles: T[];
  duplicateIndexes: number[];
  count: number;
}

export interface FileDuplicateSummary<T extends FileLike = File> {
  groups: Array<FileDuplicateGroup<T>>;
  duplicateFiles: T[];
  duplicateIndexes: number[];
  duplicateKeys: string[];
  totalCount: number;
  uniqueCount: number;
  duplicateCount: number;
  duplicateGroupCount: number;
  hasDuplicates: boolean;
}

export interface FileDeduplicationReport<T extends FileLike = File> {
  deduplicatedFiles: T[];
  removedFiles: T[];
  removedIndexes: number[];
  summary: FileDuplicateSummary<T>;
  totalCount: number;
  uniqueCount: number;
  removedCount: number;
  changed: boolean;
}

export interface FileSelectionChangeOptions<T extends FileLike = File> extends FileIdentityOptions {
  isEqual?: (before: T, after: T, key: string) => boolean;
}

export interface FileSelectionChangeSummary {
  beforeCount: number;
  afterCount: number;
  addedCount: number;
  removedCount: number;
  updatedCount: number;
  movedCount: number;
  retainedCount: number;
  duplicateBeforeCount: number;
  duplicateAfterCount: number;
  totalChanges: number;
  hasChanges: boolean;
  hasDuplicateKeys: boolean;
  onlyOrderChanged: boolean;
}

export interface FileSelectionChangeReport<T extends FileLike = File> {
  beforeFiles: T[];
  afterFiles: T[];
  addedFiles: T[];
  removedFiles: T[];
  updatedFiles: T[];
  movedFiles: T[];
  retainedFiles: T[];
  addedKeys: string[];
  removedKeys: string[];
  updatedKeys: string[];
  movedKeys: string[];
  retainedKeys: string[];
  duplicateBeforeKeys: string[];
  duplicateAfterKeys: string[];
  changedKeySet: Set<string>;
  duplicateKeySet: Set<string>;
  summary: FileSelectionChangeSummary;
  changeReport: ArrayKeyedChangeReport<T, string>;
  hasStructuralChanges: boolean;
  hasContentChanges: boolean;
}

export interface UniqueFileNameEntry {
  index: number;
  originalName: string;
  uniqueName: string;
  changed: boolean;
}

export interface UniqueFileNamesSummary {
  entries: UniqueFileNameEntry[];
  originalNames: string[];
  uniqueNames: string[];
  changedNames: string[];
  duplicateOriginalNames: string[];
  totalCount: number;
  changedCount: number;
  duplicateCount: number;
  hasChanges: boolean;
}

export interface FormatFileDisplaySummaryOptions {
  emptyText?: string;
  separator?: string;
  kindSeparator?: string;
  sizeFormatter?: (size: number) => string;
}

export interface BrowserDownloadResult {
  success: boolean;
  fileName: string;
  size: number;
  mimeType: string;
  error?: unknown;
}

export interface BrowserFileReadResult {
  success: boolean;
  text: string;
  fileName: string;
  size: number;
  mimeType: string;
  error?: unknown;
}

export type FileListInput<T extends FileNameLike = File> = ArrayLike<T> | Iterable<T> | null | undefined;
