import { clampNumber, floorToInteger, sortNumbers, toFiniteNumber, toIntegerAtLeast, toNonNegativeInteger } from './core';
import type { PaginationSummary, PaginationSummaryOptions, VisiblePageNumberSummary, VisiblePageNumberSummaryOptions } from './types';

export function normalizePage(page: number, totalPages: number): number {
  return clampNumber(page, 1, toIntegerAtLeast(totalPages, 1), 1, 0);
}

export function getTotalPages(total: number, pageSize: number): number {
  const safePageSize = toIntegerAtLeast(pageSize, 1, 1);
  return Math.max(1, Math.ceil(Math.max(0, toFiniteNumber(total)) / safePageSize));
}

export function getPageStartIndex(page: number, pageSize: number, total: number): number {
  if (toNonNegativeInteger(total) === 0) {
    return 0;
  }

  return (normalizePage(page, getTotalPages(total, pageSize)) - 1) * toIntegerAtLeast(pageSize, 1, 1);
}

export function getPageEndIndex(page: number, pageSize: number, total: number): number {
  const safeTotal = toNonNegativeInteger(total);
  return Math.min(safeTotal, getPageStartIndex(page, pageSize, safeTotal) + toIntegerAtLeast(pageSize, 1, 1));
}

/** 执行结构化特征分析并返回报告。 */
export function summarizePagination(
  page: number,
  pageSize: number,
  total: number,
  options: PaginationSummaryOptions = {}
): PaginationSummary {
  const safeTotal = toNonNegativeInteger(total);
  const safePageSize = toIntegerAtLeast(pageSize, 1, 1);
  const totalPages = getTotalPages(safeTotal, safePageSize);
  const normalizedPage = normalizePage(page, totalPages);
  const startIndex = getPageStartIndex(normalizedPage, safePageSize, safeTotal);
  const endIndex = getPageEndIndex(normalizedPage, safePageSize, safeTotal);
  const visiblePageSummary = summarizeVisiblePageNumbers(normalizedPage, totalPages, options);

  return {
    page: normalizedPage,
    pageSize: safePageSize,
    total: safeTotal,
    totalPages,
    startIndex,
    endIndex,
    startItemNumber: safeTotal === 0 ? 0 : startIndex + 1,
    endItemNumber: endIndex,
    empty: safeTotal === 0,
    firstPage: normalizedPage <= 1,
    lastPage: normalizedPage >= totalPages,
    hasPreviousPage: normalizedPage > 1,
    hasNextPage: normalizedPage < totalPages,
    previousPage: normalizedPage > 1 ? normalizedPage - 1 : null,
    nextPage: normalizedPage < totalPages ? normalizedPage + 1 : null,
    visiblePages: getPaginationWindow(normalizedPage, totalPages, options.maxVisiblePages ?? 5),
    visiblePageSummary,
  };
}

export function getPaginationWindow(current: number, total: number, maxVisible = 5): number[] {
  const safeTotal = toIntegerAtLeast(total, 1);
  const safeVisible = toIntegerAtLeast(maxVisible, 1);
  const safeCurrent = normalizePage(current, safeTotal);
  const half = Math.floor(safeVisible / 2);
  const start = clampNumber(safeCurrent - half, 1, Math.max(1, safeTotal - safeVisible + 1), 1, 0);
  const end = Math.min(safeTotal, start + safeVisible - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function getVisiblePageNumbers(current: number, total: number, siblingCount = 1, includeEdges = true): number[] {
  const safeTotal = toIntegerAtLeast(total, 1, 1);
  const safeCurrent = normalizePage(current, safeTotal);
  const safeSiblingCount = toNonNegativeInteger(siblingCount);
  const pages = new Set<number>([safeCurrent]);

  if (includeEdges) {
    pages.add(1);
    pages.add(safeTotal);
  }

  for (let offset = -safeSiblingCount; offset <= safeSiblingCount; offset += 1) {
    const page = safeCurrent + offset;
    if (page >= 1 && page <= safeTotal) {
      pages.add(page);
    }
  }

  return sortNumbers(pages);
}

export function summarizeVisiblePageNumbers(
  current: number,
  total: number,
  options: VisiblePageNumberSummaryOptions = {}
): VisiblePageNumberSummary {
  const safeTotal = toIntegerAtLeast(total, 1, 1);
  const showEdges = options.showEdges ?? false;
  const pages = getVisiblePageNumbers(current, safeTotal, options.siblingCount ?? 1, !showEdges);
  const visiblePages = showEdges ? pages.filter((page) => page !== 1 && page !== safeTotal) : pages;
  const hasEdgeButtons = showEdges && safeTotal > 1;
  const firstPage = visiblePages[0];
  const lastPage = visiblePages[visiblePages.length - 1];

  return {
    pages: visiblePages,
    edgePages: hasEdgeButtons ? [1, safeTotal] : [],
    hasEdgeButtons,
    hasLeadingEllipsis: hasEdgeButtons && firstPage !== undefined && firstPage > 2,
    hasTrailingEllipsis: hasEdgeButtons && lastPage !== undefined && lastPage < safeTotal - 1,
  };
}

export function normalizePageSizeOptions(currentPageSize: unknown, pageSizeOptions: readonly unknown[]): number[] {
  const safePageSize = toIntegerAtLeast(currentPageSize, 1, 1);
  const pageSizes = new Set<number>([safePageSize]);

  for (const option of pageSizeOptions) {
    const pageSize = floorToInteger(option, Number.NaN);
    if (pageSize >= 1) {
      pageSizes.add(pageSize);
    }
  }

  return sortNumbers(pageSizes);
}
