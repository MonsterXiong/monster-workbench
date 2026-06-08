<script setup lang="ts">
import { useI18n } from "../../composables/useI18n";

export interface DataTableColumn {
  key: string;
  title: string;
  width?: string;
  align?: "left" | "center" | "right";
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
}

withDefaults(defineProps<Props>(), {
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
});

const { t } = useI18n();

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
      'is-disabled': disabled,
    }"
    role="region"
    :aria-label="title"
    :aria-busy="loading ? 'true' : 'false'"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <BaseTableToolbar
      :title="title"
      :description="description"
      :count="count"
      :count-label="countLabel || t('common.records')"
      :icon="icon"
      :compact="compact"
      :loading="loading"
      :disabled="disabled"
    >
      <template v-if="$slots.meta" #meta>
        <slot name="meta"></slot>
      </template>

      <template v-if="$slots.actions" #actions>
        <slot name="actions"></slot>
      </template>

      <slot name="filters"></slot>
    </BaseTableToolbar>

    <div class="base-data-table__body">
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
      >
        <template v-for="column in columns" :key="column.key" #[column.key]="slotProps">
          <slot :name="column.key" v-bind="slotProps">
            {{ slotProps.row[column.key] }}
          </slot>
        </template>
      </BaseTable>
    </div>

    <footer v-if="showPagination && !(hidePaginationWhenEmpty && !loading && data.length === 0)" class="base-data-table__footer">
      <BasePagination
        :page="page"
        :page-size="pageSize"
        :total="total"
        :page-size-options="pageSizeOptions"
        :disabled="loading || disabled"
        :compact="compact"
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
