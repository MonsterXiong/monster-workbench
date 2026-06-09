import { getRecordValue } from "./object";

export type CsvValue = string | number | boolean | null | undefined;
export type CsvRow = readonly CsvValue[];

export interface CsvColumn<T> {
  key: string;
  header?: string;
  getValue?: (item: T) => CsvValue;
}

export interface CsvStringifyRowsOptions {
  delimiter?: string;
  lineBreak?: string;
}

export interface CsvSpreadsheetStringifyRowsOptions extends CsvStringifyRowsOptions {
  formulaPrefix?: string;
}

export interface NormalizeCsvRowsWidthOptions {
  width?: number;
  fillValue?: CsvValue;
  trimExtraCells?: boolean;
}

export interface CsvStringifyOptions extends CsvStringifyRowsOptions {
  includeHeader?: boolean;
}

export interface CsvSpreadsheetStringifyOptions extends CsvStringifyOptions {
  formulaPrefix?: string;
}

export interface CsvParseOptions {
  delimiter?: string;
  skipEmptyLines?: boolean;
  trimBom?: boolean;
}

export interface CsvHeaderOptions {
  trimHeaders?: boolean;
  emptyHeaderPrefix?: string;
}

export interface CsvRowsToObjectsOptions extends CsvHeaderOptions {
  headers?: readonly string[];
}

export interface CsvParseObjectsOptions extends CsvParseOptions, CsvRowsToObjectsOptions {}

export interface CsvAutoParseOptions extends Omit<CsvParseOptions, "delimiter"> {
  delimiters?: readonly string[];
  hasHeader?: boolean;
}

export interface CsvAutoParseObjectsOptions extends CsvAutoParseOptions, CsvRowsToObjectsOptions {}

export interface CsvRowsSummary {
  rowCount: number;
  columnCount: number;
  dataRowCount: number;
  headerCount: number;
  empty: boolean;
}

export interface CsvCellSummary {
  totalCellCount: number;
  nonEmptyCellCount: number;
  emptyCellCount: number;
  formulaLikeCellCount: number;
  quotedCellCount: number;
}

export interface CsvParseSummary extends CsvRowsSummary {
  delimiter: string;
  hasHeader: boolean;
}

export interface CsvParseResult {
  delimiter: string;
  rows: string[][];
  summary: CsvParseSummary;
}

export interface CsvParseObjectsResult extends CsvParseResult {
  records: CsvRecord[];
}

export interface CsvColumnSummary {
  index: number;
  header: string;
  values: string[];
  nonEmptyCount: number;
  emptyCount: number;
  uniqueCount: number;
}

export interface CsvTableSummary extends CsvRowsSummary {
  columns: CsvColumnSummary[];
  hasHeader: boolean;
}

export interface CsvRecordSummary {
  recordCount: number;
  fieldCount: number;
  empty: boolean;
  headers: string[];
  fieldCounts: Record<string, number>;
  emptyFieldCounts: Record<string, number>;
}

export type CsvRecord = Record<string, string>;

export function normalizeCsvDelimiter(delimiter = ","): string {
  return delimiter.charAt(0) || ",";
}

export function hasCsvBom(text: string): boolean {
  return text.charCodeAt(0) === 0xFEFF;
}

export function stripCsvBom(text: string): string {
  return hasCsvBom(text) ? text.slice(1) : text;
}

export function toCsvCellText(value: CsvValue): string {
  return value === undefined || value === null ? "" : String(value);
}

export function shouldQuoteCsvCell(value: string, delimiter = ","): boolean {
  return value.includes('"') || value.includes("\r") || value.includes("\n") || value.includes(normalizeCsvDelimiter(delimiter));
}

export function escapeCsvCell(value: CsvValue, delimiter = ","): string {
  const text = toCsvCellText(value);

  if (!shouldQuoteCsvCell(text, delimiter)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function isCsvFormulaLikeCell(value: CsvValue): boolean {
  return /^[=+\-@]/.test(toCsvCellText(value).trimStart());
}

export function escapeCsvFormulaCell(value: CsvValue, prefix = "'"): string {
  const text = toCsvCellText(value);
  return isCsvFormulaLikeCell(text) ? `${prefix}${text}` : text;
}

export function escapeCsvSpreadsheetCell(value: CsvValue, delimiter = ",", formulaPrefix = "'"): string {
  return escapeCsvCell(escapeCsvFormulaCell(value, formulaPrefix), delimiter);
}

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

function normalizeCsvParseOptions(options: string | CsvParseOptions = ","): Required<CsvParseOptions> {
  if (typeof options === "string") {
    return {
      delimiter: normalizeCsvDelimiter(options),
      skipEmptyLines: true,
      trimBom: true,
    };
  }

  return {
    delimiter: normalizeCsvDelimiter(options.delimiter),
    skipEmptyLines: options.skipEmptyLines ?? true,
    trimBom: options.trimBom ?? true,
  };
}

export function parseCsvLine(line: string, delimiter = ","): string[] {
  const normalizedDelimiter = normalizeCsvDelimiter(delimiter);
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === normalizedDelimiter && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

export function parseCsv(text: string, delimiter?: string): string[][];
export function parseCsv(text: string, options?: CsvParseOptions): string[][];
export function parseCsv(text: string, options: string | CsvParseOptions = ","): string[][] {
  const parseOptions = normalizeCsvParseOptions(options);
  const normalizedText = parseOptions.trimBom ? stripCsvBom(text) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let quoted = false;
  let rowStarted = false;

  const pushCell = () => {
    row.push(current);
    current = "";
  };

  const pushRow = () => {
    const nextRow = [...row, current];
    const isBlankLine = !rowStarted && row.length === 0 && current.length === 0;

    if (!parseOptions.skipEmptyLines || !isBlankLine) {
      rows.push(nextRow);
    }

    row = [];
    current = "";
    rowStarted = false;
  };

  for (let index = 0; index < normalizedText.length; index += 1) {
    const char = normalizedText[index];
    const nextChar = normalizedText[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      current += '"';
      rowStarted = true;
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      rowStarted = true;
      continue;
    }

    if (char === parseOptions.delimiter && !quoted) {
      rowStarted = true;
      pushCell();
      continue;
    }

    if ((char === "\r" || char === "\n") && !quoted) {
      pushRow();

      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      continue;
    }

    current += char;
    rowStarted = true;
  }

  if (rowStarted || row.length > 0 || current.length > 0) {
    pushRow();
  }

  return rows;
}

export function parseCsvRows(text: string, options: string | CsvParseOptions = ","): string[][] {
  return typeof options === "string" ? parseCsv(text, options) : parseCsv(text, options);
}

export function parseTsv(text: string, options: Omit<CsvParseOptions, "delimiter"> = {}): string[][] {
  return parseCsv(text, { ...options, delimiter: "\t" });
}

export function normalizeCsvHeader(header: string, index: number, options: CsvHeaderOptions = {}): string {
  const trimHeaders = options.trimHeaders ?? true;
  const emptyHeaderPrefix = options.emptyHeaderPrefix ?? "column";
  const normalizedHeader = trimHeaders ? header.trim() : header;
  return normalizedHeader || `${emptyHeaderPrefix}${index + 1}`;
}

export function normalizeCsvHeaders(headers: readonly string[], options: CsvHeaderOptions = {}): string[] {
  const counts = new Map<string, number>();

  return headers.map((header, index) => {
    const normalizedHeader = normalizeCsvHeader(header, index, options);
    const count = counts.get(normalizedHeader) ?? 0;
    counts.set(normalizedHeader, count + 1);
    return count === 0 ? normalizedHeader : `${normalizedHeader}_${count + 1}`;
  });
}

export function csvRowsToObjects(rows: readonly string[][], options: CsvRowsToObjectsOptions = {}): CsvRecord[] {
  const headerRow = options.headers ? Array.from(options.headers) : rows[0] ?? [];
  const headers = normalizeCsvHeaders(headerRow, options);
  const dataRows = options.headers ? rows : rows.slice(1);

  return dataRows.map((row) => {
    const record: CsvRecord = {};

    headers.forEach((header, index) => {
      record[header] = row[index] ?? "";
    });

    return record;
  });
}

export function parseCsvObjects(text: string, options: CsvParseObjectsOptions = {}): CsvRecord[] {
  const rows = parseCsv(text, options);
  return csvRowsToObjects(rows, options);
}

export function parseCsvRecords(text: string, options: CsvParseObjectsOptions = {}): CsvRecord[] {
  return parseCsvObjects(text, options);
}

export function parseTsvObjects(text: string, options: Omit<CsvParseObjectsOptions, "delimiter"> = {}): CsvRecord[] {
  return parseCsvObjects(text, { ...options, delimiter: "\t" });
}

export function parseTsvRecords(text: string, options: Omit<CsvParseObjectsOptions, "delimiter"> = {}): CsvRecord[] {
  return parseTsvObjects(text, options);
}

export function summarizeCsvRows(rows: readonly (readonly string[])[], hasHeader = true): CsvRowsSummary {
  const rowCount = rows.length;
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const headerCount = hasHeader && rowCount > 0 ? rows[0].length : 0;

  return {
    rowCount,
    columnCount,
    dataRowCount: hasHeader ? Math.max(0, rowCount - 1) : rowCount,
    headerCount,
    empty: rowCount === 0,
  };
}

export function summarizeCsvCells(rows: readonly (readonly CsvValue[])[], delimiter = ","): CsvCellSummary {
  const cells = rows.flatMap((row) => Array.from(row));
  const texts = cells.map(toCsvCellText);

  return {
    totalCellCount: cells.length,
    nonEmptyCellCount: texts.filter((value) => value.trim().length > 0).length,
    emptyCellCount: texts.filter((value) => value.trim().length === 0).length,
    formulaLikeCellCount: cells.filter(isCsvFormulaLikeCell).length,
    quotedCellCount: texts.filter((value) => shouldQuoteCsvCell(value, delimiter)).length,
  };
}

export function getCsvColumnValues(
  rows: readonly (readonly string[])[],
  columnIndex: number,
  hasHeader = true
): string[] {
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return dataRows.map((row) => row[columnIndex] ?? "");
}

export function summarizeCsvColumn(
  rows: readonly (readonly string[])[],
  columnIndex: number,
  hasHeader = true
): CsvColumnSummary {
  const header = hasHeader ? rows[0]?.[columnIndex] ?? "" : "";
  const values = getCsvColumnValues(rows, columnIndex, hasHeader);
  const nonEmptyValues = values.filter((value) => value.trim().length > 0);

  return {
    index: columnIndex,
    header,
    values,
    nonEmptyCount: nonEmptyValues.length,
    emptyCount: values.length - nonEmptyValues.length,
    uniqueCount: new Set(nonEmptyValues).size,
  };
}

export function summarizeCsvTable(rows: readonly (readonly string[])[], hasHeader = true): CsvTableSummary {
  const summary = summarizeCsvRows(rows, hasHeader);

  return {
    ...summary,
    hasHeader,
    columns: Array.from({ length: summary.columnCount }, (_, index) => summarizeCsvColumn(rows, index, hasHeader)),
  };
}

export function summarizeCsvRecords(records: readonly CsvRecord[]): CsvRecordSummary {
  const headers = Array.from(new Set(records.flatMap((record) => Object.keys(record))));
  const fieldCounts: Record<string, number> = {};
  const emptyFieldCounts: Record<string, number> = {};

  headers.forEach((header) => {
    fieldCounts[header] = 0;
    emptyFieldCounts[header] = 0;
  });

  records.forEach((record) => {
    headers.forEach((header) => {
      const value = record[header] ?? "";
      fieldCounts[header] += value.trim().length > 0 ? 1 : 0;
      emptyFieldCounts[header] += value.trim().length > 0 ? 0 : 1;
    });
  });

  return {
    recordCount: records.length,
    fieldCount: headers.length,
    empty: records.length === 0,
    headers,
    fieldCounts,
    emptyFieldCounts,
  };
}

export function summarizeParsedCsvRows(
  rows: readonly (readonly string[])[],
  delimiter = ",",
  hasHeader = true
): CsvParseSummary {
  return {
    ...summarizeCsvRows(rows, hasHeader),
    delimiter: normalizeCsvDelimiter(delimiter),
    hasHeader,
  };
}

function countDelimiterOutsideQuotes(text: string, delimiter: string): number {
  let count = 0;
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      count += 1;
    }
  }

  return count;
}

export function detectCsvDelimiter(text: string, candidates: readonly string[] = [",", ";", "\t", "|"]): string {
  const sample = stripCsvBom(text).split(/\r?\n/).slice(0, 10).join("\n");
  const normalizedCandidates = candidates.map(normalizeCsvDelimiter).filter((delimiter) => delimiter.length > 0);

  if (normalizedCandidates.length === 0) {
    return ",";
  }

  return normalizedCandidates.reduce(
    (best, delimiter) => {
      const count = countDelimiterOutsideQuotes(sample, delimiter);
      return count > best.count ? { delimiter, count } : best;
    },
    { delimiter: normalizedCandidates[0], count: -1 }
  ).delimiter;
}

export function parseCsvAuto(text: string, options: CsvAutoParseOptions = {}): string[][] {
  const delimiter = detectCsvDelimiter(text, options.delimiters);
  return parseCsv(text, {
    ...options,
    delimiter,
  });
}

export function parseCsvAutoWithSummary(text: string, options: CsvAutoParseOptions = {}): CsvParseResult {
  const delimiter = detectCsvDelimiter(text, options.delimiters);
  const rows = parseCsv(text, {
    ...options,
    delimiter,
  });

  return {
    delimiter,
    rows,
    summary: summarizeParsedCsvRows(rows, delimiter, options.hasHeader ?? true),
  };
}

export function parseCsvObjectsAuto(text: string, options: CsvAutoParseObjectsOptions = {}): CsvRecord[] {
  const delimiter = detectCsvDelimiter(text, options.delimiters);
  return parseCsvObjects(text, {
    ...options,
    delimiter,
  });
}

export function parseCsvObjectsAutoWithSummary(
  text: string,
  options: CsvAutoParseObjectsOptions = {}
): CsvParseObjectsResult {
  const delimiter = detectCsvDelimiter(text, options.delimiters);
  const rows = parseCsv(text, {
    ...options,
    delimiter,
  });
  const records = csvRowsToObjects(rows, options);
  const hasHeader = options.hasHeader ?? !options.headers;

  return {
    delimiter,
    rows,
    records,
    summary: summarizeParsedCsvRows(rows, delimiter, hasHeader),
  };
}

export function parseCsvRecordsAuto(text: string, options: CsvAutoParseObjectsOptions = {}): CsvRecord[] {
  return parseCsvObjectsAuto(text, options);
}

export function parseCsvRecordsAutoWithSummary(
  text: string,
  options: CsvAutoParseObjectsOptions = {}
): CsvParseObjectsResult {
  return parseCsvObjectsAutoWithSummary(text, options);
}
