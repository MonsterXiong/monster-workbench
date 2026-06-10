import { getPathBodySegments, getPathChildPrefix, getPathRoot, getPathSegments, normalizePathDots, normalizePathForCompare } from "./core";
import type { PathCompareOptions, PathRelationSummary } from "./types";

export function isSamePath(left: string, right: string, options: PathCompareOptions = {}): boolean {
  return normalizePathForCompare(left, options) === normalizePathForCompare(right, options);
}

export function isPathInsideBasePath(basePath: string, targetPath: string, options: PathCompareOptions = {}): boolean {
  const normalizedBase = normalizePathForCompare(basePath, options);
  const normalizedTarget = normalizePathForCompare(targetPath, options);

  if (!normalizedBase || !normalizedTarget || normalizedBase === normalizedTarget) {
    return false;
  }

  return normalizedTarget.startsWith(getPathChildPrefix(normalizedBase));
}

export function isPathInsideOrSame(basePath: string, targetPath: string, options: PathCompareOptions = {}): boolean {
  return isSamePath(basePath, targetPath, options) || isPathInsideBasePath(basePath, targetPath, options);
}

/** 内部核心工具方法。 */
export function getRelativePath(basePath: string, targetPath: string, options: PathCompareOptions = {}): string {
  const normalizedBaseRaw = normalizePathForCompare(basePath);
  const normalizedTargetRaw = normalizePathForCompare(targetPath);
  const normalizedBase = normalizePathForCompare(basePath, options);
  const normalizedTarget = normalizePathForCompare(targetPath, options);
  const compareRoot = (path: string) => {
    const root = getPathRoot(path);
    return options.ignoreCase ? root.toLowerCase() : root;
  };
  const baseRoot = compareRoot(basePath);
  const targetRoot = compareRoot(targetPath);

  if (!normalizedBase) {
    return normalizedTargetRaw;
  }

  if (baseRoot !== targetRoot) {
    return normalizedTargetRaw;
  }

  if (normalizedTarget === normalizedBase) {
    return "";
  }

  const basePrefix = getPathChildPrefix(normalizedBase);

  if (normalizedTarget.startsWith(basePrefix)) {
    return normalizedTargetRaw.slice(getPathChildPrefix(normalizedBaseRaw).length);
  }

  const baseSegments = getPathSegments(normalizedBase);
  const targetSegments = getPathSegments(normalizedTargetRaw);
  const targetCompareSegments = getPathSegments(normalizedTarget);
  let sharedLength = 0;

  while (
    sharedLength < baseSegments.length &&
    sharedLength < targetCompareSegments.length &&
    baseSegments[sharedLength] === targetCompareSegments[sharedLength]
  ) {
    sharedLength += 1;
  }

  return [
    ...Array.from({ length: baseSegments.length - sharedLength }, () => ".."),
    ...targetSegments.slice(sharedLength),
  ].join("/");
}

export function getRelativePaths(basePath: string, targetPaths: readonly string[], options: PathCompareOptions = {}): string[] {
  return targetPaths.map((targetPath) => getRelativePath(basePath, targetPath, options));
}

export function getCommonPathAncestor(paths: readonly string[], options: PathCompareOptions = {}): string {
  const normalizedPaths = paths.map((path) => normalizePathDots(path)).filter(Boolean);

  if (normalizedPaths.length === 0) {
    return "";
  }

  const firstPath = normalizedPaths[0];
  const firstRoot = getPathRoot(firstPath);
  const firstComparableRoot = normalizePathForCompare(firstRoot, options);
  let commonSegments = getPathBodySegments(firstPath);
  let commonCompareSegments = getPathBodySegments(normalizePathForCompare(firstPath, options));

  for (const path of normalizedPaths.slice(1)) {
    if (normalizePathForCompare(getPathRoot(path), options) !== firstComparableRoot) {
      return "";
    }

    const compareSegments = getPathBodySegments(normalizePathForCompare(path, options));
    let sharedLength = 0;

    while (
      sharedLength < commonCompareSegments.length &&
      sharedLength < compareSegments.length &&
      commonCompareSegments[sharedLength] === compareSegments[sharedLength]
    ) {
      sharedLength += 1;
    }

    commonSegments = commonSegments.slice(0, sharedLength);
    commonCompareSegments = commonCompareSegments.slice(0, sharedLength);
  }

  if (commonSegments.length === 0) {
    return firstRoot;
  }

  return firstRoot ? `${firstRoot.replace(/\/$/, "")}/${commonSegments.join("/")}` : commonSegments.join("/");
}

/** 执行结构化特征分析并返回报告。 */
export function summarizePathRelation(
  basePath: string,
  targetPath: string,
  options: PathCompareOptions = {}
): PathRelationSummary {
  return {
    basePath,
    targetPath,
    same: isSamePath(basePath, targetPath, options),
    inside: isPathInsideBasePath(basePath, targetPath, options),
    insideOrSame: isPathInsideOrSame(basePath, targetPath, options),
    relativePath: getRelativePath(basePath, targetPath, options),
    commonAncestor: getCommonPathAncestor([basePath, targetPath], options),
  };
}
