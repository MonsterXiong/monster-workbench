import {
  createSortControlsReport,
  sortByValue,
} from "../compare";
import {
  createErrorDisplayReport,
  createErrorDisplayReports,
  summarizeLogLines,
} from "../error";
import {
  createStatusSummaryItemsReport,
  createSummaryItemsReport,
  formatBytes,
  formatDuration,
  formatPercent,
  formatTemplateWithReport,
} from "../format";
import {
  partitionSearchQuery,
  rankSearchItemsWithSummary,
} from "../search";
import {
  createSelectionDisplaySummaryByKeys,
  createSelectionKeyReplacementReport,
  summarizeSelectionAvailability,
} from "../selection";
import {
  createEmailValidator,
  createRecordValidationSchema,
  createRecordValidationSchemaReport,
  createRequiredValidator,
  runValidators,
  type ValidatorMap,
} from "../validation";
import {
  parseBooleanWithReport,
  parseEnumListWithReport,
  parseIntegerWithReport,
  summarizeValueTypes,
} from "../value";

const items = [
  { id: "a", title: "Alpha report", status: "ready", size: 1280 },
  { id: "b", title: "Beta utils manual", status: "draft", size: 4096 },
  { id: "c", title: "Gamma playground", status: "ready", size: 2048 },
];

type ContactForm = {
  name: string;
  email: string;
};

type ContactFormRecord = Record<keyof ContactForm, string>;

const contactValidators: ValidatorMap<ContactFormRecord> = {
  name: [createRequiredValidator("name required")],
  email: [createRequiredValidator("email required"), createEmailValidator("email invalid")],
};

const validationSchema = createRecordValidationSchema<ContactFormRecord>(contactValidators, {
  name: "Name",
  email: "Email",
});

export const businessUtilityExamples = {
  sortedItems: sortByValue(items, (item) => item.size, "desc"),
  sortControls: createSortControlsReport({ key: "size", direction: "desc" }, ["title", "size", "status"], { clearOnDesc: true }),
  search: rankSearchItemsWithSummary(items, "utils", [(item) => item.title, (item) => item.status]),
  searchPartition: partitionSearchQuery(items, {
    keyword: "report",
    fields: [(item) => item.title],
    filters: [
      { value: "ready", matches: (item, value) => item.status === value },
    ],
  }),
  selection: createSelectionDisplaySummaryByKeys(["a", "b", "c"], ["a", "c"], { unit: "items" }),
  selectionAvailability: summarizeSelectionAvailability(["a", "b", "c"], ["a", "x"], ["b"]),
  selectionReplacement: createSelectionKeyReplacementReport(["a", "b"], [
    ["b", "c"],
    ["x", "z"],
  ]),
  validation: createRecordValidationSchemaReport({ name: "", email: "bad" }, validationSchema),
  requiredOnly: runValidators("", [createRequiredValidator("required")]),
  valueTypes: summarizeValueTypes([null, "", 0, false, [], {}, new Date("2026-06-10")]),
  parsedBoolean: parseBooleanWithReport("yes", false),
  parsedInteger: parseIntegerWithReport("42.8", 0),
  parsedEnumList: parseEnumListWithReport(["ready", "unknown"], ["ready", "draft"] as const, "draft"),
  errorReport: createErrorDisplayReport(createErrorWithCodeLike("Upload failed", "UPLOAD_FAILED")),
  errorReports: createErrorDisplayReports([new Error("Network failed"), "plain error"]),
  logSummary: summarizeLogLines(["[INFO] ready", "[WARN] slow", "[ERROR] failed"]),
  summaryItems: createSummaryItemsReport([
    { key: "count", label: "Count", value: items.length },
    { key: "size", label: "Size", value: formatBytes(7424) },
  ]),
  statusItems: createStatusSummaryItemsReport([
    { key: "ready", label: "Ready", value: 2, tone: "success", active: true },
    { key: "draft", label: "Draft", value: 1, tone: "warning", active: true },
  ]),
  percent: formatPercent(0.375),
  duration: formatDuration(93_000),
  template: formatTemplateWithReport("Hello {name}, {missing}", { name: "Codex" }),
};

function createErrorWithCodeLike(message: string, code: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

export const businessUtilityBoundaryCases = [
  {
    key: "missing-template",
    title: "template missing key",
    input: "formatTemplateWithReport('Hello {name}, {missing}')",
    expected: businessUtilityExamples.template.missingKeys.join(", "),
  },
  {
    key: "invalid-record",
    title: "record validation",
    input: "createRecordValidationSchemaReport({ name: '', email: 'bad' })",
    expected: String(businessUtilityExamples.validation.summary.errorCount),
  },
  {
    key: "unavailable-selection",
    title: "selection availability",
    input: "summarizeSelectionAvailability(['a','b'], ['a','x'], ['b'])",
    expected: businessUtilityExamples.selectionAvailability.unavailableSelectedKeys.join(", "),
  },
  {
    key: "enum-fallback",
    title: "enum list fallback",
    input: "parseEnumListWithReport(['ready', 'unknown'], ['ready', 'draft'])",
    expected: String(businessUtilityExamples.parsedEnumList.summary.fallbackUsedCount),
  },
];
