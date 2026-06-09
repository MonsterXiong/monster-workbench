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

export interface CsvStringifyOptions extends CsvStringifyRowsOptions {
  includeHeader?: boolean;
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

export function stringifyCsvRow(row: CsvRow, delimiter = ","): string {
  const normalizedDelimiter = normalizeCsvDelimiter(delimiter);
  return row.map((cell) => escapeCsvCell(cell, normalizedDelimiter)).join(normalizedDelimiter);
}

export function stringifyCsvRows(rows: readonly CsvRow[], options: CsvStringifyRowsOptions = {}): string {
  const lineBreak = options.lineBreak ?? "\n";
  return rows.map((row) => stringifyCsvRow(row, options.delimiter)).join(lineBreak);
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

export function stringifyCsv<T>(items: readonly T[], columns: readonly CsvColumn<T>[], options: CsvStringifyOptions = {}): string {
  return stringifyCsvRows(toCsvRows(items, columns, options), options);
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
