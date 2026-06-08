export interface UniqueFileNameOptions {
  ignoreCase?: boolean;
  separator?: string;
  startIndex?: number;
}

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
  const startIndex = Math.max(1, Math.floor(options.startIndex ?? 1));
  const normalizeName = (value: string) => (ignoreCase ? value.toLowerCase() : value);
  const existingNameSet = new Set(existingNames.map(normalizeName));

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
  return normalizeSlashes(path)
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function sanitizeFileName(value: string, replacement = "_"): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, replacement).replace(/\s+/g, " ").trim();
}
