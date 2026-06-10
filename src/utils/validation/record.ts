import { createValidationResult, getFirstValidationError, getFirstValidationResultError, getValidationErrors } from "./result";
import type {
  FormatRecordValidationSummaryOptions,
  RecordValidationDisplaySummary,
  RecordValidationFieldSummary,
  RecordValidationFieldsSummary,
  RecordValidationResult,
  RecordValidationSchema,
  RecordValidationSchemaFieldsReport,
  RecordValidationSchemaReport,
  ValidationErrorCountMap,
  ValidationErrorEntry,
  ValidationErrorMap,
  ValidationSummary,
  Validator,
  ValidatorMap,
} from "./types";

/** 基于参数构建一个复杂的数据实例报告。 */
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

/** 基于参数构建一个复杂的数据实例报告。 */
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
