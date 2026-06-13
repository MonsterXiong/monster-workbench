<script setup lang="ts">
import type { ElPagination } from "element-plus";
import type { CSSProperties, StyleValue } from "vue";
import { computed, ref, useAttrs } from "vue";
import { useI18n } from "../../composables/useI18n";
import BaseSelect from "./BaseSelect.vue";
import { toElementPlusSize } from "./elementPlusDom";
import {
  clampNumber,
  formatTemplate,
  getTotalPages,
  joinNonEmptyStrings,
  normalizePage,
  normalizePageSizeOptions,
  omit,
  toIntegerAtLeast,
  toNonNegativeInteger,
} from "../../utils";

defineOptions({
  inheritAttrs: false,
});

type PageSizeControl = "base" | "native";
type PaginationNativeInstance = InstanceType<typeof ElPagination>;

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
  showJumper?: boolean;
  pageSizeControl?: PageSizeControl;
  hideOnSinglePage?: boolean;
  background?: boolean;
  simple?: boolean;
  compact?: boolean;
  surface?: "card" | "muted" | "plain";
  size?: "sm" | "md" | "lg";
  siblingCount?: number;
  pagerCount?: number;
  layout?: string;
  teleported?: boolean;
  appendSizeTo?: string;
  popperClass?: string;
  popperStyle?: string | CSSProperties;
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
  showJumper: false,
  pageSizeControl: "base",
  hideOnSinglePage: false,
  background: false,
  simple: false,
  compact: false,
  surface: "card",
  size: "md",
  siblingCount: 1,
  pagerCount: undefined,
  layout: "",
  teleported: true,
  appendSizeTo: "",
  popperClass: "",
  popperStyle: undefined,
  loadingText: "",
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "update:page", value: number): void;
  (e: "update:pageSize", value: number): void;
  (e: "change", payload: { page: number; pageSize: number }): void;
  (e: "current-change", value: number): void;
  (e: "size-change", value: number): void;
  (e: "prev-click", value: number): void;
  (e: "next-click", value: number): void;
}>();

const { t } = useI18n();
const attrs = useAttrs();
const rootRef = ref<HTMLElement | null>(null);
const paginationRef = ref<PaginationNativeInstance | null>(null);

const safeTotal = computed(() => toNonNegativeInteger(props.total));
const safePageSize = computed(() => toIntegerAtLeast(props.pageSize, 1, 1));
const safeSiblingCount = computed(() => toNonNegativeInteger(props.siblingCount, 1));
const totalPages = computed(() => getTotalPages(safeTotal.value, safePageSize.value));
const hasRecords = computed(() => safeTotal.value > 0);
const displayTotalPages = computed(() => (hasRecords.value ? totalPages.value : 0));
const currentPage = computed(() => (hasRecords.value ? normalizePage(props.page, totalPages.value) : 0));
const isSinglePage = computed(() => totalPages.value <= 1);
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const isDisabled = computed(() => props.disabled || props.loading);
const start = computed(() => (safeTotal.value === 0 ? 0 : (currentPage.value - 1) * safePageSize.value + 1));
const end = computed(() => clampNumber(currentPage.value * safePageSize.value, 0, safeTotal.value));
const normalizedPageSizeOptions = computed(() => normalizePageSizeOptions(safePageSize.value, props.pageSizeOptions));
const pageSizeText = (size: number) => formatTemplate(t("common.pagination.pageSize"), { size });
const pageSizeSelectOptions = computed(() => normalizedPageSizeOptions.value.map((option) => ({ label: pageSizeText(option), value: option })));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const summaryAriaText = computed(() =>
  hasRecords.value
    ? `显示 ${start.value}-${end.value}，共 ${safeTotal.value} 条`
    : `显示 0-0，共 0 条`
);
const elementCurrentPage = computed(() => (hasRecords.value ? currentPage.value : 1));
const elementSize = computed(() => toElementPlusSize(resolvedSize.value));
const shouldUseNativePageSize = computed(() => props.showPageSize && !props.simple && props.pageSizeControl === "native");
const pagerCount = computed(() => {
  if (props.pagerCount !== undefined) {
    const oddCount = props.pagerCount % 2 === 0 ? props.pagerCount + 1 : props.pagerCount;
    return clampNumber(oddCount, 5, 21);
  }
  const rawCount = safeSiblingCount.value * 2 + (props.showEdges ? 5 : 3);
  const oddCount = rawCount % 2 === 0 ? rawCount + 1 : rawCount;
  return clampNumber(oddCount, 5, 21);
});
const paginationLayout = computed(() => {
  if (props.layout) return props.layout;
  if (props.simple || !hasRecords.value) return "prev, next";
  const parts = [];
  if (shouldUseNativePageSize.value) parts.push("sizes");
  parts.push("prev", "pager", "next");
  if (props.showJumper) parts.push("jumper");
  return parts.join(", ");
});
const layoutUsesNativePageSize = computed(() => props.showPageSize && !props.simple && /\bsizes\b/.test(paginationLayout.value));
const shouldShowPager = computed(() => !(props.hideOnSinglePage && isSinglePage.value));
const shouldRenderBasePageSize = computed(() => props.showPageSize && !props.simple && !layoutUsesNativePageSize.value);
const shouldRenderRoot = computed(() => shouldShowPager.value || props.showSummary || shouldRenderBasePageSize.value);
const resolvedPopperClass = computed(() => joinNonEmptyStrings(["base-pagination-popper", props.popperClass]));
const rootClass = computed(() => attrs.class);
const rootStyle = computed(() => attrs.style as StyleValue | undefined);
const paginationPassthroughAttrs = computed(() => omit(attrs, ["class", "style", "aria-label", "aria-busy", "aria-disabled"]));

const emitPage = (page: number) => {
  if (isDisabled.value || !hasRecords.value) return;
  const nextPage = normalizePage(page, totalPages.value);
  if (nextPage === currentPage.value) return;
  emit("update:page", nextPage);
  emit("current-change", nextPage);
  emit("change", { page: nextPage, pageSize: safePageSize.value });
};

const handleCurrentPageUpdate = (page: number) => {
  emitPage(page);
};

const handlePageSizeUpdate = (pageSize: number) => {
  emitPageSize(pageSize);
};

const handlePrevClick = (page: number) => {
  emit("prev-click", normalizePage(page, totalPages.value));
};

const handleNextClick = (page: number) => {
  emit("next-click", normalizePage(page, totalPages.value));
};

const emitPageSize = (value: unknown) => {
  if (isDisabled.value) return;
  const rawValue = Array.isArray(value) ? value[0] : value;
  const nextPageSize = toIntegerAtLeast(rawValue, 1, safePageSize.value);
  const nextPage = hasRecords.value ? 1 : 0;
  emit("update:pageSize", nextPageSize);
  emit("update:page", nextPage);
  emit("size-change", nextPageSize);
  if (nextPage !== currentPage.value) {
    emit("current-change", nextPage);
  }
  emit("change", { page: nextPage, pageSize: nextPageSize });
};

const getElement = () => (rootRef.value instanceof HTMLElement ? rootRef.value : null);

const focusFirstControl = () => {
  const target = getElement()?.querySelector<HTMLElement>(
    "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"
  );
  target?.focus();
  return target ?? null;
};

const focusCurrentPage = () => {
  const target = getElement()?.querySelector<HTMLElement>(".el-pager li.is-active, [aria-current='page']");
  if (!target) return null;

  if (!target.hasAttribute("tabindex")) {
    target.tabIndex = 0;
  }

  target.focus();
  return target;
};

defineExpose({
  getNativePagination: () => paginationRef.value,
  getElement,
  focusFirstControl,
  focusCurrentPage,
});
</script>

<template>
  <nav
    v-if="shouldRenderRoot"
    ref="rootRef"
    v-bind="paginationPassthroughAttrs"
    class="base-pagination"
    :class="[
      rootClass,
      `base-pagination--${resolvedSize}`,
      `base-pagination--${surface}`,
      {
        'base-pagination--simple': simple,
        'base-pagination--native-sizes': layoutUsesNativePageSize,
        'is-loading': loading,
        'is-disabled': isDisabled,
      },
    ]"
    :style="rootStyle"
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

    <div v-if="shouldShowPager" class="base-pagination__controls">
      <span v-if="simple" class="base-pagination__simple" aria-live="polite">
        {{ currentPage }} / {{ displayTotalPages }}
      </span>
      <el-pagination
        ref="paginationRef"
        class="base-pagination__pager"
        :current-page="elementCurrentPage"
        :page-size="safePageSize"
        :total="safeTotal"
        :pager-count="pagerCount"
        :page-sizes="normalizedPageSizeOptions"
        :layout="paginationLayout"
        :size="elementSize"
        :background="background"
        :disabled="isDisabled || !hasRecords"
        :hide-on-single-page="hideOnSinglePage"
        :teleported="teleported"
        :append-size-to="appendSizeTo || undefined"
        :popper-class="resolvedPopperClass"
        :popper-style="popperStyle"
        :prev-text="simple ? t('common.pagination.previous') : ''"
        :next-text="simple ? t('common.pagination.next') : ''"
        @update:current-page="handleCurrentPageUpdate"
        @update:page-size="handlePageSizeUpdate"
        @prev-click="handlePrevClick"
        @next-click="handleNextClick"
      />
    </div>

    <BaseSelect
      v-if="shouldRenderBasePageSize"
      class="base-pagination__select"
      :model-value="safePageSize"
      :options="pageSizeSelectOptions"
      :disabled="isDisabled"
      :aria-label="t('common.pagination.pageSizeLabel')"
      :size="resolvedSize"
      :teleported="teleported"
      :fit-input-width="false"
      :popper-class="resolvedPopperClass"
      @update:model-value="emitPageSize"
    />
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

:deep(.base-pagination__pager.is-background .btn-prev),
:deep(.base-pagination__pager.is-background .btn-next),
:deep(.base-pagination__pager.is-background .el-pager li) {
  @apply border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900;
}

:deep(.base-pagination__pager.is-background .el-pager li.is-active) {
  border-color: rgba(var(--color-primary), 0.36);
  background-color: rgb(var(--color-primary));
  box-shadow: 0 8px 18px rgba(var(--color-primary), 0.18);
  @apply text-white;
}

:deep(.base-pagination__pager .el-pagination__jump) {
  @apply ml-1 flex h-7 items-center gap-1 whitespace-nowrap text-[11px] font-bold text-slate-500 dark:text-slate-400;
}

:deep(.base-pagination__pager .el-pagination__goto),
:deep(.base-pagination__pager .el-pagination__classifier) {
  @apply text-[11px] font-bold text-slate-400 dark:text-slate-500;
}

:deep(.base-pagination__pager .el-pagination__jump .el-input) {
  @apply mx-1 w-14;
}

:deep(.base-pagination__pager .el-pagination__jump .el-input__wrapper) {
  @apply h-7 rounded-lg border border-slate-200 bg-slate-50 px-2 shadow-none transition dark:border-slate-800 dark:bg-slate-950;
  box-shadow: none;
}

:deep(.base-pagination__pager .el-pagination__jump .el-input__wrapper:hover) {
  @apply border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900;
}

:deep(.base-pagination__pager .el-pagination__jump .el-input__wrapper.is-focus) {
  border-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.14);
  @apply bg-white dark:bg-slate-900;
}

:deep(.base-pagination__pager .el-pagination__jump .el-input__inner) {
  @apply h-6 text-center text-[11px] font-black text-slate-700 dark:text-slate-100;
}

.base-pagination--native-sizes :deep(.base-pagination__pager) {
  @apply gap-2;
}

:deep(.base-pagination__pager .el-pagination__sizes) {
  @apply m-0 min-w-0;
}

:deep(.base-pagination__pager .el-pagination__sizes .el-select) {
  @apply w-32;
}

:deep(.base-pagination__pager .el-pagination__sizes .el-select__wrapper) {
  @apply min-h-7 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] shadow-none transition dark:border-slate-800 dark:bg-slate-950;
  box-shadow: none;
}

:deep(.base-pagination__pager .el-pagination__sizes .el-select__wrapper:hover) {
  @apply border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900;
}

:deep(.base-pagination__pager .el-pagination__sizes .el-select__wrapper.is-focused) {
  border-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.14);
  @apply bg-white dark:bg-slate-900;
}

:deep(.base-pagination__pager .el-pagination__sizes .el-select__placeholder),
:deep(.base-pagination__pager .el-pagination__sizes .el-select__selected-item) {
  @apply text-[11px] font-black text-slate-700 dark:text-slate-100;
}

:global(.base-pagination-popper.el-popper) {
  --el-color-primary: rgb(var(--color-primary));
}

:global(.base-pagination-popper .el-select-dropdown) {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 16px 34px rgba(15, 23, 42, 0.13),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

:global(.base-pagination-popper .el-select-dropdown__list) {
  padding: 5px;
}

:global(.base-pagination-popper .el-select-dropdown__item) {
  height: 30px;
  border-radius: 8px;
  padding: 0 9px;
  color: #334155;
  font-size: 11px;
  font-weight: 850;
  line-height: 30px;
}

:global(.base-pagination-popper .el-select-dropdown__item.hover),
:global(.base-pagination-popper .el-select-dropdown__item:hover) {
  background: #f1f5f9;
  color: #0f172a;
}

:global(.base-pagination-popper .el-select-dropdown__item.selected) {
  background: rgb(var(--color-primary) / 0.1);
  color: rgb(var(--color-primary));
}

:global(.dark .base-pagination-popper .el-select-dropdown) {
  border-color: #1e293b;
  background: #0f172a;
  box-shadow:
    0 16px 34px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(148, 163, 184, 0.08);
}

:global(.dark .base-pagination-popper .el-select-dropdown__item) {
  color: #cbd5e1;
}

:global(.dark .base-pagination-popper .el-select-dropdown__item.hover),
:global(.dark .base-pagination-popper .el-select-dropdown__item:hover) {
  background: #1e293b;
  color: #f8fafc;
}

.base-pagination__simple {
  @apply inline-flex h-7 items-center rounded-lg px-2 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.base-pagination__select {
  @apply w-36 shrink-0;
}

@media (prefers-reduced-motion: reduce) {
  .base-pagination,
  :deep(.base-pagination__pager .btn-prev),
  :deep(.base-pagination__pager .btn-next),
  :deep(.base-pagination__pager .el-pager li) {
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
