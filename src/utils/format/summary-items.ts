import { STATUS_TONES } from "./constants";
import { formatKeyValueList, formatNullable } from "./list";
import type {
  CreateSummaryItemsOptions,
  CreateSummaryItemsReportOptions,
  StatusSummaryItem,
  StatusSummaryItemInput,
  StatusSummaryItemsReport,
  StatusSummaryItemsSummary,
  StatusTone,
  SummaryItem,
  SummaryItemInput,
  SummaryItemsReport,
  SummaryItemsSummary,
  FormatSummaryItemsOptions,
} from "./types";

export function createSummaryItem<TMeta = unknown>(
  input: SummaryItemInput<TMeta>,
  options: CreateSummaryItemsOptions = {}
): SummaryItem<TMeta> | null {
  if (input.visible === false) {
    return null;
  }

  const label = formatNullable(input.label, "");
  const fallback = options.fallback ?? "";
  const value = formatNullable(input.value, fallback);

  if ((options.skipEmpty ?? true) && (!label || !value)) {
    return null;
  }

  return {
    key: input.key,
    label,
    value,
    ...(input.meta === undefined ? {} : { meta: input.meta }),
  };
}

export function createSummaryItems<TMeta = unknown>(
  items: readonly SummaryItemInput<TMeta>[],
  options: CreateSummaryItemsOptions = {}
): Array<SummaryItem<TMeta>> {
  return items.flatMap((item) => {
    const summaryItem = createSummaryItem(item, options);
    return summaryItem ? [summaryItem] : [];
  });
}

export function createStatusSummaryItem<TMeta = unknown>(
  input: StatusSummaryItemInput<TMeta>,
  options: CreateSummaryItemsOptions = {}
): StatusSummaryItem<TMeta> | null {
  const item = createSummaryItem(input, options);

  if (!item) {
    return null;
  }

  return {
    ...item,
    tone: input.tone ?? "neutral",
    active: input.active ?? true,
  };
}

export function createStatusSummaryItems<TMeta = unknown>(
  items: readonly StatusSummaryItemInput<TMeta>[],
  options: CreateSummaryItemsOptions = {}
): Array<StatusSummaryItem<TMeta>> {
  return items.flatMap((item) => {
    const summaryItem = createStatusSummaryItem(item, options);
    return summaryItem ? [summaryItem] : [];
  });
}

export function getSummaryItemKeys<TItem extends SummaryItem<unknown>>(items: readonly TItem[]): string[] {
  return items.map((item) => item.key);
}

export function getDuplicateSummaryItemKeys<TItem extends SummaryItem<unknown>>(items: readonly TItem[]): string[] {
  const duplicateKeys: string[] = [];
  const seenKeys = new Set<string>();

  for (const key of getSummaryItemKeys(items)) {
    if (seenKeys.has(key)) {
      if (!duplicateKeys.includes(key)) {
        duplicateKeys.push(key);
      }
      continue;
    }

    seenKeys.add(key);
  }

  return duplicateKeys;
}

export function hasDuplicateSummaryItemKeys<TItem extends SummaryItem<unknown>>(items: readonly TItem[]): boolean {
  return getDuplicateSummaryItemKeys(items).length > 0;
}

export function createSummaryItemMap<TItem extends SummaryItem<unknown>>(items: readonly TItem[]): Map<string, TItem> {
  return new Map(items.map((item) => [item.key, item]));
}

export function createSummaryItemRecord<TItem extends SummaryItem<unknown>>(items: readonly TItem[]): Record<string, string> {
  return items.reduce<Record<string, string>>((record, item) => {
    record[item.key] = item.value;
    return record;
  }, {});
}

export function summarizeSummaryItems<TItem extends SummaryItem<unknown>>(
  items: readonly TItem[],
  sourceCount = items.length
): SummaryItemsSummary {
  const duplicateKeys = getDuplicateSummaryItemKeys(items);

  return {
    sourceCount,
    itemCount: items.length,
    skippedCount: Math.max(0, sourceCount - items.length),
    keys: getSummaryItemKeys(items),
    duplicateKeys,
    hasDuplicateKeys: duplicateKeys.length > 0,
    empty: items.length === 0,
  };
}

export function formatSummaryItems<TMeta = unknown>(
  items: readonly SummaryItem<TMeta>[],
  options: FormatSummaryItemsOptions<TMeta> = {}
): string {
  const entries = items.map((item, index) => [
    options.labelFormatter?.(item, index) ?? item.label,
    options.valueFormatter?.(item, index) ?? item.value,
  ] as const);

  return formatKeyValueList(entries, options);
}

/** 基于参数构建一个复杂的数据实例报告。 */
export function createSummaryItemsReport<TMeta = unknown>(
  inputs: readonly SummaryItemInput<TMeta>[],
  options: CreateSummaryItemsReportOptions<TMeta> = {}
): SummaryItemsReport<TMeta> {
  const items = createSummaryItems(inputs, options);

  return {
    items,
    itemMap: createSummaryItemMap(items),
    itemRecord: createSummaryItemRecord(items),
    formattedText: formatSummaryItems(items, options.format),
    summary: summarizeSummaryItems(items, inputs.length),
  };
}

function createEmptyStatusToneCounts(): Record<StatusTone, number> {
  return STATUS_TONES.reduce<Record<StatusTone, number>>((counts, tone) => {
    counts[tone] = 0;
    return counts;
  }, {
    neutral: 0,
    success: 0,
    warning: 0,
    danger: 0,
    info: 0,
  });
}

export function getActiveStatusSummaryItems<TMeta = unknown>(
  items: readonly StatusSummaryItem<TMeta>[]
): Array<StatusSummaryItem<TMeta>> {
  return items.filter((item) => item.active);
}

export function getInactiveStatusSummaryItems<TMeta = unknown>(
  items: readonly StatusSummaryItem<TMeta>[]
): Array<StatusSummaryItem<TMeta>> {
  return items.filter((item) => !item.active);
}

export function groupStatusSummaryItemsByTone<TMeta = unknown>(
  items: readonly StatusSummaryItem<TMeta>[]
): Record<StatusTone, Array<StatusSummaryItem<TMeta>>> {
  return STATUS_TONES.reduce<Record<StatusTone, Array<StatusSummaryItem<TMeta>>>>((groups, tone) => {
    groups[tone] = items.filter((item) => item.tone === tone);
    return groups;
  }, {
    neutral: [],
    success: [],
    warning: [],
    danger: [],
    info: [],
  });
}

export function summarizeStatusSummaryItems<TMeta = unknown>(
  items: readonly StatusSummaryItem<TMeta>[],
  sourceCount = items.length
): StatusSummaryItemsSummary {
  const baseSummary = summarizeSummaryItems(items, sourceCount);
  const activeItems = getActiveStatusSummaryItems(items);
  const toneCounts = createEmptyStatusToneCounts();
  const activeToneCounts = createEmptyStatusToneCounts();

  for (const item of items) {
    toneCounts[item.tone] += 1;

    if (item.active) {
      activeToneCounts[item.tone] += 1;
    }
  }

  return {
    ...baseSummary,
    activeCount: activeItems.length,
    inactiveCount: items.length - activeItems.length,
    toneCounts,
    activeToneCounts,
    hasActive: activeItems.length > 0,
    hasInactive: activeItems.length < items.length,
  };
}

/** 基于参数构建一个复杂的数据实例报告。 */
export function createStatusSummaryItemsReport<TMeta = unknown>(
  inputs: readonly StatusSummaryItemInput<TMeta>[],
  options: CreateSummaryItemsReportOptions<TMeta> = {}
): StatusSummaryItemsReport<TMeta> {
  const items = createStatusSummaryItems(inputs, options);

  return {
    items,
    activeItems: getActiveStatusSummaryItems(items),
    inactiveItems: getInactiveStatusSummaryItems(items),
    itemsByTone: groupStatusSummaryItemsByTone(items),
    itemMap: createSummaryItemMap(items),
    itemRecord: createSummaryItemRecord(items),
    formattedText: formatSummaryItems(items, options.format),
    summary: summarizeStatusSummaryItems(items, inputs.length),
  };
}
