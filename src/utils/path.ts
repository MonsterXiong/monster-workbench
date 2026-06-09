import { keySetBy } from "./array";
import { toIntegerAtLeast } from "./number";

export interface UniqueFileNameOptions {
  ignoreCase?: boolean;
  separator?: string;
  startIndex?: number;
}

export interface PathCompareOptions {
  ignoreCase?: boolean;
}

export interface PathBreadcrumb {
  name: string;
  path: string;
  index: number;
  isLast: boolean;
}

export interface PathFileInfo {
  path: string;
  directory: string;
  fileName: string;
  baseName: string;
  extension: string;
  extensionWithDot: string;
  hasExtension: boolean;
}

export interface PathExtensionSummary {
  extensions: string[];
  counts: Record<string, number>;
  totalCount: number;
  emptyExtensionCount: number;
  uniqueExtensionCount: number;
}

export interface PathListSummary {
  totalCount: number;
  empty: boolean;
  absoluteCount: number;
  relativeCount: number;
  unsafeCount: number;
  maxDepth: number;
  commonAncestor: string;
  roots: string[];
  rootCounts: Record<string, number>;
  directories: string[];
  directoryCounts: Record<string, number>;
  extensionSummary: PathExtensionSummary;
}

export interface PathAncestorOptions {
  includeSelf?: boolean;
  includeRoot?: boolean;
}

export interface PathSafetySummary {
  path: string;
  normalizedPath: string;
  empty: boolean;
  absolute: boolean;
  relative: boolean;
  windowsDrive: boolean;
  unc: boolean;
  hasControlCharacters: boolean;
  hasTraversal: boolean;
  safeRelative: boolean;
}

export interface PathRelationSummary {
  basePath: string;
  targetPath: string;
  same: boolean;
  inside: boolean;
  insideOrSame: boolean;
  relativePath: string;
  commonAncestor: string;
}

export interface FileNameSanitizeSummary {
  originalName: string;
  sanitizedName: string;
  fallbackUsed: boolean;
  changed: boolean;
  safe: boolean;
}

const WINDOWS_DRIVE_PATH_REGEXP = /^[a-zA-Z]:\//;
const WINDOWS_DRIVE_ROOT_REGEXP = /^([a-zA-Z]:)(?:\/|$)/;
const UNC_PATH_REGEXP = /^[\\/]{2}[^\\/]+[\\/][^\\/]+/;
const PATH_CONTROL_CHAR_REGEXP = /[\u0000-\u001F]/;
const FILE_NAME_UNSAFE_CHAR_REGEXP = /[<>:"/\\|?*\u0000-\u001F]/;
const FILE_NAME_UNSAFE_CHAR_GLOBAL_REGEXP = /[<>:"/\\|?*\u0000-\u001F]/g;

export function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
}

function normalizePathForRoot(path: string): string {
  return path.trim().replace(/\\/g, "/");
}

export function normalizePathInput(path: string): string {
  return normalizeSlashes(path.trim());
}

export function hasPathControlCharacters(path: string): boolean {
  return PATH_CONTROL_CHAR_REGEXP.test(path);
}

export function isAbsolutePath(path: string): boolean {
  const normalizedPath = normalizePathInput(path);
  return normalizedPath.startsWith("/") || WINDOWS_DRIVE_PATH_REGEXP.test(normalizedPath);
}

export function isWindowsDrivePath(path: string): boolean {
  return WINDOWS_DRIVE_ROOT_REGEXP.test(normalizePathForRoot(path));
}

export function isUncPath(path: string): boolean {
  return UNC_PATH_REGEXP.test(path.trim());
}

export function isRelativePath(path: string): boolean {
  const normalizedPath = normalizePathInput(path);
  return normalizedPath.length > 0 && !isAbsolutePath(normalizedPath);
}

export function getPathRoot(path: string): string {
  const normalizedPath = normalizePathForRoot(path);
  const uncMatch = normalizedPath.match(/^(\/\/+[^/]+\/[^/]+)(?:\/|$)/);

  if (uncMatch) {
    return uncMatch[1].replace(/^\/+/, "//");
  }

  const driveMatch = normalizedPath.match(WINDOWS_DRIVE_ROOT_REGEXP);

  if (driveMatch) {
    return `${driveMatch[1]}/`;
  }

  return normalizedPath.startsWith("/") ? "/" : "";
}

export function trimTrailingSlash(path: string): string {
  return path.replace(/[\\/]+$/g, "");
}

export function ensureTrailingSlash(path: string): string {
  return path ? `${trimTrailingSlash(path)}/` : "";
}

export function joinPath(...parts: string[]): string {
  return parts
    .filter((part) => part.trim().length > 0)
    .map((part, index) => {
      const normalizedPart = normalizeSlashes(part);
      return index === 0 ? trimTrailingSlash(normalizedPart) : normalizedPart.replace(/^\/+|\/+$/g, "");
    })
    .join("/");
}

export function joinPathIfPresent(basePath: string, relativePath: string): string {
  const normalizedRelativePath = relativePath.trim();
  return normalizedRelativePath ? joinPath(basePath, normalizedRelativePath) : "";
}

export function getFileName(path: string): string {
  const normalizedPath = trimTrailingSlash(normalizeSlashes(path));
  return normalizedPath.split("/").pop() ?? "";
}

export function getDirectoryName(path: string): string {
  const normalizedPath = trimTrailingSlash(normalizeSlashes(path));
  const slashIndex = normalizedPath.lastIndexOf("/");
  return slashIndex >= 0 ? normalizedPath.slice(0, slashIndex) : "";
}

export function getFileExtension(path: string): string {
  const fileName = getFileName(path);
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : "";
}

export function getFileBaseName(path: string): string {
  const fileName = getFileName(path);
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}

export function getPathFileInfo(path: string): PathFileInfo {
  const fileName = getFileName(path);
  const dotIndex = fileName.lastIndexOf(".");
  const hasExtension = dotIndex > 0;

  return {
    path,
    directory: getDirectoryName(path),
    fileName,
    baseName: hasExtension ? fileName.slice(0, dotIndex) : fileName,
    extension: hasExtension ? fileName.slice(dotIndex + 1).toLowerCase() : "",
    extensionWithDot: hasExtension ? fileName.slice(dotIndex) : "",
    hasExtension,
  };
}

export function stripFileExtension(path: string): string {
  const dotIndex = path.lastIndexOf(".");
  const slashIndex = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return dotIndex > slashIndex ? path.slice(0, dotIndex) : path;
}

export function changeFileName(path: string, fileName: string): string {
  const directory = getDirectoryName(path);
  return directory ? joinPath(directory, fileName) : fileName;
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

export function hasFileExtension(path: string, extensions: readonly string[]): boolean {
  const extension = getFileExtension(path);
  const normalizedExtensions = extensions.map((item) => item.replace(/^\./, "").toLowerCase());
  return normalizedExtensions.includes(extension);
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

export function getPathSegments(path: string): string[] {
  return normalizePathInput(path)
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function getPathDepth(path: string): number {
  return getPathSegments(path).length;
}

export function getPathBreadcrumbs(path: string): PathBreadcrumb[] {
  const root = getPathRoot(path);
  const normalizedPath = normalizePathDots(path);
  const body = root ? normalizedPath.slice(root.length) : normalizedPath;
  const segments = body.split("/").filter(Boolean);
  const rootCrumb = root
    ? [{
        name: trimTrailingSlash(root) || root,
        path: root,
        index: 0,
        isLast: segments.length === 0,
      }]
    : [];

  const bodyCrumbs = segments.map((name, index) => ({
    name,
    path: root
      ? joinPath(root, ...segments.slice(0, index + 1))
      : segments.slice(0, index + 1).join("/"),
    index: rootCrumb.length + index,
    isLast: index === segments.length - 1,
  }));

  return [...rootCrumb, ...bodyCrumbs].map((item, index, items) => ({
    ...item,
    index,
    isLast: index === items.length - 1,
  }));
}

export function getPathAncestors(path: string, options: PathAncestorOptions = {}): string[] {
  const breadcrumbs = getPathBreadcrumbs(path);
  const includeRoot = options.includeRoot ?? true;
  const includeSelf = options.includeSelf ?? false;

  return breadcrumbs
    .filter((item) => includeSelf || !item.isLast)
    .filter((item) => includeRoot || item.path !== getPathRoot(path))
    .map((item) => item.path);
}

export function hasPathTraversal(path: string): boolean {
  return getPathSegments(path).some((segment) => segment === "." || segment === "..");
}

export function normalizePathDots(path: string): string {
  const normalizedPath = normalizePathForRoot(path);
  const root = getPathRoot(normalizedPath);
  const body = root ? normalizedPath.slice(root.length) : normalizedPath;
  const segments: string[] = [];

  for (const segment of body.split("/")) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      const previous = segments[segments.length - 1];

      if (previous && previous !== "..") {
        segments.pop();
        continue;
      }

      if (!root) {
        segments.push(segment);
      }

      continue;
    }

    segments.push(segment);
  }

  const normalizedBody = segments.join("/");

  if (!root) {
    return normalizedBody;
  }

  return normalizedBody ? `${trimTrailingSlash(root)}/${normalizedBody}` : root;
}

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

function normalizePathForCompare(path: string, options: PathCompareOptions = {}): string {
  const normalizedPath = normalizePathDots(path);
  const root = getPathRoot(normalizedPath);
  const comparablePath = root && normalizedPath === root ? root : trimTrailingSlash(normalizedPath);
  return options.ignoreCase ? comparablePath.toLowerCase() : comparablePath;
}

function getPathChildPrefix(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

function getPathBodySegments(path: string): string[] {
  const root = getPathRoot(path);
  const body = root ? path.slice(root.length) : path;
  return body.split("/").filter(Boolean);
}

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

  return firstRoot ? joinPath(firstRoot, ...commonSegments) : commonSegments.join("/");
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

export function sanitizeFileName(value: string, replacement = "_"): string {
  return value.replace(FILE_NAME_UNSAFE_CHAR_GLOBAL_REGEXP, replacement).replace(/\s+/g, " ").trim();
}

export function isSafeFileName(value: string): boolean {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 && !FILE_NAME_UNSAFE_CHAR_REGEXP.test(trimmedValue);
}

export function sanitizeFileNameWithFallback(value: string, fallback = "untitled", replacement = "_"): string {
  return sanitizeFileName(value, replacement) || fallback;
}

export function summarizeFileNameSanitize(
  value: string,
  fallback = "untitled",
  replacement = "_"
): FileNameSanitizeSummary {
  const sanitizedName = sanitizeFileNameWithFallback(value, fallback, replacement);

  return {
    originalName: value,
    sanitizedName,
    fallbackUsed: sanitizeFileName(value, replacement).length === 0,
    changed: value !== sanitizedName,
    safe: isSafeFileName(sanitizedName),
  };
}

export function sanitizeFileNames(values: readonly string[], fallback = "untitled", replacement = "_"): string[] {
  return values.map((value) => sanitizeFileNameWithFallback(value, fallback, replacement));
}
