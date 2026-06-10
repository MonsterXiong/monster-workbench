import { floorToInteger, getTotalPages, normalizePage, PaginationSummaryOptions, summarizePagination, toIntegerAtLeast } from "../number";
import { createOptionalValueFiltersReport } from "./filter";
import { sortArrayByMany } from "./sort";
import { ArrayListViewOptions, ArrayListViewReport, ArrayPage, ArrayPaginationReport, CollapsedMiddleEntry } from "./types";

export function paginateArray<T>(items: readonly T[], page: number, pageSize: number): ArrayPage<T> {
  const total = items.length;
  const totalPages = getTotalPages(total, pageSize);
  const normalizedPage = normalizePage(page, totalPages);
  const safePageSize = toIntegerAtLeast(pageSize, 1);
  const start = total === 0 ? 0 : (normalizedPage - 1) * safePageSize;
  const end = Math.min(total, start + safePageSize);

  return {
    items: items.slice(start, end),
    page: normalizedPage,
    pageSize: safePageSize,
    total,
    totalPages,
    start,
    end,
  };
}

/** 对本地数组进行内存分页，并提供包含总数、页码的详细信息摘要。 */
export function paginateArrayWithSummary<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
  options: PaginationSummaryOptions = {}
): ArrayPaginationReport<T> {
  const pageResult = paginateArray(items, page, pageSize);
  const summary = summarizePagination(pageResult.page, pageResult.pageSize, pageResult.total, options);

  return {
    ...pageResult,
    summary,
    hasItems: pageResult.items.length > 0,
    itemCount: pageResult.items.length,
  };
}

/** 创建带过滤、排序、分页功能的增强数组视图报告。 */
export function createArrayListViewReport<T>(
  items: readonly T[],
  options: ArrayListViewOptions<T> = {}
): ArrayListViewReport<T> {
  const filters = options.filters ?? [];
  const sortRules = options.sortRules ?? [];
  const filterReport = createOptionalValueFiltersReport(items, filters);
  const sortedItems = sortArrayByMany(filterReport.matchedItems, sortRules);
  const page = options.page ?? 1;
  const defaultPageSize = sortedItems.length || 1;
  const pageSize = options.pageSize ?? defaultPageSize;
  const pageReport = paginateArrayWithSummary(sortedItems, page, pageSize, options.pagination);

  return {
    sourceItems: [...items],
    filteredItems: filterReport.matchedItems,
    sortedItems,
    page: pageReport,
    filters: filterReport,
    sortRules: [...sortRules],
    summary: {
      sourceCount: items.length,
      filteredCount: filterReport.matchedItems.length,
      sortedCount: sortedItems.length,
      pageItemCount: pageReport.itemCount,
      removedByFilterCount: filterReport.unmatchedItems.length,
      hasFilters: filterReport.summary.hasFilters,
      hasActiveFilters: filterReport.summary.hasActiveFilters,
      hasSortRules: sortRules.length > 0,
      paginated: pageReport.totalPages > 1,
      empty: items.length === 0,
    },
  };
}

export function collapseMiddleItems<T>(items: readonly T[], maxItems: number, ellipsisKey = "ellipsis"): Array<CollapsedMiddleEntry<T>> {
  const safeMaxItems = floorToInteger(maxItems, 0);

  if (safeMaxItems < 3 || items.length <= safeMaxItems) {
    return items.map((item, index) => ({
      type: "item",
      item,
      index,
      isLast: index === items.length - 1,
    }));
  }

  const tailCount = safeMaxItems - 2;
  const tailStart = items.length - tailCount;
  const hiddenCount = Math.max(0, tailStart - 1);

  return [
    {
      type: "item",
      item: items[0],
      index: 0,
      isLast: false,
    },
    {
      type: "ellipsis",
      key: ellipsisKey,
      hiddenCount,
    },
    ...items.slice(tailStart).map((item, offset) => {
      const index = tailStart + offset;
      return {
        type: "item" as const,
        item,
        index,
        isLast: index === items.length - 1,
      };
    }),
  ];
}
