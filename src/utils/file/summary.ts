import { FILE_KINDS } from "./constants";
import {
  getFileKindCounts,
  getFileNames,
  getFileSize,
  getTotalFileSize,
  toFileArray,
} from "./list";
import type {
  FileDisplaySummary,
  FileLike,
  FileListInput,
  FileListSummary,
  FileSizeSummary,
  FormatFileDisplaySummaryOptions,
} from "./types";

export function summarizeFiles<T extends FileLike = File>(files: FileListInput<T>): FileListSummary {
  const fileArray = toFileArray(files);
  const kindCounts = getFileKindCounts(fileArray);

  return {
    totalCount: fileArray.length,
    totalSize: getTotalFileSize(fileArray),
    empty: fileArray.length === 0,
    names: getFileNames(fileArray),
    kinds: FILE_KINDS.filter((kind) => kindCounts[kind] > 0),
    kindCounts,
  };
}

/** 对多个文件的大小编制并统计分布比例。 */
export function summarizeFileSizes<T extends FileLike = File>(files: FileListInput<T>): FileSizeSummary<T> {
  const fileArray = toFileArray(files);

  if (fileArray.length === 0) {
    return {
      totalCount: 0,
      totalSize: 0,
      minSize: 0,
      maxSize: 0,
      averageSize: 0,
      empty: true,
      smallestFile: undefined,
      largestFile: undefined,
    };
  }

  let totalSize = 0;
  let minSize = Number.POSITIVE_INFINITY;
  let maxSize = Number.NEGATIVE_INFINITY;
  let smallestFile: T | undefined;
  let largestFile: T | undefined;

  for (const file of fileArray) {
    const size = getFileSize(file);
    totalSize += size;

    if (size < minSize) {
      minSize = size;
      smallestFile = file;
    }

    if (size > maxSize) {
      maxSize = size;
      largestFile = file;
    }
  }

  return {
    totalCount: fileArray.length,
    totalSize,
    minSize,
    maxSize,
    averageSize: totalSize / fileArray.length,
    empty: false,
    smallestFile,
    largestFile,
  };
}

function formatDefaultFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Number((size / 1024).toFixed(1))} KB`;
  }

  return `${Number((size / 1024 / 1024).toFixed(1))} MB`;
}

export function formatFileDisplaySummary(summary: FileListSummary, options: FormatFileDisplaySummaryOptions = {}): string {
  if (summary.empty) {
    return options.emptyText ?? "0 files";
  }

  const sizeFormatter = options.sizeFormatter ?? formatDefaultFileSize;
  const countText = `${summary.totalCount} files`;
  const sizeText = sizeFormatter(summary.totalSize);
  return [countText, sizeText].filter(Boolean).join(options.separator ?? " | ");
}

/** 针对某个展示卡片生成体积、格式与尺寸的信息。 */
export function createFileDisplaySummary<T extends FileLike = File>(
  files: FileListInput<T>,
  options: FormatFileDisplaySummaryOptions = {}
): FileDisplaySummary {
  const summary = summarizeFiles(files);
  const sizeFormatter = options.sizeFormatter ?? formatDefaultFileSize;

  return {
    ...summary,
    label: formatFileDisplaySummary(summary, options),
    sizeLabel: summary.empty ? options.emptyText ?? "0 files" : sizeFormatter(summary.totalSize),
    kindLabel: summary.kinds.join(options.kindSeparator ?? ", "),
  };
}
