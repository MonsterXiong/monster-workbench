export type CsvValue = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
  key: string;
  header?: string;
  getValue?: (item: T) => CsvValue;
}

export function escapeCsvCell(value: CsvValue): string {
  const text = value === undefined || value === null ? "" : String(value);

  if (!/[",\r\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function stringifyCsvRows(rows: readonly (readonly CsvValue[])[]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function toCsvRows<T>(items: readonly T[], columns: readonly CsvColumn<T>[]): CsvValue[][] {
  const headers = columns.map((column) => column.header ?? column.key);
  const rows = items.map((item) =>
    columns.map((column) => (column.getValue ? column.getValue(item) : (item as Record<string, CsvValue>)[column.key]))
  );

  return [headers, ...rows];
}

export function stringifyCsv<T>(items: readonly T[], columns: readonly CsvColumn<T>[]): string {
  return stringifyCsvRows(toCsvRows(items, columns));
}

export function parseCsvLine(line: string): string[] {
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

    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

export function parseCsv(text: string): string[][] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map(parseCsvLine);
}
