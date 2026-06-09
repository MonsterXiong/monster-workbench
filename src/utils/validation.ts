import { isBetween, isFiniteNumber, toFiniteNumber } from "./number";
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

export interface RecordValidationResult<T extends Record<string, unknown>> extends ValidationResult {
  fields: ValidationErrorMap<T>;
}

const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IPV4_REGEXP = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

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

export function runValidatorsUntilFirst<T>(value: T, validators: readonly Validator<T>[]): ValidationResult {
  const error = getFirstValidationError(value, validators);
  return createValidationResult(error ? [error] : []);
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

export function createRequiredValidator<T>(message: string): Validator<T> {
  return (value) => (isRequiredValue(value) ? null : message);
}

export function createPatternValidator(pattern: RegExp, message: string): Validator<string> {
  return (value) => (pattern.test(value) ? null : message);
}

export function createEmailValidator(message: string): Validator<string> {
  return (value) => (isEmail(value) ? null : message);
}

export function createMinLengthValidator<T extends string | readonly unknown[]>(min: number, message: string): Validator<T> {
  return (value) => (isMinLength(value, min) ? null : message);
}

export function createMaxLengthValidator<T extends string | readonly unknown[]>(max: number, message: string): Validator<T> {
  return (value) => (isMaxLength(value, max) ? null : message);
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
