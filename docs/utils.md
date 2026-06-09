# 工具函数手册

`src/utils` 是前端纯工具函数层。工具函数应保持无 Vue、无 Tauri、无 Store、无 Service 依赖；页面和业务层通过 `src/utils/index.ts` 统一导入。

## 目录规则

- 大文件按 `src/utils/<module>/` 拆分，保留同名兼容入口，例如 `src/utils/number.ts` 只做 `export * from "./number/index"`。
- 子文件按功能划分：`types.ts`、`core.ts`、`range.ts`、`list.ts`、`pagination.ts` 等。
- 模块内部可以相对导入同目录能力；外部调用优先从 `src/utils` 或 `src/utils/<module>` barrel 导入。
- 拆分不得改变公开函数名、参数语义和返回结构。

## Number

位置：

- `src/utils/number.ts`：兼容入口。
- `src/utils/number/index.ts`：模块 barrel。
- `src/utils/number/types.ts`：类型定义。
- `src/utils/number/core.ts`：数值解析、整数归一化、clamp、step、随机数、排序等基础能力。
- `src/utils/number/range.ts`：范围映射、百分比、区间交集、进度和 delta 摘要。
- `src/utils/number/list.ts`：数值列表统计、分桶定义、分布统计。
- `src/utils/number/pagination.ts`：分页归一化、可见页码、页容量选项。

典型用例：

```ts
import {
  createNumberRangeBuckets,
  summarizeNumberDistribution,
  summarizeNumberRange,
  summarizePagination,
} from "@/utils";

const range = summarizeNumberRange("128", 0, 100);
const buckets = createNumberRangeBuckets([0, 10, 20, 50, 100], { includeOuterBuckets: true });
const distribution = summarizeNumberDistribution([12, "18", "", null, "非法数字"], buckets, 1);
const page = summarizePagination(99, 20, 45);
```

边界行为：

- `toFiniteNumber` 使用 `Number(value)`，所以空字符串会解析为 `0`；需要排除空字符串时先用 `value` 或 `object` 模块做空值归一化。
- `createNumberRangeBuckets` 默认生成连续区间；内部 bucket 默认左闭右开，最后一个内部 bucket 右闭，避免边界重复计数。
- `summarizePagination` 会把超出范围的页码归一化到合法页码。
- `summarizeNumberDistribution` 会分别输出 `invalidCount` 和 `unmatchedCount`，用于区分无法解析的输入和没有命中任何 bucket 的合法数值。

Playground 与用例：

- Playground：`/playground` -> `工具函数` -> `number`。
- 独立用例：`src/utils/examples/number.ts`。

## CSV

位置：

- `src/utils/csv.ts`：兼容入口。
- `src/utils/csv/index.ts`：模块 barrel。
- `src/utils/csv/types.ts`：类型定义。
- `src/utils/csv/core.ts`：delimiter、BOM、cell 转义、公式样式 cell 判断。
- `src/utils/csv/stringify.ts`：行/表格序列化、TSV、Spreadsheet-safe CSV。
- `src/utils/csv/parse.ts`：CSV/TSV 解析、header 归一化、record 转换。
- `src/utils/csv/summary.ts`：行、cell、列、record、自动 delimiter 和 parse summary。

典型用例：

```ts
import {
  parseCsv,
  parseCsvObjectsAutoWithSummary,
  stringifySpreadsheetCsvRows,
  summarizeCsvTable,
} from "@/utils";

const rows = parseCsv('"标题","第一行\n第二行"');
const table = summarizeCsvTable(rows, true);
const records = parseCsvObjectsAutoWithSummary("name;score\nalpha;12");
const safeCsv = stringifySpreadsheetCsvRows([["名称", "=SUM(A1:A2)"]]);
```

边界行为：

- `parseCsv` 支持 quoted cell 内多行内容、逗号和双引号转义。
- `detectCsvDelimiter` 统计候选分隔符时会忽略引号内的 delimiter。
- 中文路径和 Windows 路径按普通文本保留，不做路径层面的归一化。
- `stringifySpreadsheetCsvRows` 会对 `= + - @` 开头的公式样式 cell 加前缀，降低电子表格公式注入风险。

Playground 与用例：

- 独立用例：`src/utils/examples/csv.ts`。
- Playground 后续接入 `工具函数` 分组。

## 后续拆分批次

优先级按当前文件规模和依赖面排序：

1. `array`：基础数组、集合/Map、分组、分页、diff、筛选、排序。
2. `object`：record 基础、patch/defaults/cleanup、path、diff/dashboard、deep diff。
3. `tree`：flatten/list、lookup、diff、selection、filter、summary。
4. `date` / `url` / `string`：按范围、解析、格式化、summary 拆分。
5. Playground 扩展：继续接入 `csv`、`array`、`object`、`tree` 模块典型用例。

## 验证要求

每次拆分或新增工具函数后至少运行：

```bash
npm run typecheck
npm run check:architecture
git diff --check -- <touched files>
```

涉及 Playground UI 时补浏览器验证；涉及复杂边界时补 `src/utils/examples/*` 或后续测试脚本。
