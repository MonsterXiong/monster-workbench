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

const WINDOWS_DRIVE_PATH_REGEXP = /^[a-zA-Z]:\//;
const WINDOWS_DRIVE_ROOT_REGEXP = /^([a-zA-Z]:)(?:\/|$)/;
const UNC_PATH_REGEXP = /^[\\/]{2}[^\\/]+[\\/][^\\/]+/;
const PATH_CONTROL_CHAR_REGEXP = /[\u0000-\u001F]/;

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

export function stripFileExtension(path: string): string {
  const dotIndex = path.lastIndexOf(".");
  const slashIndex = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return dotIndex > slashIndex ? path.slice(0, dotIndex) : path;
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

function normalizePathForCompare(path: string, options: PathCompareOptions = {}): string {
  const normalizedPath = normalizePathDots(path);
  const root = getPathRoot(normalizedPath);
  const comparablePath = root && normalizedPath === root ? root : trimTrailingSlash(normalizedPath);
  return options.ignoreCase ? comparablePath.toLowerCase() : comparablePath;
}

function getPathChildPrefix(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
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

export function isSafeRelativePathText(path: string): boolean {
  const normalizedPath = normalizePathInput(path);
  return isRelativePath(normalizedPath) && !hasPathControlCharacters(normalizedPath) && !hasPathTraversal(normalizedPath);
}

export function sanitizeFileName(value: string, replacement = "_"): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, replacement).replace(/\s+/g, " ").trim();
}

export function sanitizeFileNameWithFallback(value: string, fallback = "untitled", replacement = "_"): string {
  return sanitizeFileName(value, replacement) || fallback;
}
