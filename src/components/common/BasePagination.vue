<script setup lang="ts">
import { computed } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import {
  clampNumber,
  formatTemplate,
  getEventTargetValue,
  getTotalPages,
  getVisiblePageNumbers,
  normalizePage,
  toIntegerAtLeast,
  toNonNegativeInteger,
  uniqueArray,
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
const currentPage = computed(() => normalizePage(props.page, totalPages.value));
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const isDisabled = computed(() => props.disabled || props.loading);
const start = computed(() => (safeTotal.value === 0 ? 0 : (currentPage.value - 1) * safePageSize.value + 1));
const end = computed(() => clampNumber(currentPage.value * safePageSize.value, 0, safeTotal.value));
const normalizedPageSizeOptions = computed(() =>
  uniqueArray([safePageSize.value, ...props.pageSizeOptions.map((option) => toIntegerAtLeast(option, 1, safePageSize.value))]).sort(
    (left, right) => left - right
  )
);
const pageSizeText = (size: number) => formatTemplate(t("common.pagination.pageSize"), { size });
const pageAriaText = (page: number) => formatTemplate(t("common.pagination.page"), { page });
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));

const visiblePages = computed(() => {
  const pages = getVisiblePageNumbers(currentPage.value, totalPages.value, safeSiblingCount.value, !props.showEdges);

  if (!props.showEdges || totalPages.value <= 1) {
    return pages;
  }

  return pages.filter((page) => page !== 1 && page !== totalPages.value);
});
const showEdgeButtons = computed(() => props.showEdges && !props.simple && totalPages.value > 1);
const hasLeadingEllipsis = computed(() => showEdgeButtons.value && visiblePages.value.length > 0 && visiblePages.value[0] > 2);
const hasTrailingEllipsis = computed(
  () => showEdgeButtons.value && visiblePages.value.length > 0 && visiblePages.value[visiblePages.value.length - 1] < totalPages.value - 1
);

const emitPage = (page: number) => {
  if (isDisabled.value) return;
  const nextPage = normalizePage(page, totalPages.value);
  emit("update:page", nextPage);
  emit("change", { page: nextPage, pageSize: safePageSize.value });
};

const emitPageSize = (event: Event) => {
  if (isDisabled.value) return;
  const nextPageSize = toIntegerAtLeast(getEventTargetValue(event), 1, safePageSize.value);
  emit("update:pageSize", nextPageSize);
  emit("update:page", 1);
  emit("change", { page: 1, pageSize: nextPageSize });
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
      <span>{{ start }}-{{ end }}</span>
      <span>/</span>
      <strong>{{ safeTotal }}</strong>
    </div>

    <div class="base-pagination__controls">
      <button
        type="button"
        class="base-pagination__button"
        :disabled="isDisabled || currentPage <= 1"
        :aria-label="t('common.pagination.previous')"
        @click="emitPage(currentPage - 1)"
      >
        <ChevronLeft class="h-4 w-4" aria-hidden="true" />
      </button>

      <span v-if="simple" class="base-pagination__simple" aria-live="polite">
        {{ currentPage }} / {{ totalPages }}
      </span>

      <template v-else>
        <button
          v-if="showEdgeButtons"
          type="button"
          class="base-pagination__page"
          :class="{ 'is-active': currentPage === 1 }"
          :disabled="isDisabled"
          :aria-current="currentPage === 1 ? 'page' : undefined"
          :aria-label="pageAriaText(1)"
          @click="emitPage(1)"
        >
          1
        </button>

        <span v-if="hasLeadingEllipsis" class="base-pagination__ellipsis" aria-hidden="true">...</span>

        <template v-for="(pageItem, index) in visiblePages" :key="pageItem">
          <span v-if="index > 0 && pageItem - visiblePages[index - 1] > 1" class="base-pagination__ellipsis" aria-hidden="true">...</span>
          <button
            type="button"
            class="base-pagination__page"
            :class="{ 'is-active': pageItem === currentPage }"
            :disabled="isDisabled"
            :aria-current="pageItem === currentPage ? 'page' : undefined"
            :aria-label="pageAriaText(pageItem)"
            @click="emitPage(pageItem)"
          >
            {{ pageItem }}
          </button>
        </template>

        <span v-if="hasTrailingEllipsis" class="base-pagination__ellipsis" aria-hidden="true">...</span>

        <button
          v-if="showEdgeButtons"
          type="button"
          class="base-pagination__page"
          :class="{ 'is-active': currentPage === totalPages }"
          :disabled="isDisabled"
          :aria-current="currentPage === totalPages ? 'page' : undefined"
          :aria-label="pageAriaText(totalPages)"
          @click="emitPage(totalPages)"
        >
          {{ totalPages }}
        </button>
      </template>

      <button
        type="button"
        class="base-pagination__button"
        :disabled="isDisabled || currentPage >= totalPages"
        :aria-label="t('common.pagination.next')"
        @click="emitPage(currentPage + 1)"
      >
        <ChevronRight class="h-4 w-4" aria-hidden="true" />
      </button>
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

.base-pagination__button,
.base-pagination__page {
  @apply inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-black text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100;
}

.base-pagination--lg .base-pagination__button,
.base-pagination--lg .base-pagination__page {
  @apply h-8 min-w-8 text-xs;
}

.base-pagination__button:disabled,
.base-pagination__page:disabled {
  @apply hover:border-slate-200 hover:bg-slate-50 hover:text-slate-600 dark:hover:border-slate-800 dark:hover:bg-slate-950 dark:hover:text-slate-300;
}

.base-pagination__page.is-active {
  border-color: rgba(var(--color-primary), 0.4);
  background-color: rgba(var(--color-primary), 0.1);
  box-shadow: inset 0 0 0 1px rgba(var(--color-primary), 0.12);
  @apply text-primary;
}

.base-pagination__ellipsis {
  @apply px-1 text-[11px] font-black text-slate-300 dark:text-slate-600;
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
  .base-pagination__button,
  .base-pagination__page,
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
