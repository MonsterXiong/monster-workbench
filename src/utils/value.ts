export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export type Primitive = string | number | bigint | boolean | symbol | null | undefined;
export type EmptyValue = null | undefined | "";

export interface ValueTypeSummary {
  type: string;
  empty: boolean;
  nullish: boolean;
  primitive: boolean;
  truthy: boolean;
  array: boolean;
  plainRecord: boolean;
}

export interface ValueTypeListSummary {
  totalCount: number;
  emptyValueCount: number;
  nullishCount: number;
  primitiveCount: number;
  arrayCount: number;
  plainRecordCount: number;
  typeCounts: Record<string, number>;
  types: string[];
}

export type ParsedValueKind = "boolean" | "number" | "integer" | "enum";

export interface ParsedValueReport<T> {
  input: unknown;
  value: T;
  kind: ParsedValueKind;
  valid: boolean;
  fallbackUsed: boolean;
  fallback: T;
}

export interface ParsedValueListSummary {
  totalCount: number;
  validCount: number;
  invalidCount: number;
  fallbackUsedCount: number;
  emptyInputCount: number;
  allValid: boolean;
  hasInvalid: boolean;
}

export interface ParsedValueListReport<T> {
  reports: Array<ParsedValueReport<T>>;
  values: T[];
  validValues: T[];
  invalidInputs: unknown[];
  summary: ParsedValueListSummary;
}

export function isPrimitive(value: unknown): value is Primitive {
  return value === null || (typeof value !== "object" && typeof value !== "function");
}

export function isPropertyKey(value: unknown): value is PropertyKey {
  return typeof value === "string" || typeof value === "number" || typeof value === "symbol";
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isObjectLike(value: unknown): value is object {
  return (typeof value === "object" || typeof value === "function") && value !== null;
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function isFunction<T extends (...args: any[]) => unknown = (...args: any[]) => unknown>(value: unknown): value is T {
  return typeof value === "function";
}

export function isPromiseLike<T = unknown>(value: unknown): value is PromiseLike<T> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

export function isDateObject(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp;
}

export function isMap<K = unknown, V = unknown>(value: unknown): value is Map<K, V> {
  return value instanceof Map;
}

export function isSet<T = unknown>(value: unknown): value is Set<T> {
  return value instanceof Set;
}

export function isIterable<T = unknown>(value: unknown): value is Iterable<T> {
  return value !== null && value !== undefined && typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function";
}

export function isAsyncIterable<T = unknown>(value: unknown): value is AsyncIterable<T> {
  return value !== null && value !== undefined && typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function";
}

export function isArrayLike<T = unknown>(value: unknown): value is ArrayLike<T> {
  if (value === null || value === undefined || typeof value === "function") {
    return false;
  }

  const length = (value as { length?: unknown }).length;
  return typeof length === "number" && Number.isInteger(length) && length >= 0 && length <= Number.MAX_SAFE_INTEGER;
}

export function isTruthy<T>(value: T): value is Exclude<T, false | 0 | "" | null | undefined> {
  return value !== false && value !== 0 && value !== "" && value !== null && value !== undefined;
}

export function isFalsy(value: unknown): value is false | 0 | "" | null | undefined {
  return value === false || value === 0 || value === "" || value === null || value === undefined;
}

export function isEmptyValue(value: unknown): value is EmptyValue {
  return value === null || value === undefined || value === "";
}

export function isNonEmptyValue<T>(value: T): value is Exclude<T, EmptyValue> {
  return !isEmptyValue(value);
}

export function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

export function isUrlSearchParams(value: unknown): value is URLSearchParams {
  return typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams;
}

export function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer;
}

export function isArrayBufferView(value: unknown): value is ArrayBufferView {
  return typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value);
}

export function isReadableStream(value: unknown): value is ReadableStream {
  return typeof ReadableStream !== "undefined" && value instanceof ReadableStream;
}

export function isNativeRequestBody(value: unknown): value is BodyInit {
  return (
    typeof value === "string" ||
    isFormData(value) ||
    isUrlSearchParams(value) ||
    isBlob(value) ||
    isArrayBuffer(value) ||
    isArrayBufferView(value) ||
    isReadableStream(value)
  );
}

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

export function withDefault<T>(value: T | null | undefined, fallback: T): T {
  return isNil(value) ? fallback : value;
}

export function withNonEmptyDefault<T>(value: T | EmptyValue, fallback: Exclude<T, EmptyValue>): Exclude<T, EmptyValue> {
  return isEmptyValue(value) ? fallback : (value as Exclude<T, EmptyValue>);
}

export function coalesce<T>(...values: readonly (T | null | undefined)[]): T | undefined {
  return values.find(isNonNullable);
}

export function coalesceWithDefault<T>(values: readonly (T | null | undefined)[], fallback: T): T {
  return coalesce(...values) ?? fallback;
}

export function coalesceNonEmpty<T>(...values: readonly (T | EmptyValue)[]): Exclude<T, EmptyValue> | undefined {
  return values.find(isNonEmptyValue) as Exclude<T, EmptyValue> | undefined;
}

export function coalesceNonEmptyWithDefault<T>(values: readonly (T | EmptyValue)[], fallback: Exclude<T, EmptyValue>): Exclude<T, EmptyValue> {
  return coalesceNonEmpty(...values) ?? fallback;
}

export function parseBoolean(value: unknown, fallback = false): boolean {
  return parseOptionalBoolean(value) ?? fallback;
}

export function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value !== 0 : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (["true", "1", "yes", "y", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "no", "n", "off"].includes(normalizedValue)) {
    return false;
  }

  return undefined;
}

export function parseOptionalNumber(value: unknown): number | undefined {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

export function parseNumber(value: unknown, fallback = 0): number {
  return parseOptionalNumber(value) ?? fallback;
}

export function parseOptionalInteger(value: unknown): number | undefined {
  const numericValue = parseOptionalNumber(value);
  return numericValue === undefined ? undefined : Math.trunc(numericValue);
}

export function parseInteger(value: unknown, fallback = 0): number {
  return parseOptionalInteger(value) ?? fallback;
}

export function createParsedValueReport<T>(
  input: unknown,
  parsedValue: T | undefined,
  fallback: T,
  kind: ParsedValueKind
): ParsedValueReport<T> {
  const valid = parsedValue !== undefined;

  return {
    input,
    value: valid ? parsedValue : fallback,
    kind,
    valid,
    fallbackUsed: !valid,
    fallback,
  };
}

export function parseBooleanWithReport(input: unknown, fallback = false): ParsedValueReport<boolean> {
  return createParsedValueReport(input, parseOptionalBoolean(input), fallback, "boolean");
}

export function parseNumberWithReport(input: unknown, fallback = 0): ParsedValueReport<number> {
  return createParsedValueReport(input, parseOptionalNumber(input), fallback, "number");
}

export function parseIntegerWithReport(input: unknown, fallback = 0): ParsedValueReport<number> {
  return createParsedValueReport(input, parseOptionalInteger(input), fallback, "integer");
}

export function booleanToString(value: boolean, trueValue = "true", falseValue = "false"): string {
  return value ? trueValue : falseValue;
}

export function parseEnum<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function parseOptionalEnum<T extends string>(value: unknown, options: readonly T[]): T | undefined {
  return typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function parseEnumWithReport<T extends string>(
  input: unknown,
  options: readonly T[],
  fallback: T
): ParsedValueReport<T> {
  return createParsedValueReport(input, parseOptionalEnum(input, options), fallback, "enum");
}

export function parseEnumList<T extends string>(values: unknown, options: readonly T[]): T[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter((value): value is T => isOneOf(value, options));
}

export function parseBooleanList(values: unknown): boolean[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.flatMap((value) => {
    const parsedValue = parseOptionalBoolean(value);
    return parsedValue === undefined ? [] : [parsedValue];
  });
}

export function parseNumberList(values: unknown): number[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.flatMap((value) => {
    const parsedValue = parseOptionalNumber(value);
    return parsedValue === undefined ? [] : [parsedValue];
  });
}

export function parseIntegerList(values: unknown): number[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.flatMap((value) => {
    const parsedValue = parseOptionalInteger(value);
    return parsedValue === undefined ? [] : [parsedValue];
  });
}

export function summarizeParsedValueReports<T>(reports: readonly ParsedValueReport<T>[]): ParsedValueListSummary {
  const validCount = reports.filter((report) => report.valid).length;
  const fallbackUsedCount = reports.filter((report) => report.fallbackUsed).length;

  return {
    totalCount: reports.length,
    validCount,
    invalidCount: reports.length - validCount,
    fallbackUsedCount,
    emptyInputCount: reports.filter((report) => isEmptyValue(report.input)).length,
    allValid: reports.length > 0 && validCount === reports.length,
    hasInvalid: validCount < reports.length,
  };
}

export function createParsedValueListReport<T>(
  reports: readonly ParsedValueReport<T>[]
): ParsedValueListReport<T> {
  return {
    reports: [...reports],
    values: reports.map((report) => report.value),
    validValues: reports.flatMap((report) => report.valid ? [report.value] : []),
    invalidInputs: reports.flatMap((report) => report.valid ? [] : [report.input]),
    summary: summarizeParsedValueReports(reports),
  };
}

export function parseBooleanListWithReport(values: unknown, fallback = false): ParsedValueListReport<boolean> {
  const inputs = Array.isArray(values) ? values : [];
  return createParsedValueListReport(inputs.map((value) => parseBooleanWithReport(value, fallback)));
}

export function parseNumberListWithReport(values: unknown, fallback = 0): ParsedValueListReport<number> {
  const inputs = Array.isArray(values) ? values : [];
  return createParsedValueListReport(inputs.map((value) => parseNumberWithReport(value, fallback)));
}

export function parseIntegerListWithReport(values: unknown, fallback = 0): ParsedValueListReport<number> {
  const inputs = Array.isArray(values) ? values : [];
  return createParsedValueListReport(inputs.map((value) => parseIntegerWithReport(value, fallback)));
}

export function parseEnumListWithReport<T extends string>(
  values: unknown,
  options: readonly T[],
  fallback: T
): ParsedValueListReport<T> {
  const inputs = Array.isArray(values) ? values : [];
  return createParsedValueListReport(inputs.map((value) => parseEnumWithReport(value, options, fallback)));
}

export function createEnumParser<T extends string>(options: readonly T[], fallback: T): (value: unknown) => T {
  return (value) => parseEnum(value, options, fallback);
}

export function isOneOf<T extends string | number>(value: unknown, options: readonly T[]): value is T {
  return options.includes(value as T);
}

export function coerceEmptyToNull(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

export function coerceEmptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

export function coerceEmptyValuesToNull(values: readonly unknown[]): unknown[] {
  return values.map(coerceEmptyToNull);
}

export function coerceEmptyValuesToUndefined(values: readonly unknown[]): unknown[] {
  return values.map(coerceEmptyToUndefined);
}
