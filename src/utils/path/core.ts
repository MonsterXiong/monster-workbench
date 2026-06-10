import type { PathCompareOptions } from "./types";

const WINDOWS_DRIVE_PATH_REGEXP = /^[a-zA-Z]:\//;
const WINDOWS_DRIVE_ROOT_REGEXP = /^([a-zA-Z]:)(?:\/|$)/;
const UNC_PATH_REGEXP = /^[\\/]{2}[^\\/]+[\\/][^\\/]+/;
const PATH_CONTROL_CHAR_REGEXP = /[\u0000-\u001F]/;

export function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
}

export function normalizePathForRoot(path: string): string {
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

export function normalizePathForCompare(path: string, options: PathCompareOptions = {}): string {
  const normalizedPath = normalizePathDots(path);
  const root = getPathRoot(normalizedPath);
  const comparablePath = root && normalizedPath === root ? root : trimTrailingSlash(normalizedPath);
  return options.ignoreCase ? comparablePath.toLowerCase() : comparablePath;
}

export function getPathChildPrefix(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

export function getPathBodySegments(path: string): string[] {
  const root = getPathRoot(path);
  const body = root ? path.slice(root.length) : path;
  return body.split("/").filter(Boolean);
}
