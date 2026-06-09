# 工具函数手册

`src/utils` 是前端纯工具函数层。工具函数必须保持无 Vue、无 Tauri、无 Store、无 Service 依赖；页面和业务层优先通过 `src/utils/index.ts` 或模块 barrel 导入。

## 目录规则

- 大文件按 `src/utils/<module>/` 拆分，并保留同名兼容入口，例如 `src/utils/array.ts` 只做 `export * from "./array/index"`。
- 子文件按功能划分，常见结构为 `types.ts`、`core.ts`、`diff.ts`、`summary.ts`、`pagination.ts`、`path.ts` 等。
- 拆分不得改变公开函数名、参数语义、返回结构和边界行为。
- 独立用例放在 `src/utils/examples/*`，用于 Playground 展示，也可后续迁移为单元测试。

## Number

位置：

- `src/utils/number.ts`：兼容入口。
- `src/utils/number/types.ts`：数值、范围、分页、分布统计类型。
- `src/utils/number/core.ts`：数值解析、整数归一、clamp、step、随机数、排序。
- `src/utils/number/range.ts`：范围映射、百分比、区间交集、进度和 delta 摘要。
- `src/utils/number/list.ts`：数值列表统计、分桶、分布统计。
- `src/utils/number/pagination.ts`：分页归一、可见页码、页容量选项。

典型用例：

```ts
import { createNumberRangeBuckets, summarizeNumberDistribution, summarizePagination } from "@/utils";

const buckets = createNumberRangeBuckets([0, 10, 20, 50, 100], { includeOuterBuckets: true });
const distribution = summarizeNumberDistribution([12, "18", "", null, "invalid"], buckets, 1);
const page = summarizePagination(99, 20, 45);
```

边界行为：

- `toFiniteNumber` 使用 `Number(value)`，空字符串会解析为 `0`。
- 分桶默认内部区间左闭右开，最后一个内部区间右闭。
- `summarizePagination` 会把页码、页容量收敛到合法范围。

用例：`src/utils/examples/number.ts`

Playground：`/playground` -> `工具函数` -> `number`

## CSV

位置：

- `src/utils/csv.ts`：兼容入口。
- `src/utils/csv/types.ts`：CSV 行、列、解析、摘要类型。
- `src/utils/csv/core.ts`：delimiter、BOM、cell 转义、公式样式 cell 判断。
- `src/utils/csv/stringify.ts`：CSV/TSV 序列化、电子表格安全 CSV。
- `src/utils/csv/parse.ts`：CSV/TSV 解析、header 归一、record 转换。
- `src/utils/csv/summary.ts`：行、cell、列、record、自动 delimiter 和 parse summary。

典型用例：

```ts
import { parseCsv, parseCsvObjectsAutoWithSummary, stringifySpreadsheetCsvRows, summarizeCsvTable } from "@/utils";

const rows = parseCsv('"name","line 1\nline 2"');
const table = summarizeCsvTable(rows, true);
const records = parseCsvObjectsAutoWithSummary("name;score\nalpha;12");
const safeCsv = stringifySpreadsheetCsvRows([["name", "=SUM(A1:A2)"]]);
```

边界行为：

- `parseCsv` 支持 quoted cell 内的多行、逗号和双引号转义。
- `detectCsvDelimiter` 统计候选分隔符时会忽略引号内 delimiter。
- 中文路径和 Windows 路径作为普通文本保留。
- `stringifySpreadsheetCsvRows` 会给 `= + - @` 开头的公式样式 cell 加前缀，降低电子表格公式注入风险。

用例：`src/utils/examples/csv.ts`

Playground：`/playground` -> `工具函数` -> `csv`

## Array

位置：

- `src/utils/array.ts`：兼容入口。
- `src/utils/array/types.ts`：分页、分组、集合、diff、筛选、排序类型。
- `src/utils/array/core.ts`：数组归一、compact、首尾项、下标、查找、相邻项。
- `src/utils/array/set-map.ts`：去重、Set、Map、按 key 映射、集合合并。
- `src/utils/array/window.ts`：take/drop/window/chunk/zip/range/collapse middle。
- `src/utils/array/group.ts`：groupBy、keyBy、countBy、分组摘要。
- `src/utils/array/pagination.ts`：数组分页、分页摘要、列表视图 report。
- `src/utils/array/diff.ts`：集合 diff、 occurrence diff、index diff、keyed change diff。
- `src/utils/array/summary.ts`：数值数组统计。
- `src/utils/array/mutate.ts`：move/swap/insert/remove/update/replace/upsert/toggle。
- `src/utils/array/filter.ts`：partition、按值筛选、可选值筛选 report。
- `src/utils/array/sort.ts`：固定顺序排序、多规则稳定排序。

典型用例：

```ts
import { createArrayListViewReport, diffArraysByKeyChanges, groupByEntries, uniqueBy } from "@/utils";

const uniqueOwners = uniqueBy(tasks, (item) => item.owner);
const groups = groupByEntries(tasks, (item) => item.status);
const diff = diffArraysByKeyChanges(before, after, (item) => item.id);
const view = createArrayListViewReport(tasks, { filters, sortRules, page: 1, pageSize: 20 });
```

边界行为：

- 多数函数返回新数组；`pushLimitedItems/pushLimitedItem` 会原地修改传入数组。
- 空数组分页仍保持 `totalPages >= 1`，页码归一到 `1`。
- `OptionalValueFilter` 默认把 `null/undefined/""` 视为未激活，`0/false` 是有效筛选值。
- `uniqueBy` 保留首次出现；`uniqueByLast` 保留最后一次出现但输出保持原数组顺序。
- `diffArraysByKeyChanges` 遇到重复 key 时 `Map` 后写覆盖前写，同时记录 duplicate keys。

用例：`src/utils/examples/array.ts`

Playground：`/playground` -> `工具函数` -> `array`

## Object

位置：

- `src/utils/object.ts`：兼容入口。
- `src/utils/object/types.ts`：record、path、cleanup、patch、diff、deep diff 类型。
- `src/utils/object/core.ts`：record/plain object 判断。
- `src/utils/object/record.ts`：pick/omit、map/filter/partition、entries、patch、dirty、reset。
- `src/utils/object/defaults.ts`：defaults、merge records、merge report。
- `src/utils/object/cleanup.ts`：空值移除、deep cleanup、value summary、cleanup report。
- `src/utils/object/security.ts`：敏感 key 判断和 deep redact。
- `src/utils/object/path.ts`：path 解析、格式化、get/set/delete、flatten/unflatten、deep merge。
- `src/utils/object/diff.ts`：object diff、diff summary/report/dashboard、patch/apply、deep diff。

典型用例：

```ts
import { createDeepObjectDiffReport, getByPath, pickByPaths, setByPath } from "@/utils";

const value = getByPath(data, "profile.tags[1]");
const next = setByPath(data, "profile.settings.theme", "dark");
const picked = pickByPaths(next, ["profile.name", "profile.settings.theme"]);
const report = createDeepObjectDiffReport(before, after, { compareArraysByIndex: true });
```

边界行为：

- 空值只表示 `null | undefined | ""`；`0`、`false`、`[]`、`{}` 不是空值。
- `isRecord` 排除数组；`isPlainObject` 只接受普通对象或 `null` prototype 对象。
- `diffObjects` 默认把数组作为整体 changed；`diffObjectsDeep` 只有 `compareArraysByIndex: true` 才逐索引比较数组。
- path 空路径在 `setByPath/deleteByPath` 中是 no-op；数字 segment 会驱动数组容器创建。
- `objectPathToString` 是简单点号 join；需要转义展示时使用 `formatObjectPath`。

用例：`src/utils/examples/object.ts`

Playground：`/playground` -> `工具函数` -> `object`

## Tree

位置：

- `src/utils/tree.ts`：兼容入口。
- `src/utils/tree/types.ts`：tree、flat list、lookup、checked、diff、list diagnostic 类型。
- `src/utils/tree/core.ts`：children 访问、基础遍历、搜索、按 value 查询。
- `src/utils/tree/flatten.ts`：flatten、tree to list、parent id list、node/parent/children map。
- `src/utils/tree/lookup.ts`：key list、lookup、ancestor/descendant/path/sibling 查询、key resolve。
- `src/utils/tree/checked.ts`：checked key 归一、级联、半选、toggle。
- `src/utils/tree/diff.ts`：diff by key、summary、report。
- `src/utils/tree/mutate.ts`：按 key 更新、替换、删除、插入。
- `src/utils/tree/visible.ts`：expanded/visible/hidden keys、匹配展开、空 children 裁剪。
- `src/utils/tree/list.ts`：list to tree、诊断、缺失父级/重复 id/循环检测。
- `src/utils/tree/summary.ts`：节点数、叶子数、深度、summary。
- `src/utils/tree/path-text.ts`：树形文本路径解析。

典型用例：

```ts
import { createTreeDiffByKeyReport, diagnoseListTreeItems, treeToParentIdList } from "@/utils";

const rows = treeToParentIdList(nodes, { getId: (item) => item.id, getChildren: (item) => item.children });
const diagnostic = diagnoseListTreeItems(listRows, { getId: (item) => item.id, getParentId: (item) => item.parentId });
const diff = createTreeDiffByKeyReport(before, after, (item) => item.children, (item) => item.id);
```

边界行为：

- `getTreeChildren` 把 `undefined` 统一视为 `[]`。
- `flattenTree` 是深度优先前序，`depth` 从 `0` 开始，`path` 是每层 index 数组。
- `getTreeDepth` 返回层数，空树为 `0`，单层为 `1`。
- `createTreeLookup` 对重复 key 不抛错，Map 后写覆盖前写。
- `listToTree` 缺失 parent 会把节点当 root；诊断请使用 `diagnoseListTreeItems`。
- `diffTreesByKey` 默认内容比较是 `Object.is(beforeNode, afterNode)`。

用例：`src/utils/examples/tree.ts`

Playground：`/playground` -> `工具函数` -> `tree`

## JSON / Path

JSON 仍保留单文件 `src/utils/json.ts`，覆盖 parse/stringify、guard、summary、format/minify、clone。循环对象会让 `tryJsonStringify` 返回失败结果，`safeJsonStringify` 返回 fallback。

Path 仍保留单文件 `src/utils/path.ts`，覆盖 slash 归一、Windows/UNC 判断、join/resolve、相对路径、共同祖先、安全子路径、文件名清理。

典型用例：

```ts
import { resolveSafeChildPath, safeJsonStringify, summarizePathRelation, tryJsonStringify } from "@/utils";

const result = tryJsonStringify(circularObject);
const text = safeJsonStringify(circularObject, "{\"error\":\"circular\"}");
const relation = summarizePathRelation("C:\\work\\项目", "C:\\work\\项目\\报告\\明细.csv", { ignoreCase: true });
const safePath = resolveSafeChildPath("C:\\work\\项目", "报告\\明细.csv");
```

边界行为：

- JSON try/safe 系列不会向调用方抛出 stringify/parse 异常。
- `resolveSafeChildPath` 会拒绝绝对路径、UNC 路径和包含 `..` 的路径穿越文本。
- 中文路径和 Windows 路径按字符串工具处理，不触碰文件系统。

用例：`src/utils/examples/json.ts`、`src/utils/examples/path.ts`

Playground：`/playground` -> `工具函数` -> `json / path`

## 后续拆分建议

当前已完成 `number`、`csv`、`array`、`object`、`tree` 的 folder + functional files 拆分。后续如继续缩小单文件，优先考虑：

1. `file`：文件类型、accept、选择、去重、大小摘要、下载/读取。
2. `date` / `url` / `string`：按解析、格式化、范围、summary 拆分。
3. `storage` / `dom` / `selection`：按平台边界、选择状态和浏览器能力拆分。

## 验证要求

每次拆分或新增工具函数后至少运行：

```bash
npm run typecheck
npm run check:architecture
git diff --check -- <touched files>
```

涉及 Playground UI 时补浏览器验证；涉及复杂边界时补 `src/utils/examples/*` 或后续测试脚本。
