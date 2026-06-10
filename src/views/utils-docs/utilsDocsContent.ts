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

export interface UtilityFunctionDoc {
  name: string;
  description: string;
  params?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  returns?: {
    type: string;
    description: string;
  };
  throws?: string[];
  defaultTestArgs?: string[];
}

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
  functions: UtilityFunctionDoc[];
  snippets: string[];
  examples: UtilityExampleRow[];
  boundaryCases: UtilityBoundaryCase[];
}

const utilityGroups = ["集合结构", "运行展示", "文本输入", "数据资源", "浏览器能力", "业务通用"] as const;

export const utilityDocGroups = [...utilityGroups];

function files(name: string): string[] {
  return [`src/utils/${name}/index.ts`];
}

function splitFiles(name: string, modules: readonly string[]): string[] {
  return [`src/utils/${name}/index.ts`, ...modules.map((moduleName) => `src/utils/${name}/${moduleName}.ts`)];
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
    sourceFiles: files("array"),
    splitStatus: "split",
    description: "数组去重、分组、分页、过滤、排序、索引 diff 和 keyed diff。",
    functions: [
      { name: "uniqueBy", description: "根据指定的键函数对数组元素进行去重。", params: [{"name":"items","type":"readonly T[]","required":true,"description":"需要处理的数据集合，支持泛型数组。"},{"name":"getKey","type":"(item: T) => K","required":true,"description":"哈希键提取回调，返回的具体值将作为判定元素的唯一凭证。"}], returns: {"type":"T[]","description":"返回处理完成的全新泛型数组，不会污染原数组。"},
      defaultTestArgs: ["[{id:1, name: 'A'}, {id:2, name:'B'}, {id:1, name:'C'}]","item => item.id"] },
      { name: "groupByEntries", description: "将数组元素分组，并返回对象数组结构而不是单个大对象。", params: [{"name":"items","type":"readonly T[]","required":true,"description":"需要处理的数据集合，支持泛型数组。"},{"name":"getKey","type":"(item: T) => K","required":true,"description":"哈希键提取回调，返回的具体值将作为判定元素的唯一凭证。"}], returns: {"type":"GroupByEntry<K, T>[]","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["[{cat:'A', v:1}, {cat:'B', v:2}, {cat:'A', v:3}]","item => item.cat"] },
      { name: "paginateArrayWithSummary", description: "对本地数组进行内存分页，并提供包含总数、页码的详细信息摘要。", params: [{"name":"items","type":"readonly T[]","required":true,"description":"需要处理的数据集合，支持泛型数组。"},{"name":"page","type":"number","required":true,"description":"目标页码，从 1 开始计数。"},{"name":"pageSize","type":"number","required":true,"description":"每页容纳的数据条目数量。"},{"name":"options","type":"PaginationSummaryOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"ArrayPaginationReport<T>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]","2","3","{}"] },
      { name: "diffArraysByIndex", description: "基于索引对两个数组进行对比，常用于列表纯变动检测。", params: [{"name":"before","type":"readonly T[]","required":true,"description":"发生变化前的原始基准数据集。"},{"name":"after","type":"readonly T[]","required":true,"description":"发生变化后的最新比对数据集。"},{"name":"equals","type":"(before: T, after: T, index: number) => boolean","required":false,"description":"自定义对象深度比对或等值判断逻辑。"}], returns: {"type":"ArrayIndexDiffResult<T>","description":"返回封装了执行状态与可能产出数据的标准结果包裹体。"},
      defaultTestArgs: ["[1, 2, 3]","[1, 4, 3]"] },
      { name: "diffArraysByKeyChanges", description: "基于键值进行集合变动的 diff（提取新增、删除和保持不变的项）。", params: [{"name":"before","type":"readonly T[]","required":true,"description":"发生变化前的原始基准数据集。"},{"name":"after","type":"readonly T[]","required":true,"description":"发生变化后的最新比对数据集。"},{"name":"getKey","type":"(item: T, index: number) => K","required":true,"description":"哈希键提取回调，返回的具体值将作为判定元素的唯一凭证。"},{"name":"options","type":"ArrayKeyedChangeDiffOptions<T, K>","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"ArrayKeyedChangeDiffResult<T, K>","description":"返回封装了执行状态与可能产出数据的标准结果包裹体。"},
      defaultTestArgs: ["[{id:1, v:1}, {id:2, v:2}]","[{id:1, v:1}, {id:3, v:3}]","item => item.id"] },
      { name: "createArrayListViewReport", description: "创建带过滤、排序、分页功能的增强数组视图报告。", params: [{"name":"items","type":"readonly T[]","required":true,"description":"需要处理的数据集合，支持泛型数组。"},{"name":"options","type":"ArrayListViewOptions<T>","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"ArrayListViewReport<T>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["[{id:1, v:10}, {id:2, v:5}]","{ sortRules: [{ key: 'v', direction: 'desc' }] }"] }
    ],
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
    sourceFiles: splitFiles("async", ["index", "types", "timer", "sleep", "debounce", "timeout", "task", "retry-poll", "settled", "batch-plan", "run"]),
    splitStatus: "split",
    description: "异步重试、延迟、超时、批处理计划、任务结果和 settled result 摘要。",
    functions: [
      { name: "summarizeRetryOptions", description: "分析和汇总重试策略配置。", params: [{"name":"options","type":"RetryOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"RetryOptionsSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["{ maxRetries: 3, baseDelayMs: 100 }"] },
      { name: "summarizeAsyncBatchPlan", description: "根据总数和并发度规划并输出批处理计划。", params: [{"name":"itemCount","type":"unknown","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"concurrency","type":"number","required":false,"description":"并发处理的最大上限阈值。"}], returns: {"type":"AsyncBatchPlanSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["['task1', 'task2', 'task3']","{ concurrency: 2 }"] },
      { name: "createAsyncTaskReport", description: "创建一个异步任务执行状态和时间报告。", params: [{"name":"result","type":"AsyncTaskResult<T>","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"startedAtMs","type":"number","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"endedAtMs","type":"number","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"AsyncTaskReport<T>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["{ id: '1', status: 'pending' }","{ status: 'fulfilled', value: 'success' }"] },
      { name: "createAsyncBatchReport", description: "对一批已执行完成的任务进行合并汇总报告。", params: [{"name":"results","type":"readonly PromiseSettledResult<T>[]","required":true,"description":"数据集合列表。"},{"name":"plan","type":"AsyncBatchPlanSummary","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"startedAtMs","type":"number","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"endedAtMs","type":"number","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"AsyncBatchReport<T>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["[{ id: '1', status: 'fulfilled', value: 'A' }, { id: '2', status: 'rejected', reason: 'Error' }]"] },
      { name: "summarizeSettledResults", description: "汇总 Promise.allSettled 的执行结果（成功/失败统计）。", params: [{"name":"results","type":"readonly PromiseSettledResult<T>[]","required":true,"description":"数据集合列表。"}], returns: {"type":"SettledResultsSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["[{ status: 'fulfilled', value: 1 }, { status: 'rejected', reason: 'Fail' }]"] }
    ],
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
      sourceFiles: splitFiles("browser", ["index", "types", "platform", "viewport", "location", "env"]),
      splitStatus: "split",
    description: "浏览器环境、视口断点、媒体查询、能力探测和 location 快照。",
    functions: [
      { name: "summarizeBrowserEnvironment", description: "提取浏览器核心环境指标（如内核、平台、UA）。", params: [{"name":"win","type":"Window","required":false,"description":"必须传递给该方法的核心依赖参数。"},{"name":"nav","type":"Navigator","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"BrowserEnvironmentSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["window.navigator.userAgent"] },
      { name: "summarizeBrowserCapabilities", description: "探测当前浏览器支持的高级特性能力。", params: [{"name":"win","type":"Window","required":false,"description":"必须传递给该方法的核心依赖参数。"},{"name":"nav","type":"Navigator","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"BrowserCapabilitySummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["{ touch: true, webgl: false }"] },
      { name: "summarizeViewportBreakpoints", description: "将视口尺寸折叠至当前的响应式断点类型。", params: [{"name":"breakpoints","type":"readonly ViewportBreakpoint[]","required":true,"description":"数据集合列表。"},{"name":"win","type":"Window","required":false,"description":"必须传递给该方法的核心依赖参数。"},{"name":"fallback","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"ViewportBreakpointSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["1024"] },
      { name: "summarizeMediaQueries", description: "汇总并分析常见的 CSS 媒体查询生效状态。", params: [{"name":"queries","type":"readonly string[]","required":true,"description":"数据集合列表。"},{"name":"fallback","type":"boolean","required":false,"description":"必须传递给该方法的核心依赖参数。"},{"name":"win","type":"Window","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"MediaQuerySummary[]","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["'(prefers-color-scheme: dark)'"] },
      { name: "getLocationSnapshot", description: "获取当前页面 URL 的各个核心组成部分。", params: [{"name":"loc","type":"Location","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"LocationSnapshot","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["window.location"] }
    ],
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
      sourceFiles: splitFiles("clipboard", ["index", "types", "availability", "result", "write", "read"]),
      splitStatus: "split",
    description: "剪贴板复制结果、降级来源、错误报告和展示文本。",
      functions: [
      { name: "copyTextToClipboard", description: "触发剪贴板复制逻辑，支持自动降级。", params: [{"name":"text","type":"string","required":true,"description":"待处理的原始文本字符串。"},{"name":"options","type":"CopyTextOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"Promise<boolean>","description":"异步包装的结果载体，可在外部安全 await 获取深层数据。"},
      defaultTestArgs: ["'Hello World'"] },
      { name: "createClipboardCopyResult", description: "包装原生的剪贴板操作结果。", params: [{"name":"success","type":"boolean","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"method","type":"ClipboardCopyMethod","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"text","type":"string","required":true,"description":"待处理的原始文本字符串。"},{"name":"error","type":"unknown","required":false,"description":"JS 原生 Error 对象或符合异常接口的实体。"}], returns: {"type":"ClipboardCopyResult","description":"返回封装了执行状态与可能产出数据的标准结果包裹体。"},
      defaultTestArgs: ["'Hello'","true","''"] },
      { name: "summarizeClipboardCopyResult", description: "生成剪贴板操作状态及字符特征摘要。", params: [{"name":"result","type":"ClipboardCopyResult","required":true,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"ClipboardResultSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["{ success: true, textLength: 5 }"] },
      { name: "createClipboardCopyReport", description: "创建包含失败重试等上下文的完整剪贴板报告。", params: [{"name":"result","type":"ClipboardCopyResult","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"FormatClipboardResultSummaryOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"ClipboardResultReport<ClipboardCopyResult>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["'Short text'"] },
      { name: "formatClipboardCopyResult", description: "快速格式化剪贴板交互信息以供 UI 提示。", params: [{"name":"result","type":"ClipboardCopyResult","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"FormatClipboardResultSummaryOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["{ success: false, errorMessage: 'Denied' }"] }
    ],
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
    sourceFiles: splitFiles("color", ["index", "types", "constants", "normalize", "parse", "convert", "adjust", "contrast", "summary"]),
    splitStatus: "split",
    description: "颜色标准化、混色、透明度、调亮、对比度和调色板摘要。",
    functions: [
      { name: "normalizeHexColor", description: "标准化十六进制颜色，去除非法字符并补全缩写。", params: [{"name":"value","type":"string","required":true,"description":"需要进行操作或评估的值。"},{"name":"fallback","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'#abc'"] },
      { name: "summarizeColorValue", description: "对颜色值提取亮度、色相等特征并生成摘要。", params: [{"name":"value","type":"string | RgbColor | RgbaColor | HslColor","required":true,"description":"需要进行操作或评估的值。"},{"name":"fallback","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"ColorValueSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["'#ff0000'"] },
      { name: "summarizeColorContrast", description: "对比两种颜色的亮度差异以判断是否满足可读性要求。", params: [{"name":"foreground","type":"string | RgbColor","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"background","type":"string | RgbColor","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"minRatio","type":"number","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"ColorContrastSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["'#000000'","'#ffffff'"] },
      { name: "summarizeColorPalette", description: "生成色板组合的关键统计信息。", params: [{"name":"values","type":"readonly (string | RgbColor | RgbaColor)[]","required":true,"description":"数据集合列表。"}], returns: {"type":"ColorPaletteSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["['#ff0000', '#00ff00', '#0000ff']"] },
      { name: "mixHexColors", description: "在两种十六进制颜色间按照一定比例进行混合。", params: [{"name":"left","type":"string","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"right","type":"string","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"weight","type":"number","required":false,"description":"必须传递给该方法的核心依赖参数。"},{"name":"fallback","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'#ff0000'","'#0000ff'","0.5"] },
      { name: "getContrastTextColor", description: "针对给定背景色智能返回适合的对比文本色（黑或白）。", params: [{"name":"value","type":"string | RgbColor","required":true,"description":"需要进行操作或评估的值。"},{"name":"light","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"},{"name":"dark","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'#ffffff'"] }
    ],
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
      sourceFiles: splitFiles("compare", ["index", "types", "state", "compare", "sort"]),
      splitStatus: "split",
    description: "值比较、稳定排序、排序控件状态和可空值排序策略。",
    functions: [
      { name: "compareValues", description: "对多种数据类型执行标准比较逻辑（相等、大小等）。", params: [{"name":"left","type":"ComparableValue","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"right","type":"ComparableValue","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"directionOrOptions","type":"SortDirection | CompareValueOptions","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"number","description":"返回计算结果、索引值或统计数值。"},
      defaultTestArgs: ["10","20","'asc'"] },
      { name: "sortByValue", description: "增强的属性安全排序实现，支持正逆向排序。", params: [{"name":"items","type":"readonly T[]","required":true,"description":"需要处理的数据集合，支持泛型数组。"},{"name":"getValue","type":"(item: T) => ComparableValue","required":true,"description":"执行业务逻辑的回调函数。"},{"name":"directionOrOptions","type":"SortDirection | CompareValueOptions","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"T[]","description":"返回处理完成的全新泛型数组，不会污染原数组。"},
      defaultTestArgs: ["[{a:2}, {a:1}]","item => item.a","'asc'"] },
      { name: "toggleSortDirection", description: "翻转当前的排序方向（asc <-> desc）。", params: [{"name":"direction","type":"unknown","required":true,"description":"排序或控制流的方向，如 'asc' 或 'desc'。"},{"name":"fallback","type":"SortDirection","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"SortDirection","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["'asc'"] },
      { name: "createSortControlsReport", description: "分析当前的排序设置，并给出 UI 面板应该展示的状态。", params: [{"name":"current","type":"SortState<K>","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"keys","type":"readonly K[]","required":true,"description":"数据集合列表。"},{"name":"options","type":"SortControlSummaryOptions<K>","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"SortControlsReport<K>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["[{key: 'name', direction: 'asc'}]"] }
    ],
    snippets: ["sortByValue(items, (item) => item.size, 'desc')", "createSortControlsReport(current, allowedKeys)"],
    examples: [
      { label: "按大小排序", expression: "sortByValue(items, item => item.size, 'desc')", value: businessUtilityExamples.sortedItems },
      { label: "排序控件报告", expression: "createSortControlsReport({ key: 'size', direction: 'desc' }, keys)", value: businessUtilityExamples.sortControls },
    ],
      boundaryCases: businessUtilityBoundaryCases.filter((item) => item.key.includes("compare")),
  }),
  doc({
    key: "csv",
    title: "csv 表格文本工具",
    group: "数据资源",
    importPath: "src/utils/csv",
    sourceFiles: files("csv"),
    splitStatus: "split",
    description: "CSV/TSV 解析、自动分隔符、对象化、表格摘要和公式注入防护导出。",
    functions: [
      { name: "parseCsv", description: "基础的 CSV 字符串转二维数组实现。", params: [{"name":"text","type":"string","required":true,"description":"待处理的原始文本字符串。"},{"name":"options","type":"string | CsvParseOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string[][]","description":"返回经处理后的结构化结果或报表。"}, throws: ["当 CSV 格式严重损坏或包含无法解析的字符时，可能抛出语法异常。"],
      defaultTestArgs: ["'id,name\\n1,Alice\\n2,Bob'","','"] },
      { name: "parseCsvAutoWithSummary", description: "带有分隔符自动探测与行列预警机制的 CSV 解析。", params: [{"name":"text","type":"string","required":true,"description":"待处理的原始文本字符串。"},{"name":"options","type":"CsvAutoParseOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"CsvParseResult","description":"返回封装了执行状态与可能产出数据的标准结果包裹体。"},
      defaultTestArgs: ["'a;b;c\\n1;2;3'"] },
      { name: "parseCsvObjectsAutoWithSummary", description: "将首行视为表头，将 CSV 解析为包含对象的对象数组摘要。", params: [{"name":"text","type":"string","required":true,"description":"待处理的原始文本字符串。"},{"name":"options","type":"CsvAutoParseObjectsOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"CsvParseObjectsResult","description":"返回封装了执行状态与可能产出数据的标准结果包裹体。"},
      defaultTestArgs: ["'id,value\\n1,100\\n2,200'"] },
      { name: "summarizeCsvTable", description: "快速分析已解析表格的行列与数据有效性。", params: [{"name":"rows","type":"readonly (readonly string[])[]","required":true,"description":"数据集合列表。"},{"name":"hasHeader","type":"boolean","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"CsvTableSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["[['id', 'name'], ['1', 'Alice']]"] },
      { name: "summarizeCsvCells", description: "对一系列单元格的值类型分布进行直观摘要。", params: [{"name":"rows","type":"readonly (readonly CsvValue[])[]","required":true,"description":"数据集合列表。"},{"name":"delimiter","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"CsvCellSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["['A', 'B', 'C']"] },
      { name: "stringifySpreadsheetCsvRows", description: "安全序列化 CSV 并转义 Excel 危险公式注入前缀。", params: [{"name":"rows","type":"readonly CsvRow[]","required":true,"description":"数据集合列表。"},{"name":"options","type":"CsvSpreadsheetStringifyRowsOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["[['1', '2'], ['3', '4']]"] }
    ],
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
    sourceFiles: files("date"),
    splitStatus: "split",
    description: "日期格式化、范围摘要、预设区间、日期列表、状态判断和带日期文件名。",
    functions: [
      { name: "formatDateOnly", description: "对常见日期类型执行简单的 YYYY-MM-DD 格式化。", params: [{"name":"value","type":"DateInput","required":true,"description":"需要进行操作或评估的值。"},{"name":"fallback","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"}, throws: ["当传入一个完全无法识别的非法日期字符串并且未提供降级容错时可能会抛出异常。"],
      defaultTestArgs: ["new Date()","'YYYY-MM-DD'"] },
      { name: "summarizeDateRange", description: "对包含起止的日期对象生成持续天数等概要。", params: [{"name":"range","type":"DateRangeLike<DateInput>","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"separator","type":"string","required":false,"description":"CSV 或普通文本的自定义分隔符。"},{"name":"fallback","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"},{"name":"durationOptions","type":"DateRangeDurationOptions","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"DateRangeSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["new Date('2026-01-01')","new Date('2026-12-31')"] },
      { name: "formatDateRangeSummary", description: "针对日期区间快速进行可读性字符串格式化输出。", params: [{"name":"summary","type":"DateRangeSummary","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"FormatDateRangeSummaryOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["{ startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), daysCount: 365 }"] },
      { name: "getDateRangePresetValue", description: "根据预设快捷键（如近7天、本月）计算精确日期区间。", params: [{"name":"key","type":"DateRangePresetKey","required":true,"description":"查找、比对或提取操作所依赖的键名。"},{"name":"baseDate","type":"DateInput","required":false,"description":"日期时间对象实体。"}], returns: {"type":"NormalizedDateRange","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["'last7Days'"] },
      { name: "enumerateDateRangeValues", description: "枚举并返回区间内包含的所有离散日期。", params: [{"name":"range","type":"DateRangeLike<DateInput>","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"EnumerateDateRangeOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string[]","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["new Date('2026-01-01')","new Date('2026-01-05')"] },
      { name: "summarizeDateStatus", description: "根据传入基准时间判断当前属于什么时态阶段。", params: [{"name":"value","type":"DateInput","required":true,"description":"需要进行操作或评估的值。"},{"name":"baseDate","type":"DateInput","required":false,"description":"日期时间对象实体。"}], returns: {"type":"DateStatusSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["new Date()"] }
    ],
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
    sourceFiles: splitFiles("dom", ["index", "types", "constants", "guards", "events", "query-focus", "css", "element", "viewport", "scroll"]),
    splitStatus: "split",
    description: "DOM 事件清理、可见区域、焦点和元素尺寸相关工具。",
    functions: [
      { name: "addDomEventListener", description: "注册 DOM 事件并返回一键销毁闭包，支持弱引用。", params: [{"name":"target","type":"EventTarget","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"type","type":"string","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"listener","type":"EventListenerOrEventListenerObject","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"DomEventOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"DomEventCleanup","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["document.body","'click'","() => console.log('clicked')"] },
      { name: "mergeDomEventCleanups", description: "合并多个事件销毁闭包为一个。", params: [{"name":"cleanups","type":"readonly DomEventCleanup[]","required":true,"description":"数据集合列表。"}], returns: {"type":"DomEventCleanup","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["() => console.log('cleanup1')","() => console.log('cleanup2')"] },
      { name: "summarizeRectInViewport", description: "分析一个 DOMRect 当前在视口内的交叉状态与面积。", params: [{"name":"rect","type":"DOMRect","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"root","type":"Window","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"RectViewportSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["{ top: 10, left: 10, bottom: 100, right: 100, width: 90, height: 90 }","{ innerWidth: 1920, innerHeight: 1080 }"] },
      { name: "isElementInViewport", description: "判断目标元素是否在当前视口内可见。", params: [{"name":"element","type":"Element","required":true,"description":"真实的浏览器 DOM 节点元素。"},{"name":"root","type":"Window","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"boolean","description":"返回真假布尔值，代表判断是否成立或操作是否成功。"},
      defaultTestArgs: ["document.body"] }
    ],
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
      sourceFiles: splitFiles("encoding", ["index", "types", "bytes", "base64", "hex", "data-url"]),
      splitStatus: "split",
    description: "Base64 安全编解码、Data URL 创建、解析和编码文本摘要。",
    functions: [
      { name: "safeDecodeBase64Utf8", description: "更安全的 Base64 到 UTF-8 解码机制，带 fallback。", params: [{"name":"value","type":"string","required":true,"description":"需要进行操作或评估的值。"},{"name":"options","type":"SafeDecodeBase64Options","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'SGVsbG8='"] },
      { name: "createDataUrl", description: "基于数据内容快速拼接标准的 Data URI 字符串。", params: [{"name":"data","type":"string","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"mimeType","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"},{"name":"encoding","type":"\"base64\" | \"text\"","required":false,"description":"支持执行操作的上下文核心参数。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'text/plain'","'SGVsbG8='"] },
      { name: "summarizeDataUrl", description: "解析并验证给定 Data URI 的 mime-type 和大小。", params: [{"name":"value","type":"string","required":true,"description":"需要进行操作或评估的值。"}], returns: {"type":"DataUrlSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["'data:text/plain;base64,SGVsbG8='"] },
      { name: "summarizeEncodedText", description: "对各种编码的文本块生成编码安全性与大小特征摘要。", params: [{"name":"value","type":"string","required":true,"description":"需要进行操作或评估的值。"}], returns: {"type":"EncodedTextSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["'Hello World'","'utf8'"] }
    ],
    snippets: ["safeDecodeBase64Utf8(input, { fallback: '' })", "summarizeDataUrl(createDataUrl(text, 'text/plain', 'text'))"],
    examples: [
      { label: "编码摘要", expression: "summarizeEncodedText('5Lit5paH')", value: textUtilityExamples.encodedText },
      { label: "安全解码", expression: "safeDecodeBase64Utf8(value, { fallback })", value: textUtilityExamples.decodedBase64 },
      { label: "Data URL", expression: "summarizeDataUrl(dataUrl)", value: textUtilityExamples.dataUrl },
    ],
      boundaryCases: textUtilityBoundaryCases.filter((item) => item.key.includes("base64") || item.key.includes("data-url")),
  }),
  doc({
    key: "error",
    title: "error 错误展示工具",
    group: "业务通用",
    importPath: "src/utils/error",
    sourceFiles: splitFiles("error", ["index", "types", "core", "summary", "log"]),
    splitStatus: "split",
    description: "错误消息、错误码、展示报告、多错误列表和日志行摘要。",
    functions: [
      { name: "getErrorMessage", description: "智能从任意 error 载荷提取可读的 message 文本。", params: [{"name":"error","type":"unknown","required":true,"description":"JS 原生 Error 对象或符合异常接口的实体。"},{"name":"fallback","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["new Error('Something went wrong')"] },
      { name: "createErrorDisplayReport", description: "组装含有追踪 ID 等高级扩展的错误报告对象。", params: [{"name":"error","type":"unknown","required":true,"description":"JS 原生 Error 对象或符合异常接口的实体。"},{"name":"options","type":"ErrorDisplayReportOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"ErrorDisplayReport","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["new Error('Network error')"] },
      { name: "createErrorDisplayReports", description: "批量格式化多种异构错误为统一集合报告。", params: [{"name":"errors","type":"readonly unknown[]","required":true,"description":"数据集合列表。"},{"name":"options","type":"ErrorDisplayReportOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"ErrorDisplayReport[]","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["[new Error('A'), new Error('B')]"] },
      { name: "summarizeLogLines", description: "对聚合的日志片段生成严重度与分布概要。", params: [{"name":"lines","type":"readonly string[]","required":true,"description":"数据集合列表。"}], returns: {"type":"LogLinesSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["['Error 1', 'Error 2']"] }
    ],
    snippets: ["getErrorMessage(err, fallback)", "createErrorDisplayReport(err)"],
    examples: [
      { label: "错误报告", expression: "createErrorDisplayReport(error)", value: businessUtilityExamples.errorReport },
      { label: "日志摘要", expression: "summarizeLogLines(lines)", value: businessUtilityExamples.logSummary },
    ],
    boundaryCases: businessUtilityBoundaryCases.filter((item) => item.key.includes("error")),
  }),
  doc({
    key: "file",
    title: "file 文件工具",
    group: "数据资源",
    importPath: "src/utils/file",
    sourceFiles: files("file"),
    splitStatus: "split",
    description: "文件类型、accept 规则、选择校验、大小摘要、去重、展示和浏览器选择降级。",
    functions: [
      { name: "summarizeFileAccept", description: "解析 MIME 和后缀，总结可接收的文件范畴。", params: [{"name":"accept","type":"FileAcceptInput","required":true,"description":"符合 HTML input accept 规范的文件类型字符串。"}], returns: {"type":"FileAcceptSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["'image/*,video/*'"] },
      { name: "matchesFileAccept", description: "校验一个给定的文件是否符合特定的 accept 规则。", params: [{"name":"file","type":"FileLike","required":true,"description":"File 或 Blob 原生文件对象。"},{"name":"accept","type":"FileAcceptInput","required":true,"description":"符合 HTML input accept 规范的文件类型字符串。"}], returns: {"type":"boolean","description":"返回真假布尔值，代表判断是否成立或操作是否成功。"}, throws: ["当 accept 规则表达式存在语法错误时可能抛错。"],
      defaultTestArgs: ["{ type: 'image/png', name: 'test.png' }","'image/*'"] },
      { name: "createFileSelectionIntakeReport", description: "接收到选中文件后，生成总览报告和警告拦截清单。", params: [{"name":"files","type":"FileListInput<T>","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"FileValidationOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"FileSelectionIntakeReport<T>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["[{ name: 'a.png', size: 1000 }, { name: 'b.txt', size: 2000 }]"] },
      { name: "summarizeFileSizes", description: "对多个文件的大小编制并统计分布比例。", params: [{"name":"files","type":"FileListInput<T>","required":true,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"FileSizeSummary<T>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["[1024, 2048, 5000]"] },
      { name: "createFileDisplaySummary", description: "针对某个展示卡片生成体积、格式与尺寸的信息。", params: [{"name":"files","type":"FileListInput<T>","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"FormatFileDisplaySummaryOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"FileDisplaySummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["{ name: 'document.pdf', size: 1048576, type: 'application/pdf' }"] },
      { name: "createFileDeduplicationReport", description: "自动针对给定的文件集合依据哈希或尺寸排重并报告结果。", params: [{"name":"files","type":"FileListInput<T>","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"FileDeduplicateOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"FileDeduplicationReport<T>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["['a.txt', 'b.txt', 'a.txt']"] }
    ],
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
    functions: [
      { name: "formatBytes", description: "执行格式化逻辑并返回可展示字符串。", params: [{"name":"bytes","type":"number","required":true,"description":"文件或数据流的字节大小数值。"},{"name":"options","type":"FormatBytesOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["1048576"] },
      { name: "formatDuration", description: "执行格式化逻辑并返回可展示字符串。", params: [{"name":"ms","type":"number","required":true,"description":"持续时长，以毫秒为单位。"},{"name":"options","type":"FormatDurationOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["3661000"] },
      { name: "formatPercent", description: "执行格式化逻辑并返回可展示字符串。", params: [{"name":"value","type":"number","required":true,"description":"需要进行操作或评估的值。"},{"name":"options","type":"FormatPercentOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["0.854"] },
      { name: "formatTemplateWithReport", description: "执行格式化逻辑并返回可展示字符串。", params: [{"name":"template","type":"string","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"params","type":"Record<string, TemplateParamValue>","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"FormatTemplateOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"TemplateFormatReport","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["'Hello {name}'","{ name: 'World' }"] },
      { name: "createSummaryItemsReport", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"inputs","type":"readonly SummaryItemInput<TMeta>[]","required":true,"description":"数据集合列表。"},{"name":"options","type":"CreateSummaryItemsReportOptions<TMeta>","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"SummaryItemsReport<TMeta>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["['Apple', 'Banana', 'Cherry']"] },
      { name: "createStatusSummaryItemsReport", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"inputs","type":"readonly StatusSummaryItemInput<TMeta>[]","required":true,"description":"数据集合列表。"},{"name":"options","type":"CreateSummaryItemsReportOptions<TMeta>","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"StatusSummaryItemsReport<TMeta>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["[{ status: 'success', text: 'A' }, { status: 'error', text: 'B' }]"] }
    ],
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
      sourceFiles: splitFiles("id", ["index", "types", "normalize", "create-internal", "map-internal", "map", "stable", "create", "unique"]),
      splitStatus: "split",
    description: "稳定 hash id、DOM id 规范化、唯一 DOM id 和重复 id 摘要。",
    functions: [
      { name: "createStableHashId", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"value","type":"string","required":true,"description":"需要进行操作或评估的值。"},{"name":"prefix","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'some-long-string-to-hash'"] },
      { name: "normalizeDomId", description: "内部核心工具方法。", params: [{"name":"value","type":"unknown","required":true,"description":"需要进行操作或评估的值。"},{"name":"fallback","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"},{"name":"separator","type":"string","required":false,"description":"CSV 或普通文本的自定义分隔符。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'123 Invalid ID!!'"] },
      { name: "ensureUniqueDomId", description: "内部核心工具方法。", params: [{"name":"value","type":"unknown","required":true,"description":"需要进行操作或评估的值。"},{"name":"existingIds","type":"readonly string[]","required":true,"description":"关联的唯一标识。"},{"name":"separator","type":"string","required":false,"description":"CSV 或普通文本的自定义分隔符。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'my-id'","['my-id', 'my-id-1']"] },
      { name: "summarizeUniqueIds", description: "执行结构化特征分析并返回报告。", params: [{"name":"values","type":"readonly unknown[]","required":true,"description":"数据集合列表。"},{"name":"existingIds","type":"readonly string[]","required":false,"description":"关联的唯一标识。"},{"name":"separator","type":"string","required":false,"description":"CSV 或普通文本的自定义分隔符。"}], returns: {"type":"UniqueIdsSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["['id1', 'id2', 'id1']"] }
    ],
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
    sourceFiles: splitFiles("json", ["index", "types", "value", "stringify", "parse"]),
    splitStatus: "split",
    description: "安全 stringify、可序列化检测、循环引用错误消息和兜底输出。",
    functions: [
      { name: "tryJsonStringify", description: "内部核心工具方法。", params: [{"name":"value","type":"unknown","required":true,"description":"需要进行操作或评估的值。"},{"name":"spacing","type":"number","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"JsonStringifyResult","description":"返回封装了执行状态与可能产出数据的标准结果包裹体。"}, throws: ["当对象存在循环引用时将抛出 TypeError 异常。"],
      defaultTestArgs: ["{ a: 1, b: 2 }"] },
      { name: "safeJsonStringify", description: "内部核心工具方法。", params: [{"name":"value","type":"unknown","required":true,"description":"需要进行操作或评估的值。"},{"name":"fallback","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["{ circular: null }"] },
      { name: "isJsonSerializable", description: "内部核心工具方法。", params: [{"name":"value","type":"unknown","required":true,"description":"需要进行操作或评估的值。"}], returns: {"type":"boolean","description":"返回真假布尔值，代表判断是否成立或操作是否成功。"},
      defaultTestArgs: ["{ a: 1 }"] },
      { name: "getJsonStringifyErrorMessage", description: "内部核心工具方法。", params: [{"name":"result","type":"JsonStringifyResult","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"fallback","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["{}"] }
    ],
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
      sourceFiles: splitFiles("keyboard", ["index", "types", "core", "shortcuts", "navigation", "summary"]),
      splitStatus: "split",
    description: "快捷键解析、展示、ARIA 转换和批量快捷键摘要。",
    functions: [
      { name: "parseKeyboardShortcut", description: "内部核心工具方法。", params: [{"name":"value","type":"string","required":true,"description":"需要进行操作或评估的值。"}], returns: {"type":"KeyboardShortcut","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["'Ctrl+Shift+A'"] },
      { name: "formatKeyboardShortcut", description: "执行格式化逻辑并返回可展示字符串。", params: [{"name":"shortcut","type":"string | KeyboardShortcut","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"FormatKeyboardShortcutOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["{ ctrlKey: true, shiftKey: true, key: 'A' }"] },
      { name: "toAriaKeyShortcuts", description: "内部核心工具方法。", params: [{"name":"shortcut","type":"string | KeyboardShortcut","required":true,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'Ctrl+A'"] },
      { name: "summarizeKeyboardShortcuts", description: "执行结构化特征分析并返回报告。", params: [{"name":"shortcuts","type":"readonly (string | KeyboardShortcut)[]","required":true,"description":"数据集合列表。"},{"name":"options","type":"FormatKeyboardShortcutsOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"KeyboardShortcutSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["['Ctrl+C', 'Ctrl+V']"] }
    ],
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
    sourceFiles: files("number"),
    splitStatus: "split",
    description: "数值解析、范围归一化、步进、进度、分页、分桶和数列统计。",
    functions: [
      { name: "summarizeNumberList", description: "执行结构化特征分析并返回报告。", params: [{"name":"values","type":"readonly unknown[]","required":true,"description":"数据集合列表。"}], returns: {"type":"NumberListSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["[10, 20, 5, 15]"] },
      { name: "summarizeNumberDistribution", description: "执行结构化特征分析并返回报告。", params: [{"name":"values","type":"readonly unknown[]","required":true,"description":"数据集合列表。"},{"name":"buckets","type":"readonly NumberBucketDefinition[]","required":true,"description":"数据集合列表。"},{"name":"precision","type":"number","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"NumberDistributionSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["[1, 2, 2, 3, 3, 3]"] },
      { name: "summarizeNumberRange", description: "执行结构化特征分析并返回报告。", params: [{"name":"value","type":"unknown","required":true,"description":"需要进行操作或评估的值。"},{"name":"min","type":"unknown","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"max","type":"unknown","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"precision","type":"number","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"NumberRangeSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["5","15"] },
      { name: "summarizeProgressRatio", description: "执行结构化特征分析并返回报告。", params: [{"name":"current","type":"unknown","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"total","type":"unknown","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"precision","type":"number","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"ProgressRatioSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["45","100"] },
      { name: "summarizeSteppedNumber", description: "执行结构化特征分析并返回报告。", params: [{"name":"value","type":"unknown","required":true,"description":"需要进行操作或评估的值。"},{"name":"options","type":"NormalizeSteppedNumberOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"SteppedNumberSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["12","5"] },
      { name: "summarizePagination", description: "执行结构化特征分析并返回报告。", params: [{"name":"page","type":"number","required":true,"description":"目标页码，从 1 开始计数。"},{"name":"pageSize","type":"number","required":true,"description":"每页容纳的数据条目数量。"},{"name":"total","type":"number","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"PaginationSummaryOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"PaginationSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["3","10","100"] }
    ],
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
    sourceFiles: files("object"),
    splitStatus: "split",
    description: "record、路径读写、对象清理、defaults、patch、浅 diff 和深度 diff。",
    functions: [
      { name: "getByPath", description: "内部核心工具方法。", params: [{"name":"value","type":"unknown","required":true,"description":"需要进行操作或评估的值。"},{"name":"path","type":"ObjectPathInput","required":true,"description":"对象深度访问的路径字符串，如 'a.b.c'。"},{"name":"fallback","type":"T","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"T","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["{ a: { b: { c: 42 } } }","'a.b.c'"] },
      { name: "setByPath", description: "内部核心工具方法。", params: [{"name":"value","type":"T","required":true,"description":"需要进行操作或评估的值。"},{"name":"path","type":"ObjectPathInput","required":true,"description":"对象深度访问的路径字符串，如 'a.b.c'。"},{"name":"nextValue","type":"unknown","required":true,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"T","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["{}","'a.b.c'","42"] },
      { name: "pickByPaths", description: "内部核心工具方法。", params: [{"name":"value","type":"unknown","required":true,"description":"需要进行操作或评估的值。"},{"name":"paths","type":"readonly ObjectPathInput[]","required":true,"description":"对象访问路径字符串的集合。"}], returns: {"type":"AnyRecord","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["{ a: 1, b: 2, c: 3 }","['a', 'c']"] },
      { name: "createObjectCleanupReport", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"value","type":"T","required":true,"description":"需要进行操作或评估的值。"},{"name":"options","type":"ObjectCleanupOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"ObjectCleanupReport<T>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["{ a: 1, b: null, c: undefined, d: '' }"] },
      { name: "createDeepObjectDiffReport", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"before","type":"unknown","required":true,"description":"发生变化前的原始基准数据集。"},{"name":"after","type":"unknown","required":true,"description":"发生变化后的最新比对数据集。"},{"name":"diffOptions","type":"ObjectDeepDiffOptions","required":false,"description":"必须传递给该方法的核心依赖参数。"},{"name":"patchOptions","type":"ObjectDiffPatchOptions","required":false,"description":"必须传递给该方法的核心依赖参数。"},{"name":"basePath","type":"string[]","required":false,"description":"数据集合列表。"}], returns: {"type":"ObjectDiffReport","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["{ a: 1, b: 2 }","{ a: 1, b: 3, c: 4 }"] },
      { name: "formatObjectDiff", description: "执行格式化逻辑并返回可展示字符串。", params: [{"name":"entries","type":"readonly ObjectDiffEntry[]","required":true,"description":"数据集合列表。"},{"name":"options","type":"FormatObjectDiffOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["{ a: 1 }","{ a: 2 }"] }
    ],
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
    sourceFiles: splitFiles("path", ["index", "types", "core", "file", "file-internal", "hierarchy", "compare", "resolve", "safety", "safety-file"]),
    splitStatus: "split",
    description: "Windows/Unix 路径、相对路径、安全子路径、文件名清理和路径关系摘要。",
    functions: [
      { name: "getRelativePath", description: "内部核心工具方法。", params: [{"name":"basePath","type":"string","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"targetPath","type":"string","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"PathCompareOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'/var/log'","'/var/log/nginx/access.log'"] },
      { name: "summarizePathRelation", description: "执行结构化特征分析并返回报告。", params: [{"name":"basePath","type":"string","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"targetPath","type":"string","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"PathCompareOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"PathRelationSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["'/app/src'","'/app/src/utils/index.ts'"] },
      { name: "resolveSafeChildPath", description: "内部核心工具方法。", params: [{"name":"basePath","type":"string","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"relativePath","type":"string","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"PathCompareOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'/app/data'","'../etc/passwd'"] },
      { name: "sanitizeFileNameWithFallback", description: "内部核心工具方法。", params: [{"name":"value","type":"string","required":true,"description":"需要进行操作或评估的值。"},{"name":"fallback","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"},{"name":"replacement","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'invalid<file>name:?.txt'"] },
      { name: "summarizePathSafety", description: "执行结构化特征分析并返回报告。", params: [{"name":"path","type":"string","required":true,"description":"对象深度访问的路径字符串，如 'a.b.c'。"}], returns: {"type":"PathSafetySummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["'/secure/dir/../../etc'"] }
    ],
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
    sourceFiles: splitFiles("search", ["index", "types", "text", "highlight", "score", "filter", "summary", "rank"]),
    splitStatus: "split",
    description: "关键词拆分、字段匹配、搜索排序、筛选分区和搜索结果摘要。",
    functions: [
      { name: "normalizeSearchKeywordText", description: "内部核心工具方法。", params: [{"name":"value","type":"string | readonly string[]","required":true,"description":"需要进行操作或评估的值。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'  Hello   World  '"] },
      { name: "rankSearchItemsWithSummary", description: "内部核心工具方法。", params: [{"name":"items","type":"readonly T[]","required":true,"description":"需要处理的数据集合，支持泛型数组。"},{"name":"keyword","type":"string | readonly string[]","required":true,"description":"目标检索关键词。"},{"name":"fields","type":"readonly SearchField<T>[]","required":true,"description":"数据集合列表。"},{"name":"options","type":"RankSearchItemsOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"RankedSearchItemsWithSummary<T>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["['apple', 'banana', 'apricot']","'ap'"] },
      { name: "partitionSearchQuery", description: "内部核心工具方法。", params: [{"name":"items","type":"readonly T[]","required":true,"description":"需要处理的数据集合，支持泛型数组。"},{"name":"options","type":"SearchQueryOptions<T>","required":true,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"SearchQueryPartition<T>","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["'tag:bug priority:high login crash'"] },
      { name: "createSearchResultDisplaySummary", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"summary","type":"SearchResultSummary","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"FormatSearchResultSummaryOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"SearchResultDisplaySummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["{ items: ['a', 'b'], total: 10, query: 'test' }"] }
    ],
    snippets: ["rankSearchItemsWithSummary(items, keyword, fields)", "partitionSearchQuery(items, { keyword, fields, filters })"],
    examples: [
      { label: "搜索排序", expression: "rankSearchItemsWithSummary(items, 'utils', fields)", value: businessUtilityExamples.search },
      { label: "搜索分区", expression: "partitionSearchQuery(items, query)", value: businessUtilityExamples.searchPartition },
    ],
    boundaryCases: businessUtilityBoundaryCases.filter((item) => item.key.includes("search")),
  }),
  doc({
    key: "selection",
    title: "selection 选择工具",
    group: "业务通用",
    importPath: "src/utils/selection",
    sourceFiles: splitFiles("selection", ["index", "types", "keys", "display", "actions", "availability", "range", "delta", "replacement", "items"]),
    splitStatus: "split",
    description: "多选展示、可用性检查、key 替换和批量操作选择态摘要。",
    functions: [
      { name: "createSelectionDisplaySummaryByKeys", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"availableKeys","type":"readonly K[]","required":true,"description":"数据集合列表。"},{"name":"selectedKeys","type":"readonly K[]","required":true,"description":"数据集合列表。"},{"name":"options","type":"FormatSelectionSummaryOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"SelectionDisplaySummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["['id1', 'id2']","[{id: 'id1', name: 'A'}, {id: 'id2', name: 'B'}, {id: 'id3', name: 'C'}]","item => item.id"] },
      { name: "summarizeSelectionAvailability", description: "执行结构化特征分析并返回报告。", params: [{"name":"availableKeys","type":"readonly K[]","required":true,"description":"数据集合列表。"},{"name":"selectedKeys","type":"readonly K[]","required":true,"description":"数据集合列表。"},{"name":"selectableKeys","type":"readonly K[]","required":false,"description":"数据集合列表。"}], returns: {"type":"SelectionAvailabilitySummary<K>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["['a', 'b', 'c']","['b', 'c', 'd']"] },
      { name: "createSelectionKeyReplacementReport", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"selectedKeys","type":"readonly K[]","required":true,"description":"数据集合列表。"},{"name":"replacements","type":"ReadonlyMap<K, K> | readonly (readonly [K, K])[]","required":true,"description":"数据集合列表。"}], returns: {"type":"SelectionKeyReplacementReport<K>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["['id1', 'id2']","'id1'","'id1-new'"] }
    ],
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
    sourceFiles: splitFiles("storage", ["index", "types", "runtime", "key", "item", "json", "entries", "summary", "record", "mutation", "ttl"]),
    splitStatus: "split",
    description: "storage key、TTL envelope、条目扫描、前缀摘要和 mutation 预览。",
    functions: [
      { name: "createStorageKey", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"parts","type":"readonly StorageValue[]","required":true,"description":"数据集合列表。"},{"name":"separator","type":"string","required":false,"description":"CSV 或普通文本的自定义分隔符。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'user_settings'","'123'"] },
      { name: "parseStorageKey", description: "内部核心工具方法。", params: [{"name":"key","type":"string","required":true,"description":"查找、比对或提取操作所依赖的键名。"},{"name":"separator","type":"string","required":false,"description":"CSV 或普通文本的自定义分隔符。"}], returns: {"type":"string[]","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["'monster:user_settings:123'"] },
      { name: "createStorageTtlEnvelope", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"value","type":"T","required":true,"description":"需要进行操作或评估的值。"},{"name":"ttlMs","type":"number","required":false,"description":"必须传递给该方法的核心依赖参数。"},{"name":"nowMs","type":"number","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"StorageTtlEnvelope<T>","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["{ theme: 'dark' }","3600"] },
      { name: "summarizeStorageEntries", description: "执行结构化特征分析并返回报告。", params: [{"name":"entries","type":"readonly StorageEntry[]","required":true,"description":"数据集合列表。"},{"name":"prefixSeparator","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"StorageEntriesSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["{ a: '1', b: '2' }"] },
      { name: "summarizeStorageTtlEntries", description: "执行结构化特征分析并返回报告。", params: [{"name":"entries","type":"readonly StorageTtlEntry<unknown>[]","required":true,"description":"数据集合列表。"}], returns: {"type":"StorageTtlSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["{ a: { value: 1, expiresAt: Date.now() + 1000 } }"] },
      { name: "previewAndSummarizeStorageMutations", description: "内部核心工具方法。", params: [{"name":"items","type":"Record<string, StorageValue>","required":true,"description":"需要处理的数据集合，支持泛型数组。"},{"name":"options","type":"StorageItemOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"StorageMutationSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["{ key1: 'new_val', key2: null }","{ key1: 'old_val', key2: 'exist' }"] }
    ],
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
    functions: [
      { name: "cleanDisplayText", description: "内部核心工具方法。", params: [{"name":"value","type":"unknown","required":true,"description":"需要进行操作或评估的值。"},{"name":"options","type":"CleanDisplayTextOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'  Too   much\\n\\nwhitespace  '"] },
      { name: "createTextPreview", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"value","type":"unknown","required":true,"description":"需要进行操作或评估的值。"},{"name":"options","type":"TextPreviewOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"TextPreviewSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["'This is a very long text that needs to be previewed'","15"] },
      { name: "formatTextPreview", description: "执行格式化逻辑并返回可展示字符串。", params: [{"name":"value","type":"unknown","required":true,"description":"需要进行操作或评估的值。"},{"name":"options","type":"TextPreviewOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'Short'"] },
      { name: "truncateMiddleText", description: "内部核心工具方法。", params: [{"name":"value","type":"string","required":true,"description":"需要进行操作或评估的值。"},{"name":"maxLength","type":"number","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"separator","type":"string","required":false,"description":"CSV 或普通文本的自定义分隔符。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'abcdefghijklmnopqrstuvwxyz'","10"] },
      { name: "maskText", description: "内部核心工具方法。", params: [{"name":"value","type":"string","required":true,"description":"需要进行操作或评估的值。"},{"name":"visibleStart","type":"number","required":false,"description":"必须传递给该方法的核心依赖参数。"},{"name":"visibleEnd","type":"number","required":false,"description":"必须传递给该方法的核心依赖参数。"},{"name":"mask","type":"string","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'13812345678'","3","4"] },
      { name: "splitBySeparators", description: "内部核心工具方法。", params: [{"name":"value","type":"string","required":true,"description":"需要进行操作或评估的值。"},{"name":"separators","type":"readonly string[]","required":false,"description":"数据集合列表。"},{"name":"normalize","type":"boolean","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"string[]","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["'a,b;c|d'","[',', ';', '|']"] },
      { name: "summarizeText", description: "执行结构化特征分析并返回报告。", params: [{"name":"value","type":"unknown","required":true,"description":"需要进行操作或评估的值。"},{"name":"options","type":"TextSummaryOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"TextSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["'A text with some words'"] }
    ],
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
    sourceFiles: files("tree"),
    splitStatus: "split",
    description: "tree to list、list to tree、lookup、可见节点、勾选态、诊断和 by-key diff。",
    functions: [
      { name: "treeToListWithoutChildren", description: "内部核心工具方法。", params: [{"name":"items","type":"readonly T[]","required":true,"description":"需要处理的数据集合，支持泛型数组。"},{"name":"getChildren","type":"(item: T) => readonly T[]","required":true,"description":"数据集合列表。"},{"name":"childrenKey","type":"C","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"Omit<T, C>[]","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["[{ id: 1, children: [{ id: 2 }] }]"] },
      { name: "treeToParentIdList", description: "内部核心工具方法。", params: [{"name":"items","type":"readonly T[]","required":true,"description":"需要处理的数据集合，支持泛型数组。"},{"name":"options","type":"TreeParentIdListOptions<T, K, C>","required":true,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"TreeParentIdListItem<T, K, C>[]","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["[{ id: 1, children: [{ id: 2 }] }]"] },
      { name: "listToTree", description: "内部核心工具方法。", params: [{"name":"items","type":"readonly T[]","required":true,"description":"需要处理的数据集合，支持泛型数组。"},{"name":"options","type":"ListToTreeOptions<T, K, C>","required":true,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"TreeWithChildren<T, C>[]","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["[{ id: 1, parentId: null }, { id: 2, parentId: 1 }]"] },
      { name: "diagnoseListTreeItems", description: "内部核心工具方法。", params: [{"name":"items","type":"readonly T[]","required":true,"description":"需要处理的数据集合，支持泛型数组。"},{"name":"options","type":"Pick<ListToTreeOptions<T, K, \"children\">, \"getId\" | \"getParentId\" | \"rootParentIds\">","required":true,"description":"支持执行操作的上下文核心参数。"}], returns: {"type":"ListTreeDiagnostic<T, K>","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["[{ id: 1, parentId: 2 }, { id: 2, parentId: 1 }]"] },
      { name: "createTreeLookup", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"items","type":"readonly T[]","required":true,"description":"需要处理的数据集合，支持泛型数组。"},{"name":"getChildren","type":"TreeChildrenGetter<T>","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"getKey","type":"TreeKeyGetter<T, K>","required":true,"description":"哈希键提取回调，返回的具体值将作为判定元素的唯一凭证。"}], returns: {"type":"TreeLookup<T, K>","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["[{ id: 1, children: [{ id: 2 }] }]"] },
      { name: "summarizeTreeByKey", description: "执行结构化特征分析并返回报告。", params: [{"name":"items","type":"readonly T[]","required":true,"description":"需要处理的数据集合，支持泛型数组。"},{"name":"getChildren","type":"TreeChildrenGetter<T>","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"getKey","type":"TreeKeyGetter<T, K>","required":true,"description":"哈希键提取回调，返回的具体值将作为判定元素的唯一凭证。"}], returns: {"type":"TreeKeySummary<T, K>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["[{ id: 1, children: [{ id: 2 }] }]","item => item.id"] },
      { name: "createTreeDiffByKeyReport", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"before","type":"readonly T[]","required":true,"description":"发生变化前的原始基准数据集。"},{"name":"after","type":"readonly T[]","required":true,"description":"发生变化后的最新比对数据集。"},{"name":"getChildren","type":"TreeChildrenGetter<T>","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"getKey","type":"TreeKeyGetter<T, K>","required":true,"description":"哈希键提取回调，返回的具体值将作为判定元素的唯一凭证。"},{"name":"options","type":"TreeDiffByKeyOptions<T, K>","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"TreeDiffByKeyReport<T, K>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["[{id:1}]","[{id:2}]","item => item.id"] }
    ],
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
    functions: [
      { name: "summarizeUrl", description: "执行结构化特征分析并返回报告。", params: [{"name":"input","type":"string","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"UrlSummaryOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"UrlSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["'https://example.com/path?a=1'"] },
      { name: "summarizeUrls", description: "执行结构化特征分析并返回报告。", params: [{"name":"inputs","type":"readonly string[]","required":true,"description":"数据集合列表。"},{"name":"options","type":"UrlSummaryOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"UrlListSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["['https://a.com', 'https://b.com']"] },
      { name: "summarizeSearchParams", description: "执行结构化特征分析并返回报告。", params: [{"name":"searchParams","type":"URLSearchParams","required":true,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"UrlQuerySummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["new URLSearchParams('?a=1&b=2')"] },
      { name: "diffSearchParams", description: "内部核心工具方法。", params: [{"name":"before","type":"URLSearchParams","required":true,"description":"发生变化前的原始基准数据集。"},{"name":"after","type":"URLSearchParams","required":true,"description":"发生变化后的最新比对数据集。"}], returns: {"type":"UrlQueryDiffSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["new URLSearchParams('?a=1&b=2')","new URLSearchParams('?a=1&c=3')"] },
      { name: "createQueryKey", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"input","type":"SearchParamsInput","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"NormalizeSearchParamsOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'search'","'keyword'"] },
      { name: "appendQuery", description: "内部核心工具方法。", params: [{"name":"url","type":"string","required":true,"description":"合法的统一资源定位符字符串。"},{"name":"params","type":"Record<string, QueryValue>","required":true,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'https://example.com'","{ ref: '123' }"] },
      { name: "normalizeUrlQuery", description: "内部核心工具方法。", params: [{"name":"url","type":"string","required":true,"description":"合法的统一资源定位符字符串。"},{"name":"options","type":"NormalizeUrlQueryOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'?a=1&b=2'"] },
      { name: "filterUrlQueryParams", description: "内部核心工具方法。", params: [{"name":"url","type":"string","required":true,"description":"合法的统一资源定位符字符串。"},{"name":"options","type":"FilterUrlQueryParamsOptions","required":false,"description":"自定义配置选项，用于控制执行的细节行为。"}], returns: {"type":"string","description":"返回经过格式化、转换或提取后的目标文本字符串。"},
      defaultTestArgs: ["'?a=1&b=2&c=3'","['a', 'c']"] }
    ],
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
    sourceFiles: splitFiles("validation", ["index", "types", "constants", "result", "named", "record", "predicates", "validators"]),
    splitStatus: "split",
    description: "必填、邮箱、范围、记录级 schema、校验报告和多 validator 执行。",
    functions: [
      { name: "createRequiredValidator", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"message","type":"string","required":true,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"Validator<T>","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["'username'"] },
      { name: "createEmailValidator", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"message","type":"string","required":true,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"Validator<string>","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["'email'"] },
      { name: "runValidators", description: "内部核心工具方法。", params: [{"name":"value","type":"T","required":true,"description":"需要进行操作或评估的值。"},{"name":"validators","type":"readonly Validator<T>[]","required":true,"description":"校验器函数的合集。"}], returns: {"type":"ValidationResult","description":"返回封装了执行状态与可能产出数据的标准结果包裹体。"},
      defaultTestArgs: ["'test@example.com'","[createRequiredValidator('email'), createEmailValidator('email')]"] },
      { name: "createRecordValidationSchema", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"validators","type":"Partial<{ [K in keyof T]: readonly Validator<T[K]>[]; }>","required":true,"description":"校验器函数的合集。"},{"name":"labels","type":"Partial<Record<keyof T, string>>","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"RecordValidationSchema<T>","description":"返回经处理后的结构化结果或报表。"},
      defaultTestArgs: ["{ name: [createRequiredValidator('name')] }"] },
      { name: "createRecordValidationSchemaReport", description: "基于参数构建一个复杂的数据实例报告。", params: [{"name":"value","type":"T","required":true,"description":"需要进行操作或评估的值。"},{"name":"schema","type":"RecordValidationSchema<T>","required":true,"description":"结构化对象的校验骨架蓝图。"},{"name":"options","type":"Omit<FormatRecordValidationSummaryOptions<T>, \"formatField\">","required":false,"description":"支持执行操作的上下文核心参数。"}], returns: {"type":"RecordValidationSchemaReport<T>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["{ name: '' }","{ name: [createRequiredValidator('name')] }"] }
    ],
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
      sourceFiles: splitFiles("value", ["index", "types", "guards", "summary", "parse", "coerce"]),
      splitStatus: "split",
    description: "空值判断、布尔/整数/枚举解析、值类型摘要和 fallback 报告。",
    functions: [
      { name: "isNil", description: "内部核心工具方法。", params: [{"name":"value","type":"unknown","required":true,"description":"需要进行操作或评估的值。"}], returns: {"type":"boolean","description":"返回真假布尔值，代表判断是否成立或操作是否成功。"},
      defaultTestArgs: ["null"] },
      { name: "isNonEmptyValue", description: "内部核心工具方法。", params: [{"name":"value","type":"T","required":true,"description":"需要进行操作或评估的值。"}], returns: {"type":"boolean","description":"返回真假布尔值，代表判断是否成立或操作是否成功。"},
      defaultTestArgs: ["''"] },
      { name: "parseBooleanWithReport", description: "内部核心工具方法。", params: [{"name":"input","type":"unknown","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"fallback","type":"boolean","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"ParsedValueReport<boolean>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["'true'"] },
      { name: "parseIntegerWithReport", description: "内部核心工具方法。", params: [{"name":"input","type":"unknown","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"fallback","type":"number","required":false,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"ParsedValueReport<number>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["'123.45'"] },
      { name: "parseEnumListWithReport", description: "内部核心工具方法。", params: [{"name":"values","type":"unknown","required":true,"description":"必须传递给该方法的核心依赖参数。"},{"name":"options","type":"readonly T[]","required":true,"description":"自定义配置选项，用于控制执行的细节行为。"},{"name":"fallback","type":"T","required":true,"description":"必须传递给该方法的核心依赖参数。"}], returns: {"type":"ParsedValueListReport<T>","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["['A', 'C']","['A', 'B']"] },
      { name: "summarizeValueTypes", description: "执行结构化特征分析并返回报告。", params: [{"name":"values","type":"readonly unknown[]","required":true,"description":"数据集合列表。"}], returns: {"type":"ValueTypeListSummary","description":"返回包含完整状态、详情和分析数据的结构化专属报告模型。"},
      defaultTestArgs: ["{ a: 1, b: 'str', c: null }"] }
    ],
    snippets: ["parseIntegerWithReport(input, fallback)", "parseEnumListWithReport(input, allowed, fallback)"],
    examples: [
      { label: "值类型摘要", expression: "summarizeValueTypes(values)", value: businessUtilityExamples.valueTypes },
      { label: "布尔解析", expression: "parseBooleanWithReport('yes', false)", value: businessUtilityExamples.parsedBoolean },
      { label: "枚举列表", expression: "parseEnumListWithReport(values, allowed, fallback)", value: businessUtilityExamples.parsedEnumList },
    ],
      boundaryCases: businessUtilityBoundaryCases.filter((item) => item.key.includes("value") || item.key.includes("enum")),
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
