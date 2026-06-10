import { joinPath, normalizePathDots, trimTrailingSlash, getPathRoot } from "./core";
import type { PathAncestorOptions, PathBreadcrumb } from "./types";

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
