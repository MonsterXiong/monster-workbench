import { getFileExtension } from "../path";
import {
  ARCHIVE_EXTENSIONS,
  AUDIO_EXTENSIONS,
  CODE_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  MIME_TYPE_BY_EXTENSION,
  TEXT_EXTENSIONS,
  VIDEO_EXTENSIONS,
} from "./constants";
import type { FileKind, FileLike, UploadFileType } from "./types";

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

export function getFileLikeMimeType(file: FileLike, fallback = getMimeTypeByPath(file.name, "")): string {
  return getMimeTypeBase(file.type || fallback);
}
