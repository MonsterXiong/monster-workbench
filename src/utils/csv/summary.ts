import { isCsvFormulaLikeCell, normalizeCsvDelimiter, shouldQuoteCsvCell, stripCsvBom, toCsvCellText } from './core';
import { csvRowsToObjects, parseCsv, parseCsvObjects } from './parse';
import type { CsvAutoParseObjectsOptions, CsvAutoParseOptions, CsvCellSummary, CsvColumnSummary, CsvParseObjectsResult, CsvParseResult, CsvParseSummary, CsvRecord, CsvRecordSummary, CsvRowsSummary, CsvTableSummary, CsvValue } from './types';

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

/** 对一系列单元格的值类型分布进行直观摘要。 */
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

/** 快速分析已解析表格的行列与数据有效性。 */
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

/** 带有分隔符自动探测与行列预警机制的 CSV 解析。 */
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

/** 将首行视为表头，将 CSV 解析为包含对象的对象数组摘要。 */
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
