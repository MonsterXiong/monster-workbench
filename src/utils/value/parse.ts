import { isEmptyValue } from "./guards";
import { isOneOf } from "./coerce";
import type { ParsedValueKind, ParsedValueListReport, ParsedValueListSummary, ParsedValueReport } from "./types";

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

export function parseBoolean(value: unknown, fallback = false): boolean {
  return parseOptionalBoolean(value) ?? fallback;
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

export function createParsedValueListReport<T>(reports: readonly ParsedValueReport<T>[]): ParsedValueListReport<T> {
  return {
    reports: [...reports],
    values: reports.map((report) => report.value),
    validValues: reports.flatMap((report) => (report.valid ? [report.value] : [])),
    invalidInputs: reports.flatMap((report) => (report.valid ? [] : [report.input])),
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
