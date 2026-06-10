import { maxBy, minBy } from "../array";
import { toFiniteNumber, toNonNegativeInteger } from "../number";
import { matchesFileAccept } from "./accept";
import { toFileArray } from "./list";
import { summarizeFileSizes, summarizeFiles } from "./summary";
import type {
  FileAcceptInput,
  FileLike,
  FileListInput,
  FileSelectionIntakeReport,
  FileValidationOptions,
  FileValidationRejectEntry,
  FileValidationRejectGroups,
  FileValidationRejectReason,
  FileValidationReport,
  FileValidationResult,
  FileValidationSummary,
} from "./types";

export function getEffectiveMaxFiles(maxFiles = 0, multiple = true): number {
  const safeMaxFiles = toNonNegativeInteger(maxFiles);
  return safeMaxFiles > 0 ? safeMaxFiles : multiple ? 0 : 1;
}

export function getFilesRejectedByAccept<T extends FileLike>(
  files: FileListInput<T>,
  accept: FileAcceptInput
): T[] {
  return toFileArray(files).filter((file) => !matchesFileAccept(file, accept));
}

export function getFilesAcceptedByAccept<T extends FileLike>(
  files: FileListInput<T>,
  accept: FileAcceptInput
): T[] {
  return toFileArray(files).filter((file) => matchesFileAccept(file, accept));
}

export function getFilesExceedingSize<T extends FileLike>(files: FileListInput<T>, maxSize = 0): T[] {
  const safeMaxSize = Math.max(0, toFiniteNumber(maxSize));
  return safeMaxSize > 0 ? toFileArray(files).filter((file) => toFiniteNumber(file.size ?? 0) > safeMaxSize) : [];
}

export function getFilesWithinSizeLimit<T extends FileLike>(files: FileListInput<T>, maxSize = 0): T[] {
  const safeMaxSize = Math.max(0, toFiniteNumber(maxSize));
  return safeMaxSize > 0 ? toFileArray(files).filter((file) => toFiniteNumber(file.size ?? 0) <= safeMaxSize) : toFileArray(files);
}

export function createFileValidationRejectGroups<T extends FileLike = File>(): FileValidationRejectGroups<T> {
  return {
    accept: [],
    "max-files": [],
    "max-size": [],
  };
}

export function getFileValidationRejectGroups<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileValidationOptions = {}
): FileValidationRejectGroups<T> {
  const fileArray = toFileArray(files);
  const maxFiles = getEffectiveMaxFiles(options.maxFiles, options.multiple ?? true);

  return {
    accept: getFilesRejectedByAccept(fileArray, options.accept),
    "max-files": maxFiles > 0 && fileArray.length > maxFiles ? fileArray : [],
    "max-size": getFilesExceedingSize(fileArray, options.maxSize),
  };
}

export function getFileValidationRejectEntries<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileValidationOptions = {}
): Array<FileValidationRejectEntry<T>> {
  const groups = getFileValidationRejectGroups(files, options);

  return (Object.entries(groups) as Array<[FileValidationRejectReason, T[]]>).flatMap(([reason, groupFiles]) =>
    groupFiles.map((file) => ({ file, reason }))
  );
}

export function getLargestFile<T extends FileLike = File>(files: FileListInput<T>): T | undefined {
  return maxBy(toFileArray(files), (file) => toFiniteNumber(file.size ?? 0));
}

export function getSmallestFile<T extends FileLike = File>(files: FileListInput<T>): T | undefined {
  return minBy(toFileArray(files), (file) => toFiniteNumber(file.size ?? 0));
}

export function validateFileList<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileValidationOptions = {}
): FileValidationResult<T> {
  const fileArray = toFileArray(files);

  if (fileArray.length === 0) {
    return {
      valid: false,
      files: fileArray,
      rejectedFiles: [],
      reason: null,
    };
  }

  const maxFiles = getEffectiveMaxFiles(options.maxFiles, options.multiple ?? true);
  if (maxFiles > 0 && fileArray.length > maxFiles) {
    return {
      valid: false,
      files: fileArray,
      rejectedFiles: fileArray,
      reason: "max-files",
    };
  }

  const invalidAcceptedFiles = getFilesRejectedByAccept(fileArray, options.accept);
  if (invalidAcceptedFiles.length > 0) {
    return {
      valid: false,
      files: fileArray,
      rejectedFiles: invalidAcceptedFiles,
      reason: "accept",
    };
  }

  const oversizedFiles = getFilesExceedingSize(fileArray, options.maxSize);
  if (oversizedFiles.length > 0) {
    return {
      valid: false,
      files: fileArray,
      rejectedFiles: oversizedFiles,
      reason: "max-size",
    };
  }

  return {
    valid: true,
    files: fileArray,
    rejectedFiles: [],
    reason: null,
  };
}

export function summarizeFileValidation<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileValidationOptions = {}
): FileValidationSummary {
  const fileArray = toFileArray(files);
  const rejectGroups = getFileValidationRejectGroups(fileArray, options);
  const rejectedFiles = new Set<T>([
    ...rejectGroups.accept,
    ...rejectGroups["max-size"],
    ...rejectGroups["max-files"],
  ]);
  const validation = validateFileList(fileArray, options);

  return {
    valid: validation.valid,
    totalCount: fileArray.length,
    acceptedCount: Math.max(0, fileArray.length - rejectedFiles.size),
    rejectedCount: rejectedFiles.size,
    acceptRejectedCount: rejectGroups.accept.length,
    maxFilesRejectedCount: rejectGroups["max-files"].length,
    maxSizeRejectedCount: rejectGroups["max-size"].length,
    reason: validation.reason,
  };
}

export function createFileValidationReport<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileValidationOptions = {}
): FileValidationReport<T> {
  const fileArray = toFileArray(files);
  const result = validateFileList(fileArray, options);
  const rejectGroups = getFileValidationRejectGroups(fileArray, options);
  const rejectEntries = getFileValidationRejectEntries(fileArray, options);
  const rejectedFileSet = new Set(rejectEntries.map((entry) => entry.file));

  return {
    result,
    summary: summarizeFileValidation(fileArray, options),
    rejectEntries,
    rejectGroups,
    acceptedFiles: fileArray.filter((file) => !rejectedFileSet.has(file)),
  };
}

/** 接收到选中文件后，生成总览报告和警告拦截清单。 */
export function createFileSelectionIntakeReport<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FileValidationOptions = {}
): FileSelectionIntakeReport<T> {
  const fileArray = toFileArray(files);
  const rejectGroups = createFileValidationRejectGroups<T>();
  const maxFiles = getEffectiveMaxFiles(options.maxFiles, options.multiple ?? true);
  const acceptedFiles: T[] = [];

  for (const file of fileArray) {
    if (!matchesFileAccept(file, options.accept)) {
      rejectGroups.accept.push(file);
      continue;
    }

    if (getFilesExceedingSize([file], options.maxSize).length > 0) {
      rejectGroups["max-size"].push(file);
      continue;
    }

    if (maxFiles > 0 && acceptedFiles.length >= maxFiles) {
      rejectGroups["max-files"].push(file);
      continue;
    }

    acceptedFiles.push(file);
  }

  const rejectEntries = (Object.entries(rejectGroups) as Array<[FileValidationRejectReason, T[]]>).flatMap(([reason, groupFiles]) =>
    groupFiles.map((file) => ({ file, reason }))
  );
  const rejectedFiles = rejectEntries.map((entry) => entry.file);

  return {
    files: fileArray,
    acceptedFiles,
    rejectedFiles,
    rejectEntries,
    rejectGroups,
    summary: {
      valid: fileArray.length > 0 && rejectedFiles.length === 0,
      totalCount: fileArray.length,
      acceptedCount: acceptedFiles.length,
      rejectedCount: rejectedFiles.length,
      acceptRejectedCount: rejectGroups.accept.length,
      maxFilesRejectedCount: rejectGroups["max-files"].length,
      maxSizeRejectedCount: rejectGroups["max-size"].length,
      partial: acceptedFiles.length > 0 && rejectedFiles.length > 0,
      empty: fileArray.length === 0,
    },
    fileSummary: summarizeFiles(acceptedFiles),
    sizeSummary: summarizeFileSizes(acceptedFiles),
  };
}

export function getLargestAcceptedFile<T extends FileLike = File>(files: FileListInput<T>, options: FileValidationOptions = {}): T | undefined {
  return getLargestFile(getFilesAcceptedByAccept(files, options.accept));
}

export function getSmallestAcceptedFile<T extends FileLike = File>(files: FileListInput<T>, options: FileValidationOptions = {}): T | undefined {
  return getSmallestFile(getFilesAcceptedByAccept(files, options.accept));
}
