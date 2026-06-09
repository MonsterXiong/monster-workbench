import { createValidationResult, hasValidationErrors, runValidators } from "./result";
import type {
  FormatValidationResultsSummaryOptions,
  NamedValidationResult,
  NamedValidator,
  ValidationPlanReport,
  ValidationResultsDisplaySummary,
  ValidationResultsReport,
  ValidationResultsSummary,
  Validator,
} from "./types";

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
