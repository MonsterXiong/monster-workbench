import {
  diffArraysByKeyChangesWithReport,
  firstItem,
  groupBy,
  maxBy,
  minBy,
  uniqueArray,
  type ArrayKeyedChangeReport,
} from "./array";
import { toFiniteNumber, toNonNegativeInteger } from "./number";
import { getFileExtension, getFileName, getUniqueFileName, type UniqueFileNameOptions } from "./path";
import { joinTextList, splitBySeparators } from "./string";
import { isNonEmptyValue } from "./value";

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

export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico", "avif"] as const;
export const TEXT_EXTENSIONS = ["txt", "md", "markdown", "log", "csv", "tsv", "json", "xml", "yaml", "yml"] as const;
export const DOCUMENT_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "rtf", "odt", "ods", "odp"] as const;
export const ARCHIVE_EXTENSIONS = ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "xz"] as const;
export const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "flac", "aac", "m4a"] as const;
export const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "avi", "mkv", "wmv", "m4v"] as const;
export const CODE_EXTENSIONS = [
  "js",
  "jsx",
  "ts",
  "tsx",
  "vue",
  "html",
  "css",
  "scss",
  "less",
  "rs",
  "go",
  "py",
  "java",
  "c",
  "cpp",
  "h",
  "hpp",
  "cs",
  "php",
  "rb",
  "sh",
  "ps1",
] as const;
export const FILE_KINDS: readonly FileKind[] = ["image", "text", "document", "archive", "audio", "video", "code", "file"] as const;

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  avif: "image/avif",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  log: "text/plain",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  json: "application/json",
  xml: "application/xml",
  yaml: "application/x-yaml",
  yml: "application/x-yaml",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  rtf: "application/rtf",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",
  tgz: "application/gzip",
  bz2: "application/x-bzip2",
  xz: "application/x-xz",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
  aac: "audio/aac",
  m4a: "audio/mp4",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  wmv: "video/x-ms-wmv",
  m4v: "video/x-m4v",
  js: "text/javascript",
  jsx: "text/javascript",
  ts: "text/typescript",
  tsx: "text/typescript",
  vue: "text/x-vue",
  html: "text/html",
  css: "text/css",
  scss: "text/x-scss",
  less: "text/x-less",
  rs: "text/x-rust",
  go: "text/x-go",
  py: "text/x-python",
  java: "text/x-java-source",
  c: "text/x-c",
  cpp: "text/x-c++src",
  h: "text/x-c",
  hpp: "text/x-c++hdr",
  cs: "text/x-csharp",
  php: "text/x-php",
  rb: "text/x-ruby",
  sh: "application/x-sh",
  ps1: "text/plain",
};

export function normalizeFileExtension(extension: string): string {
  return extension.trim().replace(/^\.+/, "").toLowerCase();
}

export function normalizeFileExtensionWithDot(extension: string): string {
  const normalizedExtension = normalizeFileExtension(extension);
  return normalizedExtension ? `.${normalizedExtension}` : "";
}

export function getFileExtensionWithDot(path: string): string {
  const extension = getFileExtension(path);
  return extension ? `.${extension}` : "";
}

export function getMimeTypeByExtension(extension: string, fallback = "application/octet-stream"): string {
  return MIME_TYPE_BY_EXTENSION[normalizeFileExtension(extension)] ?? fallback;
}

export function getMimeTypeByPath(path: string, fallback = "application/octet-stream"): string {
  const extension = getFileExtension(path);
  return extension ? getMimeTypeByExtension(extension, fallback) : fallback;
}

export function getMimeTypeBase(value: string): string {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isJsonMimeType(value: string): boolean {
  const mimeType = getMimeTypeBase(value);
  return mimeType === "application/json" || mimeType.endsWith("+json");
}

export function hasExtension(path: string, extensions: readonly string[]): boolean {
  const extension = getFileExtension(path);
  const normalizedExtensions = extensions.map(normalizeFileExtension);
  return extension.length > 0 && normalizedExtensions.includes(extension);
}

export function isImageFile(path: string): boolean {
  return hasExtension(path, IMAGE_EXTENSIONS);
}

export function isTextFile(path: string): boolean {
  return hasExtension(path, TEXT_EXTENSIONS);
}

export function isDocumentFile(path: string): boolean {
  return hasExtension(path, DOCUMENT_EXTENSIONS);
}

export function isArchiveFile(path: string): boolean {
  return hasExtension(path, ARCHIVE_EXTENSIONS);
}

export function isAudioFile(path: string): boolean {
  return hasExtension(path, AUDIO_EXTENSIONS);
}

export function isVideoFile(path: string): boolean {
  return hasExtension(path, VIDEO_EXTENSIONS);
}

export function isCodeFile(path: string): boolean {
  return hasExtension(path, CODE_EXTENSIONS);
}

export function getFileKind(path: string): FileKind {
  if (isImageFile(path)) return "image";
  if (isTextFile(path)) return "text";
  if (isDocumentFile(path)) return "document";
  if (isArchiveFile(path)) return "archive";
  if (isAudioFile(path)) return "audio";
  if (isVideoFile(path)) return "video";
  if (isCodeFile(path)) return "code";
  return "file";
}

export function getFileKindByExtension(extension: string): FileKind {
  const normalizedExtension = normalizeFileExtensionWithDot(extension);
  return normalizedExtension ? getFileKind(`file${normalizedExtension}`) : "file";
}

export function isFileKind(path: string, kind: FileKind): boolean {
  return getFileKind(path) === kind;
}

export function getFileKindFromMimeType(mimeType: string, fallback: FileKind = "file"): FileKind {
  const normalizedMimeType = getMimeTypeBase(mimeType);

  if (normalizedMimeType.startsWith("image/")) return "image";
  if (normalizedMimeType.startsWith("text/")) return "text";
  if (normalizedMimeType.startsWith("audio/")) return "audio";
  if (normalizedMimeType.startsWith("video/")) return "video";
  if (normalizedMimeType.includes("zip") || normalizedMimeType.includes("archive") || normalizedMimeType.includes("compressed")) return "archive";
  if (normalizedMimeType.includes("pdf") || normalizedMimeType.includes("word") || normalizedMimeType.includes("excel") || normalizedMimeType.includes("presentation")) return "document";

  return fallback;
}

export function isMimeTypeKind(mimeType: string, kind: FileKind): boolean {
  return getFileKindFromMimeType(mimeType) === kind;
}

export function getUploadFileType(path: string): UploadFileType {
  return isImageFile(path) ? "image" : "file";
}

export function normalizeAcceptRule(rule: unknown): string {
  const value = String(rule ?? "").trim().toLowerCase();

  if (!value) {
    return "";
  }

  if (value === "*") {
    return "*/*";
  }

  if (value.startsWith(".")) {
    return normalizeFileExtensionWithDot(value);
  }

  if (value.includes("/")) {
    return getMimeTypeBase(value);
  }

  return normalizeFileExtension(value);
}

export function normalizeAccept(accept: FileAcceptInput): string[] {
  if (!accept) {
    return [];
  }

  const items = Array.isArray(accept)
    ? accept.flatMap((item) => splitBySeparators(String(item ?? ""), [","], true))
    : splitBySeparators(String(accept), [","], true);
  return uniqueArray(items.map(normalizeAcceptRule).filter(isNonEmptyValue));
}

export function isAcceptAll(accept: FileAcceptInput): boolean {
  const rules = normalizeAccept(accept);
  return rules.length === 0 || rules.includes("*/*");
}

export function buildAcceptString(accept: FileAcceptInput): string {
  return normalizeAccept(accept).join(",");
}

export function getNativeAcceptValue(accept: FileAcceptInput): string | undefined {
  return isAcceptAll(accept) ? undefined : buildAcceptString(accept);
}

export function summarizeFileAccept(accept: FileAcceptInput): FileAcceptSummary {
  const rules = normalizeAccept(accept);
  const extensionRules = rules.filter((rule) => rule.startsWith("."));
  const mimeRules = rules.filter((rule) => rule.includes("/") && !rule.endsWith("/*"));
  const wildcardMimeRules = rules.filter((rule) => rule.endsWith("/*") || rule === "*/*");

  return {
    rules,
    acceptAll: isAcceptAll(accept),
    nativeAccept: getNativeAcceptValue(accept),
    extensionRules,
    mimeRules,
    wildcardMimeRules,
    extensionCount: extensionRules.length,
    mimeCount: mimeRules.length,
    wildcardMimeCount: wildcardMimeRules.length,
  };
}

export function getAcceptedExtensions(accept: FileAcceptInput): string[] {
  return normalizeAccept(accept)
    .filter((item) => item.startsWith("."))
    .map(normalizeFileExtension);
}

export function matchesAccept(path: string, accept: FileAcceptInput, mimeType = getMimeTypeByPath(path, "")): boolean {
  const rules = normalizeAccept(accept);

  if (rules.length === 0 || rules.includes("*/*")) {
    return true;
  }

  const extension = getFileExtension(path);
  const normalizedMimeType = getMimeTypeBase(mimeType);

  return rules.some((rule) => {
    if (rule.startsWith(".")) {
      return normalizeFileExtension(rule) === extension;
    }

    if (!rule.includes("/")) {
      return normalizeFileExtension(rule) === extension;
    }

    if (rule.endsWith("/*")) {
      return normalizedMimeType.startsWith(rule.slice(0, -1));
    }

    return normalizedMimeType === rule;
  });
}

export function getFileLikeMimeType(file: FileLike, fallback = getMimeTypeByPath(file.name, "")): string {
  return getMimeTypeBase(file.type || fallback);
}

export function matchesFileAccept(file: FileLike, accept: FileAcceptInput): boolean {
  return matchesAccept(file.name, accept, getFileLikeMimeType(file));
}

export function getSafeFileName(path: string, fallback = "file"): string {
  return getFileName(path) || fallback;
}

export function toFileArray<T extends FileNameLike = File>(files: FileListInput<T>): T[] {
  return files ? Array.from(files) : [];
}

export function getFileCount<T extends FileNameLike = File>(files: FileListInput<T>): number {
  return toFileArray(files).length;
}

export function getTotalFileSize<T extends FileLike = File>(files: FileListInput<T>): number {
  return toFileArray(files).reduce((total, file) => total + Math.max(0, toFiniteNumber(file.size ?? 0)), 0);
}

export function getFileSize(file: FileLike, fallback = 0): number {
  return Math.max(0, toFiniteNumber(file.size ?? fallback, fallback));
}

export function getFileLastModified(file: FileLike, fallback = 0): number {
  return Math.max(0, toFiniteNumber(file.lastModified ?? fallback, fallback));
}

export function hasFiles<T extends FileNameLike = File>(files: FileListInput<T>): files is Exclude<FileListInput<T>, null | undefined> {
  return getFileCount(files) > 0;
}

export function getDragEventFiles(event: DragEvent): FileList | null {
  return event.dataTransfer?.files ?? null;
}

export function hasDragEventFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

export function firstFile<T extends FileNameLike = File>(files: FileListInput<T>): T | undefined {
  return firstItem(toFileArray(files));
}

export function getFilesByKind<T extends FileLike = File>(files: FileListInput<T>, kind: FileKind): T[] {
  return toFileArray(files).filter((file) => getFileKind(file.name) === kind || getFileKindFromMimeType(file.type ?? "") === kind);
}

export function createFileKindCounts(): Record<FileKind, number> {
  return FILE_KINDS.reduce<Record<FileKind, number>>((result, kind) => {
    result[kind] = 0;
    return result;
  }, {} as Record<FileKind, number>);
}

export function getFileKindCounts<T extends FileLike = File>(files: FileListInput<T>): Record<FileKind, number> {
  const result = createFileKindCounts();

  for (const file of toFileArray(files)) {
    const pathKind = getFileKind(file.name);
    const kind = pathKind === "file" ? getFileKindFromMimeType(file.type ?? "", "file") : pathKind;
    result[kind] += 1;
  }

  return result;
}

export function getFileKinds<T extends FileLike = File>(files: FileListInput<T>): FileKind[] {
  const counts = getFileKindCounts(files);
  return FILE_KINDS.filter((kind) => counts[kind] > 0);
}

export function hasFileKind<T extends FileLike = File>(files: FileListInput<T>, kind: FileKind): boolean {
  return getFileKindCounts(files)[kind] > 0;
}

export function hasAnyFileKind<T extends FileLike = File>(files: FileListInput<T>, kinds: readonly FileKind[]): boolean {
  const counts = getFileKindCounts(files);
  return kinds.some((kind) => counts[kind] > 0);
}

export function hasEveryFileKind<T extends FileLike = File>(files: FileListInput<T>, kinds: readonly FileKind[]): boolean {
  const counts = getFileKindCounts(files);
  return kinds.every((kind) => counts[kind] > 0);
}

export function createFileKindGroups<T extends FileLike = File>(): Record<FileKind, T[]> {
  return FILE_KINDS.reduce<Record<FileKind, T[]>>((result, kind) => {
    result[kind] = [];
    return result;
  }, {} as Record<FileKind, T[]>);
}

export function groupFilesByKind<T extends FileLike = File>(files: FileListInput<T>): Record<FileKind, T[]> {
  const groups = createFileKindGroups<T>();
  const matchedGroups = groupBy(toFileArray(files), (file) => {
    const kind = getFileKind(file.name);
    return kind === "file" ? getFileKindFromMimeType(file.type ?? "", "file") : kind;
  }) as Partial<Record<FileKind, T[]>>;

  for (const kind of FILE_KINDS) {
    groups[kind] = matchedGroups[kind] ?? [];
  }

  return groups;
}

export function groupFilesByExtension<T extends FileNameLike = File>(files: FileListInput<T>, fallback = ""): Record<string, T[]> {
  return groupBy(toFileArray(files), (file) => getFileExtension(file.name) || fallback);
}

export function getFileExtensionCounts<T extends FileNameLike = File>(files: FileListInput<T>, fallback = ""): Record<string, number> {
  const result: Record<string, number> = {};

  for (const file of toFileArray(files)) {
    const extension = getFileExtension(file.name) || fallback;
    result[extension] = (result[extension] ?? 0) + 1;
  }

  return result;
}

export function getUniqueFileNames(fileNames: readonly string[], options: UniqueFileNameOptions = {}): string[] {
  const result: string[] = [];

  for (const fileName of fileNames) {
    const uniqueFileName = getUniqueFileName(fileName, result, options);
    result.push(uniqueFileName);
  }

  return result;
}

export function summarizeUniqueFileNames(fileNames: readonly string[], options: UniqueFileNameOptions = {}): UniqueFileNamesSummary {
  const uniqueNames = getUniqueFileNames(fileNames, options);
  const seenNames = new Set<string>();
  const duplicateOriginalNames = uniqueArray(fileNames.filter((name) => {
    const normalizedName = options.ignoreCase ?? true ? name.toLowerCase() : name;

    if (seenNames.has(normalizedName)) {
      return true;
    }

    seenNames.add(normalizedName);
    return false;
  }));
  const entries = fileNames.map<UniqueFileNameEntry>((originalName, index) => {
    const uniqueName = uniqueNames[index] ?? originalName;

    return {
      index,
      originalName,
      uniqueName,
      changed: originalName !== uniqueName,
    };
  });

  return {
    entries,
    originalNames: [...fileNames],
    uniqueNames,
    changedNames: entries.filter((entry) => entry.changed).map((entry) => entry.uniqueName),
    duplicateOriginalNames,
    totalCount: fileNames.length,
    changedCount: entries.filter((entry) => entry.changed).length,
    duplicateCount: duplicateOriginalNames.length,
    hasChanges: entries.some((entry) => entry.changed),
  };
}

export function summarizeFiles<T extends FileLike = File>(files: FileListInput<T>): FileListSummary {
  const fileArray = toFileArray(files);
  const kindCounts = getFileKindCounts(fileArray);

  return {
    totalCount: fileArray.length,
    totalSize: getTotalFileSize(fileArray),
    empty: fileArray.length === 0,
    names: getFileNames(fileArray),
    kinds: FILE_KINDS.filter((kind) => kindCounts[kind] > 0),
    kindCounts,
  };
}

export function summarizeFileSizes<T extends FileLike = File>(files: FileListInput<T>): FileSizeSummary<T> {
  const fileArray = toFileArray(files);

  if (fileArray.length === 0) {
    return {
      totalCount: 0,
      totalSize: 0,
      minSize: 0,
      maxSize: 0,
      averageSize: 0,
      empty: true,
      smallestFile: undefined,
      largestFile: undefined,
    };
  }

  let totalSize = 0;
  let minSize = Number.POSITIVE_INFINITY;
  let maxSize = Number.NEGATIVE_INFINITY;
  let smallestFile: T | undefined;
  let largestFile: T | undefined;

  for (const file of fileArray) {
    const size = getFileSize(file);
    totalSize += size;

    if (size < minSize) {
      minSize = size;
      smallestFile = file;
    }

    if (size > maxSize) {
      maxSize = size;
      largestFile = file;
    }
  }

  return {
    totalCount: fileArray.length,
    totalSize,
    minSize,
    maxSize,
    averageSize: totalSize / fileArray.length,
    empty: false,
    smallestFile,
    largestFile,
  };
}

function formatDefaultFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Number((size / 1024).toFixed(1))} KB`;
  }

  return `${Number((size / 1024 / 1024).toFixed(1))} MB`;
}

export function formatFileDisplaySummary(summary: FileListSummary, options: FormatFileDisplaySummaryOptions = {}): string {
  if (summary.empty) {
    return options.emptyText ?? "0 files";
  }

  const sizeFormatter = options.sizeFormatter ?? formatDefaultFileSize;
  const countText = `${summary.totalCount} files`;
  const sizeText = sizeFormatter(summary.totalSize);
  return [countText, sizeText].filter(Boolean).join(options.separator ?? " · ");
}

export function createFileDisplaySummary<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FormatFileDisplaySummaryOptions = {}
): FileDisplaySummary {
  const summary = summarizeFiles(files);
  const sizeFormatter = options.sizeFormatter ?? formatDefaultFileSize;

  return {
    ...summary,
    label: formatFileDisplaySummary(summary, options),
    sizeLabel: summary.empty ? options.emptyText ?? "0 files" : sizeFormatter(summary.totalSize),
    kindLabel: summary.kinds.join(options.kindSeparator ?? ", "),
  };
}

export function getEffectiveMaxFiles(maxFiles = 0, multiple = true): number {
  const safeMaxFiles = toNonNegativeInteger(maxFiles);
  return safeMaxFiles > 0 ? safeMaxFiles : multiple ? 0 : 1;
}

export function getFilesRejectedByAccept<T extends FileLike>(
  files: FileListInput<T>,
  accept: FileAcceptInput
): T[] {
  return toFileArray(files).filter((file) => !matchesFileAccept(file, accept));
}

export function getFilesAcceptedByAccept<T extends FileLike>(
  files: FileListInput<T>,
  accept: FileAcceptInput
): T[] {
  return toFileArray(files).filter((file) => matchesFileAccept(file, accept));
}

export function getFilesExceedingSize<T extends FileLike>(files: FileListInput<T>, maxSize = 0): T[] {
  const safeMaxSize = Math.max(0, toFiniteNumber(maxSize));
  return safeMaxSize > 0 ? toFileArray(files).filter((file) => toFiniteNumber(file.size ?? 0) > safeMaxSize) : [];
}

export function getFilesWithinSizeLimit<T extends FileLike>(files: FileListInput<T>, maxSize = 0): T[] {
  const safeMaxSize = Math.max(0, toFiniteNumber(maxSize));
  return safeMaxSize > 0 ? toFileArray(files).filter((file) => toFiniteNumber(file.size ?? 0) <= safeMaxSize) : toFileArray(files);
}

export function createFileValidationRejectGroups<T extends FileLike = File>(): FileValidationRejectGroups<T> {
  return {
    accept: [],
    "max-files": [],
    "max-size": [],
  };
}

export function getFileValidationRejectGroups<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileValidationOptions = {}
): FileValidationRejectGroups<T> {
  const fileArray = toFileArray(files);
  const maxFiles = getEffectiveMaxFiles(options.maxFiles, options.multiple ?? true);

  return {
    accept: getFilesRejectedByAccept(fileArray, options.accept),
    "max-files": maxFiles > 0 && fileArray.length > maxFiles ? fileArray : [],
    "max-size": getFilesExceedingSize(fileArray, options.maxSize),
  };
}

export function getFileValidationRejectEntries<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileValidationOptions = {}
): Array<FileValidationRejectEntry<T>> {
  const groups = getFileValidationRejectGroups(files, options);

  return (Object.entries(groups) as Array<[FileValidationRejectReason, T[]]>).flatMap(([reason, groupFiles]) =>
    groupFiles.map((file) => ({ file, reason }))
  );
}

export function getLargestFile<T extends FileLike = File>(files: FileListInput<T>): T | undefined {
  return maxBy(toFileArray(files), (file) => toFiniteNumber(file.size ?? 0));
}

export function getSmallestFile<T extends FileLike = File>(files: FileListInput<T>): T | undefined {
  return minBy(toFileArray(files), (file) => toFiniteNumber(file.size ?? 0));
}

export function validateFileList<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileValidationOptions = {}
): FileValidationResult<T> {
  const fileArray = toFileArray(files);

  if (fileArray.length === 0) {
    return {
      valid: false,
      files: fileArray,
      rejectedFiles: [],
      reason: null,
    };
  }

  const maxFiles = getEffectiveMaxFiles(options.maxFiles, options.multiple ?? true);
  if (maxFiles > 0 && fileArray.length > maxFiles) {
    return {
      valid: false,
      files: fileArray,
      rejectedFiles: fileArray,
      reason: "max-files",
    };
  }

  const invalidAcceptedFiles = getFilesRejectedByAccept(fileArray, options.accept);
  if (invalidAcceptedFiles.length > 0) {
    return {
      valid: false,
      files: fileArray,
      rejectedFiles: invalidAcceptedFiles,
      reason: "accept",
    };
  }

  const oversizedFiles = getFilesExceedingSize(fileArray, options.maxSize);
  if (oversizedFiles.length > 0) {
    return {
      valid: false,
      files: fileArray,
      rejectedFiles: oversizedFiles,
      reason: "max-size",
    };
  }

  return {
    valid: true,
    files: fileArray,
    rejectedFiles: [],
    reason: null,
  };
}

export function summarizeFileValidation<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileValidationOptions = {}
): FileValidationSummary {
  const fileArray = toFileArray(files);
  const rejectGroups = getFileValidationRejectGroups(fileArray, options);
  const rejectedFiles = new Set<T>([
    ...rejectGroups.accept,
    ...rejectGroups["max-size"],
    ...rejectGroups["max-files"],
  ]);
  const validation = validateFileList(fileArray, options);

  return {
    valid: validation.valid,
    totalCount: fileArray.length,
    acceptedCount: Math.max(0, fileArray.length - rejectedFiles.size),
    rejectedCount: rejectedFiles.size,
    acceptRejectedCount: rejectGroups.accept.length,
    maxFilesRejectedCount: rejectGroups["max-files"].length,
    maxSizeRejectedCount: rejectGroups["max-size"].length,
    reason: validation.reason,
  };
}

export function createFileValidationReport<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileValidationOptions = {}
): FileValidationReport<T> {
  const fileArray = toFileArray(files);
  const result = validateFileList(fileArray, options);
  const rejectGroups = getFileValidationRejectGroups(fileArray, options);
  const rejectEntries = getFileValidationRejectEntries(fileArray, options);
  const rejectedFileSet = new Set(rejectEntries.map((entry) => entry.file));

  return {
    result,
    summary: summarizeFileValidation(fileArray, options),
    rejectEntries,
    rejectGroups,
    acceptedFiles: fileArray.filter((file) => !rejectedFileSet.has(file)),
  };
}

export function createFileSelectionIntakeReport<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileValidationOptions = {}
): FileSelectionIntakeReport<T> {
  const fileArray = toFileArray(files);
  const rejectGroups = createFileValidationRejectGroups<T>();
  const maxFiles = getEffectiveMaxFiles(options.maxFiles, options.multiple ?? true);
  const acceptedFiles: T[] = [];

  for (const file of fileArray) {
    if (!matchesFileAccept(file, options.accept)) {
      rejectGroups.accept.push(file);
      continue;
    }

    if (getFilesExceedingSize([file], options.maxSize).length > 0) {
      rejectGroups["max-size"].push(file);
      continue;
    }

    if (maxFiles > 0 && acceptedFiles.length >= maxFiles) {
      rejectGroups["max-files"].push(file);
      continue;
    }

    acceptedFiles.push(file);
  }

  const rejectEntries = (Object.entries(rejectGroups) as Array<[FileValidationRejectReason, T[]]>).flatMap(([reason, groupFiles]) =>
    groupFiles.map((file) => ({ file, reason }))
  );
  const rejectedFiles = rejectEntries.map((entry) => entry.file);

  return {
    files: fileArray,
    acceptedFiles,
    rejectedFiles,
    rejectEntries,
    rejectGroups,
    summary: {
      valid: fileArray.length > 0 && rejectedFiles.length === 0,
      totalCount: fileArray.length,
      acceptedCount: acceptedFiles.length,
      rejectedCount: rejectedFiles.length,
      acceptRejectedCount: rejectGroups.accept.length,
      maxFilesRejectedCount: rejectGroups["max-files"].length,
      maxSizeRejectedCount: rejectGroups["max-size"].length,
      partial: acceptedFiles.length > 0 && rejectedFiles.length > 0,
      empty: fileArray.length === 0,
    },
    fileSummary: summarizeFiles(acceptedFiles),
    sizeSummary: summarizeFileSizes(acceptedFiles),
  };
}

export function createTextBlob(contents: string, mimeType = "text/plain"): Blob {
  return new Blob([contents], { type: mimeType });
}

export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;

  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

export function createBrowserDownloadResult(
  success: boolean,
  fileName: string,
  blob: Blob,
  error?: unknown
): BrowserDownloadResult {
  return {
    success,
    fileName,
    size: blob.size,
    mimeType: blob.type || getMimeTypeByPath(fileName, ""),
    ...(error === undefined ? {} : { error }),
  };
}

export function downloadBlobResult(fileName: string, blob: Blob): BrowserDownloadResult {
  try {
    downloadBlob(fileName, blob);
    return createBrowserDownloadResult(true, fileName, blob);
  } catch (error) {
    return createBrowserDownloadResult(false, fileName, blob, error);
  }
}

export function downloadTextFile(fileName: string, contents: string, mimeType = "text/plain"): void {
  downloadBlob(fileName, createTextBlob(contents, mimeType));
}

export function downloadTextFileResult(fileName: string, contents: string, mimeType = "text/plain"): BrowserDownloadResult {
  return downloadBlobResult(fileName, createTextBlob(contents, mimeType));
}

export function readFileAsText(file: Blob, failedMessage = "Failed to read file"): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      resolve(String(event.target?.result ?? ""));
    };
    reader.onerror = () => reject(new Error(failedMessage));
    reader.readAsText(file);
  });
}

export async function readFileAsTextResult<T extends FileLike & Blob>(
  file: T,
  failedMessage = "Failed to read file"
): Promise<BrowserFileReadResult> {
  try {
    const text = await readFileAsText(file, failedMessage);
    return {
      success: true,
      text,
      fileName: file.name,
      size: file.size,
      mimeType: getFileLikeMimeType(file),
    };
  } catch (error) {
    return {
      success: false,
      text: "",
      fileName: file.name,
      size: file.size,
      mimeType: getFileLikeMimeType(file),
      error,
    };
  }
}

export function readBrowserTextFile(
  accept: string | readonly string[] | null | undefined,
  failedMessage = "Failed to read file"
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = getNativeAcceptValue(accept) ?? "";
    input.onchange = (event: Event) => {
      const file = firstFile((event.target as HTMLInputElement).files);
      if (!file) return;

      readFileAsText(file, failedMessage).then(resolve, reject);
    };
    input.click();
  });
}

export function getFileNames<T extends FileNameLike = File>(files: FileListInput<T>): string[] {
  return toFileArray(files)
    .map((file) => file.name)
    .filter(Boolean);
}

export function joinFileNames<T extends FileNameLike = File>(files: FileListInput<T>, separator = "\u3001"): string {
  return joinTextList(getFileNames(files), separator);
}

export function normalizeFileIdentityName(name: string, ignoreCase = true): string {
  const normalizedName = name.trim();
  return ignoreCase ? normalizedName.toLowerCase() : normalizedName;
}

export function getFileIdentityKey(file: FileLike, options: FileIdentityOptions = {}): string {
  const mode = options.mode ?? "name-size-type-last-modified";
  const name = normalizeFileIdentityName(file.name, options.ignoreCase ?? true);

  if (mode === "name") {
    return JSON.stringify([name]);
  }

  const size = getFileSize(file);

  if (mode === "name-size") {
    return JSON.stringify([name, size]);
  }

  const type = getFileLikeMimeType(file);

  if (mode === "name-size-type") {
    return JSON.stringify([name, size, type]);
  }

  const lastModified = getFileLastModified(file);

  if (mode === "name-size-last-modified") {
    return JSON.stringify([name, size, lastModified]);
  }

  return JSON.stringify([name, size, type, lastModified]);
}

export function getFileIdentityKeys<T extends FileLike = File>(files: FileListInput<T>, options: FileIdentityOptions = {}): string[] {
  return toFileArray(files).map((file) => getFileIdentityKey(file, options));
}

export function summarizeDuplicateFiles<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileIdentityOptions = {}
): FileDuplicateSummary<T> {
  const fileArray = toFileArray(files);
  const groupsByKey = new Map<string, Array<{ file: T; index: number }>>();

  fileArray.forEach((file, index) => {
    const key = getFileIdentityKey(file, options);
    const group = groupsByKey.get(key) ?? [];
    group.push({ file, index });
    groupsByKey.set(key, group);
  });

  const groups: Array<FileDuplicateGroup<T>> = [];

  for (const [key, group] of groupsByKey) {
    if (group.length < 2) {
      continue;
    }

    const filesInGroup = group.map((entry) => entry.file);
    const indexes = group.map((entry) => entry.index);

    groups.push({
      key,
      files: filesInGroup,
      indexes,
      firstFile: filesInGroup[0],
      duplicateFiles: filesInGroup.slice(1),
      duplicateIndexes: indexes.slice(1),
      count: filesInGroup.length,
    });
  }

  const duplicateFiles = groups.flatMap((group) => group.duplicateFiles);
  const duplicateIndexes = groups.flatMap((group) => group.duplicateIndexes);

  return {
    groups,
    duplicateFiles,
    duplicateIndexes,
    duplicateKeys: groups.map((group) => group.key),
    totalCount: fileArray.length,
    uniqueCount: groupsByKey.size,
    duplicateCount: duplicateFiles.length,
    duplicateGroupCount: groups.length,
    hasDuplicates: groups.length > 0,
  };
}

export function hasDuplicateFiles<T extends FileLike = File>(files: FileListInput<T>, options: FileIdentityOptions = {}): boolean {
  return summarizeDuplicateFiles(files, options).hasDuplicates;
}

function getDeduplicatedFileIndexes<T extends FileLike>(
  files: readonly T[],
  options: FileDeduplicateOptions = {}
): number[] {
  const keep = options.keep ?? "first";
  const indexesByKey = new Map<string, number>();

  files.forEach((file, index) => {
    const key = getFileIdentityKey(file, options);
    if (keep === "last" || !indexesByKey.has(key)) {
      indexesByKey.set(key, index);
    }
  });

  return Array.from(indexesByKey.values()).sort((left, right) => left - right);
}

export function deduplicateFiles<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileDeduplicateOptions = {}
): T[] {
  const fileArray = toFileArray(files);
  return getDeduplicatedFileIndexes(fileArray, options).map((index) => fileArray[index]);
}

export function createFileDeduplicationReport<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileDeduplicateOptions = {}
): FileDeduplicationReport<T> {
  const fileArray = toFileArray(files);
  const summary = summarizeDuplicateFiles(fileArray, options);
  const deduplicatedFiles = deduplicateFiles(fileArray, options);
  const keptIndexes = new Set(getDeduplicatedFileIndexes(fileArray, options));
  const removedIndexes = fileArray
    .map((_file, index) => (keptIndexes.has(index) ? -1 : index))
    .filter((index) => index >= 0);
  const removedFiles = removedIndexes.map((index) => fileArray[index]);

  return {
    deduplicatedFiles,
    removedFiles,
    removedIndexes,
    summary,
    totalCount: fileArray.length,
    uniqueCount: deduplicatedFiles.length,
    removedCount: removedFiles.length,
    changed: removedIndexes.length > 0,
  };
}

export function compareFileSelections<T extends FileLike = File>(
  before: FileListInput<T>,
  after: FileListInput<T>,
  options: FileSelectionChangeOptions<T> = {}
): FileSelectionChangeReport<T> {
  const beforeFiles = toFileArray(before);
  const afterFiles = toFileArray(after);
  const isEqual = options.isEqual ?? ((beforeFile: T, afterFile: T) => (
    getFileSize(beforeFile) === getFileSize(afterFile)
      && getFileLikeMimeType(beforeFile) === getFileLikeMimeType(afterFile)
      && getFileLastModified(beforeFile) === getFileLastModified(afterFile)
  ));
  const changeReport = diffArraysByKeyChangesWithReport(
    beforeFiles,
    afterFiles,
    (file) => getFileIdentityKey(file, options),
    { isEqual }
  );
  const updatedFiles = changeReport.diff.updated
    .map((change) => change.after)
    .filter((file): file is T => Boolean(file));
  const movedFiles = changeReport.diff.moved
    .map((change) => change.after)
    .filter((file): file is T => Boolean(file));
  const retainedFiles = changeReport.diff.unchanged
    .map((change) => change.after)
    .filter((file): file is T => Boolean(file));

  return {
    beforeFiles,
    afterFiles,
    addedFiles: changeReport.diff.added,
    removedFiles: changeReport.diff.removed,
    updatedFiles,
    movedFiles,
    retainedFiles,
    addedKeys: changeReport.summary.addedKeys,
    removedKeys: changeReport.summary.removedKeys,
    updatedKeys: changeReport.summary.updatedKeys,
    movedKeys: changeReport.summary.movedKeys,
    retainedKeys: changeReport.summary.unchangedKeys,
    duplicateBeforeKeys: changeReport.diff.duplicateBeforeKeys,
    duplicateAfterKeys: changeReport.diff.duplicateAfterKeys,
    changedKeySet: changeReport.changedKeySet,
    duplicateKeySet: changeReport.duplicateKeySet,
    summary: {
      beforeCount: beforeFiles.length,
      afterCount: afterFiles.length,
      addedCount: changeReport.diff.added.length,
      removedCount: changeReport.diff.removed.length,
      updatedCount: changeReport.diff.updated.length,
      movedCount: changeReport.diff.moved.length,
      retainedCount: changeReport.diff.unchanged.length,
      duplicateBeforeCount: changeReport.diff.duplicateBeforeKeys.length,
      duplicateAfterCount: changeReport.diff.duplicateAfterKeys.length,
      totalChanges: changeReport.diff.stats.totalChanges,
      hasChanges: changeReport.diff.hasChanges,
      hasDuplicateKeys: changeReport.diff.hasDuplicateKeys,
      onlyOrderChanged: changeReport.summary.onlyOrderChanged,
    },
    changeReport,
    hasStructuralChanges: changeReport.hasStructuralChanges,
    hasContentChanges: changeReport.hasContentChanges,
  };
}
