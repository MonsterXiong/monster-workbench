import { diffArraysByKeyChangesWithReport } from "../array";
import { getFileLastModified, getFileSize, toFileArray } from "./list";
import { getFileLikeMimeType } from "./mime";
import type {
  FileDeduplicateOptions,
  FileDeduplicationReport,
  FileDuplicateGroup,
  FileDuplicateSummary,
  FileIdentityOptions,
  FileLike,
  FileListInput,
  FileSelectionChangeOptions,
  FileSelectionChangeReport,
} from "./types";

export function normalizeFileIdentityName(name: string, ignoreCase = true): string {
  const normalizedName = name.trim();
  return ignoreCase ? normalizedName.toLowerCase() : normalizedName;
}

export function getFileIdentityKey(file: FileLike, options: FileIdentityOptions = {}): string {
  const mode = options.mode ?? "name-size-type-last-modified";
  const name = normalizeFileIdentityName(file.name, options.ignoreCase ?? true);

  if (mode === "name") {
    return JSON.stringify([name]);
  }

  const size = getFileSize(file);

  if (mode === "name-size") {
    return JSON.stringify([name, size]);
  }

  const type = getFileLikeMimeType(file);

  if (mode === "name-size-type") {
    return JSON.stringify([name, size, type]);
  }

  const lastModified = getFileLastModified(file);

  if (mode === "name-size-last-modified") {
    return JSON.stringify([name, size, lastModified]);
  }

  return JSON.stringify([name, size, type, lastModified]);
}

export function getFileIdentityKeys<T extends FileLike = File>(files: FileListInput<T>, options: FileIdentityOptions = {}): string[] {
  return toFileArray(files).map((file) => getFileIdentityKey(file, options));
}

export function summarizeDuplicateFiles<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileIdentityOptions = {}
): FileDuplicateSummary<T> {
  const fileArray = toFileArray(files);
  const groupsByKey = new Map<string, Array<{ file: T; index: number }>>();

  fileArray.forEach((file, index) => {
    const key = getFileIdentityKey(file, options);
    const group = groupsByKey.get(key) ?? [];
    group.push({ file, index });
    groupsByKey.set(key, group);
  });

  const groups: Array<FileDuplicateGroup<T>> = [];

  for (const [key, group] of groupsByKey) {
    if (group.length < 2) {
      continue;
    }

    const filesInGroup = group.map((entry) => entry.file);
    const indexes = group.map((entry) => entry.index);

    groups.push({
      key,
      files: filesInGroup,
      indexes,
      firstFile: filesInGroup[0],
      duplicateFiles: filesInGroup.slice(1),
      duplicateIndexes: indexes.slice(1),
      count: filesInGroup.length,
    });
  }

  const duplicateFiles = groups.flatMap((group) => group.duplicateFiles);
  const duplicateIndexes = groups.flatMap((group) => group.duplicateIndexes);

  return {
    groups,
    duplicateFiles,
    duplicateIndexes,
    duplicateKeys: groups.map((group) => group.key),
    totalCount: fileArray.length,
    uniqueCount: groupsByKey.size,
    duplicateCount: duplicateFiles.length,
    duplicateGroupCount: groups.length,
    hasDuplicates: groups.length > 0,
  };
}

export function hasDuplicateFiles<T extends FileLike = File>(files: FileListInput<T>, options: FileIdentityOptions = {}): boolean {
  return summarizeDuplicateFiles(files, options).hasDuplicates;
}

function getDeduplicatedFileIndexes<T extends FileLike>(
  files: readonly T[],
  options: FileDeduplicateOptions = {}
): number[] {
  const keep = options.keep ?? "first";
  const indexesByKey = new Map<string, number>();

  files.forEach((file, index) => {
    const key = getFileIdentityKey(file, options);
    if (keep === "last" || !indexesByKey.has(key)) {
      indexesByKey.set(key, index);
    }
  });

  return Array.from(indexesByKey.values()).sort((left, right) => left - right);
}

export function deduplicateFiles<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileDeduplicateOptions = {}
): T[] {
  const fileArray = toFileArray(files);
  return getDeduplicatedFileIndexes(fileArray, options).map((index) => fileArray[index]);
}

export function createFileDeduplicationReport<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileDeduplicateOptions = {}
): FileDeduplicationReport<T> {
  const fileArray = toFileArray(files);
  const summary = summarizeDuplicateFiles(fileArray, options);
  const deduplicatedFiles = deduplicateFiles(fileArray, options);
  const keptIndexes = new Set(getDeduplicatedFileIndexes(fileArray, options));
  const removedIndexes = fileArray
    .map((_file, index) => (keptIndexes.has(index) ? -1 : index))
    .filter((index) => index >= 0);
  const removedFiles = removedIndexes.map((index) => fileArray[index]);

  return {
    deduplicatedFiles,
    removedFiles,
    removedIndexes,
    summary,
    totalCount: fileArray.length,
    uniqueCount: deduplicatedFiles.length,
    removedCount: removedFiles.length,
    changed: removedIndexes.length > 0,
  };
}

export function compareFileSelections<T extends FileLike = File>(
  before: FileListInput<T>,
  after: FileListInput<T>,
  options: FileSelectionChangeOptions<T> = {}
): FileSelectionChangeReport<T> {
  const beforeFiles = toFileArray(before);
  const afterFiles = toFileArray(after);
  const isEqual = options.isEqual ?? ((beforeFile: T, afterFile: T) => (
    getFileSize(beforeFile) === getFileSize(afterFile)
      && getFileLikeMimeType(beforeFile) === getFileLikeMimeType(afterFile)
      && getFileLastModified(beforeFile) === getFileLastModified(afterFile)
  ));
  const changeReport = diffArraysByKeyChangesWithReport(
    beforeFiles,
    afterFiles,
    (file) => getFileIdentityKey(file, options),
    { isEqual }
  );
  const updatedFiles = changeReport.diff.updated
    .map((change) => change.after)
    .filter((file): file is T => Boolean(file));
  const movedFiles = changeReport.diff.moved
    .map((change) => change.after)
    .filter((file): file is T => Boolean(file));
  const retainedFiles = changeReport.diff.unchanged
    .map((change) => change.after)
    .filter((file): file is T => Boolean(file));

  return {
    beforeFiles,
    afterFiles,
    addedFiles: changeReport.diff.added,
    removedFiles: changeReport.diff.removed,
    updatedFiles,
    movedFiles,
    retainedFiles,
    addedKeys: changeReport.summary.addedKeys,
    removedKeys: changeReport.summary.removedKeys,
    updatedKeys: changeReport.summary.updatedKeys,
    movedKeys: changeReport.summary.movedKeys,
    retainedKeys: changeReport.summary.unchangedKeys,
    duplicateBeforeKeys: changeReport.diff.duplicateBeforeKeys,
    duplicateAfterKeys: changeReport.diff.duplicateAfterKeys,
    changedKeySet: changeReport.changedKeySet,
    duplicateKeySet: changeReport.duplicateKeySet,
    summary: {
      beforeCount: beforeFiles.length,
      afterCount: afterFiles.length,
      addedCount: changeReport.diff.added.length,
      removedCount: changeReport.diff.removed.length,
      updatedCount: changeReport.diff.updated.length,
      movedCount: changeReport.diff.moved.length,
      retainedCount: changeReport.diff.unchanged.length,
      duplicateBeforeCount: changeReport.diff.duplicateBeforeKeys.length,
      duplicateAfterCount: changeReport.diff.duplicateAfterKeys.length,
      totalChanges: changeReport.diff.stats.totalChanges,
      hasChanges: changeReport.diff.hasChanges,
      hasDuplicateKeys: changeReport.diff.hasDuplicateKeys,
      onlyOrderChanged: changeReport.summary.onlyOrderChanged,
    },
    changeReport,
    hasStructuralChanges: changeReport.hasStructuralChanges,
    hasContentChanges: changeReport.hasContentChanges,
  };
}
