import { toNonNegativeInteger } from "../number";
import { joinMappedNonEmptyStrings } from "../string";
import { getTreeNodePath, getTreeNodePathByValue } from "./core";
import { FlattenTreeItem, ParsedTreePathItem } from "./types";

export function getTreePathText<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
  getChildren: (item: T) => readonly T[] | undefined,
  getText: (item: T) => unknown,
  separator = " / "
): string {
  return joinMappedNonEmptyStrings(getTreeNodePath(items, predicate, getChildren), getText, separator);
}

export function getTreePathTextByValue<T, K>(
  items: readonly T[],
  getValue: (item: T, meta: Omit<FlattenTreeItem<T>, "node">) => K,
  targetValue: K,
  getChildren: (item: T) => readonly T[] | undefined,
  getText: (item: T) => unknown,
  separator = " / "
): string {
  return joinMappedNonEmptyStrings(getTreeNodePathByValue(items, getValue, targetValue, getChildren), getText, separator);
}

export function removeTopPathSegment(items: readonly ParsedTreePathItem[]): ParsedTreePathItem[] {
  if (items.length === 0) {
    return [];
  }

  const topPath = items[0].path;
  const prefix = `${topPath}/`;

  return items
    .filter((item) => item.path !== topPath)
    .map((item) => ({
      ...item,
      path: item.path.startsWith(prefix) ? item.path.slice(prefix.length) : item.path,
    }))
    .filter((item) => item.path.length > 0);
}

export function parseTreeTextToPathItems(text: string): ParsedTreePathItem[] {
  const pathStack: string[] = [];
  const items: ParsedTreePathItem[] = [];

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const name = line.replace(/^[\s\u2502\u251C\u2514\u252C\u2500]+/u, "").trim();
    if (!name) continue;

    const prefixLength = Math.max(0, line.length - line.trimStart().length || line.indexOf(name));
    const depth = toNonNegativeInteger(prefixLength / 4);
    const cleanName = name.replace(/[/\\]+$/, "");

    pathStack.splice(depth);
    pathStack[depth] = cleanName;

    const path = pathStack.slice(0, depth + 1).join("/");
    const hasDirectorySuffix = /[/\\]$/.test(name);

    items.push({
      path,
      is_file: !hasDirectorySuffix && cleanName.includes(".") && !cleanName.endsWith("."),
    });
  }

  return items;
}
