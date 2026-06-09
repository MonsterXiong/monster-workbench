import { arrayUtilityBoundaryCases, arrayUtilityExamples } from "../../utils/examples/array";
import { browserUtilityBoundaryCases, browserUtilityExamples } from "../../utils/examples/browser";
import { businessUtilityBoundaryCases, businessUtilityExamples } from "../../utils/examples/business";
import { csvUtilityBoundaryCases, csvUtilityExamples } from "../../utils/examples/csv";
import { dataUtilityBoundaryCases, dataUtilityExamples } from "../../utils/examples/data";
import { jsonUtilityBoundaryCases, jsonUtilityExamples } from "../../utils/examples/json";
import { numberUtilityBoundaryCases, numberUtilityExamples } from "../../utils/examples/number";
import { objectUtilityBoundaryCases, objectUtilityExamples } from "../../utils/examples/object";
import { pathUtilityBoundaryCases, pathUtilityExamples } from "../../utils/examples/path";
import { runtimeUtilityBoundaryCases, runtimeUtilityExamples } from "../../utils/examples/runtime";
import { textUtilityBoundaryCases, textUtilityExamples } from "../../utils/examples/text";
import { treeUtilityBoundaryCases, treeUtilityExamples } from "../../utils/examples/tree";

export type UtilitySplitStatus = "split" | "single";

export interface UtilityExampleRow {
  label: string;
  expression: string;
  value: unknown;
}

export interface UtilityBoundaryCase {
  key: string;
  title: string;
  input: string;
  expected: string;
}

export interface UtilityDocEntry {
  key: string;
  title: string;
  group: string;
  importPath: string;
  sourceFiles: string[];
  splitStatus: UtilitySplitStatus;
  description: string;
  functions: string[];
  snippets: string[];
  examples: UtilityExampleRow[];
  boundaryCases: UtilityBoundaryCase[];
}

const utilityGroups = ["集合结构", "运行展示", "文本输入", "数据资源", "浏览器能力", "业务通用"] as const;

export const utilityDocGroups = [...utilityGroups];

function files(name: string, split = false): string[] {
  return split ? [`src/utils/${name}.ts`, `src/utils/${name}/index.ts`] : [`src/utils/${name}.ts`];
}

function splitFiles(name: string, modules: readonly string[]): string[] {
  return [`src/utils/${name}.ts`, ...modules.map((moduleName) => `src/utils/${name}/${moduleName}.ts`)];
}

function doc(entry: UtilityDocEntry): UtilityDocEntry {
  return entry;
}

export const utilityDocs: UtilityDocEntry[] = [
  doc({
    key: "array",
    title: "array 数组工具",
    group: "集合结构",
    importPath: "src/utils/array",
    sourceFiles: files("array", true),
    splitStatus: "split",
    description: "数组去重、分组、分页、过滤、排序、索引 diff 和 keyed diff。",
    functions: ["uniqueBy", "groupByEntries", "paginateArrayWithSummary", "diffArraysByIndex", "diffArraysByKeyChanges", "createArrayListViewReport"],
    snippets: ["uniqueBy(tasks, (item) => item.owner)", "createArrayListViewReport(tasks, { filters, sortRules, page: 1, pageSize: 20 })"],
    examples: [
      { label: "去重 owner", expression: "uniqueBy(tasks, item => item.owner)", value: arrayUtilityExamples.uniqueOwners },
      { label: "keyed diff", expression: "diffArraysByKeyChanges(before, after, item => item.id)", value: arrayUtilityExamples.keyedDiff },
      { label: "列表视图", expression: "createArrayListViewReport(tasks, options)", value: arrayUtilityExamples.listView.summary },
    ],
    boundaryCases: arrayUtilityBoundaryCases,
  }),
  doc({
    key: "async",
    title: "async 异步工具",
    group: "运行展示",
    importPath: "src/utils/async",
    sourceFiles: files("async"),
    splitStatus: "single",
    description: "异步重试、延迟、超时、批处理计划、任务结果和 settled result 摘要。",
    functions: ["summarizeRetryOptions", "summarizeAsyncBatchPlan", "createAsyncTaskReport", "createAsyncBatchReport", "summarizeSettledResults"],
    snippets: ["summarizeAsyncBatchPlan(total, concurrency)", "createAsyncBatchReport(results, plan, startedAt, finishedAt)"],
    examples: [
      { label: "重试配置", expression: "summarizeRetryOptions({ retries: 3, delayMs: 250 })", value: runtimeUtilityExamples.retryOptions },
      { label: "批处理计划", expression: "summarizeAsyncBatchPlan(9, 4)", value: runtimeUtilityExamples.batchPlan },
      { label: "settled 摘要", expression: "summarizeSettledResults(results)", value: runtimeUtilityExamples.settledSummary },
    ],
    boundaryCases: runtimeUtilityBoundaryCases.filter((item) => item.key.includes("settled")),
  }),
  doc({
    key: "browser",
    title: "browser 浏览器环境工具",
    group: "浏览器能力",
    importPath: "src/utils/browser",
    sourceFiles: files("browser"),
    splitStatus: "single",
    description: "浏览器环境、视口断点、媒体查询、能力探测和 location 快照。",
    functions: ["summarizeBrowserEnvironment", "summarizeBrowserCapabilities", "summarizeViewportBreakpoints", "summarizeMediaQueries", "getLocationSnapshot"],
    snippets: ["summarizeBrowserEnvironment(window, navigator)", "summarizeViewportBreakpoints(breakpoints, window)"],
    examples: [
      { label: "环境摘要", expression: "summarizeBrowserEnvironment(mockWindow, mockNavigator)", value: browserUtilityExamples.environment },
      { label: "能力探测", expression: "summarizeBrowserCapabilities(mockWindow, mockNavigator)", value: browserUtilityExamples.capabilities },
      { label: "断点摘要", expression: "summarizeViewportBreakpoints(breakpoints, mockWindow)", value: browserUtilityExamples.breakpoints },
    ],
    boundaryCases: browserUtilityBoundaryCases.filter((item) => item.key.includes("browser") || item.key.includes("breakpoint")),
  }),
  doc({
    key: "clipboard",
    title: "clipboard 剪贴板工具",
    group: "浏览器能力",
    importPath: "src/utils/clipboard",
    sourceFiles: files("clipboard"),
    splitStatus: "single",
    description: "剪贴板复制结果、降级来源、错误报告和展示文本。",
    functions: ["copyToClipboard", "createClipboardCopyResult", "summarizeClipboardCopyResult", "createClipboardCopyReport", "formatClipboardCopyResult"],
    snippets: ["createClipboardCopyResult(true, 'clipboard-api', text)", "createClipboardCopyReport(result)"],
    examples: [
      { label: "复制结果", expression: "createClipboardCopyResult(true, 'clipboard-api', 'hello')", value: browserUtilityExamples.clipboardResult },
      { label: "失败报告", expression: "createClipboardCopyReport(failedResult)", value: browserUtilityExamples.clipboardReport },
    ],
    boundaryCases: browserUtilityBoundaryCases.filter((item) => item.key.includes("clipboard")),
  }),
  doc({
    key: "color",
    title: "color 颜色工具",
    group: "运行展示",
    importPath: "src/utils/color",
    sourceFiles: files("color"),
    splitStatus: "single",
    description: "颜色标准化、混色、透明度、调亮、对比度和调色板摘要。",
    functions: ["normalizeHexColor", "summarizeColorValue", "summarizeColorContrast", "summarizeColorPalette", "mixHexColors", "getContrastTextColor"],
    snippets: ["getContrastTextColor(background)", "summarizeColorPalette(['#2563eb', '#16a34a'])"],
    examples: [
      { label: "颜色摘要", expression: "summarizeColorValue('#2563eb')", value: runtimeUtilityExamples.colorValue },
      { label: "对比度", expression: "summarizeColorContrast('#111827', '#ffffff')", value: runtimeUtilityExamples.colorContrast },
      { label: "调色板", expression: "summarizeColorPalette(colors)", value: runtimeUtilityExamples.colorPalette },
    ],
    boundaryCases: runtimeUtilityBoundaryCases.filter((item) => item.key.includes("color")),
  }),
  doc({
    key: "compare",
    title: "compare 比较与排序工具",
    group: "业务通用",
    importPath: "src/utils/compare",
    sourceFiles: files("compare"),
    splitStatus: "single",
    description: "值比较、稳定排序、排序控件状态和可空值排序策略。",
    functions: ["compareValues", "sortByValue", "toggleSortDirection", "createSortControlsReport"],
    snippets: ["sortByValue(items, (item) => item.size, 'desc')", "createSortControlsReport(current, allowedKeys)"],
    examples: [
      { label: "按大小排序", expression: "sortByValue(items, item => item.size, 'desc')", value: businessUtilityExamples.sortedItems },
      { label: "排序控件报告", expression: "createSortControlsReport({ key: 'size', direction: 'desc' }, keys)", value: businessUtilityExamples.sortControls },
    ],
    boundaryCases: businessUtilityBoundaryCases.filter((item) => item.key.includes("enum")),
  }),
  doc({
    key: "csv",
    title: "csv 表格文本工具",
    group: "数据资源",
    importPath: "src/utils/csv",
    sourceFiles: files("csv", true),
    splitStatus: "split",
    description: "CSV/TSV 解析、自动分隔符、对象化、表格摘要和公式注入防护导出。",
    functions: ["parseCsv", "parseCsvAutoWithSummary", "parseCsvObjectsAutoWithSummary", "summarizeCsvTable", "summarizeCsvCells", "stringifySpreadsheetCsvRows"],
    snippets: ["parseCsv(text)", "parseCsvObjectsAutoWithSummary(text)"],
    examples: [
      { label: "多行引号表格", expression: "summarizeCsvTable(parseCsv(text), true)", value: csvUtilityExamples.multilineTable },
      { label: "自动分隔符", expression: "parseCsvAutoWithSummary(semicolonText)", value: csvUtilityExamples.autoParse.summary },
      { label: "安全导出", expression: "stringifySpreadsheetCsvRows(rows)", value: csvUtilityExamples.spreadsheetSafeText },
    ],
    boundaryCases: csvUtilityBoundaryCases,
  }),
  doc({
    key: "date",
    title: "date 日期工具",
    group: "运行展示",
    importPath: "src/utils/date",
    sourceFiles: files("date", true),
    splitStatus: "split",
    description: "日期格式化、范围摘要、预设区间、日期列表、状态判断和带日期文件名。",
    functions: ["formatDateOnly", "summarizeDateRange", "formatDateRangeSummary", "getDateRangePresetValue", "enumerateDateRangeValues", "summarizeDateStatus"],
    snippets: ["summarizeDateRange({ start, end })", "enumerateDateRangeValues({ start, end })"],
    examples: [
      { label: "日期范围", expression: "summarizeDateRange({ start, end })", value: runtimeUtilityExamples.dateRange },
      { label: "最近 7 天", expression: "getDateRangePresetValue('last7Days', '2026-06-10')", value: runtimeUtilityExamples.preset },
      { label: "日期枚举", expression: "enumerateDateRangeValues(range)", value: runtimeUtilityExamples.dateValues },
    ],
    boundaryCases: runtimeUtilityBoundaryCases.filter((item) => item.key.includes("date")),
  }),
  doc({
    key: "dom",
    title: "dom DOM 工具",
    group: "浏览器能力",
    importPath: "src/utils/dom",
    sourceFiles: files("dom"),
    splitStatus: "single",
    description: "DOM 事件清理、可见区域、焦点和元素尺寸相关工具。",
    functions: ["addDomEventListener", "mergeDomEventCleanups", "summarizeRectInViewport", "isElementVisibleInViewport"],
    snippets: ["addDomEventListener(window, 'resize', handler)", "summarizeRectInViewport(element.getBoundingClientRect(), window)"],
    examples: [
      { label: "矩形可见性", expression: "summarizeRectInViewport(rect, mockWindow)", value: browserUtilityExamples.rect },
    ],
    boundaryCases: browserUtilityBoundaryCases.filter((item) => item.key.includes("rect")),
  }),
  doc({
    key: "encoding",
    title: "encoding 编码工具",
    group: "文本输入",
    importPath: "src/utils/encoding",
    sourceFiles: files("encoding"),
    splitStatus: "single",
    description: "Base64 安全编解码、Data URL 创建、解析和编码文本摘要。",
    functions: ["safeDecodeBase64Utf8", "createDataUrl", "summarizeDataUrl", "summarizeEncodedText"],
    snippets: ["safeDecodeBase64Utf8(input, { fallback: '' })", "summarizeDataUrl(createDataUrl(text, 'text/plain', 'text'))"],
    examples: [
      { label: "编码摘要", expression: "summarizeEncodedText('5Lit5paH')", value: textUtilityExamples.encodedText },
      { label: "安全解码", expression: "safeDecodeBase64Utf8(value, { fallback })", value: textUtilityExamples.decodedBase64 },
      { label: "Data URL", expression: "summarizeDataUrl(dataUrl)", value: textUtilityExamples.dataUrl },
    ],
    boundaryCases: textUtilityBoundaryCases.filter((item) => item.key.includes("base64")),
  }),
  doc({
    key: "error",
    title: "error 错误展示工具",
    group: "业务通用",
    importPath: "src/utils/error",
    sourceFiles: files("error"),
    splitStatus: "single",
    description: "错误消息、错误码、展示报告、多错误列表和日志行摘要。",
    functions: ["getErrorMessage", "createErrorDisplayReport", "createErrorDisplayReports", "summarizeLogLines"],
    snippets: ["getErrorMessage(err, fallback)", "createErrorDisplayReport(err)"],
    examples: [
      { label: "错误报告", expression: "createErrorDisplayReport(error)", value: businessUtilityExamples.errorReport },
      { label: "日志摘要", expression: "summarizeLogLines(lines)", value: businessUtilityExamples.logSummary },
    ],
    boundaryCases: businessUtilityBoundaryCases.filter((item) => item.key.includes("template")),
  }),
  doc({
    key: "file",
    title: "file 文件工具",
    group: "数据资源",
    importPath: "src/utils/file",
    sourceFiles: files("file", true),
    splitStatus: "split",
    description: "文件类型、accept 规则、选择校验、大小摘要、去重、展示和浏览器选择降级。",
    functions: ["summarizeFileAccept", "matchesFileAccept", "createFileSelectionIntakeReport", "summarizeFileSizes", "createFileDisplaySummary", "createFileDeduplicationReport"],
    snippets: ["createFileSelectionIntakeReport(files, { accept, maxFiles, maxSize })", "summarizeFileAccept(['.csv', 'image/*'])"],
    examples: [
      { label: "文件展示", expression: "createFileDisplaySummary(files)", value: dataUtilityExamples.fileDisplay },
      { label: "accept 摘要", expression: "summarizeFileAccept(['.csv', 'image/*'])", value: dataUtilityExamples.fileAccept },
      { label: "选择接收报告", expression: "createFileSelectionIntakeReport(files, options)", value: dataUtilityExamples.fileIntake.summary },
    ],
    boundaryCases: dataUtilityBoundaryCases.filter((item) => item.key.includes("file") || item.key.includes("duplicate")),
  }),
  doc({
    key: "format",
    title: "format 格式化工具",
    group: "业务通用",
    importPath: "src/utils/format",
    sourceFiles: splitFiles("format", ["index", "types", "constants", "bytes", "number", "duration", "list", "summary-items", "dimensions", "template"]),
    splitStatus: "split",
    description: "字节、时长、百分比、模板插值、状态摘要项和概览项报告。",
    functions: ["formatBytes", "formatDuration", "formatPercent", "formatTemplateWithReport", "createSummaryItemsReport", "createStatusSummaryItemsReport"],
    snippets: ["formatTemplateWithReport(template, params)", "createSummaryItemsReport(summaryItems)"],
    examples: [
      { label: "百分比", expression: "formatPercent(0.375)", value: businessUtilityExamples.percent },
      { label: "时长", expression: "formatDuration(93000)", value: businessUtilityExamples.duration },
      { label: "模板报告", expression: "formatTemplateWithReport(template, params)", value: businessUtilityExamples.template },
    ],
    boundaryCases: businessUtilityBoundaryCases.filter((item) => item.key.includes("template")),
  }),
  doc({
    key: "id",
    title: "id 标识工具",
    group: "文本输入",
    importPath: "src/utils/id",
    sourceFiles: files("id"),
    splitStatus: "single",
    description: "稳定 hash id、DOM id 规范化、唯一 DOM id 和重复 id 摘要。",
    functions: ["createStableHashId", "normalizeDomId", "ensureUniqueDomId", "summarizeUniqueIds"],
    snippets: ["createStableHashId(path, 'utils')", "ensureUniqueDomId('panel', existingIds)"],
    examples: [
      { label: "稳定 ID", expression: "createStableHashId(value, 'utils')", value: textUtilityExamples.stableId },
      { label: "DOM ID", expression: "normalizeDomId(value, 'utils')", value: textUtilityExamples.normalizedDomId },
      { label: "重复摘要", expression: "summarizeUniqueIds(ids)", value: textUtilityExamples.uniqueIds },
    ],
    boundaryCases: textUtilityBoundaryCases.filter((item) => item.key.includes("id")),
  }),
  doc({
    key: "json",
    title: "json JSON 工具",
    group: "数据资源",
    importPath: "src/utils/json",
    sourceFiles: files("json"),
    splitStatus: "single",
    description: "安全 stringify、可序列化检测、循环引用错误消息和兜底输出。",
    functions: ["tryJsonStringify", "safeJsonStringify", "isJsonSerializable", "getJsonStringifyErrorMessage"],
    snippets: ["tryJsonStringify(value)", "safeJsonStringify(value, fallback)"],
    examples: [
      { label: "循环 stringify", expression: "tryJsonStringify(circularObject)", value: jsonUtilityExamples.circularResult },
      { label: "兜底 stringify", expression: "safeJsonStringify(circularObject, fallback)", value: jsonUtilityExamples.circularFallback },
      { label: "可序列化检测", expression: "isJsonSerializable(value)", value: jsonUtilityExamples.circularSerializable },
    ],
    boundaryCases: jsonUtilityBoundaryCases,
  }),
  doc({
    key: "keyboard",
    title: "keyboard 快捷键工具",
    group: "文本输入",
    importPath: "src/utils/keyboard",
    sourceFiles: files("keyboard"),
    splitStatus: "single",
    description: "快捷键解析、展示、ARIA 转换和批量快捷键摘要。",
    functions: ["parseKeyboardShortcut", "formatKeyboardShortcut", "toAriaKeyShortcuts", "summarizeKeyboardShortcuts"],
    snippets: ["parseKeyboardShortcut('Ctrl+Shift+P')", "toAriaKeyShortcuts('Ctrl+Shift+P')"],
    examples: [
      { label: "解析", expression: "parseKeyboardShortcut('Ctrl+Shift+P')", value: textUtilityExamples.keyboard.parsed },
      { label: "展示文本", expression: "formatKeyboardShortcut('Ctrl+Shift+P')", value: textUtilityExamples.keyboard.label },
      { label: "重复摘要", expression: "summarizeKeyboardShortcuts(shortcuts)", value: textUtilityExamples.keyboard.summary },
    ],
    boundaryCases: textUtilityBoundaryCases.filter((item) => item.key.includes("shortcut")),
  }),
  doc({
    key: "number",
    title: "number 数值工具",
    group: "运行展示",
    importPath: "src/utils/number",
    sourceFiles: files("number", true),
    splitStatus: "split",
    description: "数值解析、范围归一化、步进、进度、分页、分桶和数列统计。",
    functions: ["summarizeNumberList", "summarizeNumberDistribution", "summarizeNumberRange", "summarizeProgressRatio", "summarizeSteppedNumber", "summarizePagination"],
    snippets: ["summarizeNumberRange(input, min, max, fallback)", "summarizePagination(total, pageSize, page)"],
    examples: [
      { label: "数列摘要", expression: "summarizeNumberList(inputs)", value: numberUtilityExamples.listSummary },
      { label: "范围归一化", expression: "summarizeNumberRange('128', 0, 100, 0)", value: numberUtilityExamples.range },
      { label: "分页摘要", expression: "summarizePagination(99, 20, 45)", value: numberUtilityExamples.pagination },
    ],
    boundaryCases: numberUtilityBoundaryCases,
  }),
  doc({
    key: "object",
    title: "object 对象工具",
    group: "集合结构",
    importPath: "src/utils/object",
    sourceFiles: files("object", true),
    splitStatus: "split",
    description: "record、路径读写、对象清理、defaults、patch、浅 diff 和深度 diff。",
    functions: ["getByPath", "setByPath", "pickByPaths", "createObjectCleanupReport", "createDeepObjectDiffReport", "formatObjectDiff"],
    snippets: ["getByPath(record, 'profile.tags[1]', '')", "createDeepObjectDiffReport(before, after, { compareArraysByIndex: true })"],
    examples: [
      { label: "深度 diff", expression: "createDeepObjectDiffReport(before, after)", value: objectUtilityExamples.deepDiffReport.summary },
      { label: "路径挑选", expression: "pickByPaths(record, paths)", value: objectUtilityExamples.pickedPaths },
      { label: "清理报告", expression: "createObjectCleanupReport(record, options)", value: objectUtilityExamples.cleanupReport },
    ],
    boundaryCases: objectUtilityBoundaryCases,
  }),
  doc({
    key: "path",
    title: "path 路径工具",
    group: "数据资源",
    importPath: "src/utils/path",
    sourceFiles: files("path"),
    splitStatus: "single",
    description: "Windows/Unix 路径、相对路径、安全子路径、文件名清理和路径关系摘要。",
    functions: ["getRelativePath", "summarizePathRelation", "resolveSafeChildPath", "sanitizeFileNameWithFallback", "summarizePathSafety"],
    snippets: ["resolveSafeChildPath(base, input, { ignoreCase: true })", "sanitizeFileNameWithFallback(input, 'untitled')"],
    examples: [
      { label: "路径关系", expression: "summarizePathRelation(base, target, { ignoreCase: true })", value: pathUtilityExamples.relation },
      { label: "安全子路径", expression: "resolveSafeChildPath(base, '报告\\\\明细.csv')", value: pathUtilityExamples.safeChild },
      { label: "文件名清理", expression: "sanitizeFileNameWithFallback(input, 'untitled')", value: pathUtilityExamples.sanitizedFileName },
    ],
    boundaryCases: pathUtilityBoundaryCases,
  }),
  doc({
    key: "search",
    title: "search 搜索工具",
    group: "业务通用",
    importPath: "src/utils/search",
    sourceFiles: files("search"),
    splitStatus: "single",
    description: "关键词拆分、字段匹配、搜索排序、筛选分区和搜索结果摘要。",
    functions: ["normalizeSearchKeyword", "rankSearchItemsWithSummary", "partitionSearchQuery"],
    snippets: ["rankSearchItemsWithSummary(items, keyword, fields)", "partitionSearchQuery(items, { keyword, fields, filters })"],
    examples: [
      { label: "搜索排序", expression: "rankSearchItemsWithSummary(items, 'utils', fields)", value: businessUtilityExamples.search },
      { label: "搜索分区", expression: "partitionSearchQuery(items, query)", value: businessUtilityExamples.searchPartition },
    ],
    boundaryCases: businessUtilityBoundaryCases.filter((item) => item.key.includes("selection")),
  }),
  doc({
    key: "selection",
    title: "selection 选择工具",
    group: "业务通用",
    importPath: "src/utils/selection",
    sourceFiles: splitFiles("selection", ["index", "types", "keys", "display", "actions", "availability", "range", "delta", "replacement", "items"]),
    splitStatus: "split",
    description: "多选展示、可用性检查、key 替换和批量操作选择态摘要。",
    functions: ["createSelectionDisplaySummaryByKeys", "summarizeSelectionAvailability", "createSelectionKeyReplacementReport"],
    snippets: ["createSelectionDisplaySummaryByKeys(allKeys, selectedKeys, { unit: 'items' })", "summarizeSelectionAvailability(allKeys, selectedKeys, disabledKeys)"],
    examples: [
      { label: "选择展示", expression: "createSelectionDisplaySummaryByKeys(all, selected)", value: businessUtilityExamples.selection },
      { label: "可用性", expression: "summarizeSelectionAvailability(all, selected, disabled)", value: businessUtilityExamples.selectionAvailability },
      { label: "key 替换", expression: "createSelectionKeyReplacementReport(keys, replacements)", value: businessUtilityExamples.selectionReplacement },
    ],
    boundaryCases: businessUtilityBoundaryCases.filter((item) => item.key.includes("selection")),
  }),
  doc({
    key: "storage",
    title: "storage 存储工具",
    group: "数据资源",
    importPath: "src/utils/storage",
    sourceFiles: files("storage"),
    splitStatus: "single",
    description: "storage key、TTL envelope、条目扫描、前缀摘要和 mutation 预览。",
    functions: ["createStorageKey", "parseStorageKey", "createStorageTtlEnvelope", "summarizeStorageEntries", "summarizeStorageTtlEntries", "previewAndSummarizeStorageMutations"],
    snippets: ["createStorageKey(['user', 'settings', 'theme'])", "createStorageTtlEnvelope(value, now, ttlMs)"],
    examples: [
      { label: "storage key", expression: "createStorageKey(['user', 'settings', 'theme'])", value: dataUtilityExamples.storageKey },
      { label: "条目摘要", expression: "summarizeStorageEntries(entries)", value: dataUtilityExamples.storageSummary },
      { label: "TTL 摘要", expression: "summarizeStorageTtlEntries(entries)", value: dataUtilityExamples.ttlSummary },
    ],
    boundaryCases: dataUtilityBoundaryCases.filter((item) => item.key.includes("storage") || item.key.includes("ttl")),
  }),
  doc({
    key: "string",
    title: "string 字符串工具",
    group: "文本输入",
    importPath: "src/utils/string",
    sourceFiles: splitFiles("string", ["index", "types", "core", "internal", "lines", "text-list", "match", "parts", "case", "keywords", "mask"]),
    splitStatus: "split",
    description: "文本清理、预览、截断、脱敏、大小写转换、分隔符拆分和关键词摘要。",
    functions: ["cleanDisplayText", "createTextPreview", "formatTextPreview", "truncateMiddleText", "maskText", "splitBySeparators", "summarizeText"],
    snippets: ["createTextPreview(text, { maxLength: 24 })", "splitBySeparators(input, [',', ';', '\\n'], true)"],
    examples: [
      { label: "文本摘要", expression: "summarizeText(text)", value: textUtilityExamples.textSummary },
      { label: "文本预览", expression: "createTextPreview(text, { maxLength: 24 })", value: textUtilityExamples.textPreview },
      { label: "多分隔符拆分", expression: "splitBySeparators(input)", value: textUtilityExamples.splitValues },
    ],
    boundaryCases: textUtilityBoundaryCases.filter((item) => item.key.includes("text")),
  }),
  doc({
    key: "tree",
    title: "tree 树形工具",
    group: "集合结构",
    importPath: "src/utils/tree",
    sourceFiles: files("tree", true),
    splitStatus: "split",
    description: "tree to list、list to tree、lookup、可见节点、勾选态、诊断和 by-key diff。",
    functions: ["treeToListWithoutChildren", "treeToParentIdList", "listToTree", "diagnoseListTreeItems", "createTreeLookup", "summarizeTreeByKey", "createTreeDiffByKeyReport"],
    snippets: ["treeToListWithoutChildren(nodes, (item) => item.children)", "listToTree(rows, { getId, getParentId })"],
    examples: [
      { label: "树转列表", expression: "treeToListWithoutChildren(nodes)", value: treeUtilityExamples.flatList },
      { label: "列表诊断", expression: "diagnoseListTreeItems(rows)", value: treeUtilityExamples.diagnostic.stats },
      { label: "树 diff", expression: "createTreeDiffByKeyReport(before, after)", value: treeUtilityExamples.diffReport.summary },
    ],
    boundaryCases: treeUtilityBoundaryCases,
  }),
  doc({
    key: "url",
    title: "url URL 工具",
    group: "数据资源",
    importPath: "src/utils/url",
    sourceFiles: splitFiles("url", ["index", "types", "core", "query-value", "search-params", "query-summary", "hash", "path", "mutation", "summary"]),
    splitStatus: "split",
    description: "URL 解析、query record、query diff、标准化、追加、过滤和 URL 列表摘要。",
    functions: ["summarizeUrl", "summarizeUrls", "summarizeSearchParams", "diffSearchParams", "createQueryKey", "appendQuery", "normalizeUrlQuery", "filterUrlQueryParams"],
    snippets: ["summarizeUrl(input, { baseUrl })", "appendQuery('/tools', { tag: ['ai', 'utils'], page: 2 })"],
    examples: [
      { label: "URL 摘要", expression: "summarizeUrl(url)", value: dataUtilityExamples.url },
      { label: "URL 列表", expression: "summarizeUrls(inputs, { baseUrl })", value: dataUtilityExamples.urlList },
      { label: "query diff", expression: "diffSearchParams(before, after)", value: dataUtilityExamples.queryDiff },
    ],
    boundaryCases: dataUtilityBoundaryCases.filter((item) => item.key.includes("url")),
  }),
  doc({
    key: "validation",
    title: "validation 校验工具",
    group: "业务通用",
    importPath: "src/utils/validation",
    sourceFiles: files("validation"),
    splitStatus: "single",
    description: "必填、邮箱、范围、记录级 schema、校验报告和多 validator 执行。",
    functions: ["createRequiredValidator", "createEmailValidator", "runValidators", "createRecordValidationSchema", "createRecordValidationSchemaReport"],
    snippets: ["runValidators(value, validators)", "createRecordValidationSchemaReport(record, schema)"],
    examples: [
      { label: "记录校验", expression: "createRecordValidationSchemaReport(record, schema)", value: businessUtilityExamples.validation },
      { label: "必填校验", expression: "runValidators('', [createRequiredValidator('required')])", value: businessUtilityExamples.requiredOnly },
    ],
    boundaryCases: businessUtilityBoundaryCases.filter((item) => item.key.includes("record")),
  }),
  doc({
    key: "value",
    title: "value 值解析工具",
    group: "业务通用",
    importPath: "src/utils/value",
    sourceFiles: files("value"),
    splitStatus: "single",
    description: "空值判断、布尔/整数/枚举解析、值类型摘要和 fallback 报告。",
    functions: ["isNil", "isNonEmptyValue", "parseBooleanWithReport", "parseIntegerWithReport", "parseEnumListWithReport", "summarizeValueTypes"],
    snippets: ["parseIntegerWithReport(input, fallback)", "parseEnumListWithReport(input, allowed, fallback)"],
    examples: [
      { label: "值类型摘要", expression: "summarizeValueTypes(values)", value: businessUtilityExamples.valueTypes },
      { label: "布尔解析", expression: "parseBooleanWithReport('yes', false)", value: businessUtilityExamples.parsedBoolean },
      { label: "枚举列表", expression: "parseEnumListWithReport(values, allowed, fallback)", value: businessUtilityExamples.parsedEnumList },
    ],
    boundaryCases: businessUtilityBoundaryCases.filter((item) => item.key.includes("enum")),
  }),
];

export function getUtilityDocStats(entries = utilityDocs) {
  return {
    moduleCount: entries.length,
    splitCount: entries.filter((entry) => entry.splitStatus === "split").length,
    singleCount: entries.filter((entry) => entry.splitStatus === "single").length,
    exampleCount: entries.reduce((total, entry) => total + entry.examples.length, 0),
    boundaryCaseCount: entries.reduce((total, entry) => total + entry.boundaryCases.length, 0),
  };
}
