import { isEmptyValue, isNil, isPlainRecord, isPrimitive, isDateObject, isRegExp, isMap, isSet, isPromiseLike } from "./guards";
import type { ValueTypeListSummary, ValueTypeSummary } from "./types";

export function getValueType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (isDateObject(value)) return "date";
  if (isRegExp(value)) return "regexp";
  if (isMap(value)) return "map";
  if (isSet(value)) return "set";
  if (isPromiseLike(value)) return "promise";
  return typeof value;
}

export function summarizeValueType(value: unknown): ValueTypeSummary {
  return {
    type: getValueType(value),
    empty: isEmptyValue(value),
    nullish: isNil(value),
    primitive: isPrimitive(value),
    truthy: Boolean(value),
    array: Array.isArray(value),
    plainRecord: isPlainRecord(value),
  };
}

export function summarizeValueTypes(values: readonly unknown[]): ValueTypeListSummary {
  const summaries = values.map(summarizeValueType);
  const typeCounts = summaries.reduce<Record<string, number>>((result, summary) => {
    result[summary.type] = (result[summary.type] ?? 0) + 1;
    return result;
  }, {});

  return {
    totalCount: values.length,
    emptyValueCount: summaries.filter((summary) => summary.empty).length,
    nullishCount: summaries.filter((summary) => summary.nullish).length,
    primitiveCount: summaries.filter((summary) => summary.primitive).length,
    arrayCount: summaries.filter((summary) => summary.array).length,
    plainRecordCount: summaries.filter((summary) => summary.plainRecord).length,
    typeCounts,
    types: Object.keys(typeCounts),
  };
}
