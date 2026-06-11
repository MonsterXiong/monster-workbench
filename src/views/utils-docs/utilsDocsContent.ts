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
  sandbox?: {
    enabled: boolean;
    reason?: string;
  };
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

export interface UtilityDocQualityReport {
  moduleKey: string;
  functionCount: number;
  sourceFileCount: number;
  exampleCount: number;
  boundaryCaseCount: number;
  sandboxReadyCount: number;
  missingDescriptionCount: number;
  missingParamDescriptionCount: number;
  score: number;
  level: "excellent" | "good" | "review";
}

const utilityGroups = ["集合结构", "运行展示", "文本输入", "数据资源", "浏览器能力", "业务通用"] as const;

export const utilityDocGroups = [...utilityGroups];

const generatedDescriptionPhrases = [
  "内部核心工具方法",
  "基于参数构建一个复杂的数据实例报告",
  "执行结构化特征分析并返回报告",
  "执行格式化逻辑并返回可展示字符串",
] as const;

const manualFunctionDescriptions: Record<string, string> = {
  "format.formatBytes": "把字节数转换成带单位的短文本，适合文件大小、传输量和容量指标展示。",
  "format.formatDuration": "把毫秒时长压缩成易读文本，适合任务耗时、等待时间和性能摘要。",
  "format.formatPercent": "把比例值格式化成百分比文本，并统一小数位和非法值兜底。",
  "format.createSummaryItemsReport": "从摘要项生成可渲染报告，统一空值、重点项和展示顺序。",
  "format.createStatusSummaryItemsReport": "把状态分布转换成摘要项报告，用于仪表盘、列表状态栏和审查面板。",
  "format.formatTemplateWithReport": "按模板填充变量并返回格式化结果，同时保留缺失变量等诊断信息。",
  "id.normalizeDomId": "把任意文本归一成可用 DOM id，非法片段会被清理并使用兜底值。",
  "id.createStableHashId": "基于输入内容生成稳定短 ID，适合缓存键、DOM id 和可重复资源标识。",
  "id.ensureUniqueDomId": "在已有 ID 集合中生成不冲突的 DOM id，必要时自动追加序号。",
  "id.summarizeUniqueIds": "统计 ID 列表中的唯一值、重复项和缺失项，便于批量数据诊断。",
  "json.tryJsonStringify": "安全执行 JSON 序列化，成功和失败都以结构化结果返回。",
  "json.safeJsonStringify": "执行容错 JSON 序列化，失败时返回指定 fallback，避免 UI 流程被异常中断。",
  "json.getJsonStringifyErrorMessage": "从 JSON 序列化异常中提取稳定错误文案，用于日志和提示。",
  "json.isJsonSerializable": "判断输入是否可以被 JSON.stringify 正常序列化。",
  "keyboard.parseKeyboardShortcut": "解析快捷键字符串，归一修饰键顺序并输出结构化按键组合。",
  "keyboard.formatKeyboardShortcut": "把快捷键配置格式化为面向用户的展示文本。",
  "keyboard.toAriaKeyShortcuts": "把快捷键转换成 WAI-ARIA 兼容的 aria-keyshortcuts 值。",
  "keyboard.summarizeKeyboardShortcuts": "汇总快捷键列表的展示文本、ARIA 文本和冲突风险。",
  "number.summarizeSteppedNumber": "按步进规则归一数值，并返回原始值、结果值和是否发生修正。",
  "number.summarizeNumberList": "统计数值列表的数量、极值、均值和无效输入数量。",
  "number.summarizeNumberDistribution": "按桶区间汇总数值分布，适合图表、筛选器和质量报告。",
  "number.summarizePagination": "归一分页参数并输出页码、总页数、偏移量和边界状态。",
  "number.summarizeNumberRange": "分析数值区间的起止、跨度、有效性和倒序状态。",
  "number.summarizeProgressRatio": "把当前值和总值折算为进度比例，并处理越界、空值和零总量。",
  "object.createObjectCleanupReport": "清理对象中的空值并返回删除字段、保留字段和结果对象摘要。",
  "object.formatObjectDiff": "把对象差异转换成紧凑文本，适合日志、审查结果和变更提示。",
  "object.createDeepObjectDiffReport": "递归比较对象并生成深层差异报告，支持数组索引比较策略。",
  "object.getByPath": "按点号或数组路径读取深层值，路径不存在时返回 fallback。",
  "object.setByPath": "按路径不可变写入深层值，并在需要时创建中间容器。",
  "object.pickByPaths": "按路径集合从对象中提取字段，适合生成精简提交载荷。",
  "path.getRelativePath": "计算目标路径相对基准路径的文本关系，不访问真实文件系统。",
  "path.summarizePathRelation": "汇总两个路径的父子、同级、公共祖先和相对路径关系。",
  "path.resolveSafeChildPath": "把子路径解析到基准目录下，并拒绝绝对路径、UNC 和路径穿越。",
  "path.sanitizeFileNameWithFallback": "清理文件名中的非法字符，空结果时使用兜底文件名。",
  "path.summarizePathSafety": "检查路径文本的安全性，标记绝对路径、UNC、穿越和非法片段。",
  "search.rankSearchItemsWithSummary": "对列表执行关键词匹配和排序，并返回命中摘要与排名结果。",
  "search.partitionSearchQuery": "把搜索串拆成关键词和限定条件，适合高级筛选输入。",
  "search.createSearchResultDisplaySummary": "把搜索结果统计转换成列表页可展示摘要。",
  "search.normalizeSearchKeywordText": "清理搜索关键词文本，统一空白、大小写和不可见字符。",
  "selection.summarizeSelectionAvailability": "分析当前选择在可选、禁用和不可用集合中的分布。",
  "selection.createSelectionDisplaySummaryByKeys": "根据选中 key 和数据项生成展示摘要，包含数量和预览文本。",
  "selection.createSelectionKeyReplacementReport": "生成选择 key 替换报告，说明替换前后集合变化。",
  "storage.createStorageKey": "把多段 key 片段拼成稳定 Storage key，并清理空片段。",
  "storage.parseStorageKey": "把 Storage key 按分隔符拆回层级片段。",
  "storage.previewAndSummarizeStorageMutations": "预览 Storage 写入/删除动作，并输出新增、更新、删除统计。",
  "storage.summarizeStorageEntries": "统计 Storage 条目的数量、前缀分布和值长度信息。",
  "storage.createStorageTtlEnvelope": "把值包装成带过期时间的 TTL 结构，支持永不过期。",
  "storage.summarizeStorageTtlEntries": "汇总 TTL 条目的有效、过期和永不过期数量。",
  "string.cleanDisplayText": "清理展示文本中的 BOM、控制字符、零宽字符和异常换行。",
  "string.maskText": "按首尾保留长度对敏感文本打码，适合手机号、Token 片段和账号展示。",
  "string.truncateMiddleText": "从中间截断过长文本，保留首尾信息用于路径或资源名展示。",
  "string.splitBySeparators": "按多个分隔符拆分文本，并可选择清理空白与空项。",
  "string.summarizeText": "分析文本长度、行数、词数、空白和截断状态。",
  "string.createTextPreview": "生成文本预览结构，包含原始长度、预览文本和是否截断。",
  "string.formatTextPreview": "把文本预览结果格式化为可直接展示的短文本。",
  "tree.createTreeDiffByKeyReport": "按节点 key 比较两棵树，输出新增、删除、保留和变更摘要。",
  "tree.treeToListWithoutChildren": "把树按深度优先顺序展开，并从每个节点中移除 children 字段。",
  "tree.treeToParentIdList": "把嵌套树转换成带 id、parentId、depth 和 path 的扁平列表。",
  "tree.listToTree": "把 parentId 扁平列表还原为嵌套树，并保留原始节点字段。",
  "tree.diagnoseListTreeItems": "诊断扁平树列表中的重复 id、缺失父级和循环引用。",
  "tree.createTreeLookup": "为树构建 key 到节点、父节点和路径的查询索引。",
  "tree.summarizeTreeByKey": "统计树节点数量、叶子数量、深度和 key 分布。",
  "url.appendQuery": "向 URL 追加 query 参数，自动处理已有参数和数组值。",
  "url.normalizeUrlQuery": "归一 URL 查询参数顺序和值格式，生成稳定可比较的 URL。",
  "url.filterUrlQueryParams": "按白名单或黑名单过滤 URL query 参数。",
  "url.summarizeSearchParams": "统计 URLSearchParams 的 key、值数量、重复项和空值。",
  "url.diffSearchParams": "比较两组 URLSearchParams，输出新增、删除和变化的参数。",
  "url.createQueryKey": "从查询参数生成稳定 key，适合缓存、去重和列表状态持久化。",
  "url.summarizeUrl": "解析 URL 并输出协议、主机、路径、query 和有效性摘要。",
  "url.summarizeUrls": "批量解析 URL 列表并统计有效、无效和域名分布。",
  "validation.createRecordValidationSchema": "把字段级 validators 组合成记录级 schema，并附带字段标签。",
  "validation.createRecordValidationSchemaReport": "运行记录级 schema 并输出字段错误、通过状态和展示摘要。",
  "validation.runValidators": "按顺序执行 validator 列表，返回首个错误或通过结果。",
  "validation.createRequiredValidator": "创建必填校验器，统一处理空字符串、null 和 undefined。",
  "validation.createEmailValidator": "创建邮箱格式校验器，空值通常交给必填校验单独处理。",
  "value.isNil": "判断值是否为 null 或 undefined。",
  "value.isNonEmptyValue": "判断值是否不是空值，保留 0、false、空数组和空对象。",
  "value.parseBooleanWithReport": "把未知输入解析为布尔值，并报告 fallback 是否被使用。",
  "value.parseIntegerWithReport": "把未知输入解析为整数，并报告无效输入和 fallback。",
  "value.parseEnumListWithReport": "把未知输入解析为枚举列表，过滤非法项并保留诊断信息。",
  "value.summarizeValueTypes": "统计一组值的类型分布，区分 null、数组、对象和基础类型。",
};

function isGeneratedDescription(description: string): boolean {
  return generatedDescriptionPhrases.some((phrase) => description.includes(phrase));
}

function describeParam(paramName: string, type: string): string {
  const normalizedName = paramName.toLowerCase();
  const normalizedType = type.toLowerCase();

  if (normalizedName.includes("before")) return "变更前的数据快照。";
  if (normalizedName.includes("after")) return "变更后的数据快照。";
  if (normalizedName.includes("items") || normalizedName.includes("inputs") || normalizedName.includes("values")) return "参与处理的数据列表。";
  if (normalizedName === "value" || normalizedName === "input") return "需要解析、格式化或校验的输入值。";
  if (normalizedName.includes("options")) return "可选配置，用于调整格式、兜底值或诊断策略。";
  if (normalizedName.includes("fallback")) return "输入无效或结果为空时使用的兜底值。";
  if (normalizedName.includes("getkey")) return "从数据项中提取唯一 key 的函数。";
  if (normalizedName.includes("getid")) return "从数据项中提取节点 id 的函数。";
  if (normalizedName.includes("getparentid")) return "从数据项中提取父节点 id 的函数。";
  if (normalizedName.includes("getchildren")) return "从树节点中读取子节点列表的函数。";
  if (normalizedName.includes("equals")) return "自定义相等性判断函数。";
  if (normalizedName.includes("mapper")) return "把原始项映射为目标结构的函数。";
  if (normalizedName.includes("query") || normalizedName.includes("keyword")) return "用于匹配或过滤的搜索文本。";
  if (normalizedName.includes("schema")) return "字段校验规则集合。";
  if (normalizedName.includes("validators")) return "按顺序执行的校验器列表。";
  if (normalizedName.includes("message")) return "校验失败时返回的错误文案。";
  if (normalizedName.includes("url")) return "待解析或改写的 URL 文本。";
  if (normalizedName.includes("path")) return "待解析、比较或写入的路径文本。";
  if (normalizedName.includes("key")) return "用于索引、分组或存储的键。";
  if (normalizedName.includes("text")) return "待清理、拆分、复制或展示的文本。";
  if (normalizedName.includes("start") || normalizedName.includes("end")) return "范围边界值。";
  if (normalizedName.includes("page")) return "分页页码或分页容量。";
  if (normalizedName.includes("count") || normalizedName.includes("total")) return "用于统计或比例计算的数量。";
  if (normalizedType.includes("function") || normalizedType.includes("=>")) return "自定义回调函数。";
  if (normalizedType.includes("record") || normalizedType.includes("object")) return "结构化配置对象。";
  return "函数输入参数。";
}

function describeReturn(functionName: string, type: string): string {
  if (type === "string") return "可直接用于 UI 展示或日志记录的字符串。";
  if (type === "boolean") return "布尔判断结果。";
  if (type.endsWith("[]") || type.startsWith("Array<")) return "处理后的数组结果。";
  if (functionName.startsWith("summarize")) return "结构化摘要对象。";
  if (functionName.startsWith("create")) return "可供页面、日志或后续流程使用的报告对象。";
  if (functionName.startsWith("format")) return "格式化后的展示文本。";
  if (functionName.startsWith("parse")) return "解析结果和诊断信息。";
  return "函数执行结果。";
}

function inferSandboxPolicy(entryKey: string, fn: UtilityFunctionDoc): UtilityFunctionDoc["sandbox"] {
  const defaultArgsText = fn.defaultTestArgs?.join(" ") ?? "";
  const browserRuntimeOnly = ["copyTextToClipboard", "addDomEventListener", "getActiveHTMLElement"].includes(fn.name);

  if (browserRuntimeOnly) {
    return {
      enabled: false,
      reason: "该函数需要真实浏览器对象或用户授权，文档页仅展示静态示例。",
    };
  }

  if (entryKey === "file" && /download|read|pick/i.test(fn.name)) {
    return {
      enabled: false,
      reason: "该函数可能触发浏览器文件能力，已在文档沙箱中禁用。",
    };
  }

  if (/localStorage|sessionStorage|indexedDB|clipboard/i.test(defaultArgsText)) {
    return {
      enabled: false,
      reason: "默认示例依赖浏览器持久化或剪贴板能力，沙箱不直接执行。",
    };
  }

  return { enabled: true };
}

function enhanceUtilityFunctionDoc(entryKey: string, fn: UtilityFunctionDoc): UtilityFunctionDoc {
  const docKey = `${entryKey}.${fn.name}`;
  const description = manualFunctionDescriptions[docKey] ?? (isGeneratedDescription(fn.description) ? `${fn.name} 工具函数。` : fn.description);
  const params = fn.params?.map((param) => ({
    ...param,
    description: param.description || describeParam(param.name, param.type),
  }));
  const returns = fn.returns
    ? {
        ...fn.returns,
        description: fn.returns.description || describeReturn(fn.name, fn.returns.type),
      }
    : undefined;

  return {
    ...fn,
    description,
    params,
    returns,
    sandbox: fn.sandbox ?? inferSandboxPolicy(entryKey, fn),
  };
}

function splitFiles(name: string, modules: readonly string[]): string[] {
  return Array.from(new Set([`src/utils/${name}/index.ts`, ...modules.filter((moduleName) => moduleName !== "index").map((moduleName) => `src/utils/${name}/${moduleName}.ts`)]));
}

function doc(entry: UtilityDocEntry): UtilityDocEntry {
  return {
    ...entry,
    functions: entry.functions.map((fn) => enhanceUtilityFunctionDoc(entry.key, fn)),
  };
}

export const utilityDocs: UtilityDocEntry[] = [
  doc({
    key: "array",
    title: "array 数组工具",
    group: "集合结构",
    importPath: "src/utils/array",
    sourceFiles: splitFiles("array", ["types", "core", "set-map", "window", "group", "pagination", "diff", "summary", "mutate", "filter", "sort"]),
    splitStatus: "split",
    description: "数组去重、分组、分页、过滤、排序、索引 diff 和 keyed diff。",
    functions: [
              {
                name: "diffArraysByIndex",
                description: "基于索引对两个数组进行对比，常用于列表纯变动检测。",
                params: [{"name":"before","type":"readonly T[]","required":true,"description":""},{"name":"after","type":"readonly T[]","required":true,"description":""},{"name":"equals","type":"(before: T, after: T, index: number) => boolean","required":false,"description":""}],
                returns: {"type":"ArrayIndexDiffResult<T>","description":""},
                defaultTestArgs: ["[1, 2, 3]","[1, 4, 3]"]
              },
              {
                name: "diffArraysByKeyChanges",
                description: "基于键值进行集合变动的 diff（提取新增、删除和保持不变的项）。",
                params: [{"name":"before","type":"readonly T[]","required":true,"description":""},{"name":"after","type":"readonly T[]","required":true,"description":""},{"name":"getKey","type":"(item: T, index: number) => K","required":true,"description":""},{"name":"options","type":"ArrayKeyedChangeDiffOptions<T, K>","required":false,"description":""}],
                returns: {"type":"ArrayKeyedChangeDiffResult<T, K>","description":""},
                defaultTestArgs: ["[{id:1, v:1}, {id:2, v:2}]","[{id:1, v:1}, {id:3, v:3}]","item => item.id"]
              },
              {
                name: "groupByEntries",
                description: "将数组元素分组，并返回对象数组结构而不是单个大对象。",
                params: [{"name":"items","type":"readonly T[]","required":true,"description":""},{"name":"getKey","type":"(item: T) => K","required":true,"description":""}],
                returns: {"type":"Array<GroupByEntry<K, T>>","description":""},
                defaultTestArgs: ["[{cat:'A', v:1}, {cat:'B', v:2}, {cat:'A', v:3}]","item => item.cat"]
              },
              {
                name: "paginateArrayWithSummary",
                description: "对本地数组进行内存分页，并提供包含总数、页码的详细信息摘要。",
                params: [{"name":"items","type":"readonly T[]","required":true,"description":""},{"name":"page","type":"number","required":true,"description":""},{"name":"pageSize","type":"number","required":true,"description":""},{"name":"options","type":"PaginationSummaryOptions","required":false,"description":""}],
                returns: {"type":"ArrayPaginationReport<T>","description":""},
                defaultTestArgs: ["[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]","2","3","{}"]
              },
              {
                name: "createArrayListViewReport",
                description: "创建带过滤、排序、分页功能的增强数组视图报告。",
                params: [{"name":"items","type":"readonly T[]","required":true,"description":""},{"name":"options","type":"ArrayListViewOptions<T>","required":false,"description":""}],
                returns: {"type":"ArrayListViewReport<T>","description":""},
                defaultTestArgs: ["[{id:1, v:10}, {id:2, v:5}]","{ sortRules: [{ key: 'v', direction: 'desc' }] }"]
              },
              {
                name: "uniqueBy",
                description: "根据指定的键函数对数组元素进行去重。",
                params: [{"name":"items","type":"readonly T[]","required":true,"description":""},{"name":"getKey","type":"(item: T) => K","required":true,"description":""}],
                returns: {"type":"T[]","description":""},
                defaultTestArgs: ["[{id:1, name: 'A'}, {id:2, name:'B'}, {id:1, name:'C'}]","item => item.id"]
              }
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
              {
                name: "summarizeAsyncBatchPlan",
                description: "根据总数和并发度规划并输出批处理计划。",
                params: [{"name":"itemCount","type":"unknown","required":true,"description":""},{"name":"concurrency","type":"any","required":false,"description":""}],
                returns: {"type":"AsyncBatchPlanSummary","description":""},
                defaultTestArgs: ["['task1', 'task2', 'task3']","{ concurrency: 2 }"]
              },
              {
                name: "summarizeRetryOptions",
                description: "分析和汇总重试策略配置。",
                params: [{"name":"options","type":"RetryOptions","required":false,"description":""}],
                returns: {"type":"RetryOptionsSummary","description":""},
                defaultTestArgs: ["{ maxRetries: 3, baseDelayMs: 100 }"]
              },
              {
                name: "createAsyncBatchReport",
                description: "对一批已执行完成的任务进行合并汇总报告。",
                params: [{"name":"results","type":"readonly PromiseSettledResult<T>[]","required":true,"description":""},{"name":"plan","type":"AsyncBatchPlanSummary","required":true,"description":""},{"name":"startedAtMs","type":"number","required":true,"description":""},{"name":"endedAtMs","type":"any","required":false,"description":""}],
                returns: {"type":"AsyncBatchReport<T>","description":""},
                defaultTestArgs: ["[{ id: '1', status: 'fulfilled', value: 'A' }, { id: '2', status: 'rejected', reason: 'Error' }]"]
              },
              {
                name: "summarizeSettledResults",
                description: "汇总 Promise.allSettled 的执行结果（成功/失败统计）。",
                params: [{"name":"results","type":"readonly PromiseSettledResult<T>[]","required":true,"description":""}],
                returns: {"type":"SettledResultsSummary","description":""},
                defaultTestArgs: ["[{ status: 'fulfilled', value: 1 }, { status: 'rejected', reason: 'Fail' }]"]
              },
              {
                name: "createAsyncTaskReport",
                description: "创建一个异步任务执行状态和时间报告。",
                params: [{"name":"result","type":"AsyncTaskResult<T>","required":true,"description":""},{"name":"startedAtMs","type":"number","required":true,"description":""},{"name":"endedAtMs","type":"any","required":false,"description":""}],
                returns: {"type":"AsyncTaskReport<T>","description":""},
                defaultTestArgs: ["{ id: '1', status: 'pending' }","{ status: 'fulfilled', value: 'success' }"]
              }
            ],
    snippets: ["summarizeAsyncBatchPlan(total, concurrency)", "createAsyncBatchReport(results, plan, startedAt, finishedAt)"],
    examples: [
      { label: "重试配置", expression: "summarizeRetryOptions({ retries: 3, delayMs: 250 })", value: runtimeUtilityExamples.retryOptions },
      { label: "批处理计划", expression: "summarizeAsyncBatchPlan(9, 4)", value: runtimeUtilityExamples.batchPlan },
      { label: "settled 摘要", expression: "summarizeSettledResults(results)", value: runtimeUtilityExamples.settledSummary },
    ],
    boundaryCases: runtimeUtilityBoundaryCases.filter((item) => item.key.includes("async") || item.key.includes("settled")),
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
              {
                name: "summarizeBrowserCapabilities",
                description: "探测当前浏览器支持的高级特性能力。",
                params: [{"name":"win","type":"Window | null","required":false,"description":""},{"name":"nav","type":"Navigator | null","required":false,"description":""}],
                returns: {"type":"BrowserCapabilitySummary","description":""},
                defaultTestArgs: ["{ touch: true, webgl: false }"]
              },
              {
                name: "summarizeBrowserEnvironment",
                description: "提取浏览器核心环境指标（如内核、平台、UA）。",
                params: [{"name":"win","type":"Window | null","required":false,"description":""},{"name":"nav","type":"Navigator | null","required":false,"description":""}],
                returns: {"type":"BrowserEnvironmentSummary","description":""},
                defaultTestArgs: ["window.navigator.userAgent"]
              },
              {
                name: "getLocationSnapshot",
                description: "获取当前页面 URL 的各个核心组成部分。",
                params: [{"name":"loc","type":"Location | null","required":false,"description":""}],
                returns: {"type":"LocationSnapshot","description":""},
                defaultTestArgs: ["window.location"]
              },
              {
                name: "summarizeViewportBreakpoints",
                description: "将视口尺寸折叠至当前的响应式断点类型。",
                params: [{"name":"breakpoints","type":"readonly ViewportBreakpoint[]","required":true,"description":""},{"name":"win","type":"Window | null","required":false,"description":""},{"name":"fallback","type":"any","required":false,"description":""}],
                returns: {"type":"ViewportBreakpointSummary","description":""},
                defaultTestArgs: ["1024"]
              },
              {
                name: "summarizeMediaQueries",
                description: "汇总并分析常见的 CSS 媒体查询生效状态。",
                params: [{"name":"queries","type":"readonly string[]","required":true,"description":""},{"name":"fallback","type":"any","required":false,"description":""},{"name":"win","type":"Window | null","required":false,"description":""}],
                returns: {"type":"MediaQuerySummary[]","description":""},
                defaultTestArgs: ["'(prefers-color-scheme: dark)'"]
              }
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
              {
                name: "createClipboardCopyResult",
                description: "包装原生的剪贴板操作结果。",
                params: [{"name":"success","type":"boolean","required":true,"description":""},{"name":"method","type":"ClipboardCopyMethod","required":true,"description":""},{"name":"text","type":"string","required":true,"description":""},{"name":"error","type":"unknown","required":false,"description":""}],
                returns: {"type":"ClipboardCopyResult","description":""},
                defaultTestArgs: ["'Hello'","true","''"]
              },
              {
                name: "summarizeClipboardCopyResult",
                description: "生成剪贴板操作状态及字符特征摘要。",
                params: [{"name":"result","type":"ClipboardCopyResult","required":true,"description":""}],
                returns: {"type":"ClipboardResultSummary","description":""},
                defaultTestArgs: ["{ success: true, textLength: 5 }"]
              },
              {
                name: "formatClipboardCopyResult",
                description: "快速格式化剪贴板交互信息以供 UI 提示。",
                params: [{"name":"result","type":"ClipboardCopyResult","required":true,"description":""},{"name":"options","type":"FormatClipboardResultSummaryOptions","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["{ success: false, errorMessage: 'Denied' }"]
              },
              {
                name: "createClipboardCopyReport",
                description: "创建包含失败重试等上下文的完整剪贴板报告。",
                params: [{"name":"result","type":"ClipboardCopyResult","required":true,"description":""},{"name":"options","type":"FormatClipboardResultSummaryOptions","required":false,"description":""}],
                returns: {"type":"ClipboardResultReport<ClipboardCopyResult>","description":""},
                defaultTestArgs: ["'Short text'"]
              },
              {
                name: "copyTextToClipboard",
                description: "触发剪贴板复制逻辑，支持自动降级。",
                params: [{"name":"text","type":"string","required":true,"description":""},{"name":"options","type":"CopyTextOptions","required":false,"description":""}],
                returns: {"type":"Promise<boolean>","description":""},
                defaultTestArgs: ["'Hello World'"]
              }
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
              {
                name: "mixHexColors",
                description: "在两种十六进制颜色间按照一定比例进行混合。",
                params: [{"name":"left","type":"string","required":true,"description":""},{"name":"right","type":"string","required":true,"description":""},{"name":"weight","type":"any","required":false,"description":""},{"name":"fallback","type":"any","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'#ff0000'","'#0000ff'","0.5"]
              },
              {
                name: "summarizeColorContrast",
                description: "对比两种颜色的亮度差异以判断是否满足可读性要求。",
                params: [{"name":"foreground","type":"string | RgbColor","required":true,"description":""},{"name":"background","type":"string | RgbColor","required":true,"description":""},{"name":"minRatio","type":"any","required":false,"description":""}],
                returns: {"type":"ColorContrastSummary","description":""},
                defaultTestArgs: ["'#000000'","'#ffffff'"]
              },
              {
                name: "getContrastTextColor",
                description: "针对给定背景色智能返回适合的对比文本色（黑或白）。",
                params: [{"name":"value","type":"string | RgbColor","required":true,"description":""},{"name":"light","type":"any","required":false,"description":""},{"name":"dark","type":"any","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'#ffffff'"]
              },
              {
                name: "normalizeHexColor",
                description: "标准化十六进制颜色，去除非法字符并补全缩写。",
                params: [{"name":"value","type":"string","required":true,"description":""},{"name":"fallback","type":"any","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'#abc'"]
              },
              {
                name: "summarizeColorValue",
                description: "对颜色值提取亮度、色相等特征并生成摘要。",
                params: [{"name":"value","type":"string | RgbColor | RgbaColor | HslColor","required":true,"description":""},{"name":"fallback","type":"any","required":false,"description":""}],
                returns: {"type":"ColorValueSummary","description":""},
                defaultTestArgs: ["'#ff0000'"]
              },
              {
                name: "summarizeColorPalette",
                description: "生成色板组合的关键统计信息。",
                params: [{"name":"values","type":"readonly (string | RgbColor | RgbaColor)[]","required":true,"description":""}],
                returns: {"type":"ColorPaletteSummary","description":""},
                defaultTestArgs: ["['#ff0000', '#00ff00', '#0000ff']"]
              }
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
              {
                name: "compareValues",
                description: "对多种数据类型执行标准比较逻辑（相等、大小等）。",
                params: [{"name":"left","type":"ComparableValue","required":true,"description":""},{"name":"right","type":"ComparableValue","required":true,"description":""},{"name":"directionOrOptions","type":"SortDirection | CompareValueOptions","required":false,"description":""}],
                returns: {"type":"number","description":""},
                defaultTestArgs: ["10","20","'asc'"]
              },
              {
                name: "sortByValue",
                description: "增强的属性安全排序实现，支持正逆向排序。",
                params: [{"name":"items","type":"readonly T[]","required":true,"description":""},{"name":"getValue","type":"(item: T) => ComparableValue","required":true,"description":""},{"name":"directionOrOptions","type":"SortDirection | CompareValueOptions","required":false,"description":""}],
                returns: {"type":"T[]","description":""},
                defaultTestArgs: ["[{a:2}, {a:1}]","item => item.a","'asc'"]
              },
              {
                name: "toggleSortDirection",
                description: "翻转当前的排序方向（asc <-> desc）。",
                params: [{"name":"direction","type":"unknown","required":true,"description":""},{"name":"fallback","type":"SortDirection","required":false,"description":""}],
                returns: {"type":"SortDirection","description":""},
                defaultTestArgs: ["'asc'"]
              },
              {
                name: "createSortControlsReport",
                description: "分析当前的排序设置，并给出 UI 面板应该展示的状态。",
                params: [{"name":"current","type":"SortState<K> | null | undefined","required":true,"description":""},{"name":"keys","type":"readonly K[]","required":true,"description":""},{"name":"options","type":"SortControlSummaryOptions<K>","required":false,"description":""}],
                returns: {"type":"SortControlsReport<K>","description":""},
                defaultTestArgs: ["[{key: 'name', direction: 'asc'}]"]
              }
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
    sourceFiles: splitFiles("csv", ["types", "core", "parse", "stringify", "summary"]),
    splitStatus: "split",
    description: "CSV/TSV 解析、自动分隔符、对象化、表格摘要和公式注入防护导出。",
    functions: [
              {
                name: "parseCsv",
                description: "基础的 CSV 字符串转二维数组实现。",
                params: [{"name":"text","type":"string","required":true,"description":""},{"name":"options","type":"string | CsvParseOptions","required":false,"description":""}],
                returns: {"type":"string[][]","description":""},
                throws: ["当 CSV 格式严重损坏或包含无法解析的字符时，可能抛出语法异常。"],
                defaultTestArgs: ["'id,name\\n1,Alice\\n2,Bob'","','"]
              },
              {
                name: "stringifySpreadsheetCsvRows",
                description: "安全序列化 CSV 并转义 Excel 危险公式注入前缀。",
                params: [{"name":"rows","type":"readonly CsvRow[]","required":true,"description":""},{"name":"options","type":"CsvSpreadsheetStringifyRowsOptions","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["[['1', '2'], ['3', '4']]"]
              },
              {
                name: "summarizeCsvCells",
                description: "对一系列单元格的值类型分布进行直观摘要。",
                params: [{"name":"rows","type":"readonly (readonly CsvValue[])[]","required":true,"description":""},{"name":"delimiter","type":"any","required":false,"description":""}],
                returns: {"type":"CsvCellSummary","description":""},
                defaultTestArgs: ["['A', 'B', 'C']"]
              },
              {
                name: "summarizeCsvTable",
                description: "快速分析已解析表格的行列与数据有效性。",
                params: [{"name":"rows","type":"readonly (readonly string[])[]","required":true,"description":""},{"name":"hasHeader","type":"any","required":false,"description":""}],
                returns: {"type":"CsvTableSummary","description":""},
                defaultTestArgs: ["[['id', 'name'], ['1', 'Alice']]"]
              },
              {
                name: "parseCsvAutoWithSummary",
                description: "带有分隔符自动探测与行列预警机制的 CSV 解析。",
                params: [{"name":"text","type":"string","required":true,"description":""},{"name":"options","type":"CsvAutoParseOptions","required":false,"description":""}],
                returns: {"type":"CsvParseResult","description":""},
                defaultTestArgs: ["'a;b;c\\n1;2;3'"]
              },
              {
                name: "parseCsvObjectsAutoWithSummary",
                description: "将首行视为表头，将 CSV 解析为包含对象的对象数组摘要。",
                params: [{"name":"text","type":"string","required":true,"description":""},{"name":"options","type":"CsvAutoParseObjectsOptions","required":false,"description":""}],
                returns: {"type":"CsvParseObjectsResult","description":""},
                defaultTestArgs: ["'id,value\\n1,100\\n2,200'"]
              }
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
    sourceFiles: splitFiles("date", ["types", "core", "date-only", "format", "boundary", "compare", "range", "preset", "list", "timestamp"]),
    splitStatus: "split",
    description: "日期格式化、范围摘要、预设区间、日期列表、状态判断和带日期文件名。",
    functions: [
              {
                name: "summarizeDateStatus",
                description: "根据传入基准时间判断当前属于什么时态阶段。",
                params: [{"name":"value","type":"DateInput","required":true,"description":""},{"name":"baseDate","type":"DateInput","required":false,"description":""}],
                returns: {"type":"DateStatusSummary","description":""},
                defaultTestArgs: ["new Date()"]
              },
              {
                name: "formatDateOnly",
                description: "对常见日期类型执行简单的 YYYY-MM-DD 格式化。",
                params: [{"name":"value","type":"DateInput","required":true,"description":""},{"name":"fallback","type":"any","required":false,"description":""}],
                returns: {"type":"string","description":""},
                throws: ["当传入一个完全无法识别的非法日期字符串并且未提供降级容错时可能会抛出异常。"],
                defaultTestArgs: ["new Date()","'YYYY-MM-DD'"]
              },
              {
                name: "getDateRangePresetValue",
                description: "根据预设快捷键（如近7天、本月）计算精确日期区间。",
                params: [{"name":"key","type":"DateRangePresetKey","required":true,"description":""},{"name":"baseDate","type":"DateInput","required":false,"description":""}],
                returns: {"type":"NormalizedDateRange","description":""},
                defaultTestArgs: ["'last7Days'"]
              },
              {
                name: "summarizeDateRange",
                description: "对包含起止的日期对象生成持续天数等概要。",
                params: [{"name":"range","type":"DateRangeLike","required":true,"description":""},{"name":"separator","type":"any","required":false,"description":""},{"name":"fallback","type":"any","required":false,"description":""},{"name":"durationOptions","type":"DateRangeDurationOptions","required":false,"description":""}],
                returns: {"type":"DateRangeSummary","description":""},
                defaultTestArgs: ["new Date('2026-01-01')","new Date('2026-12-31')"]
              },
              {
                name: "formatDateRangeSummary",
                description: "针对日期区间快速进行可读性字符串格式化输出。",
                params: [{"name":"summary","type":"DateRangeSummary","required":true,"description":""},{"name":"options","type":"FormatDateRangeSummaryOptions","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["{ startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), daysCount: 365 }"]
              },
              {
                name: "enumerateDateRangeValues",
                description: "枚举并返回区间内包含的所有离散日期。",
                params: [{"name":"range","type":"DateRangeLike","required":true,"description":""},{"name":"options","type":"EnumerateDateRangeOptions","required":false,"description":""}],
                returns: {"type":"string[]","description":""},
                defaultTestArgs: ["new Date('2026-01-01')","new Date('2026-01-05')"]
              }
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
              {
                name: "addDomEventListener",
                description: "注册 DOM 事件并返回一键销毁闭包，支持弱引用。",
                params: [{"name":"target","type":"EventTarget | null | undefined","required":true,"description":""},{"name":"type","type":"string","required":true,"description":""},{"name":"listener","type":"EventListenerOrEventListenerObject","required":true,"description":""},{"name":"options","type":"DomEventOptions","required":false,"description":""}],
                returns: {"type":"DomEventCleanup","description":""},
                defaultTestArgs: ["document.body","'click'","() => console.log('clicked')"]
              },
              {
                name: "mergeDomEventCleanups",
                description: "合并多个事件销毁闭包为一个。",
                params: [{"name":"cleanups","type":"readonly DomEventCleanup[]","required":true,"description":""}],
                returns: {"type":"DomEventCleanup","description":""},
                defaultTestArgs: ["() => console.log('cleanup1')","() => console.log('cleanup2')"]
              },
              {
                name: "summarizeRectInViewport",
                description: "分析一个 DOMRect 当前在视口内的交叉状态与面积。",
                params: [{"name":"rect","type":"DOMRect | null | undefined","required":true,"description":""},{"name":"root","type":"Window | null","required":false,"description":""}],
                returns: {"type":"RectViewportSummary","description":""},
                defaultTestArgs: ["{ top: 10, left: 10, bottom: 100, right: 100, width: 90, height: 90 }","{ innerWidth: 1920, innerHeight: 1080 }"]
              },
              {
                name: "isElementInViewport",
                description: "判断目标元素是否在当前视口内可见。",
                params: [{"name":"element","type":"Element | null | undefined","required":true,"description":""},{"name":"root","type":"Window | null","required":false,"description":""}],
                returns: {"type":"boolean","description":""},
                defaultTestArgs: ["document.body"]
              }
            ],
    snippets: ["addDomEventListener(window, 'resize', handler)", "summarizeRectInViewport(element.getBoundingClientRect(), window)"],
    examples: [
      { label: "矩形可见性", expression: "summarizeRectInViewport(rect, mockWindow)", value: browserUtilityExamples.rect },
      { label: "视口外矩形", expression: "summarizeRectInViewport(outsideRect, mockWindow)", value: browserUtilityExamples.rectOutside },
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
              {
                name: "safeDecodeBase64Utf8",
                description: "更安全的 Base64 到 UTF-8 解码机制，带 fallback。",
                params: [{"name":"value","type":"string","required":true,"description":""},{"name":"options","type":"SafeDecodeBase64Options","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'SGVsbG8='"]
              },
              {
                name: "summarizeEncodedText",
                description: "对各种编码的文本块生成编码安全性与大小特征摘要。",
                params: [{"name":"value","type":"string","required":true,"description":""}],
                returns: {"type":"EncodedTextSummary","description":""},
                defaultTestArgs: ["'Hello World'","'utf8'"]
              },
              {
                name: "createDataUrl",
                description: "基于数据内容快速拼接标准的 Data URI 字符串。",
                params: [{"name":"data","type":"string","required":true,"description":""},{"name":"mimeType","type":"any","required":false,"description":""},{"name":"encoding","type":"\"base64\" | \"text\"","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'text/plain'","'SGVsbG8='"]
              },
              {
                name: "summarizeDataUrl",
                description: "解析并验证给定 Data URI 的 mime-type 和大小。",
                params: [{"name":"value","type":"string","required":true,"description":""}],
                returns: {"type":"DataUrlSummary","description":""},
                defaultTestArgs: ["'data:text/plain;base64,SGVsbG8='"]
              }
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
              {
                name: "getErrorMessage",
                description: "智能从任意 error 载荷提取可读的 message 文本。",
                params: [{"name":"error","type":"unknown","required":true,"description":""},{"name":"fallback","type":"any","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["new Error('Something went wrong')"]
              },
              {
                name: "summarizeLogLines",
                description: "对聚合的日志片段生成严重度与分布概要。",
                params: [{"name":"lines","type":"readonly string[]","required":true,"description":""}],
                returns: {"type":"LogLinesSummary","description":""},
                defaultTestArgs: ["['Error 1', 'Error 2']"]
              },
              {
                name: "createErrorDisplayReport",
                description: "组装含有追踪 ID 等高级扩展的错误报告对象。",
                params: [{"name":"error","type":"unknown","required":true,"description":""},{"name":"options","type":"ErrorDisplayReportOptions","required":false,"description":""}],
                returns: {"type":"ErrorDisplayReport","description":""},
                defaultTestArgs: ["new Error('Network error')"]
              },
              {
                name: "createErrorDisplayReports",
                description: "批量格式化多种异构错误为统一集合报告。",
                params: [{"name":"errors","type":"readonly unknown[]","required":true,"description":""},{"name":"options","type":"ErrorDisplayReportOptions","required":false,"description":""}],
                returns: {"type":"ErrorDisplayReport[]","description":""},
                defaultTestArgs: ["[new Error('A'), new Error('B')]"]
              }
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
    sourceFiles: splitFiles("file", ["types", "constants", "mime", "accept", "identity", "list", "summary", "validation", "unique-names", "browser"]),
    splitStatus: "split",
    description: "文件类型、accept 规则、选择校验、大小摘要、去重、展示和浏览器选择降级。",
    functions: [
              {
                name: "summarizeFileAccept",
                description: "解析 MIME 和后缀，总结可接收的文件范畴。",
                params: [{"name":"accept","type":"FileAcceptInput","required":true,"description":""}],
                returns: {"type":"FileAcceptSummary","description":""},
                defaultTestArgs: ["'image/*,video/*'"]
              },
              {
                name: "matchesFileAccept",
                description: "校验一个给定的文件是否符合特定的 accept 规则。",
                params: [{"name":"file","type":"FileLike","required":true,"description":""},{"name":"accept","type":"FileAcceptInput","required":true,"description":""}],
                returns: {"type":"boolean","description":""},
                throws: ["当 accept 规则表达式存在语法错误时可能抛错。"],
                defaultTestArgs: ["{ type: 'image/png', name: 'test.png' }","'image/*'"]
              },
              {
                name: "createFileDeduplicationReport",
                description: "自动针对给定的文件集合依据哈希或尺寸排重并报告结果。",
                params: [{"name":"files","type":"FileListInput<T>","required":true,"description":""},{"name":"options","type":"FileDeduplicateOptions","required":false,"description":""}],
                returns: {"type":"FileDeduplicationReport<T>","description":""},
                defaultTestArgs: ["['a.txt', 'b.txt', 'a.txt']"]
              },
              {
                name: "summarizeFileSizes",
                description: "对多个文件的大小编制并统计分布比例。",
                params: [{"name":"files","type":"FileListInput<T>","required":true,"description":""}],
                returns: {"type":"FileSizeSummary<T>","description":""},
                defaultTestArgs: ["[1024, 2048, 5000]"]
              },
              {
                name: "createFileDisplaySummary",
                description: "针对某个展示卡片生成体积、格式与尺寸的信息。",
                params: [{"name":"files","type":"FileListInput<T>","required":true,"description":""},{"name":"options","type":"FormatFileDisplaySummaryOptions","required":false,"description":""}],
                returns: {"type":"FileDisplaySummary","description":""},
                defaultTestArgs: ["{ name: 'document.pdf', size: 1048576, type: 'application/pdf' }"]
              },
              {
                name: "createFileSelectionIntakeReport",
                description: "接收到选中文件后，生成总览报告和警告拦截清单。",
                params: [{"name":"files","type":"FileListInput<T>","required":true,"description":""},{"name":"options","type":"FileValidationOptions","required":false,"description":""}],
                returns: {"type":"FileSelectionIntakeReport<T>","description":""},
                defaultTestArgs: ["[{ name: 'a.png', size: 1000 }, { name: 'b.txt', size: 2000 }]"]
              }
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
              {
                name: "formatBytes",
                description: "执行格式化逻辑并返回可展示字符串。",
                params: [{"name":"bytes","type":"number","required":true,"description":""},{"name":"options","type":"FormatBytesOptions","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["1048576"]
              },
              {
                name: "formatDuration",
                description: "执行格式化逻辑并返回可展示字符串。",
                params: [{"name":"ms","type":"number","required":true,"description":""},{"name":"options","type":"FormatDurationOptions","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["3661000"]
              },
              {
                name: "formatPercent",
                description: "执行格式化逻辑并返回可展示字符串。",
                params: [{"name":"value","type":"number","required":true,"description":""},{"name":"options","type":"FormatPercentOptions","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["0.854"]
              },
              {
                name: "createSummaryItemsReport",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"inputs","type":"readonly SummaryItemInput<TMeta>[]","required":true,"description":""},{"name":"options","type":"CreateSummaryItemsReportOptions<TMeta>","required":false,"description":""}],
                returns: {"type":"SummaryItemsReport<TMeta>","description":""},
                defaultTestArgs: ["['Apple', 'Banana', 'Cherry']"]
              },
              {
                name: "createStatusSummaryItemsReport",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"inputs","type":"readonly StatusSummaryItemInput<TMeta>[]","required":true,"description":""},{"name":"options","type":"CreateSummaryItemsReportOptions<TMeta>","required":false,"description":""}],
                returns: {"type":"StatusSummaryItemsReport<TMeta>","description":""},
                defaultTestArgs: ["[{ status: 'success', text: 'A' }, { status: 'error', text: 'B' }]"]
              },
              {
                name: "formatTemplateWithReport",
                description: "执行格式化逻辑并返回可展示字符串。",
                params: [{"name":"template","type":"string","required":true,"description":""},{"name":"params","type":"Record<string, TemplateParamValue>","required":true,"description":""},{"name":"options","type":"FormatTemplateOptions","required":false,"description":""}],
                returns: {"type":"TemplateFormatReport","description":""},
                defaultTestArgs: ["'Hello {name}'","{ name: 'World' }"]
              }
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
              {
                name: "normalizeDomId",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"unknown","required":true,"description":""},{"name":"fallback","type":"any","required":false,"description":""},{"name":"separator","type":"any","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'123 Invalid ID!!'"]
              },
              {
                name: "createStableHashId",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"value","type":"string","required":true,"description":""},{"name":"prefix","type":"any","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'some-long-string-to-hash'"]
              },
              {
                name: "ensureUniqueDomId",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"unknown","required":true,"description":""},{"name":"existingIds","type":"readonly string[]","required":true,"description":""},{"name":"separator","type":"any","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'my-id'","['my-id', 'my-id-1']"]
              },
              {
                name: "summarizeUniqueIds",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"values","type":"readonly unknown[]","required":true,"description":""},{"name":"existingIds","type":"readonly string[]","required":false,"description":""},{"name":"separator","type":"any","required":false,"description":""}],
                returns: {"type":"UniqueIdsSummary","description":""},
                defaultTestArgs: ["['id1', 'id2', 'id1']"]
              }
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
              {
                name: "tryJsonStringify",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"unknown","required":true,"description":""},{"name":"spacing","type":"number","required":false,"description":""}],
                returns: {"type":"JsonStringifyResult","description":""},
                throws: ["当对象存在循环引用时将抛出 TypeError 异常。"],
                defaultTestArgs: ["{ a: 1, b: 2 }"]
              },
              {
                name: "safeJsonStringify",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"unknown","required":true,"description":""},{"name":"fallback","type":"any","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["{ circular: null }"]
              },
              {
                name: "getJsonStringifyErrorMessage",
                description: "内部核心工具方法。",
                params: [{"name":"result","type":"JsonStringifyResult","required":true,"description":""},{"name":"fallback","type":"any","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["{}"]
              },
              {
                name: "isJsonSerializable",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"unknown","required":true,"description":""}],
                returns: {"type":"boolean","description":""},
                defaultTestArgs: ["{ a: 1 }"]
              }
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
              {
                name: "parseKeyboardShortcut",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"string","required":true,"description":""}],
                returns: {"type":"KeyboardShortcut","description":""},
                defaultTestArgs: ["'Ctrl+Shift+A'"]
              },
              {
                name: "formatKeyboardShortcut",
                description: "执行格式化逻辑并返回可展示字符串。",
                params: [{"name":"shortcut","type":"string | KeyboardShortcut","required":true,"description":""},{"name":"options","type":"FormatKeyboardShortcutOptions","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["{ ctrlKey: true, shiftKey: true, key: 'A' }"]
              },
              {
                name: "toAriaKeyShortcuts",
                description: "内部核心工具方法。",
                params: [{"name":"shortcut","type":"string | KeyboardShortcut","required":true,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'Ctrl+A'"]
              },
              {
                name: "summarizeKeyboardShortcuts",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"shortcuts","type":"readonly (string | KeyboardShortcut)[]","required":true,"description":""},{"name":"options","type":"FormatKeyboardShortcutsOptions","required":false,"description":""}],
                returns: {"type":"KeyboardShortcutSummary","description":""},
                defaultTestArgs: ["['Ctrl+C', 'Ctrl+V']"]
              }
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
    sourceFiles: splitFiles("number", ["types", "core", "range", "list", "pagination"]),
    splitStatus: "split",
    description: "数值解析、范围归一化、步进、进度、分页、分桶和数列统计。",
    functions: [
              {
                name: "summarizeSteppedNumber",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"value","type":"unknown","required":true,"description":""},{"name":"options","type":"NormalizeSteppedNumberOptions","required":false,"description":""}],
                returns: {"type":"SteppedNumberSummary","description":""},
                defaultTestArgs: ["12","5"]
              },
              {
                name: "summarizeNumberList",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"values","type":"readonly unknown[]","required":true,"description":""}],
                returns: {"type":"NumberListSummary","description":""},
                defaultTestArgs: ["[10, 20, 5, 15]"]
              },
              {
                name: "summarizeNumberDistribution",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"values","type":"readonly unknown[]","required":true,"description":""},{"name":"buckets","type":"readonly NumberBucketDefinition[]","required":true,"description":""},{"name":"precision","type":"any","required":false,"description":""}],
                returns: {"type":"NumberDistributionSummary","description":""},
                defaultTestArgs: ["[1, 2, 2, 3, 3, 3]"]
              },
              {
                name: "summarizePagination",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"page","type":"number","required":true,"description":""},{"name":"pageSize","type":"number","required":true,"description":""},{"name":"total","type":"number","required":true,"description":""},{"name":"options","type":"PaginationSummaryOptions","required":false,"description":""}],
                returns: {"type":"PaginationSummary","description":""},
                defaultTestArgs: ["3","10","100"]
              },
              {
                name: "summarizeNumberRange",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"value","type":"unknown","required":true,"description":""},{"name":"min","type":"unknown","required":true,"description":""},{"name":"max","type":"unknown","required":true,"description":""},{"name":"precision","type":"any","required":false,"description":""}],
                returns: {"type":"NumberRangeSummary","description":""},
                defaultTestArgs: ["5","15"]
              },
              {
                name: "summarizeProgressRatio",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"current","type":"unknown","required":true,"description":""},{"name":"total","type":"unknown","required":true,"description":""},{"name":"precision","type":"any","required":false,"description":""}],
                returns: {"type":"ProgressRatioSummary","description":""},
                defaultTestArgs: ["45","100"]
              }
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
    sourceFiles: splitFiles("object", ["types", "core", "record", "defaults", "cleanup", "security", "path", "diff"]),
    splitStatus: "split",
    description: "record、路径读写、对象清理、defaults、patch、浅 diff 和深度 diff。",
    functions: [
              {
                name: "createObjectCleanupReport",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"value","type":"T","required":true,"description":""},{"name":"options","type":"ObjectCleanupOptions","required":false,"description":""}],
                returns: {"type":"ObjectCleanupReport<T>","description":""},
                defaultTestArgs: ["{ a: 1, b: null, c: undefined, d: '' }"]
              },
              {
                name: "formatObjectDiff",
                description: "执行格式化逻辑并返回可展示字符串。",
                params: [{"name":"entries","type":"readonly ObjectDiffEntry[]","required":true,"description":""},{"name":"options","type":"FormatObjectDiffOptions","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["{ a: 1 }","{ a: 2 }"]
              },
              {
                name: "createDeepObjectDiffReport",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"before","type":"unknown","required":true,"description":""},{"name":"after","type":"unknown","required":true,"description":""},{"name":"diffOptions","type":"ObjectDeepDiffOptions","required":false,"description":""},{"name":"patchOptions","type":"ObjectDiffPatchOptions","required":false,"description":""},{"name":"basePath","type":"string[]","required":false,"description":""}],
                returns: {"type":"ObjectDiffReport","description":""},
                defaultTestArgs: ["{ a: 1, b: 2 }","{ a: 1, b: 3, c: 4 }"]
              },
              {
                name: "getByPath",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"unknown","required":true,"description":""},{"name":"path","type":"ObjectPathInput","required":true,"description":""},{"name":"fallback","type":"T","required":false,"description":""}],
                returns: {"type":"T | undefined","description":""},
                defaultTestArgs: ["{ a: { b: { c: 42 } } }","'a.b.c'"]
              },
              {
                name: "setByPath",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"T","required":true,"description":""},{"name":"path","type":"ObjectPathInput","required":true,"description":""},{"name":"nextValue","type":"unknown","required":true,"description":""}],
                returns: {"type":"T","description":""},
                defaultTestArgs: ["{}","'a.b.c'","42"]
              },
              {
                name: "pickByPaths",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"unknown","required":true,"description":""},{"name":"paths","type":"readonly ObjectPathInput[]","required":true,"description":""}],
                returns: {"type":"AnyRecord","description":""},
                defaultTestArgs: ["{ a: 1, b: 2, c: 3 }","['a', 'c']"]
              }
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
              {
                name: "getRelativePath",
                description: "内部核心工具方法。",
                params: [{"name":"basePath","type":"string","required":true,"description":""},{"name":"targetPath","type":"string","required":true,"description":""},{"name":"options","type":"PathCompareOptions","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'/var/log'","'/var/log/nginx/access.log'"]
              },
              {
                name: "summarizePathRelation",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"basePath","type":"string","required":true,"description":""},{"name":"targetPath","type":"string","required":true,"description":""},{"name":"options","type":"PathCompareOptions","required":false,"description":""}],
                returns: {"type":"PathRelationSummary","description":""},
                defaultTestArgs: ["'/app/src'","'/app/src/utils/index.ts'"]
              },
              {
                name: "resolveSafeChildPath",
                description: "内部核心工具方法。",
                params: [{"name":"basePath","type":"string","required":true,"description":""},{"name":"relativePath","type":"string","required":true,"description":""},{"name":"options","type":"PathCompareOptions","required":false,"description":""}],
                returns: {"type":"string | null","description":""},
                defaultTestArgs: ["'/app/data'","'../etc/passwd'"]
              },
              {
                name: "sanitizeFileNameWithFallback",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"string","required":true,"description":""},{"name":"fallback","type":"any","required":false,"description":""},{"name":"replacement","type":"any","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'invalid<file>name:?.txt'"]
              },
              {
                name: "summarizePathSafety",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"path","type":"string","required":true,"description":""}],
                returns: {"type":"PathSafetySummary","description":""},
                defaultTestArgs: ["'/secure/dir/../../etc'"]
              },
              {
                name: "sanitizeFileNameWithFallback",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"string","required":true,"description":""},{"name":"fallback","type":"any","required":false,"description":""},{"name":"replacement","type":"any","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'invalid<file>name:?.txt'"]
              }
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
              {
                name: "rankSearchItemsWithSummary",
                description: "内部核心工具方法。",
                params: [{"name":"items","type":"readonly T[]","required":true,"description":""},{"name":"keyword","type":"string | readonly string[]","required":true,"description":""},{"name":"fields","type":"ReadonlyArray<SearchField<T>>","required":true,"description":""},{"name":"options","type":"RankSearchItemsOptions","required":false,"description":""}],
                returns: {"type":"RankedSearchItemsWithSummary<T>","description":""},
                defaultTestArgs: ["['apple', 'banana', 'apricot']","'ap'"]
              },
              {
                name: "partitionSearchQuery",
                description: "内部核心工具方法。",
                params: [{"name":"items","type":"readonly T[]","required":true,"description":""},{"name":"options","type":"SearchQueryOptions<T>","required":true,"description":""}],
                returns: {"type":"SearchQueryPartition<T>","description":""},
                defaultTestArgs: ["'tag:bug priority:high login crash'"]
              },
              {
                name: "createSearchResultDisplaySummary",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"summary","type":"SearchResultSummary","required":true,"description":""},{"name":"options","type":"FormatSearchResultSummaryOptions","required":false,"description":""}],
                returns: {"type":"SearchResultDisplaySummary","description":""},
                defaultTestArgs: ["{ items: ['a', 'b'], total: 10, query: 'test' }"]
              },
              {
                name: "normalizeSearchKeywordText",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"string | readonly string[]","required":true,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'  Hello   World  '"]
              }
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
              {
                name: "summarizeSelectionAvailability",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"availableKeys","type":"readonly K[]","required":true,"description":""},{"name":"selectedKeys","type":"readonly K[]","required":true,"description":""},{"name":"selectableKeys","type":"readonly K[]","required":false,"description":""}],
                returns: {"type":"SelectionAvailabilitySummary<K>","description":""},
                defaultTestArgs: ["['a', 'b', 'c']","['b', 'c', 'd']"]
              },
              {
                name: "createSelectionDisplaySummaryByKeys",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"availableKeys","type":"readonly K[]","required":true,"description":""},{"name":"selectedKeys","type":"readonly K[]","required":true,"description":""},{"name":"options","type":"FormatSelectionSummaryOptions","required":false,"description":""}],
                returns: {"type":"SelectionDisplaySummary","description":""},
                defaultTestArgs: ["['id1', 'id2']","[{id: 'id1', name: 'A'}, {id: 'id2', name: 'B'}, {id: 'id3', name: 'C'}]","item => item.id"]
              },
              {
                name: "createSelectionKeyReplacementReport",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"selectedKeys","type":"readonly K[]","required":true,"description":""},{"name":"replacements","type":"ReadonlyMap<K, K> | ReadonlyArray<readonly [K, K]>","required":true,"description":""}],
                returns: {"type":"SelectionKeyReplacementReport<K>","description":""},
                defaultTestArgs: ["['id1', 'id2']","'id1'","'id1-new'"]
              }
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
              {
                name: "createStorageKey",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"parts","type":"readonly StorageValue[]","required":true,"description":""},{"name":"separator","type":"any","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'user_settings'","'123'"]
              },
              {
                name: "parseStorageKey",
                description: "内部核心工具方法。",
                params: [{"name":"key","type":"string","required":true,"description":""},{"name":"separator","type":"any","required":false,"description":""}],
                returns: {"type":"string[]","description":""},
                defaultTestArgs: ["'monster:user_settings:123'"]
              },
              {
                name: "previewAndSummarizeStorageMutations",
                description: "内部核心工具方法。",
                params: [{"name":"items","type":"Record<string, StorageValue>","required":true,"description":""},{"name":"options","type":"StorageItemOptions","required":false,"description":""}],
                returns: {"type":"StorageMutationSummary","description":""},
                defaultTestArgs: ["{ key1: 'new_val', key2: null }","{ key1: 'old_val', key2: 'exist' }"]
              },
              {
                name: "summarizeStorageEntries",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"entries","type":"readonly StorageEntry[]","required":true,"description":""},{"name":"prefixSeparator","type":"any","required":false,"description":""}],
                returns: {"type":"StorageEntriesSummary","description":""},
                defaultTestArgs: ["{ a: '1', b: '2' }"]
              },
              {
                name: "createStorageTtlEnvelope",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"value","type":"T","required":true,"description":""},{"name":"ttlMs","type":"number","required":false,"description":""},{"name":"nowMs","type":"any","required":false,"description":""}],
                returns: {"type":"StorageTtlEnvelope<T>","description":""},
                defaultTestArgs: ["{ theme: 'dark' }","3600"]
              },
              {
                name: "summarizeStorageTtlEntries",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"entries","type":"readonly StorageTtlEntry[]","required":true,"description":""}],
                returns: {"type":"StorageTtlSummary","description":""},
                defaultTestArgs: ["{ a: { value: 1, expiresAt: Date.now() + 1000 } }"]
              }
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
              {
                name: "cleanDisplayText",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"unknown","required":true,"description":""},{"name":"options","type":"CleanDisplayTextOptions","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'  Too   much\\n\\nwhitespace  '"]
              },
              {
                name: "maskText",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"string","required":true,"description":""},{"name":"visibleStart","type":"any","required":false,"description":""},{"name":"visibleEnd","type":"any","required":false,"description":""},{"name":"mask","type":"any","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'13812345678'","3","4"]
              },
              {
                name: "truncateMiddleText",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"string","required":true,"description":""},{"name":"maxLength","type":"number","required":true,"description":""},{"name":"separator","type":"any","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'abcdefghijklmnopqrstuvwxyz'","10"]
              },
              {
                name: "splitBySeparators",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"string","required":true,"description":""},{"name":"separators","type":"ReadonlyArray<string>","required":false,"description":""},{"name":"normalize","type":"any","required":false,"description":""}],
                returns: {"type":"string[]","description":""},
                defaultTestArgs: ["'a,b;c|d'","[',', ';', '|']"]
              },
              {
                name: "summarizeText",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"value","type":"unknown","required":true,"description":""},{"name":"options","type":"TextSummaryOptions","required":false,"description":""}],
                returns: {"type":"TextSummary","description":""},
                defaultTestArgs: ["'A text with some words'"]
              },
              {
                name: "createTextPreview",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"value","type":"unknown","required":true,"description":""},{"name":"options","type":"TextPreviewOptions","required":false,"description":""}],
                returns: {"type":"TextPreviewSummary","description":""},
                defaultTestArgs: ["'This is a very long text that needs to be previewed'","15"]
              },
              {
                name: "formatTextPreview",
                description: "执行格式化逻辑并返回可展示字符串。",
                params: [{"name":"value","type":"unknown","required":true,"description":""},{"name":"options","type":"TextPreviewOptions","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'Short'"]
              }
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
    sourceFiles: splitFiles("tree", ["types", "core", "flatten", "lookup", "checked", "diff", "mutate", "visible", "list", "summary", "path-text"]),
    splitStatus: "split",
    description: "tree to list、list to tree、lookup、可见节点、勾选态、诊断和 by-key diff。",
    functions: [
              {
                name: "createTreeDiffByKeyReport",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"before","type":"readonly T[]","required":true,"description":""},{"name":"after","type":"readonly T[]","required":true,"description":""},{"name":"getChildren","type":"TreeChildrenGetter<T>","required":true,"description":""},{"name":"getKey","type":"TreeKeyGetter<T, K>","required":true,"description":""},{"name":"options","type":"TreeDiffByKeyOptions<T, K>","required":false,"description":""}],
                returns: {"type":"TreeDiffByKeyReport<T, K>","description":""},
                defaultTestArgs: ["[{id:1}]","[{id:2}]","item => item.id"]
              },
              {
                name: "treeToListWithoutChildren",
                description: "内部核心工具方法。",
                params: [{"name":"items","type":"readonly T[]","required":true,"description":""},{"name":"getChildren","type":"(item: T) => readonly T[] | undefined","required":true,"description":""},{"name":"childrenKey","type":"any","required":false,"description":""}],
                returns: {"type":"Array<Omit<T, C>>","description":""},
                defaultTestArgs: ["[{ id: 1, children: [{ id: 2 }] }]"]
              },
              {
                name: "treeToParentIdList",
                description: "内部核心工具方法。",
                params: [{"name":"items","type":"readonly T[]","required":true,"description":""},{"name":"options","type":"TreeParentIdListOptions<T, K, C>","required":true,"description":""}],
                returns: {"type":"Array<TreeParentIdListItem<T, K, C>>","description":""},
                defaultTestArgs: ["[{ id: 1, children: [{ id: 2 }] }]"]
              },
              {
                name: "listToTree",
                description: "内部核心工具方法。",
                params: [{"name":"items","type":"readonly T[]","required":true,"description":""},{"name":"options","type":"ListToTreeOptions<T, K, C>","required":true,"description":""}],
                returns: {"type":"Array<TreeWithChildren<T, C>>","description":""},
                defaultTestArgs: ["[{ id: 1, parentId: null }, { id: 2, parentId: 1 }]"]
              },
              {
                name: "diagnoseListTreeItems",
                description: "内部核心工具方法。",
                params: [{"name":"items","type":"readonly T[]","required":true,"description":""},{"name":"options","type":"Pick<ListToTreeOptions<T, K>, \"getId\" | \"getParentId\" | \"rootParentIds\">","required":true,"description":""}],
                returns: {"type":"ListTreeDiagnostic<T, K>","description":""},
                defaultTestArgs: ["[{ id: 1, parentId: 2 }, { id: 2, parentId: 1 }]"]
              },
              {
                name: "createTreeLookup",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"items","type":"readonly T[]","required":true,"description":""},{"name":"getChildren","type":"TreeChildrenGetter<T>","required":true,"description":""},{"name":"getKey","type":"TreeKeyGetter<T, K>","required":true,"description":""}],
                returns: {"type":"TreeLookup<T, K>","description":""},
                defaultTestArgs: ["[{ id: 1, children: [{ id: 2 }] }]"]
              },
              {
                name: "summarizeTreeByKey",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"items","type":"readonly T[]","required":true,"description":""},{"name":"getChildren","type":"TreeChildrenGetter<T>","required":true,"description":""},{"name":"getKey","type":"TreeKeyGetter<T, K>","required":true,"description":""}],
                returns: {"type":"TreeKeySummary<T, K>","description":""},
                defaultTestArgs: ["[{ id: 1, children: [{ id: 2 }] }]","item => item.id"]
              }
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
              {
                name: "appendQuery",
                description: "内部核心工具方法。",
                params: [{"name":"url","type":"string","required":true,"description":""},{"name":"params","type":"Record<string, QueryValue>","required":true,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'https://example.com'","{ ref: '123' }"]
              },
              {
                name: "normalizeUrlQuery",
                description: "内部核心工具方法。",
                params: [{"name":"url","type":"string","required":true,"description":""},{"name":"options","type":"NormalizeUrlQueryOptions","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'?a=1&b=2'"]
              },
              {
                name: "filterUrlQueryParams",
                description: "内部核心工具方法。",
                params: [{"name":"url","type":"string","required":true,"description":""},{"name":"options","type":"FilterUrlQueryParamsOptions","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'?a=1&b=2&c=3'","['a', 'c']"]
              },
              {
                name: "summarizeSearchParams",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"searchParams","type":"URLSearchParams","required":true,"description":""}],
                returns: {"type":"UrlQuerySummary","description":""},
                defaultTestArgs: ["new URLSearchParams('?a=1&b=2')"]
              },
              {
                name: "diffSearchParams",
                description: "内部核心工具方法。",
                params: [{"name":"before","type":"URLSearchParams","required":true,"description":""},{"name":"after","type":"URLSearchParams","required":true,"description":""}],
                returns: {"type":"UrlQueryDiffSummary","description":""},
                defaultTestArgs: ["new URLSearchParams('?a=1&b=2')","new URLSearchParams('?a=1&c=3')"]
              },
              {
                name: "createQueryKey",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"input","type":"SearchParamsInput","required":true,"description":""},{"name":"options","type":"NormalizeSearchParamsOptions","required":false,"description":""}],
                returns: {"type":"string","description":""},
                defaultTestArgs: ["'search'","'keyword'"]
              },
              {
                name: "summarizeUrl",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"input","type":"string","required":true,"description":""},{"name":"options","type":"UrlSummaryOptions","required":false,"description":""}],
                returns: {"type":"UrlSummary","description":""},
                defaultTestArgs: ["'https://example.com/path?a=1'"]
              },
              {
                name: "summarizeUrls",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"inputs","type":"readonly string[]","required":true,"description":""},{"name":"options","type":"UrlSummaryOptions","required":false,"description":""}],
                returns: {"type":"UrlListSummary","description":""},
                defaultTestArgs: ["['https://a.com', 'https://b.com']"]
              }
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
              {
                name: "createRecordValidationSchema",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"validators","type":"ValidatorMap<T>","required":true,"description":""},{"name":"labels","type":"Partial<Record<keyof T, string>>","required":false,"description":""}],
                returns: {"type":"RecordValidationSchema<T>","description":""},
                defaultTestArgs: ["{ name: [createRequiredValidator('name')] }"]
              },
              {
                name: "createRecordValidationSchemaReport",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"value","type":"T","required":true,"description":""},{"name":"schema","type":"RecordValidationSchema<T>","required":true,"description":""},{"name":"options","type":"Omit<FormatRecordValidationSummaryOptions<T>, \"formatField\">","required":false,"description":""}],
                returns: {"type":"RecordValidationSchemaReport<T>","description":""},
                defaultTestArgs: ["{ name: '' }","{ name: [createRequiredValidator('name')] }"]
              },
              {
                name: "runValidators",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"T","required":true,"description":""},{"name":"validators","type":"readonly Validator<T>[]","required":true,"description":""}],
                returns: {"type":"ValidationResult","description":""},
                defaultTestArgs: ["'test@example.com'","[createRequiredValidator('email'), createEmailValidator('email')]"]
              },
              {
                name: "createRequiredValidator",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"message","type":"string","required":true,"description":""}],
                returns: {"type":"Validator<T>","description":""},
                defaultTestArgs: ["'username'"]
              },
              {
                name: "createEmailValidator",
                description: "基于参数构建一个复杂的数据实例报告。",
                params: [{"name":"message","type":"string","required":true,"description":""}],
                returns: {"type":"Validator<string>","description":""},
                defaultTestArgs: ["'email'"]
              }
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
              {
                name: "isNil",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"unknown","required":true,"description":""}],
                returns: {"type":"value is null | undefined","description":""},
                defaultTestArgs: ["null"]
              },
              {
                name: "isNonEmptyValue",
                description: "内部核心工具方法。",
                params: [{"name":"value","type":"T","required":true,"description":""}],
                returns: {"type":"value is Exclude<T, EmptyValue>","description":""},
                defaultTestArgs: ["''"]
              },
              {
                name: "parseBooleanWithReport",
                description: "内部核心工具方法。",
                params: [{"name":"input","type":"unknown","required":true,"description":""},{"name":"fallback","type":"any","required":false,"description":""}],
                returns: {"type":"ParsedValueReport<boolean>","description":""},
                defaultTestArgs: ["'true'"]
              },
              {
                name: "parseIntegerWithReport",
                description: "内部核心工具方法。",
                params: [{"name":"input","type":"unknown","required":true,"description":""},{"name":"fallback","type":"any","required":false,"description":""}],
                returns: {"type":"ParsedValueReport<number>","description":""},
                defaultTestArgs: ["'123.45'"]
              },
              {
                name: "parseEnumListWithReport",
                description: "内部核心工具方法。",
                params: [{"name":"values","type":"unknown","required":true,"description":""},{"name":"options","type":"readonly T[]","required":true,"description":""},{"name":"fallback","type":"T","required":true,"description":""}],
                returns: {"type":"ParsedValueListReport<T>","description":""},
                defaultTestArgs: ["['A', 'C']","['A', 'B']"]
              },
              {
                name: "summarizeValueTypes",
                description: "执行结构化特征分析并返回报告。",
                params: [{"name":"values","type":"readonly unknown[]","required":true,"description":""}],
                returns: {"type":"ValueTypeListSummary","description":""},
                defaultTestArgs: ["{ a: 1, b: 'str', c: null }"]
              }
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
  const qualityReports = entries.map((entry) => getUtilityDocQualityReport(entry));

  return {
    moduleCount: entries.length,
    splitCount: entries.filter((entry) => entry.splitStatus === "split").length,
    singleCount: entries.filter((entry) => entry.splitStatus === "single").length,
    functionCount: entries.reduce((total, entry) => total + entry.functions.length, 0),
    exampleCount: entries.reduce((total, entry) => total + entry.examples.length, 0),
    boundaryCaseCount: entries.reduce((total, entry) => total + entry.boundaryCases.length, 0),
    sandboxReadyCount: entries.reduce((total, entry) => total + entry.functions.filter((fn) => fn.sandbox?.enabled !== false).length, 0),
    averageQualityScore: Math.round(qualityReports.reduce((total, report) => total + report.score, 0) / Math.max(qualityReports.length, 1)),
  };
}

export function getUtilityDocQualityReport(entry: UtilityDocEntry): UtilityDocQualityReport {
  const functionCount = entry.functions.length;
  const missingDescriptionCount = entry.functions.filter((fn) => isGeneratedDescription(fn.description) || !fn.description.trim()).length;
  const missingParamDescriptionCount = entry.functions.reduce((total, fn) => {
    return total + (fn.params?.filter((param) => !param.description.trim()).length ?? 0);
  }, 0);
  const sandboxReadyCount = entry.functions.filter((fn) => fn.sandbox?.enabled !== false).length;
  const sandboxPolicyCoveredCount = entry.functions.filter((fn) => fn.sandbox?.enabled !== false || Boolean(fn.sandbox?.reason)).length;
  const exampleCoverage = Math.min(1, entry.examples.length / Math.max(1, Math.ceil(functionCount / 3)));
  const boundaryCoverage = Math.min(1, entry.boundaryCases.length / Math.max(1, Math.ceil(functionCount / 3)));
  const sourceCoverage = Math.min(1, entry.sourceFiles.length / Math.max(1, entry.splitStatus === "split" ? 3 : 1));
  const descriptionScore = 1 - Math.min(1, missingDescriptionCount / Math.max(functionCount, 1));
  const paramScore = 1 - Math.min(1, missingParamDescriptionCount / Math.max(entry.functions.reduce((total, fn) => total + (fn.params?.length ?? 0), 0), 1));
  const sandboxScore = sandboxPolicyCoveredCount / Math.max(functionCount, 1);
  const score = Math.round((descriptionScore * 0.26 + paramScore * 0.2 + exampleCoverage * 0.18 + boundaryCoverage * 0.18 + sourceCoverage * 0.1 + sandboxScore * 0.08) * 100);

  return {
    moduleKey: entry.key,
    functionCount,
    sourceFileCount: entry.sourceFiles.length,
    exampleCount: entry.examples.length,
    boundaryCaseCount: entry.boundaryCases.length,
    sandboxReadyCount,
    missingDescriptionCount,
    missingParamDescriptionCount,
    score,
    level: score >= 90 ? "excellent" : score >= 75 ? "good" : "review",
  };
}
