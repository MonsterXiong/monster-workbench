export function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
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

export function getPathSegments(path: string): string[] {
  return normalizeSlashes(path)
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function sanitizeFileName(value: string, replacement = "_"): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, replacement).replace(/\s+/g, " ").trim();
}
