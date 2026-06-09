<script setup lang="ts">
import { computed } from "vue";
import BaseIcon from "./BaseIcon.vue";
import { useI18n } from "../../composables/useI18n";
import { getByPath, hasItem, toIntegerAtLeast } from "../../utils";

export interface BaseTableColumn {
  key: string;
  title: string;
  width?: string;
  align?: "left" | "center" | "right";
  headerAlign?: "left" | "center" | "right";
  wrap?: boolean;
  ariaLabel?: string;
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
});

const { t } = useI18n();

const tableLabel = computed(() => props.ariaLabel || props.caption || t("common.table"));
const skeletonCount = computed(() => toIntegerAtLeast(props.skeletonRows, 1, 3));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const tableStyle = computed(() => ({ "--base-table-min-width": props.minWidth } as Record<string, string>));

const getRowKey = (row: any, index: number) => {
  if (typeof props.rowKey === "function") return props.rowKey(row, index);
  const rowKeyValue = props.rowKey ? getByPath(row, props.rowKey) : undefined;
  if (rowKeyValue !== undefined) return String(rowKeyValue);
  return index;
};

const isRowSelected = (row: any, index: number) => hasItem(props.selectedKeys, getRowKey(row, index));
const getCellValue = (row: any, key: string) => getByPath(row, key, "");
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
    role="region"
    :aria-label="tableLabel"
    :aria-busy="loading ? 'true' : 'false'"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <table class="base-table__table" :style="tableStyle">
      <caption v-if="caption" class="base-table__caption">
        {{ caption }}
      </caption>
      <thead>
        <tr class="base-table__head-row">
          <th
            v-for="col in columns"
            :key="col.key"
            :style="{ width: col.width }"
            class="base-table__head-cell"
            :class="col.headerAlign || col.align ? `base-table__cell--${col.headerAlign || col.align}` : ''"
            scope="col"
            :aria-label="col.ariaLabel || undefined"
          >
            {{ col.title }}
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-if="loading">
          <tr>
            <td :colspan="columns.length" class="sr-only" role="status" aria-live="polite">
              {{ resolvedLoadingText }}
            </td>
          </tr>
          <tr v-for="i in skeletonCount" :key="i" class="base-table__row" aria-hidden="true">
            <td v-for="col in columns" :key="col.key" class="base-table__cell">
              <div class="base-table__skeleton" aria-hidden="true"></div>
            </td>
          </tr>
        </template>
        <template v-else-if="data.length === 0">
          <tr>
            <td :colspan="columns.length" class="base-table__empty-cell">
              <div class="base-table__empty" role="status">
                <BaseIcon :name="emptyIcon" size="28" aria-hidden="true" />
                <span>{{ emptyText || t('common.noData') }}</span>
              </div>
            </td>
          </tr>
        </template>
        <template v-else>
          <tr
            v-for="(row, idx) in data"
            :key="getRowKey(row, idx)"
            class="base-table__row"
            :class="{
              'is-striped': striped && idx % 2 === 1,
              'is-selected': isRowSelected(row, idx),
            }"
            :aria-selected="isRowSelected(row, idx) ? 'true' : undefined"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              class="base-table__cell"
              :class="[
                col.align ? `base-table__cell--${col.align}` : '',
                col.wrap ? 'base-table__cell--wrap' : '',
              ]"
            >
              <slot :name="col.key" :row="row" :index="idx">
                {{ getCellValue(row, col.key) }}
              </slot>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
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

.base-table__table {
  min-width: var(--base-table-min-width, 520px);
  @apply w-full table-fixed border-collapse;
}

.base-table__caption {
  @apply sr-only;
}

.base-table__head-row {
  @apply border-b border-slate-200 bg-slate-50/80 text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400;
}

.base-table__head-cell {
  @apply px-4 py-3 text-left text-xs font-black;
}

.base-table--sm .base-table__head-cell {
  @apply px-3 py-2 text-[11px];
}

.base-table--lg .base-table__head-cell {
  @apply px-5 py-4 text-sm;
}

.base-table__row {
  @apply border-b border-slate-100 transition duration-150 dark:border-slate-800/50;
}

.base-table__row.is-striped {
  @apply bg-slate-50/40 dark:bg-slate-800/20;
}

.base-table--hover .base-table__row:hover {
  @apply bg-slate-50 dark:bg-slate-800/50;
}

.base-table__row.is-selected {
  background-color: rgba(var(--color-primary), 0.08);
}

.base-table__cell {
  @apply min-w-0 truncate px-4 py-3 text-sm text-slate-800 dark:text-slate-200;
  vertical-align: top;
}

.base-table--wrap-cells .base-table__cell,
.base-table__cell--wrap {
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
  white-space: normal;
}

.base-table--sm .base-table__cell {
  @apply px-3 py-2.5 text-[11px] leading-relaxed;
}

.base-table--lg .base-table__cell {
  @apply px-5 py-4 text-base;
}

.base-table__cell--center {
  @apply text-center;
}

.base-table__cell--right {
  @apply text-right;
}

.base-table__empty-cell {
  @apply py-12 text-center text-slate-400 dark:text-slate-500;
}

.base-table__empty {
  @apply flex flex-col items-center justify-center gap-2 text-xs font-bold;
}

.base-table__skeleton {
  @apply h-4 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800;
}

@media (prefers-reduced-motion: reduce) {
  .base-table,
  .base-table__row,
  .base-table__skeleton {
    animation: none !important;
    transition: none !important;
  }
}
</style>
