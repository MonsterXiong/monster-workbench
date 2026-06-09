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
