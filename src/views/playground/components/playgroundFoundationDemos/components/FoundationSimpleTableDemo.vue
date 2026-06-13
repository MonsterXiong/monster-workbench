<script setup lang="ts">
import { ref } from "vue";
import BaseTable, { type BaseTableColumn } from "../../../../../components/common/BaseTable.vue";
import PlaygroundDemoSection from "../../PlaygroundDemoSection.vue";

const simpleTableColumns = [
  { key: "name", title: "组件", width: "32%" },
  { key: "usage", title: "用途", width: "34%" },
  { key: "status", title: "状态", width: "18%" },
  { key: "owner", title: "维护", width: "16%", align: "right" as const },
];

const simpleTableRows = [
  { name: "BaseButton", usage: "动作入口", status: "稳定", owner: "基础组" },
  { name: "BaseSearchInput", usage: "列表搜索", status: "稳定", owner: "基础组" },
  { name: "BasePagination", usage: "分页导航", status: "新增展示", owner: "数据组" },
  { name: "BaseTable", usage: "轻量表格", status: "待增强", owner: "数据组" },
];

const nestedTableColumns = [
  { key: "name", title: "组件", width: "22%" },
  { key: "meta.version", title: "版本", width: "13%", align: "center" as const },
  { key: "meta.owner", title: "负责人", width: "18%" },
  { key: "meta.trace", title: "追踪标识", wrap: true, ariaLabel: "组件追踪标识" },
];

const nestedTableRows = [
  {
    name: "BaseDescriptionList",
    meta: {
      id: "foundation-description-list",
      version: "0.0.3",
      owner: "基础组",
      trace: "trace://playground/foundation/BaseDescriptionList/long-readable-path-for-wrapping-check",
    },
  },
  {
    name: "BaseKeyValueList",
    meta: {
      id: "foundation-key-value-list",
      version: "0.0.3",
      owner: "基础组",
      trace: "trace://playground/foundation/BaseKeyValueList/sidebar-summary-and-detail-card",
    },
  },
  {
    name: "BaseTable",
    meta: {
      id: "foundation-table",
      version: "0.0.4",
      owner: "数据组",
      trace: "trace://playground/foundation/BaseTable/nested-key-and-long-cell-content",
    },
  },
];

const interactiveTableColumns: BaseTableColumn[] = [
  { key: "name", title: "组件", width: "190px", fixed: true, sortable: true },
  { key: "usage", title: "用途", width: "220px", sortable: true },
  { key: "status", title: "状态", width: "150px", sortable: true, sortOrders: ["ascending", "descending", null] },
  { key: "owner", title: "维护", width: "140px", align: "right" as const, fixed: "right" as const },
];

const nativeTableColumns: BaseTableColumn[] = [
  {
    key: "selection",
    title: "",
    type: "selection",
    width: "48px",
    fixed: "left",
    selectable: (row: { state: string }) => row.state !== "stable",
    reserveSelection: true,
  },
  { key: "index", title: "#", type: "index", width: "56px", fixed: "left", align: "center", index: (index) => index + 1 },
  { key: "detail", title: "", type: "expand", width: "48px" },
  { key: "name", title: "组件", minWidth: 180, fixed: "left", sortable: true, resizable: true },
  {
    key: "status",
    title: "状态",
    width: "150px",
    columnKey: "status",
    filterMultiple: false,
    filters: [
      { text: "稳定", value: "stable" },
      { text: "增强中", value: "enhancing" },
    ],
    filterMethod: (value: string, row: { state: string }) => row.state === value,
  },
  { key: "usage", title: "用途", minWidth: 240, formatter: (row: { usage: string }) => row.usage },
  { key: "owner", title: "维护", width: "140px", align: "right" as const },
];

const nativeTableRows = [
  { name: "BaseTable", usage: "过滤、当前行和原生表格能力透传", status: "增强中", state: "enhancing", owner: "数据组" },
  { name: "BaseDataTable", usage: "组合工具条、表格和分页", status: "增强中", state: "enhancing", owner: "数据组" },
  { name: "BasePagination", usage: "页码、跳页和页容量", status: "稳定", state: "stable", owner: "数据组" },
  { name: "BaseSearchInput", usage: "检索输入与清空", status: "稳定", state: "stable", owner: "基础组" },
];

const nativeTableRef = ref<InstanceType<typeof BaseTable> | null>(null);
const lastSortText = ref("默认按组件名升序");
const currentNativeRow = ref("BaseTable");
const lastFilterText = ref("未过滤");
const selectedNativeCount = ref(0);
const expandedNativeText = ref("未展开详情");
const hoveredNativeCellText = ref("未悬停单元格");
const nativeMethodText = ref("实例方法待触发");

const handleSortChange = ({ prop, order }: { prop: string; order: "ascending" | "descending" | null }) => {
  lastSortText.value = order ? `${prop} / ${order}` : "已清除排序";
};

const handleFilterChange = (payload: Record<string, string[]>) => {
  const status = payload.status?.[0];
  lastFilterText.value = status ? `状态过滤：${status}` : "未过滤";
};

const handleCurrentChange = (row: { name?: string } | null) => {
  currentNativeRow.value = row?.name || "未选择";
};

const handleRowClick = (row: { name?: string }) => {
  if (row.name) currentNativeRow.value = row.name;
};

const handleRowDblclick = (row: { name?: string }) => {
  currentNativeRow.value = row.name ? `${row.name} / 双击` : "双击行";
};

const handleSelectionChange = (selection: Array<{ name?: string }>) => {
  selectedNativeCount.value = selection.length;
};

const handleCellMouseEnter = (row: { name?: string }, column: unknown) => {
  const tableColumn = column as { label?: string; property?: string };
  hoveredNativeCellText.value = `${row.name || "当前行"} / ${tableColumn.label || tableColumn.property || "单元格"}`;
};

const handleCellMouseLeave = () => {
  hoveredNativeCellText.value = "已离开单元格";
};

const handleExpandChange = (row: { name?: string }, expanded: Array<unknown> | boolean) => {
  const expandedText = Array.isArray(expanded) ? `${expanded.length} 行展开` : expanded ? "已展开" : "已收起";
  expandedNativeText.value = `${row.name || "当前行"}：${expandedText}`;
};

const getNativeSummary = ({ columns, data }: { columns: Array<{ property?: string }>; data: typeof nativeTableRows }) => {
  return columns.map((column, index) => {
    if (index === 0) return "汇总";
    if (column.property === "status") return `${data.length} 项`;
    if (column.property === "owner") return "2 组";
    return "";
  });
};

const toggleNativeSelection = () => {
  nativeTableRef.value?.toggleAllSelection();
  nativeMethodText.value = "已调用 toggleAllSelection";
};

const clearNativeSelection = () => {
  nativeTableRef.value?.clearSelection();
  nativeMethodText.value = "已调用 clearSelection";
};

const setSecondNativeRow = () => {
  const nextRow = nativeTableRows[1];
  nativeTableRef.value?.setCurrentRow(nextRow);
  currentNativeRow.value = nextRow.name;
  nativeMethodText.value = `已定位到 ${nextRow.name}`;
};

const clearNativeSort = () => {
  nativeTableRef.value?.clearSort();
  nativeMethodText.value = "已调用 clearSort";
};
</script>

<template>
  <section class="detail-stack">
    <PlaygroundDemoSection title="轻量表格" subtitle="基础表格适合小型数据、嵌套面板和不需要完整工具条的列表。" icon="Table2">
      <div class="simple-table-grid">
        <BasePanel title="紧凑表格" subtitle="支持自定义单元格、条纹和 hover。">
          <BaseTable
            aria-label="紧凑组件表格"
            :columns="simpleTableColumns"
            :data="simpleTableRows"
            row-key="name"
            :selected-keys="['BasePagination']"
            size="sm"
          >
            <template #name="{ row }">
              <strong class="simple-table-name">{{ row.name }}</strong>
            </template>
            <template #status="{ row }">
              <BaseBadge :type="row.status === '稳定' ? 'success' : row.status === '待增强' ? 'warning' : 'primary'" variant="outline">
                {{ row.status }}
              </BaseBadge>
            </template>
          </BaseTable>
        </BasePanel>
        <BasePanel title="排序与固定列" subtitle="透传 Element Plus 的 defaultSort、sortable、fixed 和 sort-change。">
          <BaseTable
            caption="可排序固定列轻量表格"
            :columns="interactiveTableColumns"
            :data="simpleTableRows"
            row-key="name"
            :selected-keys="['BaseButton', 'BaseSearchInput']"
            :default-sort="{ prop: 'name', order: 'ascending' }"
            surface="muted"
            size="lg"
            empty-icon="SearchX"
            min-width="700px"
            @sort-change="handleSortChange"
          >
            <template #name="{ row }">
              <strong class="simple-table-name">{{ row.name }}</strong>
            </template>
            <template #status="{ row }">
              <BaseBadge :type="row.status === '稳定' ? 'success' : row.status === '待增强' ? 'warning' : 'primary'" variant="outline">
                {{ row.status }}
              </BaseBadge>
            </template>
            <template #owner="{ row }">
              <BaseStatusDot type="primary" :label="row.owner" orientation="horizontal" />
            </template>
          </BaseTable>
          <div class="table-sort-summary">
            <BaseStatusDot type="primary" :label="lastSortText" orientation="horizontal" />
          </div>
        </BasePanel>
        <BasePanel title="过滤与当前行" subtitle="透传 Element Plus 的 filter、highlight-current-row、tableLayout、maxHeight 和行事件。">
          <BaseTable
            ref="nativeTableRef"
            data-playground-table="native-capabilities"
            caption="原生表格能力透传示例"
            :columns="nativeTableColumns"
            :data="nativeTableRows"
            row-key="name"
            :current-row-key="currentNativeRow"
            highlight-current-row
            table-layout="auto"
            max-height="220px"
            min-width="760px"
            :show-overflow-tooltip="true"
            tooltip-effect="light"
            surface="muted"
            show-summary
            :summary-method="getNativeSummary"
            @selection-change="handleSelectionChange"
            @expand-change="handleExpandChange"
            @filter-change="handleFilterChange"
            @current-change="handleCurrentChange"
            @row-click="handleRowClick"
            @row-dblclick="handleRowDblclick"
            @cell-mouse-enter="handleCellMouseEnter"
            @cell-mouse-leave="handleCellMouseLeave"
          >
            <template #nameHeader>
              <span class="table-header-chip">组件 / 可调整列宽</span>
            </template>
            <template #detail="{ row }">
              <div class="table-expand-panel">
                <BaseStatusDot type="primary" :label="`${row.name} 已接入原生展开列`" orientation="horizontal" />
                <span>{{ row.usage }}</span>
              </div>
            </template>
            <template #name="{ row }">
              <strong class="simple-table-name">{{ row.name }}</strong>
            </template>
            <template #status="{ row }">
              <BaseBadge :type="row.state === 'stable' ? 'success' : 'warning'" variant="outline">
                {{ row.status }}
              </BaseBadge>
            </template>
            <template #append>
              <div class="table-append-row">
                append 插槽：稳定项不可被选择，索引列、展开列、hover 事件和实例方法均由 Element Plus 表格能力透传。
              </div>
            </template>
          </BaseTable>
          <div class="table-action-row" aria-label="表格实例方法">
            <BaseButton type="neutral" size="sm" @click="toggleNativeSelection">切换全选</BaseButton>
            <BaseButton type="neutral" size="sm" @click="clearNativeSelection">清空选择</BaseButton>
            <BaseButton type="neutral" size="sm" @click="setSecondNativeRow">定位第二行</BaseButton>
            <BaseButton type="neutral" size="sm" @click="clearNativeSort">清空排序</BaseButton>
          </div>
          <div class="table-sort-summary">
            <BaseStatusDot type="primary" :label="`当前行：${currentNativeRow}`" orientation="horizontal" />
            <BaseStatusDot type="neutral" :label="lastFilterText" orientation="horizontal" />
            <BaseStatusDot type="success" :label="`已选择：${selectedNativeCount}`" orientation="horizontal" />
            <BaseStatusDot type="warning" :label="expandedNativeText" orientation="horizontal" />
            <BaseStatusDot type="primary" :label="hoveredNativeCellText" orientation="horizontal" />
            <BaseStatusDot type="neutral" :label="nativeMethodText" orientation="horizontal" />
          </div>
        </BasePanel>
        <BasePanel title="长字段表格" subtitle="支持嵌套 key、列级换行和自定义最小宽度。">
          <BaseTable
            aria-label="嵌套字段轻量表格"
            :columns="nestedTableColumns"
            :data="nestedTableRows"
            row-key="meta.id"
            :selected-keys="['foundation-table']"
            min-width="640px"
            size="sm"
          >
            <template #name="{ row }">
              <strong class="simple-table-name">{{ row.name }}</strong>
            </template>
          </BaseTable>
        </BasePanel>
        <BasePanel title="加载与空态" subtitle="轻量表格内置加载骨架和空态。">
          <div class="table-state-stack">
            <BaseTable
              aria-label="加载中的轻量表格"
              :columns="simpleTableColumns.slice(0, 3)"
              :data="[]"
              loading
              loading-text="正在加载组件表格"
              :skeleton-rows="4"
              size="sm"
            />
            <BaseTable aria-label="空轻量表格" :columns="simpleTableColumns.slice(0, 2)" :data="[]" size="sm" empty-text="暂无组件记录" empty-icon="FolderOpen" />
            <BaseTable
              aria-label="禁用 plain 表格"
              :columns="simpleTableColumns.slice(0, 3)"
              :data="simpleTableRows.slice(0, 2)"
              surface="plain"
              :bordered="false"
              :hover="false"
              disabled
              size="sm"
            />
          </div>
        </BasePanel>
      </div>
    </PlaygroundDemoSection>
  </section>
</template>

<style scoped>
.detail-stack {
  @apply space-y-4;
}

.simple-table-grid {
  @apply grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)];
}

.simple-table-name {
  @apply text-xs font-black text-slate-800 dark:text-slate-100;
}

.table-state-stack {
  @apply flex min-w-0 flex-col gap-3;
}

.table-sort-summary {
  @apply mt-3 flex min-w-0 flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}

.table-action-row {
  @apply mt-3 flex min-w-0 flex-wrap items-center gap-2;
}

.table-expand-panel {
  @apply flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400;
}

.table-append-row {
  @apply border-t border-slate-100 bg-slate-50/80 px-4 py-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400;
}

.table-header-chip {
  @apply inline-flex max-w-full items-center rounded-md bg-white px-2 py-1 text-[11px] font-black text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700;
}
</style>
