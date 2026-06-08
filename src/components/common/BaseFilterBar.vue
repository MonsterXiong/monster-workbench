<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";

export interface FilterBarItem {
  key: string;
  label: string;
  value: string | number;
  type?: "primary" | "success" | "warning" | "danger" | "neutral";
  removable?: boolean;
}

interface Props {
  title?: string;
  description?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  filters?: FilterBarItem[];
  count?: number | string | null;
  countLabel?: string;
  emptyText?: string;
  selectedText?: string;
  clearText?: string;
  compact?: boolean;
  surface?: "card" | "muted" | "plain";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  showSearch?: boolean;
  showClear?: boolean;
  showSummaryWhenEmpty?: boolean;
  divided?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  description: "",
  searchValue: "",
  searchPlaceholder: "",
  filters: () => [],
  count: null,
  countLabel: "",
  emptyText: "",
  selectedText: "",
  clearText: "",
  compact: false,
  surface: "card",
  size: "md",
  loading: false,
  disabled: false,
  showSearch: true,
  showClear: true,
  showSummaryWhenEmpty: true,
  divided: true,
  ariaLabel: "",
});

const { t } = useI18n();
const filterId = useId();
const titleId = `base-filter-bar-title-${filterId}`;
const descriptionId = `base-filter-bar-description-${filterId}`;
const labelledBy = computed(() => (!props.ariaLabel && props.title ? titleId : undefined));
const describedBy = computed(() => (props.description ? descriptionId : undefined));
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const isInteractiveDisabled = computed(() => props.disabled || props.loading);

const emit = defineEmits<{
  (e: "update:searchValue", value: string): void;
  (e: "search", value: string): void;
  (e: "remove-filter", filter: FilterBarItem): void;
  (e: "clear"): void;
}>();

const handleSearchUpdate = (value: string) => {
  emit("update:searchValue", value);
};

const handleSearchClear = () => {
  if (isInteractiveDisabled.value) return;
  emit("update:searchValue", "");
  emit("search", "");
};

const handleRemoveFilter = (filter: FilterBarItem) => {
  if (isInteractiveDisabled.value || filter.removable === false) return;
  emit("remove-filter", filter);
};

const handleClear = () => {
  if (isInteractiveDisabled.value) return;
  emit("clear");
};

void resolvedSize;
void handleRemoveFilter;
void handleClear;
</script>

<template>
  <section
    class="base-filter-bar"
    :class="[
      `base-filter-bar--${resolvedSize}`,
      `base-filter-bar--${surface}`,
      {
        'base-filter-bar--divided': divided,
        'is-loading': loading,
        'is-disabled': disabled,
      },
    ]"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <div class="base-filter-bar__head">
      <div class="base-filter-bar__title-wrap">
        <div class="base-filter-bar__title-row">
          <h3 v-if="title" :id="titleId">{{ title }}</h3>
          <span v-if="count !== null && count !== undefined" class="base-filter-bar__count">
            {{ count }} {{ countLabel || t('common.filterCount') }}
          </span>
        </div>
        <p v-if="description" :id="descriptionId">{{ description }}</p>
      </div>

      <div v-if="$slots.actions" class="base-filter-bar__actions">
        <slot name="actions"></slot>
      </div>
    </div>

    <div class="base-filter-bar__main">
      <BaseSearchInput
        v-if="showSearch"
        class="base-filter-bar__search"
        :model-value="searchValue"
        :placeholder="searchPlaceholder || t('common.search')"
        :size="resolvedSize === 'lg' ? 'md' : resolvedSize"
        :loading="loading"
        :disabled="isInteractiveDisabled"
        @update:model-value="handleSearchUpdate"
        @search="emit('search', $event)"
        @clear="handleSearchClear"
      />

      <div v-if="$slots.filters" class="base-filter-bar__controls">
        <slot name="filters"></slot>
      </div>
    </div>

    <div v-if="filters.length" class="base-filter-bar__summary">
      <span class="base-filter-bar__summary-label">{{ selectedText || t('common.selectedFilters') }}</span>
      <button
        v-for="filter in filters"
        :key="filter.key"
        type="button"
        class="base-filter-bar__chip"
        :class="`base-filter-bar__chip--${filter.type || 'neutral'}`"
        :disabled="isInteractiveDisabled || filter.removable === false"
        :aria-label="
          filter.removable === false
            ? `${filter.label}: ${filter.value}`
            : `${t('common.removeFilter')}: ${filter.label} ${filter.value}`
        "
        :title="filter.removable === false ? `${filter.label}: ${filter.value}` : `${t('common.removeFilter')}: ${filter.label} ${filter.value}`"
        @click="handleRemoveFilter(filter)"
      >
        <span>{{ filter.label }}: {{ filter.value }}</span>
        <BaseIcon v-if="filter.removable !== false" name="X" size="12" aria-hidden="true" />
      </button>
      <button
        v-if="showClear"
        type="button"
        class="base-filter-bar__clear"
        :disabled="isInteractiveDisabled"
        :aria-label="clearText || t('common.clear')"
        :title="clearText || t('common.clear')"
        @click="handleClear"
      >
        {{ clearText || t('common.clear') }}
      </button>
    </div>

    <div v-else-if="showSummaryWhenEmpty" class="base-filter-bar__summary base-filter-bar__summary--empty">
      <span class="base-filter-bar__summary-label">{{ emptyText || t('common.noFilters') }}</span>
    </div>
  </section>
</template>

<style scoped>
.base-filter-bar {
  @apply min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
}

.base-filter-bar--sm {
  @apply rounded-xl p-3;
}

.base-filter-bar--lg {
  @apply p-5;
}

.base-filter-bar--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-filter-bar--plain {
  @apply rounded-none border-0 bg-transparent p-0 shadow-none dark:bg-transparent;
}

.base-filter-bar.is-loading,
.base-filter-bar.is-disabled {
  @apply opacity-75;
}

.base-filter-bar__head {
  @apply flex min-w-0 flex-wrap items-start justify-between gap-3;
}

.base-filter-bar__title-wrap {
  @apply min-w-0;
}

.base-filter-bar__title-row {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}

.base-filter-bar h3 {
  @apply truncate text-sm font-black text-slate-900 dark:text-slate-100;
}

.base-filter-bar--lg h3 {
  @apply text-base;
}

.base-filter-bar p {
  @apply mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400;
}

.base-filter-bar--lg p {
  @apply text-sm;
}

.base-filter-bar__count {
  background-color: rgba(var(--color-primary), 0.1);
  @apply inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold text-primary;
}

.base-filter-bar__actions {
  @apply flex shrink-0 flex-wrap items-center justify-end gap-2;
}

.base-filter-bar__main {
  @apply mt-3 flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center;
}

.base-filter-bar__search {
  @apply lg:max-w-xs;
}

.base-filter-bar--lg .base-filter-bar__search {
  @apply lg:max-w-sm;
}

.base-filter-bar__controls {
  @apply flex min-w-0 flex-1 flex-wrap items-center gap-2;
}

.base-filter-bar__summary {
  @apply mt-3 flex min-w-0 flex-wrap items-center gap-2 pt-3 lg:basis-full;
}

.base-filter-bar--divided .base-filter-bar__summary {
  @apply border-t border-slate-100 dark:border-slate-800;
}

.base-filter-bar__summary--empty {
  @apply min-h-10 items-center;
}

.base-filter-bar__summary-label {
  @apply text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500;
}

.base-filter-bar__chip {
  @apply inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-black transition disabled:cursor-default;
  color: rgb(var(--chip-color));
  background-color: rgba(var(--chip-color), 0.1);
  border-color: rgba(var(--chip-color), 0.18);
}

.base-filter-bar__chip:not(:disabled):hover {
  border-color: rgba(var(--chip-color), 0.36);
  background-color: rgba(var(--chip-color), 0.16);
}

.base-filter-bar__chip span {
  @apply truncate;
}

.base-filter-bar__chip--primary {
  --chip-color: var(--color-primary);
}

.base-filter-bar__chip--success {
  --chip-color: 16 185 129;
}

.base-filter-bar__chip--warning {
  --chip-color: 245 158 11;
}

.base-filter-bar__chip--danger {
  --chip-color: 239 68 68;
}

.base-filter-bar__chip--neutral {
  --chip-color: 100 116 139;
}

.base-filter-bar__clear {
  @apply rounded-full px-2 py-1 text-[10px] font-black text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

@media (prefers-reduced-motion: reduce) {
  .base-filter-bar,
  .base-filter-bar__chip,
  .base-filter-bar__clear {
    transition: none !important;
  }
}
</style>
