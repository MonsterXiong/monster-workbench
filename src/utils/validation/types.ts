export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export type Validator<T> = (value: T) => string | false | null | undefined;
export type ValidatorMap<T extends Record<string, unknown>> = Partial<{
  [K in keyof T]: readonly Validator<T[K]>[];
}>;

export type ValidationErrorMap<T extends Record<string, unknown>> = Partial<Record<keyof T, string[]>>;
export type ValidationErrorCountMap<T extends Record<string, unknown>> = Partial<Record<keyof T, number>>;

export interface RecordValidationResult<T extends Record<string, unknown>> extends ValidationResult {
  fields: ValidationErrorMap<T>;
}

export interface RecordValidationSchema<T extends Record<string, unknown>> {
  validators: ValidatorMap<T>;
  labels?: Partial<Record<keyof T, string>>;
}

export interface RecordValidationSchemaReport<T extends Record<string, unknown>> {
  value: T;
  schema: RecordValidationSchema<T>;
  result: RecordValidationResult<T>;
  summary: RecordValidationDisplaySummary<T>;
  valid: boolean;
}

export interface RecordValidationSchemaFieldsReport<T extends Record<string, unknown>> {
  schema: RecordValidationSchema<T>;
  includedFields: Array<keyof T>;
  excludedFields: Array<keyof T>;
  totalFieldCount: number;
  includedFieldCount: number;
  excludedFieldCount: number;
  hasExcludedFields: boolean;
}

export interface ValidationSummary<T extends Record<string, unknown> = Record<string, unknown>> {
  valid: boolean;
  errorCount: number;
  firstError: string;
  fields: Array<keyof T>;
}

export interface ValidationResultSummary {
  valid: boolean;
  errorCount: number;
  firstError: string;
}

export interface ValidationErrorEntry<T extends Record<string, unknown> = Record<string, unknown>> {
  field: keyof T;
  error: string;
  index: number;
}

export interface RecordValidationFieldSummary<T extends Record<string, unknown> = Record<string, unknown>> {
  field: keyof T;
  errorCount: number;
  firstError: string;
  errors: string[];
}

export interface RecordValidationFieldsSummary<T extends Record<string, unknown> = Record<string, unknown>> {
  valid: boolean;
  fieldCount: number;
  errorCount: number;
  firstError: string;
  fields: Array<keyof T>;
  fieldErrorCounts: ValidationErrorCountMap<T>;
  entries: Array<RecordValidationFieldSummary<T>>;
}

export interface FormatRecordValidationSummaryOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  fieldSeparator?: string;
  errorSeparator?: string;
  formatField?: (field: keyof T) => string;
  fallback?: string;
}

export interface RecordValidationDisplaySummary<T extends Record<string, unknown> = Record<string, unknown>> extends RecordValidationFieldsSummary<T> {
  text: string;
}

export interface FormatValidationErrorsOptions {
  separator?: string;
  fallback?: string;
}

export interface NamedValidationResult {
  name: string;
  result: ValidationResult;
}

export interface NamedValidator<T> {
  name: string;
  validator: Validator<T>;
}

export interface ValidationPlanReport<T> {
  value: T;
  validators: Array<NamedValidator<T>>;
  results: NamedValidationResult[];
  summary: ValidationResultsSummary;
}

export interface ValidationResultsSummary {
  totalCount: number;
  validCount: number;
  invalidCount: number;
  errorCount: number;
  invalidNames: string[];
  firstError: string;
  allValid: boolean;
  hasErrors: boolean;
  empty: boolean;
}

export interface FormatValidationResultsSummaryOptions {
  emptyText?: string;
  validText?: string;
  invalidLabel?: string;
  errorLabel?: string;
  separator?: string;
  nameSeparator?: string;
  includeErrorCount?: boolean;
  includeInvalidNames?: boolean;
}

export interface ValidationResultsReport {
  results: NamedValidationResult[];
  summary: ValidationResultsSummary;
}

export interface ValidationResultsDisplaySummary extends ValidationResultsSummary {
  text: string;
}
