import { isFiniteNumber, toFiniteNumber } from "../number";
import {
  isEmail,
  isIntegerInRange,
  isIpv4,
  isJsonArrayText,
  isJsonObjectText,
  isJsonText,
  isLengthBetween,
  isLocalhost,
  isMaxLength,
  isMinLength,
  isNumberInRange,
  isPort,
  isRequiredValue,
  isSafeRelativePath,
  isUuid,
  isValidFileName,
  isValidHttpUrl,
} from "./predicates";
import { getFirstValidationError, getValidationErrors } from "./result";
import type { Validator } from "./types";

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

/** 基于参数构建一个复杂的数据实例报告。 */
export function createRequiredValidator<T>(message: string): Validator<T> {
  return (value) => (isRequiredValue(value) ? null : message);
}

export function createRequiredIfValidator<T>(condition: (value: T) => boolean, message: string): Validator<T> {
  return (value) => (condition(value) ? createRequiredValidator<T>(message)(value) : null);
}

export function createPatternValidator(pattern: RegExp, message: string): Validator<string> {
  return (value) => (pattern.test(value) ? null : message);
}

/** 基于参数构建一个复杂的数据实例报告。 */
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
