import { normalizeCsvDelimiter, stripCsvBom } from './core';
import type { CsvHeaderOptions, CsvParseObjectsOptions, CsvParseOptions, CsvRecord, CsvRowsToObjectsOptions } from './types';

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
