import {
  parseCsv,
  parseCsvAutoWithSummary,
  parseCsvObjectsAutoWithSummary,
  stringifySpreadsheetCsvRows,
  summarizeCsvCells,
  summarizeCsvTable,
} from "../csv";

export const csvMultilineQuotedText = [
  "姓名,备注,路径",
  "\"张三\",\"第一行",
  "第二行，包含逗号\",\"C:\\\\工作区\\\\报表.csv\"",
  "\"李四\",\"包含 \"\"双引号\"\" 的备注\",\"D:\\\\数据\\\\中文目录\\\\明细.csv\"",
].join("\r\n");

export const csvSemicolonText = [
  "name;score;note",
  "alpha;12;ok",
  "beta;18;\"line one",
  "line two\"",
].join("\n");

export const csvUtilityExamples = {
  multilineRows: parseCsv(csvMultilineQuotedText),
  multilineTable: summarizeCsvTable(parseCsv(csvMultilineQuotedText), true),
  multilineCells: summarizeCsvCells(parseCsv(csvMultilineQuotedText)),
  autoParse: parseCsvAutoWithSummary(csvSemicolonText),
  autoRecords: parseCsvObjectsAutoWithSummary(csvSemicolonText),
  spreadsheetSafeText: stringifySpreadsheetCsvRows([
    ["名称", "公式风险", "说明"],
    ["中文路径", "=SUM(A1:A2)", "C:\\工作区\\报表.csv"],
    ["多行内容", "+cmd", "第一行\n第二行"],
  ]),
};

export const csvUtilityBoundaryCases = [
  {
    key: "multiline-quotes",
    title: "CSV 多行引号",
    input: "字段值中包含 CRLF、逗号和双引号",
    expected: "parseCsv 会在 quoted 状态内保留换行，不拆成额外记录。",
  },
  {
    key: "chinese-windows-path",
    title: "中文与 Windows 路径",
    input: "C:\\工作区\\报表.csv / D:\\数据\\中文目录\\明细.csv",
    expected: "路径文本按普通 cell 保留，不做路径归一化或转义破坏。",
  },
  {
    key: "auto-delimiter",
    title: "自动分隔符",
    input: "分号 CSV",
    expected: "detectCsvDelimiter 会忽略引号内分隔符，并选择命中最多的候选 delimiter。",
  },
  {
    key: "formula-escape",
    title: "表格公式注入防护",
    input: "=SUM(A1:A2)、+cmd",
    expected: "stringifySpreadsheetCsvRows 会给公式样式 cell 增加前缀。",
  },
];
