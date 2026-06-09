<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import { joinAriaIds } from "../../utils";

export interface DataTableColumn {
  key: string;
  title: string;
  width?: string;
  align?: "left" | "center" | "right";
  headerAlign?: "left" | "center" | "right";
  wrap?: boolean;
  ariaLabel?: string;
}

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
});

const { t } = useI18n();
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

const emit = defineEmits<{
  (e: "update:page", value: number): void;
  (e: "update:pageSize", value: number): void;
  (e: "page-change", payload: { page: number; pageSize: number }): void;
}>();

const handlePageChange = (payload: { page: number; pageSize: number }) => {
  emit("page-change", payload);
};
</script>

<template>
  <section
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
      >
        <template v-for="column in columns" :key="column.key" #[column.key]="slotProps">
          <slot :name="column.key" v-bind="slotProps">
            {{ slotProps.row[column.key] }}
          </slot>
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
