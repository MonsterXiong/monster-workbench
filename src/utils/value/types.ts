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
