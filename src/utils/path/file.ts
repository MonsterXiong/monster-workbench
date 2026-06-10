import { keySetBy } from "../array";
import { toIntegerAtLeast } from "../number";
import { joinPath } from "./core";
import { changeFileName as changeFileNameInternal, getDirectoryName, getFileBaseName, getFileExtension, getPathFileInfo, hasFileExtension, stripFileExtension } from "./file-internal";
import type { PathExtensionSummary, PathFileInfo, UniqueFileNameOptions } from "./types";

export { getDirectoryName, getFileBaseName, getFileExtension, getPathFileInfo, hasFileExtension, stripFileExtension };

export function getFileName(path: string): string {
  return getPathFileInfo(path).fileName;
}

export function changeFileName(path: string, fileName: string): string {
  return changeFileNameInternal(path, fileName);
}

export function changeFileBaseName(path: string, baseName: string): string {
  const info = getPathFileInfo(path);
  return changeFileName(path, `${baseName}${info.extensionWithDot}`);
}

export function appendFileNameSuffix(path: string, suffix: string): string {
  if (!suffix) {
    return path;
  }

  const info = getPathFileInfo(path);
  return changeFileName(path, `${info.baseName}${suffix}${info.extensionWithDot}`);
}

export function changeFileExtension(path: string, extension: string): string {
  const normalizedExtension = extension.replace(/^\./, "");
  return normalizedExtension ? `${stripFileExtension(path)}.${normalizedExtension}` : stripFileExtension(path);
}

export function getFileExtensions(paths: readonly string[], fallback = ""): string[] {
  return paths.map((path) => getFileExtension(path) || fallback);
}

export function countFileExtensions(paths: readonly string[], fallback = ""): Record<string, number> {
  return getFileExtensions(paths, fallback).reduce<Record<string, number>>((counts, extension) => {
    counts[extension] = (counts[extension] ?? 0) + 1;
    return counts;
  }, {});
}

export function summarizePathExtensions(paths: readonly string[], fallback = ""): PathExtensionSummary {
  const extensions = getFileExtensions(paths, fallback);
  const counts = countFileExtensions(paths, fallback);
  const emptyExtensionCount = extensions.filter((extension) => !extension).length;

  return {
    extensions,
    counts,
    totalCount: paths.length,
    emptyExtensionCount,
    uniqueExtensionCount: Object.keys(counts).filter(Boolean).length,
  };
}

export function ensureFileExtension(path: string, extension: string): string {
  const normalizedExtension = extension.trim().replace(/^\.+/, "");

  if (!normalizedExtension || hasFileExtension(path, [normalizedExtension])) {
    return path;
  }

  return `${path}.${normalizedExtension}`;
}

export function getUniqueFileName(fileName: string, existingNames: readonly string[], options: UniqueFileNameOptions = {}): string {
  const ignoreCase = options.ignoreCase ?? true;
  const separator = options.separator ?? " ";
  const startIndex = toIntegerAtLeast(options.startIndex ?? 1, 1);
  const normalizeName = (value: string) => (ignoreCase ? value.toLowerCase() : value);
  const existingNameSet = keySetBy(existingNames, normalizeName);

  if (!existingNameSet.has(normalizeName(fileName))) {
    return fileName;
  }

  const baseName = getFileBaseName(fileName) || "file";
  const dotIndex = fileName.lastIndexOf(".");
  const suffix = dotIndex > 0 ? fileName.slice(dotIndex) : "";

  for (let index = startIndex; index < Number.MAX_SAFE_INTEGER; index += 1) {
    const candidate = `${baseName}${separator}(${index})${suffix}`;

    if (!existingNameSet.has(normalizeName(candidate))) {
      return candidate;
    }
  }

  return fileName;
}

export function ensureJoinPath(directory: string, fileName: string): string {
  return directory ? joinPath(directory, fileName) : fileName;
}

export type { PathFileInfo };
