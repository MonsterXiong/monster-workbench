<script setup lang="ts">
import { computed } from "vue";
import BaseIcon from "./BaseIcon.vue";
import { useI18n } from "../../composables/useI18n";
import { getByPath, hasSelectionKey, toIntegerAtLeast } from "../../utils";

export type BaseTableSortOrder = "ascending" | "descending" | null;
export type BaseTableFixedColumn = boolean | "left" | "right";
export type BaseTableSortable = boolean | "custom";

export interface BaseTableColumn {
  key: string;
  title: string;
  width?: string;
  align?: "left" | "center" | "right";
  headerAlign?: "left" | "center" | "right";
  wrap?: boolean;
  ariaLabel?: string;
  fixed?: BaseTableFixedColumn;
  sortable?: BaseTableSortable;
  sortMethod?: (a: any, b: any) => number;
  sortBy?: string | string[];
  sortOrders?: BaseTableSortOrder[];
}

export interface BaseTableSort {
  prop: string;
  order: Exclude<BaseTableSortOrder, null>;
}

export interface BaseTableSortChangePayload {
  column: unknown;
  prop: string;
  order: BaseTableSortOrder;
}

interface Props {
  columns: BaseTableColumn[];
  data: any[];
  loading?: boolean;
  striped?: boolean;
  hover?: boolean;
  ariaLabel?: string;
  emptyText?: string;
  emptyIcon?: string;
  size?: "sm" | "md" | "lg";
  surface?: "card" | "muted" | "plain";
  bordered?: boolean;
  rounded?: boolean;
  disabled?: boolean;
  rowKey?: string | ((row: any, index: number) => string | number);
  selectedKeys?: Array<string | number>;
  skeletonRows?: number;
  caption?: string;
  loadingText?: string;
  wrapCells?: boolean;
  minWidth?: string;
  defaultSort?: BaseTableSort;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  striped: true,
  hover: true,
  ariaLabel: "",
  emptyText: "",
  emptyIcon: "Inbox",
  size: "md",
  surface: "card",
  bordered: true,
  rounded: true,
  disabled: false,
  rowKey: "",
  selectedKeys: () => [],
  skeletonRows: 3,
  caption: "",
  loadingText: "",
  wrapCells: false,
  minWidth: "520px",
  defaultSort: undefined,
});

const emit = defineEmits<{
  (e: "sort-change", payload: BaseTableSortChangePayload): void;
}>();

const { t } = useI18n();

const tableLabel = computed(() => props.ariaLabel || props.caption || t("common.table"));
const skeletonCount = computed(() => toIntegerAtLeast(props.skeletonRows, 1, 3));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const tableStyle = computed(() => ({ "--base-table-min-width": props.minWidth } as Record<string, string>));
const minWidthPixels = computed(() => {
  const parsed = Number.parseFloat(props.minWidth);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 520;
});
const skeletonRows = computed(() =>
  Array.from({ length: skeletonCount.value }, (_, index) => ({
    __baseTableSkeleton: index,
  }))
);
const tableData = computed(() => (props.loading ? skeletonRows.value : props.data));
const elementSize = computed(() => {
  if (props.size === "sm") return "small";
  if (props.size === "lg") return "large";
  return "default";
});

const isSkeletonRow = (row: any) => Boolean(row?.__baseTableSkeleton !== undefined);

const getRowKey = (row: any, index: number) => {
  if (isSkeletonRow(row)) return `__base-table-skeleton-${row.__baseTableSkeleton}`;
  if (typeof props.rowKey === "function") return props.rowKey(row, index);
  const rowKeyValue = props.rowKey ? getByPath(row, props.rowKey) : undefined;
  if (rowKeyValue !== undefined) return String(rowKeyValue);
  return index;
};

const getElementRowKey = (row: any) => {
  if (isSkeletonRow(row)) return getRowKey(row, row.__baseTableSkeleton);
  const rowIndex = props.data.indexOf(row);
  return getRowKey(row, rowIndex >= 0 ? rowIndex : 0);
};

const isRowSelected = (row: any, index: number) => {
  if (isSkeletonRow(row)) return false;
  return hasSelectionKey(props.selectedKeys, getRowKey(row, index));
};

const getCellValue = (row: any, key: string) => getByPath(row, key, "");

const getColumnWidth = (column: BaseTableColumn) => {
  if (!column.width) return undefined;
  const width = String(column.width).trim();

  if (width.endsWith("%")) {
    return undefined;
  }

  if (width.endsWith("px")) {
    const pixels = Number.parseFloat(width);
    return Number.isFinite(pixels) ? pixels : undefined;
  }

  const numericWidth = Number.parseFloat(width);
  return Number.isFinite(numericWidth) ? numericWidth : undefined;
};

const getColumnMinWidth = (column: BaseTableColumn) => {
  if (!column.width) return 120;
  const width = String(column.width).trim();

  if (!width.endsWith("%")) return undefined;

  const percent = Number.parseFloat(width);
  return Number.isFinite(percent) ? Math.max(72, Math.round((minWidthPixels.value * percent) / 100)) : undefined;
};

const getRowClassName = ({ row, rowIndex }: { row: any; rowIndex: number }) => {
  if (isSkeletonRow(row)) return "base-table__row base-table__row--loading";

  return [
    "base-table__row",
    props.striped && rowIndex % 2 === 1 ? "is-striped" : "",
    isRowSelected(row, rowIndex) ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
};

const getColumnCellClass = (column: BaseTableColumn) => {
  return [
    "base-table__cell",
    column.align ? `base-table__cell--${column.align}` : "",
    column.wrap || props.wrapCells ? "base-table__cell--wrap" : "",
  ]
    .filter(Boolean)
    .join(" ");
};

const getColumnHeaderClass = (column: BaseTableColumn) => {
  return [
    "base-table__head-cell",
    column.headerAlign || column.align ? `base-table__cell--${column.headerAlign || column.align}` : "",
  ]
    .filter(Boolean)
    .join(" ");
};

const getColumnSortable = (column: BaseTableColumn) => {
  if (column.sortable === "custom") return "custom";
  return Boolean(column.sortable);
};

const handleSortChange = (payload: BaseTableSortChangePayload) => {
  emit("sort-change", payload);
};
</script>

<template>
  <div
    class="base-table"
    :class="[
      `base-table--${size}`,
      `base-table--${surface}`,
      {
        'base-table--bordered': bordered,
        'base-table--rounded': rounded,
        'base-table--hover': hover,
        'base-table--wrap-cells': wrapCells,
        'is-disabled': disabled,
      },
    ]"
    :style="tableStyle"
    role="region"
    :aria-label="tableLabel"
    :aria-busy="loading ? 'true' : 'false'"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <span v-if="caption" class="base-table__caption">{{ caption }}</span>
    <span v-if="loading" class="sr-only" role="status" aria-live="polite">
      {{ resolvedLoadingText }}
    </span>

    <el-table
      class="base-table__table"
      :data="tableData"
      :size="elementSize"
      :row-key="getElementRowKey"
      :row-class-name="getRowClassName"
      :show-header="true"
      :stripe="false"
      :border="false"
      :fit="true"
      :scrollbar-always-on="true"
      table-layout="fixed"
      :highlight-current-row="false"
      :default-sort="defaultSort"
      :aria-label="tableLabel"
      @sort-change="handleSortChange"
    >
      <el-table-column
        v-for="column in columns"
        :key="column.key"
        :prop="column.key"
        :label="column.title"
        :width="getColumnWidth(column)"
        :min-width="getColumnMinWidth(column)"
        :align="column.align || 'left'"
        :header-align="column.headerAlign || column.align || 'left'"
        :class-name="getColumnCellClass(column)"
        :label-class-name="getColumnHeaderClass(column)"
        :fixed="column.fixed"
        :sortable="getColumnSortable(column)"
        :sort-method="column.sortMethod"
        :sort-by="column.sortBy"
        :sort-orders="column.sortOrders"
        :show-overflow-tooltip="!wrapCells && !column.wrap"
      >
        <template #header>
          <span :aria-label="column.ariaLabel || undefined">{{ column.title }}</span>
        </template>
        <template #default="scope">
          <div v-if="isSkeletonRow(scope.row)" class="base-table__skeleton" aria-hidden="true"></div>
          <slot v-else :name="column.key" :row="scope.row" :index="scope.$index">
            {{ getCellValue(scope.row, column.key) }}
          </slot>
        </template>
      </el-table-column>

      <template #empty>
        <div class="base-table__empty" role="status">
          <BaseIcon :name="emptyIcon" size="28" aria-hidden="true" />
          <span>{{ emptyText || t("common.noData") }}</span>
        </div>
      </template>
    </el-table>
  </div>
</template>

<style scoped>
.base-table {
  @apply h-full w-full min-w-0 max-w-full overflow-auto bg-white shadow-sm transition dark:bg-slate-900;
}

.base-table--bordered {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-table--rounded {
  @apply rounded-xl;
}

.base-table--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-table--plain {
  @apply bg-transparent shadow-none dark:bg-transparent;
}

.base-table--plain.base-table--bordered {
  @apply border-0;
}

.base-table.is-disabled {
  @apply pointer-events-none opacity-70;
}

.base-table__caption {
  @apply sr-only;
}

.base-table__table {
  min-width: min(var(--base-table-min-width, 520px), 100%);
  --el-table-border-color: rgb(226 232 240);
  --el-table-header-bg-color: rgb(248 250 252 / 0.86);
  --el-table-row-hover-bg-color: rgb(248 250 252);
  --el-table-text-color: rgb(30 41 59);
  --el-table-header-text-color: rgb(100 116 139);
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-expanded-cell-bg-color: transparent;
  @apply h-full w-full;
}

:global(.dark) .base-table__table {
  --el-table-border-color: rgb(30 41 59);
  --el-table-header-bg-color: rgb(30 41 59 / 0.62);
  --el-table-row-hover-bg-color: rgb(30 41 59 / 0.5);
  --el-table-text-color: rgb(226 232 240);
  --el-table-header-text-color: rgb(148 163 184);
}

:deep(.base-table__table.el-table) {
  background-color: transparent;
  color: inherit;
}

:deep(.base-table__table .el-table__inner-wrapper::before) {
  display: none;
}

:deep(.base-table__table th.el-table__cell),
:deep(.base-table__table td.el-table__cell) {
  @apply border-b border-slate-100 p-0 dark:border-slate-800/50;
}

:deep(.base-table__table th.el-table__cell) {
  @apply bg-slate-50/80 dark:bg-slate-800/60;
}

:deep(.base-table__head-cell .cell) {
  @apply px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400;
}

:deep(.base-table__cell .cell) {
  @apply min-w-0 truncate px-4 py-3 text-sm text-slate-800 dark:text-slate-200;
  vertical-align: top;
}

:deep(.base-table__cell--center .cell) {
  @apply text-center;
}

:deep(.base-table__cell--right .cell) {
  @apply text-right;
}

:deep(.base-table__cell--wrap .cell),
.base-table--wrap-cells :deep(.base-table__cell .cell) {
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
  white-space: normal;
}

.base-table--sm :deep(.base-table__head-cell .cell) {
  @apply px-3 py-2 text-[11px];
}

.base-table--sm :deep(.base-table__cell .cell) {
  @apply px-3 py-2.5 text-[11px] leading-relaxed;
}

.base-table--lg :deep(.base-table__head-cell .cell) {
  @apply px-5 py-4 text-sm;
}

.base-table--lg :deep(.base-table__cell .cell) {
  @apply px-5 py-4 text-base;
}

:deep(.base-table__row) {
  @apply transition duration-150;
}

:deep(.base-table__row.is-striped > td.el-table__cell) {
  @apply bg-slate-50/40 dark:bg-slate-800/20;
}

.base-table--hover :deep(.base-table__row:hover > td.el-table__cell),
.base-table--hover :deep(.base-table__table .el-table__body tr.hover-row > td.el-table__cell) {
  @apply bg-slate-50 dark:bg-slate-800/50;
}

:deep(.base-table__row.is-selected > td.el-table__cell) {
  background-color: rgba(var(--color-primary), 0.08) !important;
}

:deep(.base-table__cell .el-button),
:deep(.base-table__cell .base-badge) {
  max-width: 100%;
  min-width: 0;
}

:deep(.base-table__cell .el-button > span),
:deep(.base-table__cell .base-badge) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-table__empty {
  @apply flex min-h-36 flex-col items-center justify-center gap-2 py-12 text-center text-xs font-bold text-slate-400 dark:text-slate-500;
}

.base-table__skeleton {
  @apply h-4 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800;
}

@media (prefers-reduced-motion: reduce) {
  .base-table,
  :deep(.base-table__row),
  .base-table__skeleton {
    animation: none !important;
    transition: none !important;
  }
}
</style>
