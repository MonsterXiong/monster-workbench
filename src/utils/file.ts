import { firstItem, uniqueArray } from "./array";
import { toFiniteNumber, toNonNegativeInteger } from "./number";
import { getFileExtension, getFileName } from "./path";
import { joinTextList, splitBySeparators } from "./string";
import { isNonEmptyValue } from "./value";

export type FileKind = "image" | "text" | "document" | "archive" | "audio" | "video" | "code" | "file";
export type UploadFileType = "image" | "file";
export type FileAcceptInput = string | readonly string[] | null | undefined;
export type FileValidationRejectReason = "accept" | "max-files" | "max-size";

export interface FileNameLike {
  name: string;
}

export interface FileLike extends FileNameLike {
  size?: number;
  type?: string;
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

export function hasFiles<T extends FileNameLike = File>(files: FileListInput<T>): files is Exclude<FileListInput<T>, null | undefined> {
  return getFileCount(files) > 0;
}

export function getDragEventFiles(event: DragEvent): FileList | null {
  return event.dataTransfer?.files ?? null;
}

export function firstFile<T extends FileNameLike = File>(files: FileListInput<T>): T | undefined {
  return firstItem(toFileArray(files));
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

export function getFilesExceedingSize<T extends FileLike>(files: FileListInput<T>, maxSize = 0): T[] {
  const safeMaxSize = Math.max(0, toFiniteNumber(maxSize));
  return safeMaxSize > 0 ? toFileArray(files).filter((file) => toFiniteNumber(file.size ?? 0) > safeMaxSize) : [];
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

export function downloadTextFile(fileName: string, contents: string, mimeType = "text/plain"): void {
  downloadBlob(fileName, createTextBlob(contents, mimeType));
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
