<script setup lang="ts">
import { computed } from "vue";
import { arrayUtilityBoundaryCases, arrayUtilityExamples } from "../../../utils/examples/array";
import { browserUtilityBoundaryCases, browserUtilityExamples } from "../../../utils/examples/browser";
import { businessUtilityBoundaryCases, businessUtilityExamples } from "../../../utils/examples/business";
import { csvUtilityBoundaryCases, csvUtilityExamples } from "../../../utils/examples/csv";
import { dataUtilityBoundaryCases, dataUtilityExamples } from "../../../utils/examples/data";
import { jsonUtilityBoundaryCases, jsonUtilityExamples } from "../../../utils/examples/json";
import { numberUtilityBoundaryCases, numberUtilityExamples } from "../../../utils/examples/number";
import { objectUtilityBoundaryCases, objectUtilityExamples } from "../../../utils/examples/object";
import { pathUtilityBoundaryCases, pathUtilityExamples } from "../../../utils/examples/path";
import { runtimeUtilityBoundaryCases, runtimeUtilityExamples } from "../../../utils/examples/runtime";
import { textUtilityBoundaryCases, textUtilityExamples } from "../../../utils/examples/text";
import { treeUtilityBoundaryCases, treeUtilityExamples } from "../../../utils/examples/tree";
import PlaygroundDemoSection from "./PlaygroundDemoSection.vue";

defineProps<{
  activeComponentKey: string;
}>();

const toText = (value: unknown) => {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const toBoundaryItems = (items: ReadonlyArray<{ key: string; title: string; input: string; expected: string }>) =>
  items.map((item) => ({
    key: item.key,
    label: item.title,
    value: item.expected,
    description: item.input,
  }));

const numberSummaryItems = computed(() => [
  { key: "finite", label: "有效数字", value: numberUtilityExamples.listSummary.finiteCount, status: "success" as const },
  { key: "invalid", label: "非法输入", value: numberUtilityExamples.listSummary.invalidCount, status: "warning" as const },
  { key: "sum", label: "合计", value: numberUtilityExamples.listSummary.sum },
  { key: "average", label: "平均值", value: numberUtilityExamples.listSummary.average.toFixed(2) },
  { key: "range", label: "范围夹取", value: `${numberUtilityExamples.range.value} -> ${numberUtilityExamples.range.clampedValue}`, status: "primary" as const },
  { key: "progress", label: "进度归一", value: numberUtilityExamples.progress.label, status: "danger" as const },
]);

const distributionRows = computed(() => numberUtilityExamples.distribution.buckets.map((bucket) => ({
  key: bucket.key,
  label: bucket.label,
  count: bucket.count,
  percent: `${bucket.percent}%`,
  values: bucket.values.join(", ") || "-",
})));

const distributionColumns = [
  { key: "label", title: "区间", width: "30%" },
  { key: "count", title: "数量", width: "16%" },
  { key: "percent", title: "占比", width: "16%" },
  { key: "values", title: "命中值", width: "38%", wrap: true },
];

const paginationItems = computed(() => [
  { key: "page", label: "归一页码", value: numberUtilityExamples.pagination.page },
  { key: "totalPages", label: "总页数", value: numberUtilityExamples.pagination.totalPages },
  { key: "range", label: "条目范围", value: `${numberUtilityExamples.pagination.startItemNumber}-${numberUtilityExamples.pagination.endItemNumber}` },
  { key: "pageSizes", label: "页容量选项", value: numberUtilityExamples.pageSizes.join(", ") },
]);

const csvSummaryItems = computed(() => [
  { key: "rows", label: "多行 CSV 行数", value: csvUtilityExamples.multilineTable.rowCount },
  { key: "columns", label: "列数", value: csvUtilityExamples.multilineTable.columnCount },
  { key: "delimiter", label: "自动分隔符", value: csvUtilityExamples.autoParse.delimiter === "\t" ? "\\t" : csvUtilityExamples.autoParse.delimiter },
  { key: "records", label: "对象记录数", value: csvUtilityExamples.autoRecords.records.length },
  { key: "quoted", label: "需引号字段", value: csvUtilityExamples.multilineCells.quotedCellCount },
  { key: "safe", label: "安全导出长度", value: csvUtilityExamples.spreadsheetSafeText.length },
]);

const csvColumnRows = computed(() => csvUtilityExamples.multilineTable.columns.map((column) => ({
  key: String(column.index),
  index: column.index,
  header: column.header || "-",
  nonEmptyCount: column.nonEmptyCount,
  uniqueCount: column.uniqueCount,
  values: column.values.join(" / ") || "-",
})));

const csvColumnColumns = [
  { key: "index", title: "#", width: "10%" },
  { key: "header", title: "表头", width: "22%" },
  { key: "nonEmptyCount", title: "非空", width: "14%" },
  { key: "uniqueCount", title: "去重", width: "14%" },
  { key: "values", title: "样例值", width: "40%", wrap: true },
];

const arraySummaryItems = computed(() => [
  { key: "unique", label: "唯一 owner", value: arrayUtilityExamples.uniqueOwners.length },
  { key: "groups", label: "状态分组", value: arrayUtilityExamples.groupedByStatus.length },
  { key: "changes", label: "Keyed changes", value: arrayUtilityExamples.keyedDiff.stats.totalChanges, status: "warning" as const },
  { key: "page", label: "分页页码", value: `${arrayUtilityExamples.paged.page}/${arrayUtilityExamples.paged.totalPages}` },
  { key: "filtered", label: "筛选结果", value: `${arrayUtilityExamples.listView.summary.filteredCount}/${arrayUtilityExamples.listView.summary.sourceCount}` },
  { key: "indexDiff", label: "索引变化", value: arrayUtilityExamples.indexedDiff.stats.totalChanges },
]);

const arrayDiffRows = computed(() => [
  { key: "added", type: "added", count: arrayUtilityExamples.keyedDiff.stats.added, keys: arrayUtilityExamples.keyedDiff.addedKeys.join(", ") || "-" },
  { key: "removed", type: "removed", count: arrayUtilityExamples.keyedDiff.stats.removed, keys: arrayUtilityExamples.keyedDiff.removedKeys.join(", ") || "-" },
  { key: "updated", type: "updated", count: arrayUtilityExamples.keyedDiff.stats.updated, keys: arrayUtilityExamples.keyedDiff.updatedKeys.join(", ") || "-" },
  { key: "moved", type: "moved", count: arrayUtilityExamples.keyedDiff.stats.moved, keys: arrayUtilityExamples.keyedDiff.movedKeys.join(", ") || "-" },
]);

const diffColumns = [
  { key: "type", title: "类型", width: "30%" },
  { key: "count", title: "数量", width: "20%" },
  { key: "keys", title: "Keys", width: "50%", wrap: true },
];

const objectSummaryItems = computed(() => [
  { key: "entries", label: "Diff entries", value: objectUtilityExamples.deepDiffReport.entries.length, status: "warning" as const },
  { key: "added", label: "Added", value: objectUtilityExamples.deepDiffReport.summary.stats.added },
  { key: "removed", label: "Removed", value: objectUtilityExamples.deepDiffReport.summary.stats.removed },
  { key: "changed", label: "Changed", value: objectUtilityExamples.deepDiffReport.summary.stats.changed },
  { key: "cleanup", label: "Cleanup keys", value: Object.keys(objectUtilityExamples.cleanupReport.value).join(", ") },
  { key: "picked", label: "Picked paths", value: Object.keys(objectUtilityExamples.pickedPaths).join(", ") },
]);

const objectDiffRows = computed(() => objectUtilityExamples.deepDiffReport.entries.map((entry, index) => ({
  key: `${entry.type}-${index}`,
  type: entry.type,
  path: entry.path.join(".") || "root",
  before: toText(entry.before),
  after: toText(entry.after),
})));

const objectDiffColumns = [
  { key: "type", title: "类型", width: "16%" },
  { key: "path", title: "路径", width: "28%", wrap: true },
  { key: "before", title: "Before", width: "28%", wrap: true },
  { key: "after", title: "After", width: "28%", wrap: true },
];

const treeSummaryItems = computed(() => [
  { key: "flat", label: "Tree to list", value: treeUtilityExamples.flatList.length },
  { key: "parentId", label: "ParentId rows", value: treeUtilityExamples.parentIdList.length },
  { key: "nodes", label: "Node count", value: treeUtilityExamples.summary.stats.nodeCount },
  { key: "leaves", label: "Leaf count", value: treeUtilityExamples.summary.stats.leafCount },
  { key: "issues", label: "List issues", value: treeUtilityExamples.diagnostic.stats.total, status: "warning" as const },
  { key: "changes", label: "Diff keys", value: treeUtilityExamples.diffReport.summary.changedKeys.join(", ") || "-" },
]);

const treeRows = computed(() => treeUtilityExamples.parentIdList.map((item) => ({
  key: item.id,
  id: item.id,
  parentId: item.parentId ?? "root",
  depth: item.depth,
  path: item.path.join("."),
})));

const treeColumns = [
  { key: "id", title: "ID", width: "25%" },
  { key: "parentId", title: "Parent", width: "25%" },
  { key: "depth", title: "Depth", width: "15%" },
  { key: "path", title: "Path", width: "35%", wrap: true },
];

const jsonSummaryItems = computed(() => [
  { key: "serializable", label: "普通对象可序列化", value: String(jsonUtilityExamples.serializable), status: "success" as const },
  { key: "circular", label: "循环对象可序列化", value: String(jsonUtilityExamples.circularSerializable), status: "danger" as const },
  { key: "ok", label: "循环 stringify ok", value: String(jsonUtilityExamples.circularResult.ok) },
  { key: "fallback", label: "Fallback", value: jsonUtilityExamples.circularFallback },
]);

const pathSummaryItems = computed(() => [
  { key: "inside", label: "Inside base", value: String(pathUtilityExamples.relation.inside), status: "success" as const },
  { key: "relative", label: "Relative path", value: pathUtilityExamples.relation.relativePath },
  { key: "safe", label: "Safe child", value: pathUtilityExamples.safeChild ?? "null" },
  { key: "unsafe", label: "Traversal child", value: pathUtilityExamples.unsafeChild ?? "null", status: "danger" as const },
  { key: "sanitized", label: "Sanitized name", value: pathUtilityExamples.sanitizedFileName },
  { key: "traversal", label: "Has traversal", value: String(pathUtilityExamples.traversalSafety.hasTraversal), status: "warning" as const },
]);

const runtimeSummaryItems = computed(() => [
  { key: "retry", label: "Retry attempts", value: runtimeUtilityExamples.retryOptions.maxAttempts },
  { key: "workers", label: "Batch workers", value: runtimeUtilityExamples.batchPlan.workerCount },
  { key: "settled", label: "Settled results", value: runtimeUtilityExamples.settledText, status: "warning" as const },
  { key: "contrast", label: "Color contrast", value: runtimeUtilityExamples.colorContrast.level, status: runtimeUtilityExamples.colorContrast.readable ? "success" as const : "danger" as const },
  { key: "palette", label: "Palette average", value: runtimeUtilityExamples.colorPalette.averageHex },
  { key: "range", label: "Date range", value: runtimeUtilityExamples.dateRangeText },
  { key: "dates", label: "Date list valid", value: `${runtimeUtilityExamples.dateList.validCount}/${runtimeUtilityExamples.dateList.totalCount}` },
  { key: "weekdays", label: "Weekdays", value: runtimeUtilityExamples.weekdays.join(" / ") },
]);

const textSummaryItems = computed(() => [
  { key: "chars", label: "Characters", value: textUtilityExamples.textSummary.characterCount },
  { key: "lines", label: "Lines", value: textUtilityExamples.textSummary.lineCount },
  { key: "preview", label: "Preview", value: textUtilityExamples.formattedPreview },
  { key: "keywords", label: "Keyword hits", value: `${textUtilityExamples.keywordSummary.matchedCount}/${textUtilityExamples.keywordSummary.keywordCount}` },
  { key: "dataUrl", label: "Data URL", value: `${textUtilityExamples.dataUrl.mimeType} / ${textUtilityExamples.dataUrl.encoding}` },
  { key: "stableId", label: "Stable ID", value: textUtilityExamples.stableId },
  { key: "uniqueIds", label: "Unique IDs", value: textUtilityExamples.uniqueIds.ids.join(", ") },
  { key: "shortcut", label: "Shortcut", value: textUtilityExamples.keyboard.label },
]);

const dataSummaryItems = computed(() => [
  { key: "files", label: "Files", value: dataUtilityExamples.fileDisplay.totalCount },
  { key: "duplicates", label: "Duplicate files", value: dataUtilityExamples.fileDeduplication.summary.duplicateCount, status: "warning" as const },
  { key: "intake", label: "Accepted files", value: `${dataUtilityExamples.fileIntake.summary.acceptedCount}/${dataUtilityExamples.fileIntake.summary.totalCount}` },
  { key: "storage", label: "Storage entries", value: dataUtilityExamples.storageSummary.keyCount },
  { key: "ttl", label: "TTL active", value: `${dataUtilityExamples.ttlSummary.activeCount}/${dataUtilityExamples.ttlSummary.ttlEntryCount}` },
  { key: "url", label: "URL query", value: `${dataUtilityExamples.url.queryCount} params` },
  { key: "invalidUrl", label: "Invalid URL", value: dataUtilityExamples.urlList.invalidCount, status: "danger" as const },
  { key: "queryDiff", label: "Query changed", value: dataUtilityExamples.queryDiff.changedKeys.join(", ") || "-" },
]);

const browserSummaryItems = computed(() => [
  { key: "platform", label: "Platform", value: browserUtilityExamples.environment.platform },
  { key: "viewport", label: "Viewport", value: `${browserUtilityExamples.environment.width}x${browserUtilityExamples.environment.height}` },
  { key: "breakpoint", label: "Breakpoint", value: browserUtilityExamples.breakpoints.breakpoint },
  { key: "media", label: "Media matches", value: browserUtilityExamples.mediaQueries.filter((item) => item.matches).length },
  { key: "clipboard", label: "Clipboard", value: browserUtilityExamples.clipboardText, status: "warning" as const },
  { key: "location", label: "Location", value: browserUtilityExamples.location.pathname },
  { key: "rect", label: "Rect visible", value: String(browserUtilityExamples.rect.partiallyVisible), status: "success" as const },
  { key: "languages", label: "Languages", value: browserUtilityExamples.capabilities.languages.join(", ") },
]);

const businessSummaryItems = computed(() => [
  { key: "sorted", label: "Largest item", value: businessUtilityExamples.sortedItems[0]?.title ?? "-" },
  { key: "sort", label: "Sort controls", value: businessUtilityExamples.sortControls.controls.length },
  { key: "search", label: "Search matches", value: `${businessUtilityExamples.search.summary.matchedCount}/${businessUtilityExamples.search.summary.totalCount}` },
  { key: "selection", label: "Selection", value: businessUtilityExamples.selection.label },
  { key: "unavailable", label: "Unavailable selected", value: businessUtilityExamples.selectionAvailability.unavailableSelectedCount, status: "warning" as const },
  { key: "validation", label: "Validation errors", value: businessUtilityExamples.validation.summary.errorCount, status: "danger" as const },
  { key: "errors", label: "Error reports", value: businessUtilityExamples.errorReports.length },
  { key: "template", label: "Template missing", value: businessUtilityExamples.template.missingKeys.join(", ") || "-" },
]);
</script>

<template>
  <section v-if="activeComponentKey === 'utils-number'" class="detail-stack">
    <PlaygroundDemoSection title="Number 工具函数" subtitle="数值解析、范围归一、分布统计和分页边界。" icon="Hash">
      <div class="utils-demo-grid">
        <BasePanel title="列表与边界摘要" subtitle="非法输入、空值和可解析字符串同时参与统计。">
          <BaseDescriptionList :items="numberSummaryItems" :columns="3" compact wrap-value aria-label="Number 工具函数摘要" />
        </BasePanel>

        <BasePanel title="数值分布" subtitle="分档默认左闭右开，最后一个内部区间右闭。">
          <BaseTable :columns="distributionColumns" :data="distributionRows" row-key="key" size="sm" :striped="false" wrap-cells aria-label="Number 分布统计" />
        </BasePanel>

        <BasePanel title="分页归一" subtitle="页码超出范围时会收敛到合法页码。">
          <BaseKeyValueList :items="paginationItems" :columns="2" compact wrap-value aria-label="Number 分页摘要" />
        </BasePanel>

        <BasePanel title="边界用例" subtitle="独立用例文件可直接复用到后续测试脚本。">
          <BaseKeyValueList :items="toBoundaryItems(numberUtilityBoundaryCases)" :columns="1" compact wrap-label wrap-value wrap-description aria-label="Number 边界用例" />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'utils-csv'" class="detail-stack">
    <PlaygroundDemoSection title="CSV 工具函数" subtitle="CSV/TSV 解析、自动分隔符、表格摘要和电子表格安全导出。" icon="FileSpreadsheet">
      <div class="utils-demo-grid">
        <BasePanel title="解析摘要" subtitle="覆盖多行引号、中文路径、Windows 路径和分号分隔。">
          <BaseDescriptionList :items="csvSummaryItems" :columns="3" compact wrap-value aria-label="CSV 工具函数摘要" />
        </BasePanel>

        <BasePanel title="列摘要" subtitle="表头、非空数量、去重数量和样例值。">
          <BaseTable :columns="csvColumnColumns" :data="csvColumnRows" row-key="key" size="sm" :striped="false" wrap-cells aria-label="CSV 列摘要" />
        </BasePanel>

        <BasePanel title="边界用例" subtitle="CSV 多行引号、自动分隔符和公式注入保护。">
          <BaseKeyValueList :items="toBoundaryItems(csvUtilityBoundaryCases)" :columns="1" compact wrap-label wrap-value wrap-description aria-label="CSV 边界用例" />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'utils-array'" class="detail-stack">
    <PlaygroundDemoSection title="Array 工具函数" subtitle="数组去重、分组、分页、筛选、排序和 diff。" icon="List">
      <div class="utils-demo-grid">
        <BasePanel title="数组摘要" subtitle="列表视图顺序为 filter -> sort -> paginate。">
          <BaseDescriptionList :items="arraySummaryItems" :columns="3" compact wrap-value aria-label="Array 工具函数摘要" />
        </BasePanel>

        <BasePanel title="Keyed diff" subtitle="按 id 比较新增、删除、更新和移动。">
          <BaseTable :columns="diffColumns" :data="arrayDiffRows" row-key="key" size="sm" :striped="false" wrap-cells aria-label="Array keyed diff" />
        </BasePanel>

        <BasePanel title="边界用例" subtitle="空数组、索引 diff、可选筛选和 keyed diff。">
          <BaseKeyValueList :items="toBoundaryItems(arrayUtilityBoundaryCases)" :columns="1" compact wrap-label wrap-value wrap-description aria-label="Array 边界用例" />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'utils-object'" class="detail-stack">
    <PlaygroundDemoSection title="Object 工具函数" subtitle="record 处理、path 访问、cleanup、patch 和 deep diff。" icon="Braces">
      <div class="utils-demo-grid">
        <BasePanel title="Object 摘要" subtitle="deep diff 支持数组按索引比较和忽略路径。">
          <BaseDescriptionList :items="objectSummaryItems" :columns="3" compact wrap-value aria-label="Object 工具函数摘要" />
        </BasePanel>

        <BasePanel title="Deep diff entries" subtitle="展示路径、变更类型和前后值。">
          <BaseTable :columns="objectDiffColumns" :data="objectDiffRows" row-key="key" size="sm" :striped="false" wrap-cells aria-label="Object deep diff" />
        </BasePanel>

        <BasePanel title="边界用例" subtitle="深层对象 diff、path 访问和空值清理。">
          <BaseKeyValueList :items="toBoundaryItems(objectUtilityBoundaryCases)" :columns="1" compact wrap-label wrap-value wrap-description aria-label="Object 边界用例" />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'utils-tree'" class="detail-stack">
    <PlaygroundDemoSection title="Tree 工具函数" subtitle="tree to list、list to tree、lookup、diagnostic 和 diff by key。" icon="GitFork">
      <div class="utils-demo-grid">
        <BasePanel title="Tree 摘要" subtitle="同一份树结构可转换为 flat list、parent id list 和 lookup。">
          <BaseDescriptionList :items="treeSummaryItems" :columns="3" compact wrap-value aria-label="Tree 工具函数摘要" />
        </BasePanel>

        <BasePanel title="Parent id list" subtitle="保留 depth 和 path，便于表格、面包屑和拖拽排序。">
          <BaseTable :columns="treeColumns" :data="treeRows" row-key="key" size="sm" :striped="false" wrap-cells aria-label="Tree parent id list" />
        </BasePanel>

        <BasePanel title="边界用例" subtitle="缺失父级、自引用、树形 diff 和 lookup 摘要。">
          <BaseKeyValueList :items="toBoundaryItems(treeUtilityBoundaryCases)" :columns="1" compact wrap-label wrap-value wrap-description aria-label="Tree 边界用例" />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'utils-json-path'" class="detail-stack">
    <PlaygroundDemoSection title="JSON / Path 工具函数" subtitle="循环 JSON、中文路径、Windows 路径和路径穿越边界。" icon="Route">
      <div class="utils-demo-grid">
        <BasePanel title="JSON 摘要" subtitle="try/safe 系列不抛出异常，循环对象返回错误或 fallback。">
          <BaseDescriptionList :items="jsonSummaryItems" :columns="2" compact wrap-value aria-label="JSON 工具函数摘要" />
        </BasePanel>

        <BasePanel title="Path 摘要" subtitle="Windows 路径会统一比较，安全子路径会阻止 .. 穿越。">
          <BaseDescriptionList :items="pathSummaryItems" :columns="2" compact wrap-value aria-label="Path 工具函数摘要" />
        </BasePanel>

        <BasePanel title="JSON 边界用例" subtitle="循环 JSON 和 fallback 行为。">
          <BaseKeyValueList :items="toBoundaryItems(jsonUtilityBoundaryCases)" :columns="1" compact wrap-label wrap-value wrap-description aria-label="JSON 边界用例" />
        </BasePanel>

        <BasePanel title="Path 边界用例" subtitle="中文文件名、Windows 相对路径和路径穿越阻断。">
          <BaseKeyValueList :items="toBoundaryItems(pathUtilityBoundaryCases)" :columns="1" compact wrap-label wrap-value wrap-description aria-label="Path 边界用例" />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'utils-runtime'" class="detail-stack">
    <PlaygroundDemoSection title="Async / Color / Date 工具函数" subtitle="异步批处理摘要、颜色对比与日期范围示例。" icon="Timer">
      <div class="utils-demo-grid">
        <BasePanel title="运行时摘要" subtitle="覆盖 async、color、date 的常用业务组合。">
          <BaseDescriptionList :items="runtimeSummaryItems" :columns="2" compact wrap-value aria-label="Runtime 工具函数摘要" />
        </BasePanel>

        <BasePanel title="边界用例" subtitle="失败任务、非法颜色和日期范围枚举。">
          <BaseKeyValueList :items="toBoundaryItems(runtimeUtilityBoundaryCases)" :columns="1" compact wrap-label wrap-value wrap-description aria-label="Runtime 边界用例" />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'utils-text'" class="detail-stack">
    <PlaygroundDemoSection title="String / Encoding / ID / Keyboard 工具函数" subtitle="文本清理、编码摘要、稳定 ID 和快捷键摘要。" icon="TextCursorInput">
      <div class="utils-demo-grid">
        <BasePanel title="文本与输入摘要" subtitle="覆盖文案预览、base64/data URL、DOM ID 和快捷键。">
          <BaseDescriptionList :items="textSummaryItems" :columns="2" compact wrap-value aria-label="Text 工具函数摘要" />
        </BasePanel>

        <BasePanel title="边界用例" subtitle="空文本、Unicode ID、非法 base64 和重复快捷键。">
          <BaseKeyValueList :items="toBoundaryItems(textUtilityBoundaryCases)" :columns="1" compact wrap-label wrap-value wrap-description aria-label="Text 边界用例" />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'utils-data'" class="detail-stack">
    <PlaygroundDemoSection title="File / Storage / URL 工具函数" subtitle="文件选择、Storage key/TTL 和 URL query 摘要。" icon="Files">
      <div class="utils-demo-grid">
        <BasePanel title="数据载体摘要" subtitle="覆盖文件去重、选择 intake、storage TTL 和 query diff。">
          <BaseDescriptionList :items="dataSummaryItems" :columns="2" compact wrap-value aria-label="Data 工具函数摘要" />
        </BasePanel>

        <BasePanel title="边界用例" subtitle="重复文件、空 storage value、过期 TTL 和非法 URL。">
          <BaseKeyValueList :items="toBoundaryItems(dataUtilityBoundaryCases)" :columns="1" compact wrap-label wrap-value wrap-description aria-label="Data 边界用例" />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'utils-browser'" class="detail-stack">
    <PlaygroundDemoSection title="Browser / Clipboard / DOM 工具函数" subtitle="浏览器能力、剪贴板结果和 DOM 可见区域摘要。" icon="PanelTop">
      <div class="utils-demo-grid">
        <BasePanel title="浏览器摘要" subtitle="通过 mock Window/Navigator/Location 展示 SSR 友好的能力判断。">
          <BaseDescriptionList :items="browserSummaryItems" :columns="2" compact wrap-value aria-label="Browser 工具函数摘要" />
        </BasePanel>

        <BasePanel title="边界用例" subtitle="剪贴板失败、断点匹配和 DOM rect 可见性。">
          <BaseKeyValueList :items="toBoundaryItems(browserUtilityBoundaryCases)" :columns="1" compact wrap-label wrap-value wrap-description aria-label="Browser 边界用例" />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>

  <section v-else-if="activeComponentKey === 'utils-business'" class="detail-stack">
    <PlaygroundDemoSection title="Compare / Error / Format / Search / Selection / Validation / Value 工具函数" subtitle="业务页面常见排序、搜索、选择、校验和值解析组合。" icon="Workflow">
      <div class="utils-demo-grid">
        <BasePanel title="业务通用摘要" subtitle="覆盖排序控制、搜索排名、选择可用性、校验和错误展示。">
          <BaseDescriptionList :items="businessSummaryItems" :columns="2" compact wrap-value aria-label="Business 工具函数摘要" />
        </BasePanel>

        <BasePanel title="边界用例" subtitle="缺失模板变量、非法 record、不可用选择项和枚举 fallback。">
          <BaseKeyValueList :items="toBoundaryItems(businessUtilityBoundaryCases)" :columns="1" compact wrap-label wrap-value wrap-description aria-label="Business 边界用例" />
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.utils-demo-grid {
  @apply grid gap-4 xl:grid-cols-2;
}
</style>
