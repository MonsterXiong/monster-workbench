import { toNonNegativeInteger } from "../number";
import { joinMappedNonEmptyStrings, joinNonEmptyStrings, normalizeStringList, normalizeWhitespace, truncateText } from "../string";
import { formatNumber } from "./number";
import type {
  FormatIdentifierOptions,
  FormatKeyValueListOptions,
  FormatListCountOptions,
  FormatListSummaryOptions,
  FormatMappedListOptions,
} from "./types";

export function formatNullable(value: unknown, fallback = "--"): string {
  if (value === undefined || value === null) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

export function formatIdentifier(value: unknown, options: FormatIdentifierOptions = {}): string {
  const fallback = options.fallback ?? "";
  const rawText = String(value ?? "").trim();
  const text = (options.normalizeWhitespace ?? true) ? normalizeWhitespace(rawText) : rawText;

  if (!text) {
    return fallback;
  }

  const maxLength = options.maxLength === undefined ? text.length : toNonNegativeInteger(options.maxLength);
  return truncateText(text, maxLength, options.suffix ?? "...");
}

export function formatShortIdentifier(value: unknown, maxLength = 18, fallback = ""): string {
  return formatIdentifier(value, { maxLength, fallback });
}

export function formatCodeLikeValue(value: unknown, fallback = "-"): string {
  return formatIdentifier(value, { fallback, normalizeWhitespace: false });
}

export function formatList(values: readonly unknown[], separator = "\u3001", fallback = "--"): string {
  const text = joinNonEmptyStrings(values, separator);
  return text || fallback;
}

export function formatOptionalList(
  values: readonly unknown[] | null | undefined,
  separator = "\u3001",
  fallback = "--"
): string {
  return values ? formatList(values, separator, fallback) : fallback;
}

export function formatMappedList<T>(
  values: readonly T[],
  mapper: (value: T, index: number) => unknown,
  options: FormatMappedListOptions = {}
): string {
  const text = joinMappedNonEmptyStrings(values, mapper, options.separator ?? "\u3001");
  return text || (options.fallback ?? "--");
}

export function formatKeyValueList(
  entries: readonly (readonly [unknown, unknown])[],
  options: FormatKeyValueListOptions = {}
): string {
  const pairSeparator = options.pairSeparator ?? ": ";
  const parts = entries.flatMap(([key, value]) => {
    const keyText = formatNullable(key, "");
    const valueText = formatNullable(value, "");

    if ((options.skipEmpty ?? true) && (!keyText || !valueText)) {
      return [];
    }

    return [`${keyText}${pairSeparator}${valueText}`];
  });

  return formatList(parts, options.separator ?? "\u3001", options.fallback ?? "--");
}

export function formatRecordList(
  record: Record<string, unknown>,
  options: FormatKeyValueListOptions = {}
): string {
  return formatKeyValueList(Object.entries(record), options);
}

export function formatListCount(values: readonly unknown[] | null | undefined, options: FormatListCountOptions = {}): string {
  if (!values) {
    return options.fallback ?? "--";
  }

  const unitText = options.unit ? ` ${options.unit}` : "";
  return `${formatNumber(values.length, options.locale ?? "zh-CN")}${unitText}`;
}

export function formatListSummary(values: readonly unknown[], options: FormatListSummaryOptions = {}): string {
  const items = normalizeStringList(values);
  const fallback = options.fallback ?? "--";

  if (items.length === 0) {
    return fallback;
  }

  const maxItems = options.maxItems === undefined ? items.length : toNonNegativeInteger(options.maxItems);
  const visibleItems = maxItems === 0 ? [] : items.slice(0, maxItems);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);
  const overflowText = hiddenCount > 0
    ? options.overflowFormatter?.(hiddenCount) ?? `+${hiddenCount}`
    : "";
  const text = joinNonEmptyStrings([...visibleItems, overflowText], options.separator ?? "\u3001");

  return text || fallback;
}

export function formatRange(start: unknown, end: unknown, separator = " - ", fallback = "--"): string {
  const startText = formatNullable(start, "");
  const endText = formatNullable(end, "");

  if (!startText && !endText) {
    return fallback;
  }

  if (!startText || !endText) {
    return startText || endText;
  }

  return `${startText}${separator}${endText}`;
}
