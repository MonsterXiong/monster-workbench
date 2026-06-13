<script setup lang="ts">
import { computed, ref, useAttrs } from "vue";
import type { VNodeChild } from "vue";
import type {
  CellCls,
  CellStyle,
  ColumnCls,
  ColumnStyle,
  SummaryMethod,
  TableInstance,
  TableProps,
  TreeNode,
} from "element-plus";
import BaseIcon from "./BaseIcon.vue";
import { useI18n } from "../../composables/useI18n";
import { getByPath, hasSelectionKey, toIntegerAtLeast } from "../../utils";

defineOptions({
  inheritAttrs: false,
});

export type BaseTableSortOrder = "ascending" | "descending" | null;
export type BaseTableFixedColumn = boolean | "left" | "right";
export type BaseTableSortable = boolean | "custom";
export type BaseTableLayout = "fixed" | "auto";
type BaseTableManualSortOrder = Exclude<BaseTableSortOrder, null> | "";

export interface BaseTableColumnFilter {
  text: string;
  value: string;
}

export interface BaseTableColumn {
  key: string;
  title: string;
  type?: "default" | "selection" | "index" | "expand";
  width?: string;
  minWidth?: string | number;
  align?: "left" | "center" | "right";
  headerAlign?: "left" | "center" | "right";
  wrap?: boolean;
  ariaLabel?: string;
  headerSlot?: string;
  fixed?: BaseTableFixedColumn;
  sortable?: BaseTableSortable;
  resizable?: boolean;
  selectable?: (row: any, index: number) => boolean;
  reserveSelection?: boolean;
  index?: number | ((index: number) => number | string);
  renderHeader?: (data: { column: unknown; $index: number }) => VNodeChild;
  columnKey?: string;
  sortMethod?: (a: any, b: any) => number;
  sortBy?: string | string[];
  sortOrders?: BaseTableSortOrder[];
  formatter?: (row: any, column: unknown, cellValue: unknown, index: number) => string;
  tooltipFormatter?: (data: unknown) => string;
  filters?: BaseTableColumnFilter[];
  filteredValue?: string[];
  filterPlacement?: string;
  filterMultiple?: boolean;
  filterClassName?: string;
  filterMethod?: (value: string, row: any, column: unknown) => boolean;
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
  height?: string | number;
  maxHeight?: string | number;
  showHeader?: boolean;
  highlightCurrentRow?: boolean;
  currentRowKey?: string | number;
  tableLayout?: BaseTableLayout;
  fit?: boolean;
  scrollbarAlwaysOn?: boolean;
  flexible?: boolean;
  nativeScrollbar?: boolean;
  showOverflowTooltip?: boolean;
  tooltipEffect?: string;
  tooltipOptions?: TableProps<any>["tooltipOptions"];
  tooltipFormatter?: TableProps<any>["tooltipFormatter"];
  showSummary?: boolean;
  sumText?: string;
  summaryMethod?: SummaryMethod<any>;
  rowClassName?: ColumnCls<any>;
  rowStyle?: ColumnStyle<any>;
  cellClassName?: CellCls<any>;
  cellStyle?: CellStyle<any>;
  headerRowClassName?: ColumnCls<any>;
  headerRowStyle?: ColumnStyle<any>;
  headerCellClassName?: CellCls<any>;
  headerCellStyle?: CellStyle<any>;
  spanMethod?: TableProps<any>["spanMethod"];
  selectOnIndeterminate?: boolean;
  expandRowKeys?: string[];
  defaultExpandAll?: boolean;
  rowExpandable?: (row: any, index: number) => boolean;
  indent?: number;
  treeProps?: TableProps<any>["treeProps"];
  lazy?: boolean;
  load?: (row: any, treeNode: TreeNode, resolve: (data: any[]) => void) => void;
  appendFilterPanelTo?: string;
  scrollbarTabindex?: string | number;
  allowDragLastColumn?: boolean;
  preserveExpandedContent?: boolean;
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
  height: undefined,
  maxHeight: undefined,
  showHeader: true,
  highlightCurrentRow: false,
  currentRowKey: undefined,
  tableLayout: "fixed",
  fit: true,
  scrollbarAlwaysOn: true,
  flexible: true,
  nativeScrollbar: false,
  showOverflowTooltip: undefined,
  tooltipEffect: "",
  tooltipOptions: undefined,
  tooltipFormatter: undefined,
  showSummary: false,
  sumText: "",
  summaryMethod: undefined,
  rowClassName: "",
  rowStyle: undefined,
  cellClassName: "",
  cellStyle: undefined,
  headerRowClassName: "",
  headerRowStyle: undefined,
  headerCellClassName: "",
  headerCellStyle: undefined,
  spanMethod: undefined,
  selectOnIndeterminate: true,
  expandRowKeys: undefined,
  defaultExpandAll: false,
  rowExpandable: undefined,
  indent: 16,
  treeProps: undefined,
  lazy: false,
  load: undefined,
  appendFilterPanelTo: "",
  scrollbarTabindex: undefined,
  allowDragLastColumn: true,
  preserveExpandedContent: false,
});

const emit = defineEmits<{
  (e: "select", selection: any[], row: any): void;
  (e: "select-all", selection: any[]): void;
  (e: "selection-change", selection: any[]): void;
  (e: "sort-change", payload: BaseTableSortChangePayload): void;
  (e: "filter-change", payload: Record<string, string[]>): void;
  (e: "row-click", row: any, column: unknown, event: MouseEvent): void;
  (e: "row-dblclick", row: any, column: unknown, event: MouseEvent): void;
  (e: "row-contextmenu", row: any, column: unknown, event: PointerEvent): void;
  (e: "cell-click", row: any, column: unknown, cell: HTMLTableCellElement, event: PointerEvent): void;
  (e: "cell-dblclick", row: any, column: unknown, cell: HTMLTableCellElement, event: MouseEvent): void;
  (e: "cell-contextmenu", row: any, column: unknown, cell: HTMLTableCellElement, event: PointerEvent): void;
  (e: "cell-mouse-enter", row: any, column: unknown, cell: HTMLTableCellElement, event: MouseEvent): void;
  (e: "cell-mouse-leave", row: any, column: unknown, cell: HTMLTableCellElement, event: MouseEvent): void;
  (e: "header-click", column: unknown, event: PointerEvent): void;
  (e: "header-contextmenu", column: unknown, event: PointerEvent): void;
  (e: "current-change", currentRow: any | null, oldCurrentRow: any | null): void;
  (e: "header-dragend", newWidth: number, oldWidth: number, column: unknown, event: MouseEvent): void;
  (e: "expand-change", row: any, expanded: any[] | boolean): void;
  (e: "scroll", payload: { scrollLeft: number; scrollTop: number }): void;
}>();

const { t } = useI18n();
const tableRef = ref<TableInstance | null>(null);
const attrs = useAttrs();

const tableLabel = computed(() => props.ariaLabel || props.caption || t("common.table"));
const skeletonCount = computed(() => toIntegerAtLeast(props.skeletonRows, 1, 3));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const tableStyle = computed(() => ({ "--base-table-min-width": props.minWidth } as Record<string, string>));
const rootClass = computed(() => attrs.class);
const rootStyle = computed(() => attrs.style);
const tablePassthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== "class" && key !== "style"))
);
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
const hasResizableColumns = computed(() => props.columns.some((column) => column.resizable));

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

const getFormattedCellValue = (column: BaseTableColumn, scope: any) => {
  const cellValue = getCellValue(scope.row, column.key);
  return column.formatter ? column.formatter(scope.row, scope.column, cellValue, scope.$index) : cellValue;
};

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
  if (column.minWidth !== undefined) return column.minWidth;
  if (!column.width) return 120;
  const width = String(column.width).trim();

  if (!width.endsWith("%")) return undefined;

  const percent = Number.parseFloat(width);
  return Number.isFinite(percent) ? Math.max(72, Math.round((minWidthPixels.value * percent) / 100)) : undefined;
};

const getRowClassName = ({ row, rowIndex }: { row: any; rowIndex: number }) => {
  if (isSkeletonRow(row)) return "base-table__row base-table__row--loading";

  return joinClassNames([
    "base-table__row",
    props.striped && rowIndex % 2 === 1 ? "is-striped" : "",
    isRowSelected(row, rowIndex) ? "is-selected" : "",
    getClassName(props.rowClassName, { row, rowIndex }),
  ]);
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

const getColumnHeaderSlotName = (column: BaseTableColumn) => column.headerSlot || `${column.key}Header`;

const getColumnSortable = (column: BaseTableColumn) => {
  if (column.sortable === "custom") return "custom";
  return Boolean(column.sortable);
};

const getColumnOverflowTooltip = (column: BaseTableColumn) => {
  if (props.showOverflowTooltip !== undefined) return props.showOverflowTooltip;
  return !props.wrapCells && !column.wrap;
};

const getClassName = <TPayload,>(className: string | ((payload: TPayload) => string) | undefined, payload: TPayload) => {
  if (!className) return "";
  return typeof className === "function" ? className(payload) : className;
};

const joinClassNames = (classNames: Array<string | undefined>) => classNames.filter(Boolean).join(" ");

const handleSortChange = (payload: BaseTableSortChangePayload) => {
  emit("sort-change", payload);
};

const handleFilterChange = (payload: Record<string, string[]>) => {
  emit("filter-change", payload);
};

const handleRowClick = (row: any, column: unknown, event: MouseEvent) => {
  emit("row-click", row, column, event);
};

const handleSelect = (selection: any[], row: any) => {
  emit("select", selection, row);
};

const handleSelectAll = (selection: any[]) => {
  emit("select-all", selection);
};

const handleSelectionChange = (selection: any[]) => {
  emit("selection-change", selection);
};

const handleRowDblclick = (row: any, column: unknown, event: MouseEvent) => {
  emit("row-dblclick", row, column, event);
};

const handleRowContextmenu = (row: any, column: unknown, event: PointerEvent) => {
  emit("row-contextmenu", row, column, event);
};

const handleCellClick = (row: any, column: unknown, cell: HTMLTableCellElement, event: PointerEvent) => {
  emit("cell-click", row, column, cell, event);
};

const handleCellDblclick = (row: any, column: unknown, cell: HTMLTableCellElement, event: MouseEvent) => {
  emit("cell-dblclick", row, column, cell, event);
};

const handleCellContextmenu = (row: any, column: unknown, cell: HTMLTableCellElement, event: PointerEvent) => {
  emit("cell-contextmenu", row, column, cell, event);
};

const handleCellMouseEnter = (row: any, column: unknown, cell: HTMLTableCellElement, event: MouseEvent) => {
  emit("cell-mouse-enter", row, column, cell, event);
};

const handleCellMouseLeave = (row: any, column: unknown, cell: HTMLTableCellElement, event: MouseEvent) => {
  emit("cell-mouse-leave", row, column, cell, event);
};

const handleHeaderClick = (column: unknown, event: PointerEvent) => {
  emit("header-click", column, event);
};

const handleHeaderContextmenu = (column: unknown, event: PointerEvent) => {
  emit("header-contextmenu", column, event);
};

const handleCurrentChange = (currentRow: any | null, oldCurrentRow: any | null) => {
  emit("current-change", currentRow, oldCurrentRow);
};

const handleHeaderDragend = (newWidth: number, oldWidth: number, column: unknown, event: MouseEvent) => {
  emit("header-dragend", newWidth, oldWidth, column, event);
};

const handleExpandChange = (row: any, expanded: any[] | boolean) => {
  emit("expand-change", row, expanded);
};

const handleScroll = (payload: { scrollLeft: number; scrollTop: number }) => {
  emit("scroll", payload);
};

defineExpose({
  getNativeTable: () => tableRef.value,
  clearSelection: () => tableRef.value?.clearSelection(),
  getSelectionRows: () => tableRef.value?.getSelectionRows() ?? [],
  toggleRowSelection: (row: any, selected?: boolean, ignoreSelectable?: boolean) =>
    tableRef.value?.toggleRowSelection(row, selected, ignoreSelectable),
  toggleAllSelection: () => tableRef.value?.toggleAllSelection(),
  toggleRowExpansion: (row: any, expanded?: boolean) => tableRef.value?.toggleRowExpansion(row, expanded),
  setCurrentRow: (row?: any) => tableRef.value?.setCurrentRow(row),
  clearSort: () => tableRef.value?.clearSort(),
  clearFilter: (columnKeys?: string[] | string) => tableRef.value?.clearFilter(columnKeys),
  doLayout: () => tableRef.value?.doLayout(),
  sort: (prop: string, order: BaseTableManualSortOrder) => tableRef.value?.sort(prop, order),
  scrollTo: (options: ScrollToOptions | number, yCoord?: number) => tableRef.value?.scrollTo(options, yCoord),
  setScrollLeft: (left?: number) => tableRef.value?.setScrollLeft(left),
  setScrollTop: (top?: number) => tableRef.value?.setScrollTop(top),
  updateKeyChildren: (key: string, data: any[]) => tableRef.value?.updateKeyChildren(key, data),
});
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
      rootClass,
    ]"
    :style="[tableStyle, rootStyle]"
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
      ref="tableRef"
      v-bind="tablePassthroughAttrs"
      class="base-table__table"
      :data="tableData"
      :size="elementSize"
      :row-key="getElementRowKey"
      :row-class-name="getRowClassName"
      :row-style="rowStyle"
      :cell-class-name="cellClassName"
      :cell-style="cellStyle"
      :header-row-class-name="headerRowClassName"
      :header-row-style="headerRowStyle"
      :header-cell-class-name="headerCellClassName"
      :header-cell-style="headerCellStyle"
      :height="height"
      :max-height="maxHeight"
      :show-header="showHeader"
      :show-summary="showSummary"
      :sum-text="sumText || undefined"
      :summary-method="summaryMethod"
      :span-method="spanMethod"
      :stripe="false"
      :border="hasResizableColumns"
      :fit="fit"
      :scrollbar-always-on="scrollbarAlwaysOn"
      :table-layout="tableLayout"
      :highlight-current-row="highlightCurrentRow"
      :current-row-key="currentRowKey"
      :flexible="flexible"
      :native-scrollbar="nativeScrollbar"
      :select-on-indeterminate="selectOnIndeterminate"
      :expand-row-keys="expandRowKeys"
      :default-expand-all="defaultExpandAll"
      :row-expandable="rowExpandable"
      :indent="indent"
      :tree-props="treeProps"
      :lazy="lazy"
      :load="load"
      :default-sort="defaultSort"
      :tooltip-effect="tooltipEffect || undefined"
      :tooltip-options="tooltipOptions"
      :tooltip-formatter="tooltipFormatter"
      :append-filter-panel-to="appendFilterPanelTo || undefined"
      :scrollbar-tabindex="scrollbarTabindex"
      :allow-drag-last-column="allowDragLastColumn"
      :preserve-expanded-content="preserveExpandedContent"
      :aria-label="tableLabel"
      @select="handleSelect"
      @select-all="handleSelectAll"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      @filter-change="handleFilterChange"
      @row-click="handleRowClick"
      @row-dblclick="handleRowDblclick"
      @row-contextmenu="handleRowContextmenu"
      @cell-click="handleCellClick"
      @cell-dblclick="handleCellDblclick"
      @cell-contextmenu="handleCellContextmenu"
      @cell-mouse-enter="handleCellMouseEnter"
      @cell-mouse-leave="handleCellMouseLeave"
      @header-click="handleHeaderClick"
      @header-contextmenu="handleHeaderContextmenu"
      @current-change="handleCurrentChange"
      @header-dragend="handleHeaderDragend"
      @expand-change="handleExpandChange"
      @scroll="handleScroll"
    >
      <el-table-column
        v-for="column in columns"
        :key="column.key"
        :type="column.type === 'default' ? undefined : column.type"
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
        :resizable="column.resizable"
        :selectable="column.selectable"
        :reserve-selection="column.reserveSelection"
        :index="column.index"
        :render-header="column.renderHeader"
        :column-key="column.columnKey || column.key"
        :sort-method="column.sortMethod"
        :sort-by="column.sortBy"
        :sort-orders="column.sortOrders"
        :formatter="column.formatter"
        :show-overflow-tooltip="getColumnOverflowTooltip(column)"
        :tooltip-formatter="column.tooltipFormatter"
        :filters="column.filters"
        :filtered-value="column.filteredValue"
        :filter-placement="column.filterPlacement"
        :filter-multiple="column.filterMultiple"
        :filter-class-name="column.filterClassName"
        :filter-method="column.filterMethod"
      >
        <template v-if="!column.renderHeader" #header="scope">
          <slot :name="getColumnHeaderSlotName(column)" :column="scope.column" :index="scope.$index">
            <span :aria-label="column.ariaLabel || undefined">{{ column.title }}</span>
          </slot>
        </template>
        <template v-if="column.type !== 'selection' && column.type !== 'index'" #default="scope">
          <div v-if="isSkeletonRow(scope.row)" class="base-table__skeleton" aria-hidden="true"></div>
          <slot v-else :name="column.key" :row="scope.row" :index="scope.$index">
            {{ getFormattedCellValue(column, scope) }}
          </slot>
        </template>
      </el-table-column>

      <template #empty>
        <div class="base-table__empty" role="status">
          <BaseIcon :name="emptyIcon" size="28" aria-hidden="true" />
          <span>{{ emptyText || t("common.noData") }}</span>
        </div>
      </template>

      <template v-if="$slots.append" #append>
        <slot name="append"></slot>
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
