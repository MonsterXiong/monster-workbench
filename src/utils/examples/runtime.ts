import {
  createAsyncBatchReport,
  createAsyncTaskReport,
  createAsyncTaskResult,
  formatAsyncBatchPlanSummary,
  formatSettledResultsSummary,
  getRemainingDelayMs,
  summarizeAsyncBatchPlan,
  summarizeRetryOptions,
  summarizeSettledResults,
  summarizeTimeoutResult,
} from "../async";
import {
  colorToCssWithAlpha,
  colorToHex,
  getContrastTextColor,
  lightenColor,
  mixHexColors,
  normalizeHexColor,
  summarizeColorContrast,
  summarizeColorPalette,
  summarizeColorValue,
} from "../color";
import {
  addDays,
  buildDatedFileName,
  enumerateDateRangeValues,
  formatCompactDateRange,
  formatDateOnly,
  formatDateRangeSummary,
  getDateRangePresetValue,
  getWeekdayLabels,
  summarizeDateList,
  summarizeDateRange,
  summarizeDateStatus,
} from "../date";

const settledResults: Array<PromiseSettledResult<string>> = [
  { status: "fulfilled", value: "loaded" },
  { status: "rejected", reason: new Error("timeout") },
  { status: "fulfilled", value: "cached" },
];

const batchPlan = summarizeAsyncBatchPlan(9, 4);
const settledSummary = summarizeSettledResults(settledResults);
const dateRange = { start: "2026-06-01", end: "2026-06-05" };

export const runtimeUtilityExamples = {
  retryOptions: summarizeRetryOptions({ retries: 3, delayMs: 250 }),
  remainingDelay: getRemainingDelayMs(1_000, 800, 1_350),
  timeoutSummary: summarizeTimeoutResult({ timedOut: true, value: null }),
  taskReport: createAsyncTaskReport(createAsyncTaskResult(false, undefined, new Error("failed")), 1_000, 1_240),
  batchPlan,
  batchPlanText: formatAsyncBatchPlanSummary(batchPlan, { includeConcurrency: true }),
  settledSummary,
  settledText: formatSettledResultsSummary(settledSummary, { includePercent: true }),
  batchReport: createAsyncBatchReport(settledResults, batchPlan, 1_000, 1_180),
  colorValue: summarizeColorValue("#2563eb"),
  colorContrast: summarizeColorContrast("#111827", "#ffffff"),
  colorPalette: summarizeColorPalette(["#2563eb", "#16a34a", "invalid"]),
  colorAlpha: colorToCssWithAlpha("#2563eb", 0.24),
  mixedColor: mixHexColors("#2563eb", "#16a34a", 0.35),
  lightenedColor: colorToHex(lightenColor("#2563eb", 12) ?? "#2563eb"),
  normalizedColor: normalizeHexColor("abc"),
  contrastText: getContrastTextColor("#f8fafc"),
  dateRange: summarizeDateRange(dateRange),
  dateRangeText: formatDateRangeSummary(summarizeDateRange(dateRange), { includeDuration: true }),
  compactDateRange: formatCompactDateRange(dateRange),
  preset: getDateRangePresetValue("last7Days", "2026-06-10"),
  dateStatus: summarizeDateStatus("2026-06-09", "2026-06-10"),
  dateList: summarizeDateList(["2026-06-10", "invalid", "2026-06-01"]),
  dateValues: enumerateDateRangeValues(dateRange),
  nextDay: formatDateOnly(addDays("2026-06-10", 1) ?? "invalid"),
  datedFileName: buildDatedFileName("report", "csv", "2026-06-10"),
  weekdays: getWeekdayLabels("zh-CN", { format: "short" }),
};

export const runtimeUtilityBoundaryCases = [
  {
    key: "async-timeout-result",
    title: "async timeout flag",
    input: "summarizeTimeoutResult({ timedOut: true, value: null })",
    expected: String(runtimeUtilityExamples.timeoutSummary.timedOut),
  },
  {
    key: "settled-partial",
    title: "settled results summary",
    input: "summarizeSettledResults([{ fulfilled }, { rejected }])",
    expected: `${runtimeUtilityExamples.settledSummary.fulfilledCount}/${runtimeUtilityExamples.settledSummary.totalCount}`,
  },
  {
    key: "invalid-color",
    title: "invalid color fallback",
    input: "summarizeColorValue('invalid')",
    expected: String(summarizeColorValue("invalid").valid),
  },
  {
    key: "color-normalized-short-hex",
    title: "short hex normalization",
    input: "normalizeHexColor('abc')",
    expected: runtimeUtilityExamples.normalizedColor ?? "",
  },
  {
    key: "date-invalid-list",
    title: "date list invalid count",
    input: "summarizeDateList(['2026-06-10', 'invalid'])",
    expected: String(runtimeUtilityExamples.dateList.invalidCount),
  },
  {
    key: "date-range-values",
    title: "enumerated date range",
    input: "enumerateDateRangeValues({ start, end })",
    expected: runtimeUtilityExamples.dateValues.join(", "),
  },
];
