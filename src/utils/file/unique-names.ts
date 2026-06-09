import { uniqueArray } from "../array";
import { getUniqueFileName, type UniqueFileNameOptions } from "../path";
import type { UniqueFileNameEntry, UniqueFileNamesSummary } from "./types";

export function getUniqueFileNames(fileNames: readonly string[], options: UniqueFileNameOptions = {}): string[] {
  const result: string[] = [];

  for (const fileName of fileNames) {
    const uniqueFileName = getUniqueFileName(fileName, result, options);
    result.push(uniqueFileName);
  }

  return result;
}

export function summarizeUniqueFileNames(fileNames: readonly string[], options: UniqueFileNameOptions = {}): UniqueFileNamesSummary {
  const uniqueNames = getUniqueFileNames(fileNames, options);
  const seenNames = new Set<string>();
  const duplicateOriginalNames = uniqueArray(fileNames.filter((name) => {
    const normalizedName = options.ignoreCase ?? true ? name.toLowerCase() : name;

    if (seenNames.has(normalizedName)) {
      return true;
    }

    seenNames.add(normalizedName);
    return false;
  }));
  const entries = fileNames.map<UniqueFileNameEntry>((originalName, index) => {
    const uniqueName = uniqueNames[index] ?? originalName;

    return {
      index,
      originalName,
      uniqueName,
      changed: originalName !== uniqueName,
    };
  });

  return {
    entries,
    originalNames: [...fileNames],
    uniqueNames,
    changedNames: entries.filter((entry) => entry.changed).map((entry) => entry.uniqueName),
    duplicateOriginalNames,
    totalCount: fileNames.length,
    changedCount: entries.filter((entry) => entry.changed).length,
    duplicateCount: duplicateOriginalNames.length,
    hasChanges: entries.some((entry) => entry.changed),
  };
}
