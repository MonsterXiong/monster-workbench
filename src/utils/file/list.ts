import { firstItem, groupBy } from "../array";
import { toFiniteNumber } from "../number";
import { getFileExtension, getFileName } from "../path";
import { joinTextList } from "../string";
import { FILE_KINDS } from "./constants";
import { getFileKind, getFileKindFromMimeType } from "./mime";
import type { FileKind, FileLike, FileListInput, FileNameLike } from "./types";

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

export function getFileNames<T extends FileNameLike = File>(files: FileListInput<T>): string[] {
  return toFileArray(files)
    .map((file) => file.name)
    .filter(Boolean);
}

export function joinFileNames<T extends FileNameLike = File>(files: FileListInput<T>, separator = "\u3001"): string {
  return joinTextList(getFileNames(files), separator);
}
