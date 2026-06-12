<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import { joinAriaIds } from "../../utils";

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
  searchId?: string;
  searchName?: string;
  searchAriaLabel?: string;
  searchAriaControls?: string;
  searchAriaDescribedby?: string;
  searchClearText?: string;
  searchLoadingText?: string;
  searchOnClear?: boolean;
  searchOnInput?: boolean;
  searchDebounce?: number;
  searchMinLength?: number;
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
  ariaLabelledby?: string;
  ariaDescribedby?: string;
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
  searchId: "",
  searchName: "",
  searchAriaLabel: "",
  searchAriaControls: "",
  searchAriaDescribedby: "",
  searchClearText: "",
  searchLoadingText: "",
  searchOnClear: true,
  searchOnInput: false,
  searchDebounce: 0,
  searchMinLength: 0,
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
  ariaLabelledby: "",
  ariaDescribedby: "",
});

const { t } = useI18n();
const filterId = useId();
const titleId = `base-filter-bar-title-${filterId}`;
const descriptionId = `base-filter-bar-description-${filterId}`;
const labelledBy = computed(() => (props.ariaLabel ? undefined : props.ariaLabelledby || (props.title ? titleId : undefined)));
const describedBy = computed(() => joinAriaIds([props.description ? descriptionId : undefined, props.ariaDescribedby]));
const searchDescribedBy = computed(() => joinAriaIds([props.description ? descriptionId : undefined, props.searchAriaDescribedby]));
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const isInteractiveDisabled = computed(() => props.disabled || props.loading);
const resolvedClearText = computed(() => props.clearText || t("common.clearFilters"));
const resolvedSearchClearText = computed(() => props.searchClearText || t("common.clearSearch"));
const resolvedSearchLoadingText = computed(() => props.searchLoadingText || t("common.loading"));
const resolvedSearchAriaLabel = computed(() => props.searchAriaLabel || (props.title ? `${props.title} ${t("common.search")}` : t("common.search")));
const slotState = computed(() => ({
  disabled: props.disabled,
  loading: props.loading,
  interactiveDisabled: isInteractiveDisabled.value,
}));

const emit = defineEmits<{
  (e: "update:searchValue", value: string): void;
  (e: "search", value: string): void;
  (e: "remove-filter", filter: FilterBarItem): void;
  (e: "clear"): void;
}>();

const handleSearchUpdate = (value: string) => {
  emit("update:searchValue", value);
};

const handleRemoveFilter = (filter: FilterBarItem) => {
  if (isInteractiveDisabled.value || filter.removable === false) return;
  emit("remove-filter", filter);
};

const handleClear = () => {
  if (isInteractiveDisabled.value) return;
  emit("clear");
};

const getFilterText = (filter: FilterBarItem) => `${filter.label}: ${filter.value}`;

const getFilterAriaLabel = (filter: FilterBarItem) => {
  if (filter.removable === false || isInteractiveDisabled.value) return getFilterText(filter);
  return `${t("common.removeFilter")}: ${getFilterText(filter)}`;
};

const getFilterTagType = (type?: FilterBarItem["type"]) => {
  if (type === "neutral" || !type) return "info";
  return type;
};
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
          <el-tag v-if="count !== null && count !== undefined" class="base-filter-bar__count" type="primary" effect="light" round>
            {{ count }} {{ countLabel || t('common.filterCount') }}
          </el-tag>
        </div>
        <p v-if="description" :id="descriptionId">{{ description }}</p>
      </div>

      <div v-if="$slots.actions" class="base-filter-bar__actions" role="group" :aria-label="t('common.actionsRegion')">
        <slot name="actions" v-bind="slotState"></slot>
      </div>
    </div>

    <div class="base-filter-bar__main">
      <BaseSearchInput
        v-if="showSearch"
        :id="searchId || undefined"
        :name="searchName || undefined"
        class="base-filter-bar__search"
        :model-value="searchValue"
        :placeholder="searchPlaceholder || t('common.search')"
        :size="resolvedSize === 'lg' ? 'md' : resolvedSize"
        :loading="loading"
        :disabled="disabled"
        :aria-label="resolvedSearchAriaLabel"
        :aria-controls="searchAriaControls || undefined"
        :aria-describedby="searchDescribedBy || undefined"
        :clear-text="resolvedSearchClearText"
        :loading-text="resolvedSearchLoadingText"
        :search-on-clear="searchOnClear"
        :search-on-input="searchOnInput"
        :debounce="searchDebounce"
        :min-length="searchMinLength"
        @update:model-value="handleSearchUpdate"
        @search="emit('search', $event)"
      />

      <div v-if="$slots.filters" class="base-filter-bar__controls">
        <slot name="filters" v-bind="slotState"></slot>
      </div>
    </div>

    <div v-if="filters.length" class="base-filter-bar__summary" aria-live="polite">
      <span class="base-filter-bar__summary-label">{{ selectedText || t('common.selectedFilters') }}</span>
      <template v-for="filter in filters" :key="filter.key">
        <el-tag
          class="base-filter-bar__chip"
          :class="`base-filter-bar__chip--${filter.type || 'neutral'}`"
          :type="getFilterTagType(filter.type)"
          effect="light"
          round
          :closable="filter.removable !== false && !isInteractiveDisabled"
          :aria-label="getFilterAriaLabel(filter)"
          :title="getFilterText(filter)"
          @close="handleRemoveFilter(filter)"
        >
          <span class="base-filter-bar__chip-text">{{ getFilterText(filter) }}</span>
        </el-tag>
      </template>
      <el-button
        v-if="showClear"
        class="base-filter-bar__clear"
        type="info"
        text
        round
        size="small"
        :disabled="isInteractiveDisabled"
        :aria-label="resolvedClearText"
        :title="resolvedClearText"
        @click="handleClear"
      >
        {{ resolvedClearText }}
      </el-button>
    </div>

    <div v-else-if="showSummaryWhenEmpty" class="base-filter-bar__summary base-filter-bar__summary--empty" aria-live="polite">
      <span class="base-filter-bar__summary-label">{{ emptyText || t('common.noFilters') }}</span>
    </div>
  </section>
</template>

<style scoped>
.base-filter-bar {
  @apply min-w-0 max-w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
}

.base-filter-bar--sm {
  @apply rounded-lg p-3;
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
  @apply min-w-0 flex-1;
}

.base-filter-bar__title-row {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}

.base-filter-bar h3 {
  @apply min-w-0 max-w-full truncate text-sm font-black text-slate-900 dark:text-slate-100;
}

.base-filter-bar--lg h3 {
  @apply text-base;
}

.base-filter-bar p {
  @apply mt-1 max-w-full break-words text-xs leading-5 text-slate-500 dark:text-slate-400;
}

.base-filter-bar--lg p {
  @apply text-sm;
}

.base-filter-bar__count {
  --el-tag-border-color: rgb(var(--color-primary) / 0.16);
  --el-tag-bg-color: rgb(var(--color-primary) / 0.1);
  --el-tag-text-color: rgb(var(--color-primary));
  @apply h-auto shrink-0 border px-2 py-1 text-[11px] font-bold leading-none;
  background-color: rgb(var(--color-primary) / 0.1);
}

.base-filter-bar__count :deep(.el-tag__content) {
  @apply min-w-0 truncate;
}

.base-filter-bar__actions {
  @apply flex min-w-0 max-w-full shrink flex-wrap items-center justify-end gap-2;
}

.base-filter-bar__actions :deep(.el-button),
.base-filter-bar__controls :deep(.el-button),
.base-filter-bar__actions :deep(.base-badge),
.base-filter-bar__controls :deep(.base-badge) {
  max-width: 100%;
  min-width: 0;
}

.base-filter-bar__actions :deep(.el-button > span),
.base-filter-bar__controls :deep(.el-button > span),
.base-filter-bar__actions :deep(.base-badge),
.base-filter-bar__controls :deep(.base-badge) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-filter-bar__main {
  @apply mt-3 flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center;
}

.base-filter-bar__search {
  @apply min-w-0 lg:max-w-xs;
  flex: 1 1 14rem;
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
  @apply min-w-0 max-w-full break-words text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500;
}

.base-filter-bar__chip {
  --el-tag-border-radius: 999px;
  --el-tag-border-color: rgb(var(--chip-color) / 0.18);
  --el-tag-bg-color: rgb(var(--chip-color) / 0.1);
  --el-tag-text-color: rgb(var(--chip-color));
  @apply h-auto min-w-0 max-w-full items-center rounded-full border px-2 py-1 text-[10px] font-black transition;
  max-width: min(100%, 18rem);
  color: rgb(var(--chip-color));
  background-color: rgb(var(--chip-color) / 0.1);
  border-color: rgb(var(--chip-color) / 0.18);
}

.base-filter-bar__chip:not(:disabled):hover {
  border-color: rgb(var(--chip-color) / 0.36);
  background-color: rgb(var(--chip-color) / 0.16);
}

.base-filter-bar__chip:focus-visible {
  @apply outline-none ring-2 ring-primary ring-opacity-20;
}

.base-filter-bar__chip--readonly {
  @apply cursor-default;
}

.base-filter-bar__chip :deep(.el-tag__content) {
  @apply flex min-w-0 items-center overflow-hidden;
}

.base-filter-bar__chip :deep(.el-tag__close) {
  @apply ml-1 shrink-0;
}

.base-filter-bar__chip-text {
  @apply min-w-0 truncate;
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
  @apply min-w-0 max-w-full rounded-full px-2 py-1 text-[10px] font-black text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-20 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

.base-filter-bar__clear :deep(span) {
  @apply min-w-0 truncate;
}

@media (prefers-reduced-motion: reduce) {
  .base-filter-bar,
  .base-filter-bar__chip,
  .base-filter-bar__clear {
    transition: none !important;
  }
}
</style>
