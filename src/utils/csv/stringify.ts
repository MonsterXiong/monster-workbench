import { escapeCsvCell, escapeCsvSpreadsheetCell, normalizeCsvDelimiter } from './core';
import { getRecordValue } from '../object';
import type { CsvColumn, CsvRow, CsvSpreadsheetStringifyOptions, CsvSpreadsheetStringifyRowsOptions, CsvStringifyOptions, CsvStringifyRowsOptions, CsvValue, NormalizeCsvRowsWidthOptions } from './types';

export function stringifyCsvRow(row: CsvRow, delimiter = ","): string {
  const normalizedDelimiter = normalizeCsvDelimiter(delimiter);
  return row.map((cell) => escapeCsvCell(cell, normalizedDelimiter)).join(normalizedDelimiter);
}

export function stringifyCsvRows(rows: readonly CsvRow[], options: CsvStringifyRowsOptions = {}): string {
  const lineBreak = options.lineBreak ?? "\n";
  return rows.map((row) => stringifyCsvRow(row, options.delimiter)).join(lineBreak);
}

export function stringifySpreadsheetCsvRow(
  row: CsvRow,
  delimiter = ",",
  formulaPrefix = "'"
): string {
  const normalizedDelimiter = normalizeCsvDelimiter(delimiter);
  return row.map((cell) => escapeCsvSpreadsheetCell(cell, normalizedDelimiter, formulaPrefix)).join(normalizedDelimiter);
}

export function stringifySpreadsheetCsvRows(
  rows: readonly CsvRow[],
  options: CsvSpreadsheetStringifyRowsOptions = {}
): string {
  const lineBreak = options.lineBreak ?? "\n";
  return rows
    .map((row) => stringifySpreadsheetCsvRow(row, options.delimiter, options.formulaPrefix))
    .join(lineBreak);
}

export function getCsvColumnHeader<T>(column: CsvColumn<T>): string {
  return column.header ?? column.key;
}

export function getCsvColumnValue<T>(item: T, column: CsvColumn<T>): CsvValue {
  return column.getValue ? column.getValue(item) : getRecordValue<CsvValue>(item, column.key, "");
}

export function toCsvHeaderRow<T>(columns: readonly CsvColumn<T>[]): string[] {
  return columns.map(getCsvColumnHeader);
}

export function toCsvDataRows<T>(items: readonly T[], columns: readonly CsvColumn<T>[]): CsvValue[][] {
  return items.map((item) => columns.map((column) => getCsvColumnValue(item, column)));
}

export function toCsvRows<T>(items: readonly T[], columns: readonly CsvColumn<T>[], options: CsvStringifyOptions = {}): CsvValue[][] {
  const includeHeader = options.includeHeader ?? true;
  const rows = toCsvDataRows(items, columns);
  return includeHeader ? [toCsvHeaderRow(columns), ...rows] : rows;
}

export function normalizeCsvRowsWidth(
  rows: readonly CsvRow[],
  options: NormalizeCsvRowsWidthOptions = {}
): CsvValue[][] {
  const width = options.width ?? Math.max(0, ...rows.map((row) => row.length));
  const fillValue = options.fillValue ?? "";

  return rows.map((row) => {
    const cells = options.trimExtraCells ?? true ? row.slice(0, width) : [...row];
    return cells.length >= width
      ? [...cells]
      : [...cells, ...Array.from({ length: width - cells.length }, () => fillValue)];
  });
}

export function stringifyCsv<T>(items: readonly T[], columns: readonly CsvColumn<T>[], options: CsvStringifyOptions = {}): string {
  return stringifyCsvRows(toCsvRows(items, columns, options), options);
}

export function stringifySpreadsheetCsv<T>(
  items: readonly T[],
  columns: readonly CsvColumn<T>[],
  options: CsvSpreadsheetStringifyOptions = {}
): string {
  return stringifySpreadsheetCsvRows(toCsvRows(items, columns, options), options);
}

export function createCsvColumnsFromHeaders<T = Record<string, unknown>>(headers: readonly string[]): Array<CsvColumn<T>> {
  return headers.map((header) => ({ key: header, header }));
}

export function stringifyTsvRows(rows: readonly CsvRow[], options: Omit<CsvStringifyRowsOptions, "delimiter"> = {}): string {
  return stringifyCsvRows(rows, { ...options, delimiter: "\t" });
}

export function stringifyTsv<T>(items: readonly T[], columns: readonly CsvColumn<T>[], options: Omit<CsvStringifyOptions, "delimiter"> = {}): string {
  return stringifyCsv(items, columns, { ...options, delimiter: "\t" });
}
