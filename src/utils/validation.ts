import { isBetween, isFiniteNumber, toFiniteNumber } from "./number";
import { isJsonArrayText, isJsonObjectText, isJsonText } from "./json";
import { isSafeRelativePathText } from "./path";
import { isHttpUrl } from "./url";
import { isNonEmptyValue } from "./value";

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

const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IPV4_REGEXP = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const UUID_REGEXP = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createValidationResult(errors: readonly string[] = []): ValidationResult {
  return {
    valid: errors.length === 0,
    errors: [...errors],
  };
}

export function isValidationResultValid(result: ValidationResult): boolean {
  return result.valid && result.errors.length === 0;
}

export function hasValidationErrors(result: ValidationResult): boolean {
  return !isValidationResultValid(result);
}

export function mergeValidationResults(results: readonly ValidationResult[]): ValidationResult {
  return createValidationResult(results.flatMap((result) => result.errors));
}

export function summarizeValidationResults(results: readonly NamedValidationResult[]): ValidationResultsSummary {
  const invalidResults = results.filter((entry) => hasValidationErrors(entry.result));
  const errorCount = results.reduce((total, entry) => total + entry.result.errors.length, 0);
  const firstInvalidResult = invalidResults.find((entry) => entry.result.errors.length > 0);

  return {
    totalCount: results.length,
    validCount: results.length - invalidResults.length,
    invalidCount: invalidResults.length,
    errorCount,
    invalidNames: invalidResults.map((entry) => entry.name),
    firstError: firstInvalidResult?.result.errors[0] ?? "",
    allValid: results.length > 0 && invalidResults.length === 0,
    hasErrors: errorCount > 0,
    empty: results.length === 0,
  };
}

export function createValidationResultsReport(results: readonly NamedValidationResult[]): ValidationResultsReport {
  return {
    results: results.map((entry) => ({
      name: entry.name,
      result: createValidationResult(entry.result.errors),
    })),
    summary: summarizeValidationResults(results),
  };
}

export function formatValidationResultsSummary(
  summary: ValidationResultsSummary,
  options: FormatValidationResultsSummaryOptions = {}
): string {
  if (summary.empty) {
    return options.emptyText ?? "0 validations";
  }

  if (summary.allValid) {
    return options.validText ?? "all valid";
  }

  const separator = options.separator ?? " / ";
  const invalidLabel = options.invalidLabel ?? "invalid";
  const errorLabel = options.errorLabel ?? "errors";
  const parts = [`${summary.invalidCount}/${summary.totalCount} ${invalidLabel}`];

  if (options.includeErrorCount ?? summary.errorCount !== summary.invalidCount) {
    parts.push(`${summary.errorCount} ${errorLabel}`);
  }

  if ((options.includeInvalidNames ?? true) && summary.invalidNames.length > 0) {
    parts.push(summary.invalidNames.join(options.nameSeparator ?? ", "));
  }

  return parts.join(separator);
}

export function createValidationResultsDisplaySummary(
  results: readonly NamedValidationResult[],
  options: FormatValidationResultsSummaryOptions = {}
): ValidationResultsDisplaySummary {
  const summary = summarizeValidationResults(results);

  return {
    ...summary,
    text: formatValidationResultsSummary(summary, options),
  };
}

export function runNamedValidators<T>(
  values: Record<string, T>,
  validators: readonly Validator<T>[]
): ValidationResultsReport {
  return createValidationResultsReport(
    Object.entries(values).map(([name, value]) => ({
      name,
      result: runValidators(value, validators),
    }))
  );
}

export function runValidationPlan<T>(value: T, validators: readonly NamedValidator<T>[]): ValidationPlanReport<T> {
  const results = validators.map((entry) => ({
    name: entry.name,
    result: runValidators(value, [entry.validator]),
  }));

  return {
    value,
    validators: [...validators],
    results,
    summary: summarizeValidationResults(results),
  };
}

export function createNamedValidator<T>(name: string, validator: Validator<T>): NamedValidator<T> {
  return {
    name,
    validator,
  };
}

export function createNamedValidators<T>(
  entries: readonly (readonly [string, Validator<T>])[]
): Array<NamedValidator<T>> {
  return entries.map(([name, validator]) => createNamedValidator(name, validator));
}

export function summarizeValidationResult(result: ValidationResult): ValidationResultSummary {
  return {
    valid: isValidationResultValid(result),
    errorCount: result.errors.length,
    firstError: getFirstValidationResultError(result),
  };
}

export function formatValidationErrors(result: ValidationResult, options: FormatValidationErrorsOptions = {}): string {
  const text = result.errors.join(options.separator ?? "\n");
  const fallback = options.fallback ?? "";
  return text || fallback;
}

export function appendValidationError(result: ValidationResult, error: string | null | undefined): ValidationResult {
  return error ? createValidationResult([...result.errors, error]) : createValidationResult(result.errors);
}

export function runValidators<T>(value: T, validators: readonly Validator<T>[]): ValidationResult {
  const errors = validators
    .map((validator) => validator(value))
    .filter((message): message is string => typeof message === "string" && message.length > 0);

  return createValidationResult(errors);
}

export function getValidationErrors<T>(value: T, validators: readonly Validator<T>[]): string[] {
  return runValidators(value, validators).errors;
}

export function getFirstValidationError<T>(value: T, validators: readonly Validator<T>[]): string {
  return getValidationErrors(value, validators)[0] ?? "";
}

export function getFirstValidationResultError(result: ValidationResult): string {
  return result.errors[0] ?? "";
}

export function runValidatorsUntilFirst<T>(value: T, validators: readonly Validator<T>[]): ValidationResult {
  const error = getFirstValidationError(value, validators);
  return createValidationResult(error ? [error] : []);
}

export function createRecordValidationSchema<T extends Record<string, unknown>>(
  validators: ValidatorMap<T>,
  labels: Partial<Record<keyof T, string>> = {}
): RecordValidationSchema<T> {
  return {
    validators,
    labels,
  };
}

export function mergeRecordValidationSchemas<T extends Record<string, unknown>>(
  schemas: readonly RecordValidationSchema<T>[]
): RecordValidationSchema<T> {
  const validators: ValidatorMap<T> = {};
  const labels: Partial<Record<keyof T, string>> = {};

  for (const schema of schemas) {
    Object.assign(labels, schema.labels ?? {});

    for (const key of Object.keys(schema.validators) as Array<keyof T>) {
      validators[key] = [
        ...(validators[key] ?? []),
        ...(schema.validators[key] ?? []),
      ] as ValidatorMap<T>[typeof key];
    }
  }

  return createRecordValidationSchema(validators, labels);
}

function createRecordValidationSchemaFieldsReport<T extends Record<string, unknown>>(
  schema: RecordValidationSchema<T>,
  originalFields: readonly (keyof T)[]
): RecordValidationSchemaFieldsReport<T> {
  const includedFields = Object.keys(schema.validators) as Array<keyof T>;
  const excludedFields = originalFields.filter((field) => !includedFields.includes(field));

  return {
    schema,
    includedFields,
    excludedFields,
    totalFieldCount: originalFields.length,
    includedFieldCount: includedFields.length,
    excludedFieldCount: excludedFields.length,
    hasExcludedFields: excludedFields.length > 0,
  };
}

export function filterRecordValidationSchema<T extends Record<string, unknown>>(
  schema: RecordValidationSchema<T>,
  predicate: (field: keyof T, validators: readonly Validator<T[keyof T]>[], label: string) => boolean
): RecordValidationSchema<T> {
  const validators: ValidatorMap<T> = {};
  const labels: Partial<Record<keyof T, string>> = {};

  for (const field of Object.keys(schema.validators) as Array<keyof T>) {
    const fieldValidators = schema.validators[field] ?? [];
    const label = getRecordValidationFieldLabel(schema, field);

    if (predicate(field, fieldValidators as readonly Validator<T[keyof T]>[], label)) {
      validators[field] = fieldValidators as ValidatorMap<T>[typeof field];

      if (schema.labels?.[field] !== undefined) {
        labels[field] = schema.labels[field];
      }
    }
  }

  return createRecordValidationSchema(validators, labels);
}

export function pickRecordValidationSchema<T extends Record<string, unknown>>(
  schema: RecordValidationSchema<T>,
  fields: readonly (keyof T)[]
): RecordValidationSchema<T> {
  const fieldSet = new Set(fields);
  return filterRecordValidationSchema(schema, (field) => fieldSet.has(field));
}

export function omitRecordValidationSchema<T extends Record<string, unknown>>(
  schema: RecordValidationSchema<T>,
  fields: readonly (keyof T)[]
): RecordValidationSchema<T> {
  const fieldSet = new Set(fields);
  return filterRecordValidationSchema(schema, (field) => !fieldSet.has(field));
}

export function createFilteredRecordValidationSchemaReport<T extends Record<string, unknown>>(
  schema: RecordValidationSchema<T>,
  predicate: (field: keyof T, validators: readonly Validator<T[keyof T]>[], label: string) => boolean
): RecordValidationSchemaFieldsReport<T> {
  const originalFields = Object.keys(schema.validators) as Array<keyof T>;
  return createRecordValidationSchemaFieldsReport(filterRecordValidationSchema(schema, predicate), originalFields);
}

export function createPickedRecordValidationSchemaReport<T extends Record<string, unknown>>(
  schema: RecordValidationSchema<T>,
  fields: readonly (keyof T)[]
): RecordValidationSchemaFieldsReport<T> {
  const originalFields = Object.keys(schema.validators) as Array<keyof T>;
  return createRecordValidationSchemaFieldsReport(pickRecordValidationSchema(schema, fields), originalFields);
}

export function createOmittedRecordValidationSchemaReport<T extends Record<string, unknown>>(
  schema: RecordValidationSchema<T>,
  fields: readonly (keyof T)[]
): RecordValidationSchemaFieldsReport<T> {
  const originalFields = Object.keys(schema.validators) as Array<keyof T>;
  return createRecordValidationSchemaFieldsReport(omitRecordValidationSchema(schema, fields), originalFields);
}

export function getRecordValidationFieldLabel<T extends Record<string, unknown>>(
  schema: RecordValidationSchema<T>,
  field: keyof T
): string {
  return schema.labels?.[field] ?? String(field);
}

export function validateRecord<T extends Record<string, unknown>>(value: T, validators: ValidatorMap<T>): RecordValidationResult<T> {
  const fields: ValidationErrorMap<T> = {};
  const allErrors: string[] = [];

  for (const key of Object.keys(validators) as Array<keyof T>) {
    const fieldValidators = validators[key] ?? [];
    const errors = getValidationErrors(value[key], fieldValidators);

    if (errors.length > 0) {
      fields[key] = errors;
      allErrors.push(...errors);
    }
  }

  return {
    ...createValidationResult(allErrors),
    fields,
  };
}

export function validateRecordSchema<T extends Record<string, unknown>>(
  value: T,
  schema: RecordValidationSchema<T>
): RecordValidationResult<T> {
  return validateRecord(value, schema.validators);
}

export function createRecordValidationValidator<T extends Record<string, unknown>>(
  schema: RecordValidationSchema<T>,
  separator = "\n"
): Validator<T> {
  return (value) => {
    const result = validateRecordSchema(value, schema);
    return result.valid ? null : result.errors.join(separator);
  };
}

export function validateRecordSchemaUntilFirst<T extends Record<string, unknown>>(
  value: T,
  schema: RecordValidationSchema<T>
): RecordValidationResult<T> {
  return validateRecordUntilFirst(value, schema.validators);
}

export function createRecordValidationSchemaReport<T extends Record<string, unknown>>(
  value: T,
  schema: RecordValidationSchema<T>,
  options: Omit<FormatRecordValidationSummaryOptions<T>, "formatField"> = {}
): RecordValidationSchemaReport<T> {
  const result = validateRecordSchema(value, schema);
  const summary = createRecordValidationDisplaySummary(result, {
    ...options,
    formatField: (field) => getRecordValidationFieldLabel(schema, field),
  });

  return {
    value,
    schema,
    result,
    summary,
    valid: result.valid,
  };
}

export function validateRecordUntilFirst<T extends Record<string, unknown>>(value: T, validators: ValidatorMap<T>): RecordValidationResult<T> {
  const fields: ValidationErrorMap<T> = {};
  const allErrors: string[] = [];

  for (const key of Object.keys(validators) as Array<keyof T>) {
    const fieldValidators = validators[key] ?? [];
    const error = getFirstValidationError(value[key], fieldValidators);

    if (error) {
      fields[key] = [error];
      allErrors.push(error);
    }
  }

  return {
    ...createValidationResult(allErrors),
    fields,
  };
}

export function getRecordValidationFieldKeys<T extends Record<string, unknown>>(result: RecordValidationResult<T>): Array<keyof T> {
  return Object.keys(result.fields) as Array<keyof T>;
}

export function getRecordValidationFieldErrors<T extends Record<string, unknown>>(
  result: RecordValidationResult<T>,
  field: keyof T
): string[] {
  return [...(result.fields[field] ?? [])];
}

export function getFirstRecordValidationFieldError<T extends Record<string, unknown>>(
  result: RecordValidationResult<T>,
  field: keyof T
): string {
  return getRecordValidationFieldErrors(result, field)[0] ?? "";
}

export function hasRecordValidationFieldErrors<T extends Record<string, unknown>>(
  result: RecordValidationResult<T>,
  field: keyof T
): boolean {
  return getRecordValidationFieldErrors(result, field).length > 0;
}

export function getRecordValidationFieldErrorEntries<T extends Record<string, unknown>>(
  result: RecordValidationResult<T>
): Array<{ field: keyof T; errors: string[] }> {
  return getRecordValidationFieldKeys(result).map((field) => ({
    field,
    errors: getRecordValidationFieldErrors(result, field),
  }));
}

export function getRecordValidationFieldErrorCounts<T extends Record<string, unknown>>(
  result: RecordValidationResult<T>
): ValidationErrorCountMap<T> {
  const counts: ValidationErrorCountMap<T> = {};

  for (const field of getRecordValidationFieldKeys(result)) {
    counts[field] = getRecordValidationFieldErrors(result, field).length;
  }

  return counts;
}

export function flattenRecordValidationErrors<T extends Record<string, unknown>>(
  result: RecordValidationResult<T>
): Array<ValidationErrorEntry<T>> {
  return getRecordValidationFieldKeys(result).flatMap((field) =>
    getRecordValidationFieldErrors(result, field).map((error, index) => ({
      field,
      error,
      index,
    }))
  );
}

export function getRecordValidationErrorCount<T extends Record<string, unknown>>(result: RecordValidationResult<T>): number {
  return result.errors.length;
}

export function hasAnyRecordValidationFieldErrors<T extends Record<string, unknown>>(
  result: RecordValidationResult<T>,
  fields: readonly (keyof T)[]
): boolean {
  return fields.some((field) => hasRecordValidationFieldErrors(result, field));
}

export function hasEveryRecordValidationFieldErrors<T extends Record<string, unknown>>(
  result: RecordValidationResult<T>,
  fields: readonly (keyof T)[]
): boolean {
  return fields.every((field) => hasRecordValidationFieldErrors(result, field));
}

export function getFirstRecordValidationError<T extends Record<string, unknown>>(result: RecordValidationResult<T>): string {
  return getFirstValidationResultError(result);
}

export function summarizeValidation<T extends Record<string, unknown>>(result: RecordValidationResult<T>): ValidationSummary<T> {
  return {
    valid: result.valid,
    errorCount: result.errors.length,
    firstError: getFirstRecordValidationError(result),
    fields: getRecordValidationFieldKeys(result),
  };
}

export function summarizeRecordValidationFields<T extends Record<string, unknown>>(
  result: RecordValidationResult<T>
): RecordValidationFieldsSummary<T> {
  const fields = getRecordValidationFieldKeys(result);
  const entries = fields.map<RecordValidationFieldSummary<T>>((field) => {
    const errors = getRecordValidationFieldErrors(result, field);

    return {
      field,
      errorCount: errors.length,
      firstError: errors[0] ?? "",
      errors,
    };
  });

  return {
    valid: result.valid,
    fieldCount: fields.length,
    errorCount: result.errors.length,
    firstError: getFirstRecordValidationError(result),
    fields,
    fieldErrorCounts: getRecordValidationFieldErrorCounts(result),
    entries,
  };
}

export function formatRecordValidationSummary<T extends Record<string, unknown>>(
  result: RecordValidationResult<T>,
  options: FormatRecordValidationSummaryOptions<T> = {}
): string {
  const fieldSeparator = options.fieldSeparator ?? "\n";
  const errorSeparator = options.errorSeparator ?? "\n";
  const formatField = options.formatField ?? ((field: keyof T) => String(field));
  const text = getRecordValidationFieldErrorEntries(result)
    .map(({ field, errors }) => {
      const errorText = errors.filter(Boolean).join(errorSeparator);
      return errorText ? `${formatField(field)}: ${errorText}` : "";
    })
    .filter(Boolean)
    .join(fieldSeparator);

  return text || options.fallback || "";
}

export function createRecordValidationDisplaySummary<T extends Record<string, unknown>>(
  result: RecordValidationResult<T>,
  options: FormatRecordValidationSummaryOptions<T> = {}
): RecordValidationDisplaySummary<T> {
  return {
    ...summarizeRecordValidationFields(result),
    text: formatRecordValidationSummary(result, options),
  };
}

export function isRequiredValue(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length > 0 : isNonEmptyValue(value);
}

export function isEmail(value: string): boolean {
  return EMAIL_REGEXP.test(value.trim());
}

export function isIntegerInRange(value: unknown, min: number, max: number, inclusive = true): boolean {
  const numericValue = toFiniteNumber(value, Number.NaN);
  return Number.isInteger(numericValue) && isBetween(numericValue, min, max, inclusive);
}

export function isPort(value: unknown): boolean {
  return isIntegerInRange(value, 1, 65535);
}

export function isIpv4(value: string): boolean {
  return IPV4_REGEXP.test(value.trim());
}

export function isUuid(value: string): boolean {
  return UUID_REGEXP.test(value.trim());
}

export function isLocalhost(value: string): boolean {
  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue === "localhost" || normalizedValue === "127.0.0.1" || normalizedValue === "::1";
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isBlankString(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

export function isValidHttpUrl(value: string): boolean {
  return isHttpUrl(value.trim());
}

export function isValidFileName(value: string): boolean {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 && !/[<>:"/\\|?*\u0000-\u001F]/.test(trimmedValue);
}

export function isLengthBetween(value: string | readonly unknown[], min: number, max: number, inclusive = true): boolean {
  return isBetween(value.length, min, max, inclusive);
}

export function isMinLength(value: string | readonly unknown[], min: number, inclusive = true): boolean {
  return inclusive ? value.length >= min : value.length > min;
}

export function isMaxLength(value: string | readonly unknown[], max: number, inclusive = true): boolean {
  return inclusive ? value.length <= max : value.length < max;
}

export function isNumberInRange(value: unknown, min: number, max: number, inclusive = true): boolean {
  const numericValue = toFiniteNumber(value, Number.NaN);
  return isFiniteNumber(numericValue) && isBetween(numericValue, min, max, inclusive);
}

export function createPredicateValidator<T>(predicate: (value: T) => boolean, message: string): Validator<T> {
  return (value) => (predicate(value) ? null : message);
}

export function createOptionalValidator<T>(
  validator: Validator<T>,
  isEmpty: (value: T) => boolean = (value) => !isRequiredValue(value)
): Validator<T> {
  return (value) => (isEmpty(value) ? null : validator(value));
}

export function composeValidators<T>(validators: readonly Validator<T>[]): Validator<T> {
  return (value) => getFirstValidationError(value, validators) || null;
}

export function composeAllValidators<T>(validators: readonly Validator<T>[]): Validator<T> {
  return (value) => {
    const errors = getValidationErrors(value, validators);
    return errors.length > 0 ? errors.join("\n") : null;
  };
}

export function createConditionalValidator<T>(
  condition: (value: T) => boolean,
  validator: Validator<T>
): Validator<T> {
  return (value) => (condition(value) ? validator(value) : null);
}

export function createRequiredValidator<T>(message: string): Validator<T> {
  return (value) => (isRequiredValue(value) ? null : message);
}

export function createRequiredIfValidator<T>(condition: (value: T) => boolean, message: string): Validator<T> {
  return (value) => (condition(value) ? createRequiredValidator<T>(message)(value) : null);
}

export function createPatternValidator(pattern: RegExp, message: string): Validator<string> {
  return (value) => (pattern.test(value) ? null : message);
}

export function createEmailValidator(message: string): Validator<string> {
  return (value) => (isEmail(value) ? null : message);
}

export function createUuidValidator(message: string): Validator<string> {
  return (value) => (isUuid(value) ? null : message);
}

export function createIpv4Validator(message: string): Validator<string> {
  return (value) => (isIpv4(value) ? null : message);
}

export function createLocalhostValidator(message: string): Validator<string> {
  return (value) => (isLocalhost(value) ? null : message);
}

export function createMinLengthValidator<T extends string | readonly unknown[]>(min: number, message: string): Validator<T> {
  return (value) => (isMinLength(value, min) ? null : message);
}

export function createMaxLengthValidator<T extends string | readonly unknown[]>(max: number, message: string): Validator<T> {
  return (value) => (isMaxLength(value, max) ? null : message);
}

export function createLengthRangeValidator<T extends string | readonly unknown[]>(min: number, max: number, message: string): Validator<T> {
  return (value) => (isLengthBetween(value, min, max) ? null : message);
}

export function createNumberValidator(message: string): Validator<unknown> {
  return (value) => (isFiniteNumber(toFiniteNumber(value, Number.NaN)) ? null : message);
}

export function createIntegerValidator(message: string): Validator<unknown> {
  return (value) => (Number.isInteger(toFiniteNumber(value, Number.NaN)) ? null : message);
}

export function createMinValueValidator(min: number, message: string, inclusive = true): Validator<unknown> {
  return (value) => {
    const numericValue = toFiniteNumber(value, Number.NaN);
    return isFiniteNumber(numericValue) && (inclusive ? numericValue >= min : numericValue > min) ? null : message;
  };
}

export function createMaxValueValidator(max: number, message: string, inclusive = true): Validator<unknown> {
  return (value) => {
    const numericValue = toFiniteNumber(value, Number.NaN);
    return isFiniteNumber(numericValue) && (inclusive ? numericValue <= max : numericValue < max) ? null : message;
  };
}

export function createRangeValidator(message: string, min: number, max: number): Validator<unknown> {
  return (value) => (isNumberInRange(value, min, max) ? null : message);
}

export function createIntegerRangeValidator(message: string, min: number, max: number, inclusive = true): Validator<unknown> {
  return (value) => (isIntegerInRange(value, min, max, inclusive) ? null : message);
}

export function createPortValidator(message: string): Validator<unknown> {
  return (value) => (isPort(value) ? null : message);
}

export function createHttpUrlValidator(message: string): Validator<string> {
  return (value) => (isValidHttpUrl(value) ? null : message);
}

export function createJsonTextValidator(message: string): Validator<string> {
  return (value) => (isJsonText(value) ? null : message);
}

export function createJsonObjectTextValidator(message: string): Validator<string> {
  return (value) => (isJsonObjectText(value) ? null : message);
}

export function createJsonArrayTextValidator(message: string): Validator<string> {
  return (value) => (isJsonArrayText(value) ? null : message);
}

export function createFileNameValidator(message: string): Validator<string> {
  return (value) => (isValidFileName(value) ? null : message);
}

export function createSafeRelativePathValidator(message: string): Validator<string> {
  return (value) => (isSafeRelativePath(value) ? null : message);
}

export function createOneOfValidator<T>(options: readonly T[], message: string): Validator<T> {
  return (value) => (options.includes(value) ? null : message);
}

export function isSafeRelativePath(value: string): boolean {
  return isSafeRelativePathText(value);
}
