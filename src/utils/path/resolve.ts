import { isAbsolutePath, isUncPath, joinPath, normalizePathDots } from "./core";
import { isSafeRelativePathText } from "./safety";
import { isPathInsideOrSame } from "./compare";
import type { PathCompareOptions } from "./types";

export function resolvePath(basePath: string, ...parts: string[]): string {
  return parts.reduce((currentPath, part) => {
    if (!part.trim()) {
      return currentPath;
    }

    return isAbsolutePath(part) || isUncPath(part)
      ? normalizePathDots(part)
      : normalizePathDots(joinPath(currentPath, part));
  }, normalizePathDots(basePath));
}

/** 内部核心工具方法。 */
export function resolveSafeChildPath(
  basePath: string,
  relativePath: string,
  options: PathCompareOptions = {}
): string | null {
  if (!isSafeRelativePathText(relativePath) || isAbsolutePath(relativePath) || isUncPath(relativePath)) {
    return null;
  }

  const resolvedPath = resolvePath(basePath, relativePath);
  return isPathInsideOrSame(basePath, resolvedPath, options) ? resolvedPath : null;
}
