<script setup lang="ts">
import { computed } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { clampNumber, formatTemplate, getTotalPages, getVisiblePageNumbers, normalizePage } from "../../utils";

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
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "update:page", value: number): void;
  (e: "update:pageSize", value: number): void;
  (e: "change", payload: { page: number; pageSize: number }): void;
}>();

const { t } = useI18n();

const totalPages = computed(() => getTotalPages(props.total, props.pageSize));
const currentPage = computed(() => normalizePage(props.page, totalPages.value));
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const isDisabled = computed(() => props.disabled || props.loading);
const start = computed(() => (props.total === 0 ? 0 : (currentPage.value - 1) * props.pageSize + 1));
const end = computed(() => clampNumber(currentPage.value * props.pageSize, 0, props.total));
const pageSizeText = (size: number) => formatTemplate(t("common.pagination.pageSize"), { size });
const pageAriaText = (page: number) => formatTemplate(t("common.pagination.page"), { page });

const visiblePages = computed(() => getVisiblePageNumbers(currentPage.value, totalPages.value));

const emitPage = (page: number) => {
  if (isDisabled.value) return;
  const nextPage = normalizePage(page, totalPages.value);
  emit("update:page", nextPage);
  emit("change", { page: nextPage, pageSize: props.pageSize });
};

const emitPageSize = (event: Event) => {
  if (isDisabled.value) return;
  const nextPageSize = Number((event.target as HTMLSelectElement).value);
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
        'is-disabled': disabled,
      },
    ]"
    :aria-label="ariaLabel || t('common.pagination.label')"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <div v-if="showSummary" class="base-pagination__summary" role="status" aria-live="polite">
      <span>{{ start }}-{{ end }}</span>
      <span>/</span>
      <strong>{{ total }}</strong>
    </div>

    <div class="base-pagination__controls">
      <button
        v-if="showEdges && !simple"
        type="button"
        class="base-pagination__button"
        :disabled="isDisabled || currentPage <= 1"
        :aria-label="pageAriaText(1)"
        @click="emitPage(1)"
      >
        1
      </button>

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

      <template v-else v-for="(pageItem, index) in visiblePages" :key="pageItem">
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

      <button
        type="button"
        class="base-pagination__button"
        :disabled="isDisabled || currentPage >= totalPages"
        :aria-label="t('common.pagination.next')"
        @click="emitPage(currentPage + 1)"
      >
        <ChevronRight class="h-4 w-4" aria-hidden="true" />
      </button>

      <button
        v-if="showEdges && !simple"
        type="button"
        class="base-pagination__button"
        :disabled="isDisabled || currentPage >= totalPages"
        :aria-label="pageAriaText(totalPages)"
        @click="emitPage(totalPages)"
      >
        {{ totalPages }}
      </button>
    </div>

    <select
      v-if="showPageSize && !simple"
      class="base-pagination__select"
      :value="pageSize"
      :disabled="isDisabled"
      :aria-label="t('common.pagination.pageSizeLabel')"
      @change="emitPageSize"
    >
      <option v-for="option in pageSizeOptions" :key="option" :value="option">
        {{ pageSizeText(option) }}
      </option>
    </select>
  </nav>
</template>

<style scoped>
.base-pagination {
  @apply flex min-w-0 max-w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
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
  @apply flex min-w-0 items-center gap-1;
}

.base-pagination--simple .base-pagination__controls {
  @apply flex-1 justify-end;
}

.base-pagination__button,
.base-pagination__page {
  @apply inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-black text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100;
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
  @apply text-primary;
}

.base-pagination__ellipsis {
  @apply px-1 text-[11px] font-black text-slate-300 dark:text-slate-600;
}

.base-pagination__simple {
  @apply inline-flex h-7 items-center rounded-lg px-2 text-[11px] font-black text-slate-500 dark:text-slate-400;
}

.base-pagination__select {
  @apply h-7 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-black text-slate-600 outline-none transition focus:border-primary disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300;
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
</style>
