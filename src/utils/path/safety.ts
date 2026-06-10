import { getDirectoryName } from "./file-internal";
import { summarizePathExtensions } from "./file";
import { getCommonPathAncestor } from "./compare";
import { getPathDepth, getPathRoot, hasPathControlCharacters, hasPathTraversal, isAbsolutePath, isRelativePath, isUncPath, isWindowsDrivePath, normalizePathDots, normalizePathInput } from "./core";
import { sanitizeFileNameWithFallback as sanitizeFileNameWithFallbackInternal, sanitizeFileName as sanitizeFileNameInternal, isSafeFileName as isSafeFileNameInternal, summarizeFileNameSanitize as summarizeFileNameSanitizeInternal } from "./safety-file";
import type { FileNameSanitizeSummary, PathListSummary, PathSafetySummary } from "./types";

export function summarizePaths(paths: readonly string[], fallbackExtension = ""): PathListSummary {
  const normalizedPaths = paths.map(normalizePathDots).filter(Boolean);
  const rootCounts: Record<string, number> = {};
  const directoryCounts: Record<string, number> = {};

  for (const path of normalizedPaths) {
    const root = getPathRoot(path);
    const directory = getDirectoryName(path);
    rootCounts[root] = (rootCounts[root] ?? 0) + 1;
    directoryCounts[directory] = (directoryCounts[directory] ?? 0) + 1;
  }

  return {
    totalCount: paths.length,
    empty: paths.length === 0,
    absoluteCount: normalizedPaths.filter(isAbsolutePath).length,
    relativeCount: normalizedPaths.filter(isRelativePath).length,
    unsafeCount: paths.filter((path) => hasPathControlCharacters(path) || hasPathTraversal(path)).length,
    maxDepth: normalizedPaths.reduce((maxDepth, path) => Math.max(maxDepth, getPathDepth(path)), 0),
    commonAncestor: getCommonPathAncestor(normalizedPaths),
    roots: Object.keys(rootCounts),
    rootCounts,
    directories: Object.keys(directoryCounts),
    directoryCounts,
    extensionSummary: summarizePathExtensions(normalizedPaths, fallbackExtension),
  };
}

export function isSafeRelativePathText(path: string): boolean {
  const normalizedPath = normalizePathInput(path);
  return isRelativePath(normalizedPath) && !hasPathControlCharacters(normalizedPath) && !hasPathTraversal(normalizedPath);
}

export function summarizePathSafety(path: string): PathSafetySummary {
  const normalizedPath = normalizePathInput(path);

  return {
    path,
    normalizedPath,
    empty: normalizedPath.length === 0,
    absolute: isAbsolutePath(normalizedPath),
    relative: isRelativePath(normalizedPath),
    windowsDrive: isWindowsDrivePath(normalizedPath),
    unc: isUncPath(path),
    hasControlCharacters: hasPathControlCharacters(path),
    hasTraversal: hasPathTraversal(normalizedPath),
    safeRelative: isSafeRelativePathText(normalizedPath),
  };
}

export function sanitizeFileName(value: string, replacement = "_"): string {
  return sanitizeFileNameInternal(value, replacement);
}

export function isSafeFileName(value: string): boolean {
  return isSafeFileNameInternal(value);
}

export function sanitizeFileNameWithFallback(value: string, fallback = "untitled", replacement = "_"): string {
  return sanitizeFileNameWithFallbackInternal(value, fallback, replacement);
}

export function summarizeFileNameSanitize(
  value: string,
  fallback = "untitled",
  replacement = "_"
): FileNameSanitizeSummary {
  return summarizeFileNameSanitizeInternal(value, fallback, replacement);
}

export function sanitizeFileNames(values: readonly string[], fallback = "untitled", replacement = "_"): string[] {
  return values.map((value) => sanitizeFileNameWithFallback(value, fallback, replacement));
}
