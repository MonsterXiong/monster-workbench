import { joinPath, normalizeSlashes, trimTrailingSlash } from "./core";
import type { PathFileInfo } from "./types";

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

export function hasFileExtension(path: string, extensions: readonly string[]): boolean {
  const extension = getFileExtension(path);
  const normalizedExtensions = extensions.map((item) => item.replace(/^\./, "").toLowerCase());
  return normalizedExtensions.includes(extension);
}
