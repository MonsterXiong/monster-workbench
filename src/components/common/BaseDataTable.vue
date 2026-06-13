<script setup lang="ts">
import { computed, ref, useAttrs, useId } from "vue";
import type {
  CellCls,
  CellStyle,
  ColumnCls,
  ColumnStyle,
  SummaryMethod,
  TableProps,
  TreeNode,
} from "element-plus";
import { useI18n } from "../../composables/useI18n";
import { joinAriaIds } from "../../utils";
import BaseTable from "./BaseTable.vue";
import type { BaseTableColumn, BaseTableLayout, BaseTableSort, BaseTableSortChangePayload, BaseTableSortOrder } from "./BaseTable.vue";

defineOptions({
  inheritAttrs: false,
});

export type DataTableColumn = BaseTableColumn;
type DataTableManualSortOrder = Exclude<BaseTableSortOrder, null> | "";

interface Props {
  title: string;
  description?: string;
  columns: DataTableColumn[];
  data: any[];
  loading?: boolean;
  disabled?: boolean;
  striped?: boolean;
  hover?: boolean;
  size?: "sm" | "md" | "lg";
  surface?: "card" | "muted" | "plain";
  bordered?: boolean;
  rounded?: boolean;
  emptyText?: string;
  emptyIcon?: string;
  rowKey?: string | ((row: any, index: number) => string | number);
  selectedKeys?: Array<string | number>;
  skeletonRows?: number;
  tableCaption?: string;
  tableAriaLabel?: string;
  count?: number | string | null;
  countLabel?: string;
  icon?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  pageSizeOptions?: number[];
  showPagination?: boolean;
  hidePaginationWhenEmpty?: boolean;
  compact?: boolean;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  actionsLabel?: string;
  filtersLabel?: string;
  bodyLabel?: string;
  paginationLabel?: string;
  loadingText?: string;
  wrapTitle?: boolean;
  wrapDescription?: boolean;
  wrapCells?: boolean;
  tableMinWidth?: string;
  defaultSort?: BaseTableSort;
  tableHeight?: string | number;
  tableMaxHeight?: string | number;
  showHeader?: boolean;
  highlightCurrentRow?: boolean;
  currentRowKey?: string | number;
  tableLayout?: BaseTableLayout;
  tableFit?: boolean;
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
  pageSizeControl?: "base" | "native";
}

const props = withDefaults(defineProps<Props>(), {
  description: "",
  loading: false,
  disabled: false,
  striped: true,
  hover: true,
  size: "md",
  surface: "card",
  bordered: true,
  rounded: true,
  emptyText: "",
  emptyIcon: "Inbox",
  rowKey: "",
  selectedKeys: () => [],
  skeletonRows: 3,
  tableCaption: "",
  tableAriaLabel: "",
  count: null,
  countLabel: "",
  icon: "Table2",
  page: 1,
  pageSize: 10,
  total: 0,
  pageSizeOptions: () => [10, 20, 50, 100],
  showPagination: true,
  hidePaginationWhenEmpty: false,
  compact: false,
  ariaLabel: "",
  ariaLabelledby: "",
  ariaDescribedby: "",
  actionsLabel: "",
  filtersLabel: "",
  bodyLabel: "",
  paginationLabel: "",
  loadingText: "",
  wrapTitle: false,
  wrapDescription: false,
  wrapCells: false,
  tableMinWidth: "100%",
  defaultSort: undefined,
  tableHeight: undefined,
  tableMaxHeight: undefined,
  showHeader: true,
  highlightCurrentRow: false,
  currentRowKey: undefined,
  tableLayout: "fixed",
  tableFit: true,
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
  pageSizeControl: "base",
});

const { t } = useI18n();
const attrs = useAttrs();
const rootRef = ref<HTMLElement | null>(null);
const tableRef = ref<InstanceType<typeof BaseTable> | null>(null);
const dataTableId = useId();
const titleId = `base-data-table-title-${dataTableId}`;
const descriptionId = `base-data-table-description-${dataTableId}`;
const labelledBy = computed(() => (props.ariaLabel ? undefined : props.ariaLabelledby || titleId));
const describedBy = computed(() => joinAriaIds([props.description ? descriptionId : undefined, props.ariaDescribedby]));
const isEmpty = computed(() => props.data.length === 0);
const isInteractiveDisabled = computed(() => props.disabled || props.loading);
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedBodyLabel = computed(() => props.bodyLabel || props.tableAriaLabel || props.tableCaption || props.title);
const resolvedPaginationLabel = computed(() => props.paginationLabel || `${props.title} ${t("common.pagination.label")}`);
const resolvedFiltersLabel = computed(() => props.filtersLabel || t("common.toolbar"));
const slotState = computed(() => ({
  disabled: props.disabled,
  loading: props.loading,
  empty: isEmpty.value,
  interactiveDisabled: isInteractiveDisabled.value,
}));
const getColumnHeaderSlotName = (column: DataTableColumn) => column.headerSlot || `${column.key}Header`;

const emit = defineEmits<{
  (e: "update:page", value: number): void;
  (e: "update:pageSize", value: number): void;
  (e: "page-change", payload: { page: number; pageSize: number }): void;
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

const handlePageChange = (payload: { page: number; pageSize: number }) => {
  emit("page-change", payload);
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

const handleSortChange = (payload: BaseTableSortChangePayload) => {
  emit("sort-change", payload);
};

const handleFilterChange = (payload: Record<string, string[]>) => {
  emit("filter-change", payload);
};

const handleRowClick = (row: any, column: unknown, event: MouseEvent) => {
  emit("row-click", row, column, event);
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
  getElement: () => rootRef.value,
  getBaseTable: () => tableRef.value,
  getNativeTable: () => tableRef.value?.getNativeTable(),
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
  sort: (prop: string, order: DataTableManualSortOrder) => tableRef.value?.sort(prop, order),
  scrollTo: (options: ScrollToOptions | number, yCoord?: number) => tableRef.value?.scrollTo(options, yCoord),
  setScrollLeft: (left?: number) => tableRef.value?.setScrollLeft(left),
  setScrollTop: (top?: number) => tableRef.value?.setScrollTop(top),
  updateKeyChildren: (key: string, data: any[]) => tableRef.value?.updateKeyChildren(key, data),
});
</script>

<template>
  <section
    v-bind="attrs"
    ref="rootRef"
    class="base-data-table"
    :class="{
      'base-data-table--compact': compact,
      'is-loading': loading,
      'is-disabled': disabled,
    }"
    role="region"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <span :id="titleId" class="sr-only">{{ title }}</span>
    <span v-if="description" :id="descriptionId" class="sr-only">{{ description }}</span>

    <BaseTableToolbar
      :title="title"
      :description="description"
      :count="count"
      :count-label="countLabel || t('common.records')"
      :icon="icon"
      :compact="compact"
      :loading="loading"
      :disabled="disabled"
      :actions-label="actionsLabel || undefined"
      :content-label="resolvedFiltersLabel"
      :wrap-title="wrapTitle"
      :wrap-description="wrapDescription"
      :loading-text="resolvedLoadingText"
    >
      <template v-if="$slots.meta" #meta>
        <slot name="meta" v-bind="slotState"></slot>
      </template>

      <template v-if="$slots.actions" #actions>
        <slot name="actions" v-bind="slotState"></slot>
      </template>

      <template v-if="$slots.filters" #default>
        <slot name="filters" v-bind="slotState"></slot>
      </template>
    </BaseTableToolbar>

    <div class="base-data-table__body" role="group" :aria-label="resolvedBodyLabel">
      <BaseTable
        ref="tableRef"
        :columns="columns"
        :data="data"
        :loading="loading"
        :disabled="disabled"
        :striped="striped"
        :hover="hover"
        :size="size"
        :surface="surface"
        :bordered="bordered"
        :rounded="rounded"
        :empty-text="emptyText"
        :empty-icon="emptyIcon"
        :row-key="rowKey"
        :selected-keys="selectedKeys"
        :skeleton-rows="skeletonRows"
        :caption="tableCaption"
        :aria-label="tableAriaLabel || title"
        :loading-text="resolvedLoadingText"
        :wrap-cells="wrapCells"
        :min-width="tableMinWidth"
        :default-sort="defaultSort"
        :height="tableHeight"
        :max-height="tableMaxHeight"
        :show-header="showHeader"
        :highlight-current-row="highlightCurrentRow"
        :current-row-key="currentRowKey"
        :table-layout="tableLayout"
        :fit="tableFit"
        :scrollbar-always-on="scrollbarAlwaysOn"
        :flexible="flexible"
        :native-scrollbar="nativeScrollbar"
        :show-overflow-tooltip="showOverflowTooltip"
        :tooltip-effect="tooltipEffect"
        :tooltip-options="tooltipOptions"
        :tooltip-formatter="tooltipFormatter"
        :show-summary="showSummary"
        :sum-text="sumText"
        :summary-method="summaryMethod"
        :row-class-name="rowClassName"
        :row-style="rowStyle"
        :cell-class-name="cellClassName"
        :cell-style="cellStyle"
        :header-row-class-name="headerRowClassName"
        :header-row-style="headerRowStyle"
        :header-cell-class-name="headerCellClassName"
        :header-cell-style="headerCellStyle"
        :span-method="spanMethod"
        :select-on-indeterminate="selectOnIndeterminate"
        :expand-row-keys="expandRowKeys"
        :default-expand-all="defaultExpandAll"
        :row-expandable="rowExpandable"
        :indent="indent"
        :tree-props="treeProps"
        :lazy="lazy"
        :load="load"
        :append-filter-panel-to="appendFilterPanelTo"
        :scrollbar-tabindex="scrollbarTabindex"
        :allow-drag-last-column="allowDragLastColumn"
        :preserve-expanded-content="preserveExpandedContent"
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
        <template v-for="column in columns" :key="column.key" #[column.key]="slotProps">
          <slot :name="column.key" v-bind="slotProps">
            {{ slotProps.row[column.key] }}
          </slot>
        </template>

        <template v-for="column in columns" :key="`${column.key}-header`" #[getColumnHeaderSlotName(column)]="slotProps">
          <slot :name="getColumnHeaderSlotName(column)" v-bind="slotProps">
            <span :aria-label="column.ariaLabel || undefined">{{ column.title }}</span>
          </slot>
        </template>

        <template v-if="$slots.append" #append>
          <slot name="append" v-bind="slotState"></slot>
        </template>
      </BaseTable>
    </div>

    <footer
      v-if="showPagination && !(hidePaginationWhenEmpty && !loading && data.length === 0)"
      class="base-data-table__footer"
      role="group"
      :aria-label="resolvedPaginationLabel"
    >
      <BasePagination
        :page="page"
        :page-size="pageSize"
        :total="total"
        :page-size-options="pageSizeOptions"
        :page-size-control="pageSizeControl"
        :loading="loading"
        :disabled="disabled"
        :compact="compact"
        :loading-text="resolvedLoadingText"
        :aria-label="resolvedPaginationLabel"
        @update:page="emit('update:page', $event)"
        @update:page-size="emit('update:pageSize', $event)"
        @change="handlePageChange"
      />
    </footer>
  </section>
</template>

<style scoped>
.base-data-table {
  @apply min-w-0 space-y-3;
}

.base-data-table.is-disabled,
.base-data-table.is-loading {
  @apply opacity-75;
}

.base-data-table--compact {
  @apply space-y-2;
}

.base-data-table__body {
  @apply min-h-0 min-w-0;
}

.base-data-table__footer {
  @apply min-w-0;
}
</style>
