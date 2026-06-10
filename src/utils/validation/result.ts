import type {
  FormatValidationErrorsOptions,
  ValidationResult,
  ValidationResultSummary,
  Validator,
} from "./types";

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

/** 内部核心工具方法。 */
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
