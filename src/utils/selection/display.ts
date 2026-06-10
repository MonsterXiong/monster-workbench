import { getSelectionSummaryByKeys } from "./keys";
import type { FormatSelectionSummaryOptions, SelectionDisplaySummary, SelectionSummary } from "./types";

export function getSelectionPercent(summary: SelectionSummary): number {
  return summary.totalCount > 0 ? (summary.selectedCount / summary.totalCount) * 100 : 0;
}

export function getUnselectionPercent(summary: SelectionSummary): number {
  return summary.totalCount > 0 ? (summary.unselectedCount / summary.totalCount) * 100 : 0;
}

export function formatSelectionSummary(summary: SelectionSummary, options: FormatSelectionSummaryOptions = {}): string {
  const unit = options.unit ? ` ${options.unit}` : "";

  if (!summary.hasAvailableItems || summary.empty) {
    return options.emptyText ?? `0${unit}`;
  }

  if (summary.allSelected && options.allText) {
    return options.allText;
  }

  const countText = `${summary.selectedCount}${options.separator ?? " / "}${summary.totalCount}${unit}`;
  return summary.partiallySelected && options.partialText ? `${options.partialText} ${countText}` : countText;
}

export function createSelectionDisplaySummary(
  summary: SelectionSummary,
  options: FormatSelectionSummaryOptions = {}
): SelectionDisplaySummary {
  return {
    ...summary,
    label: formatSelectionSummary(summary, options),
    selectedPercent: getSelectionPercent(summary),
    unselectedPercent: getUnselectionPercent(summary),
  };
}

/** 基于参数构建一个复杂的数据实例报告。 */
export function createSelectionDisplaySummaryByKeys<K extends PropertyKey>(
  availableKeys: readonly K[],
  selectedKeys: readonly K[],
  options: FormatSelectionSummaryOptions = {}
): SelectionDisplaySummary {
  return createSelectionDisplaySummary(getSelectionSummaryByKeys(availableKeys, selectedKeys), options);
}
