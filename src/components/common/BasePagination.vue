<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../composables/useI18n";
import {
  clampNumber,
  formatTemplate,
  getEventTargetValue,
  getTotalPages,
  normalizePage,
  normalizePageSizeOptions,
  toIntegerAtLeast,
  toNonNegativeInteger,
} from "../../utils";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  disabled?: boolean;
  loading?: boolean;
  showPageSize?: boolean;
  showSummary?: boolean;
  showEdges?: boolean;
  simple?: boolean;
  compact?: boolean;
  surface?: "card" | "muted" | "plain";
  size?: "sm" | "md" | "lg";
  siblingCount?: number;
  loadingText?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  pageSizeOptions: () => [10, 20, 50, 100],
  disabled: false,
  loading: false,
  showPageSize: true,
  showSummary: true,
  showEdges: false,
  simple: false,
  compact: false,
  surface: "card",
  size: "md",
  siblingCount: 1,
  loadingText: "",
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "update:page", value: number): void;
  (e: "update:pageSize", value: number): void;
  (e: "change", payload: { page: number; pageSize: number }): void;
}>();

const { t } = useI18n();

const safeTotal = computed(() => toNonNegativeInteger(props.total));
const safePageSize = computed(() => toIntegerAtLeast(props.pageSize, 1, 1));
const safeSiblingCount = computed(() => toNonNegativeInteger(props.siblingCount, 1));
const totalPages = computed(() => getTotalPages(safeTotal.value, safePageSize.value));
const hasRecords = computed(() => safeTotal.value > 0);
const displayTotalPages = computed(() => (hasRecords.value ? totalPages.value : 0));
const currentPage = computed(() => (hasRecords.value ? normalizePage(props.page, totalPages.value) : 0));
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const isDisabled = computed(() => props.disabled || props.loading);
const start = computed(() => (safeTotal.value === 0 ? 0 : (currentPage.value - 1) * safePageSize.value + 1));
const end = computed(() => clampNumber(currentPage.value * safePageSize.value, 0, safeTotal.value));
const normalizedPageSizeOptions = computed(() => normalizePageSizeOptions(safePageSize.value, props.pageSizeOptions));
const pageSizeText = (size: number) => formatTemplate(t("common.pagination.pageSize"), { size });
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const summaryAriaText = computed(() =>
  hasRecords.value
    ? `显示 ${start.value}-${end.value}，共 ${safeTotal.value} 条`
    : `显示 0-0，共 0 条`
);
const elementCurrentPage = computed(() => (hasRecords.value ? currentPage.value : 1));
const elementSize = computed(() => {
  if (resolvedSize.value === "sm") return "small";
  if (resolvedSize.value === "lg") return "large";
  return "default";
});
const pagerCount = computed(() => {
  const rawCount = safeSiblingCount.value * 2 + (props.showEdges ? 5 : 3);
  const oddCount = rawCount % 2 === 0 ? rawCount + 1 : rawCount;
  return clampNumber(oddCount, 5, 21);
});
const paginationLayout = computed(() => (props.simple || !hasRecords.value ? "prev, next" : "prev, pager, next"));

const emitPage = (page: number) => {
  if (isDisabled.value || !hasRecords.value) return;
  const nextPage = normalizePage(page, totalPages.value);
  if (nextPage === currentPage.value) return;
  emit("update:page", nextPage);
  emit("change", { page: nextPage, pageSize: safePageSize.value });
};

const handleCurrentPageUpdate = (page: number) => {
  emitPage(page);
};

const emitPageSize = (event: Event) => {
  if (isDisabled.value) return;
  const nextPageSize = toIntegerAtLeast(getEventTargetValue(event), 1, safePageSize.value);
  const nextPage = hasRecords.value ? 1 : 0;
  emit("update:pageSize", nextPageSize);
  emit("update:page", nextPage);
  emit("change", { page: nextPage, pageSize: nextPageSize });
};
</script>

<template>
  <nav
    class="base-pagination"
    :class="[
      `base-pagination--${resolvedSize}`,
      `base-pagination--${surface}`,
      {
        'base-pagination--simple': simple,
        'is-loading': loading,
        'is-disabled': isDisabled,
      },
    ]"
    :aria-label="ariaLabel || t('common.pagination.label')"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="isDisabled ? 'true' : undefined"
  >
    <span v-if="loading" class="sr-only" role="status" aria-live="polite">
      {{ resolvedLoadingText }}
    </span>

    <div v-if="showSummary" class="base-pagination__summary" role="status" aria-live="polite">
      <span class="sr-only">{{ summaryAriaText }}</span>
      <span>{{ start }}-{{ end }}</span>
      <span>/</span>
      <strong>{{ safeTotal }}</strong>
    </div>

    <div class="base-pagination__controls">
      <span v-if="simple" class="base-pagination__simple" aria-live="polite">
        {{ currentPage }} / {{ displayTotalPages }}
      </span>
      <el-pagination
        class="base-pagination__pager"
        :current-page="elementCurrentPage"
        :page-size="safePageSize"
        :total="safeTotal"
        :pager-count="pagerCount"
        :layout="paginationLayout"
        :size="elementSize"
        :disabled="isDisabled || !hasRecords"
        :hide-on-single-page="false"
        :prev-text="simple ? t('common.pagination.previous') : ''"
        :next-text="simple ? t('common.pagination.next') : ''"
        @update:current-page="handleCurrentPageUpdate"
      />
    </div>

    <select
      v-if="showPageSize && !simple"
      class="base-pagination__select"
      :value="safePageSize"
      :disabled="isDisabled"
      :aria-label="t('common.pagination.pageSizeLabel')"
      @change="emitPageSize"
    >
      <option v-for="option in normalizedPageSizeOptions" :key="option" :value="option">
        {{ pageSizeText(option) }}
      </option>
    </select>
  </nav>
</template>

<style scoped>
.base-pagination {
  @apply flex min-w-0 max-w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.base-pagination.is-disabled,
.base-pagination.is-loading {
  @apply opacity-60;
}

.base-pagination--sm {
  @apply gap-2 rounded-xl px-2 py-1.5;
}

.base-pagination--lg {
  @apply px-4 py-3;
}

.base-pagination--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-pagination--plain {
  @apply rounded-none border-0 bg-transparent px-0 py-0 shadow-none dark:bg-transparent;
}

.base-pagination__summary {
  @apply flex items-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-500;
}

.base-pagination__summary strong {
  @apply text-slate-700 dark:text-slate-200;
}

.base-pagination__controls {
  @apply flex min-w-0 flex-wrap items-center justify-center gap-1;
}

.base-pagination--simple .base-pagination__controls {
  @apply flex-1 justify-end;
}

:deep(.base-pagination__pager) {
  @apply m-0 flex min-w-0 flex-wrap items-center justify-center gap-1 p-0;
  --el-pagination-button-width: 28px;
  --el-pagination-button-height: 28px;
  --el-pagination-button-disabled-bg-color: rgb(248 250 252);
  --el-pagination-bg-color: transparent;
  --el-pagination-text-color: rgb(71 85 105);
  --el-pagination-hover-color: rgb(var(--color-primary));
  --el-pagination-button-color: rgb(71 85 105);
  --el-pagination-button-bg-color: transparent;
  --el-pagination-button-disabled-color: rgb(148 163 184);
}

.base-pagination--sm :deep(.base-pagination__pager) {
  --el-pagination-button-width: 28px;
  --el-pagination-button-height: 28px;
}

.base-pagination--lg :deep(.base-pagination__pager) {
  --el-pagination-button-width: 32px;
  --el-pagination-button-height: 32px;
}

:deep(.base-pagination__pager .btn-prev),
:deep(.base-pagination__pager .btn-next),
:deep(.base-pagination__pager .el-pager li) {
  @apply inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-black text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100;
  margin: 0;
  line-height: 1;
}

:deep(.base-pagination__pager .btn-prev span),
:deep(.base-pagination__pager .btn-next span) {
  @apply px-1;
}

:deep(.base-pagination__pager .el-pager) {
  @apply m-0 flex min-w-0 flex-wrap items-center justify-center gap-1 p-0;
}

:deep(.base-pagination__pager .el-pager li.more) {
  @apply border-transparent bg-transparent px-1 text-slate-300 dark:text-slate-600;
}

.base-pagination--lg :deep(.base-pagination__pager .btn-prev),
.base-pagination--lg :deep(.base-pagination__pager .btn-next),
.base-pagination--lg :deep(.base-pagination__pager .el-pager li) {
  @apply h-8 min-w-8 text-xs;
}

.base-pagination--sm :deep(.base-pagination__pager .btn-prev),
.base-pagination--sm :deep(.base-pagination__pager .btn-next),
.base-pagination--sm :deep(.base-pagination__pager .el-pager li) {
  @apply h-7 min-w-7 text-[11px];
}

:deep(.base-pagination__pager .btn-prev:disabled),
:deep(.base-pagination__pager .btn-next:disabled),
:deep(.base-pagination__pager .el-pager li.is-disabled) {
  @apply hover:border-slate-200 hover:bg-slate-50 hover:text-slate-600 dark:hover:border-slate-800 dark:hover:bg-slate-950 dark:hover:text-slate-300;
}

:deep(.base-pagination__pager .el-pager li.is-active) {
  border-color: rgba(var(--color-primary), 0.4);
  background-color: rgba(var(--color-primary), 0.1);
  box-shadow: inset 0 0 0 1px rgba(var(--color-primary), 0.12);
  @apply text-primary;
}

.base-pagination__simple {
  @apply inline-flex h-7 items-center rounded-lg px-2 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.base-pagination__select {
  @apply h-7 max-w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-black text-slate-600 outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-20 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300;
}

.base-pagination--lg .base-pagination__select {
  @apply h-8 text-xs;
}

@media (prefers-reduced-motion: reduce) {
  .base-pagination,
  :deep(.base-pagination__pager .btn-prev),
  :deep(.base-pagination__pager .btn-next),
  :deep(.base-pagination__pager .el-pager li),
  .base-pagination__select {
    transition: none !important;
  }
}

@media (max-width: 640px) {
  .base-pagination {
    @apply items-stretch;
  }

  .base-pagination__summary,
  .base-pagination__controls,
  .base-pagination__select {
    @apply w-full;
  }

  .base-pagination__summary {
    @apply justify-center;
  }
}
</style>
