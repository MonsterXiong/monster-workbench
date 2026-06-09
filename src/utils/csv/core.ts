import type { CsvValue } from './types';

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
