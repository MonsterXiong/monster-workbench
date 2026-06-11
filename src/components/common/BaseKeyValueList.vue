<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../composables/useI18n";
import { clampNumber, createLineClampStyle, isEmptyArray, toIntegerAtLeast } from "../../utils";

type KeyValueStatus = "primary" | "success" | "warning" | "danger" | "neutral";

export interface KeyValueItem {
  key: string;
  label: string;
  value: string | number;
  description?: string;
  icon?: string;
  status?: KeyValueStatus;
  statusLabel?: string;
  statusPulse?: boolean;
  span?: 1 | 2 | 3;
}

type ResolvedKeyValueItem = KeyValueItem & {
  resolvedSpan: 1 | 2 | 3;
};

interface Props {
  items: KeyValueItem[];
  columns?: 1 | 2 | 3;
  bordered?: boolean;
  compact?: boolean;
  surface?: "card" | "muted" | "plain";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  emptyText?: string;
  emptyIcon?: string;
  loadingText?: string;
  skeletonRows?: number;
  wrapLabel?: boolean;
  wrapValue?: boolean;
  wrapDescription?: boolean;
  maxDescriptionLines?: number;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  columns: 2,
  bordered: true,
  compact: false,
  surface: "muted",
  size: "md",
  loading: false,
  disabled: false,
  emptyText: "",
  emptyIcon: "ListTodo",
  loadingText: "",
  skeletonRows: 3,
  wrapLabel: false,
  wrapValue: false,
  wrapDescription: false,
  maxDescriptionLines: 1,
  ariaLabel: "",
});

const { t } = useI18n();
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const resolvedColumns = computed(() => clampNumber(props.columns, 1, 3, 2, 0) as 1 | 2 | 3);
const isEmpty = computed(() => !props.loading && isEmptyArray(props.items));
const skeletonCount = computed(() => toIntegerAtLeast(props.skeletonRows, 1, 3));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const statusLabels: Record<KeyValueStatus, string> = {
  primary: "重点",
  success: "正常",
  warning: "警告",
  danger: "异常",
  neutral: "普通",
};
const normalizedItems = computed<ResolvedKeyValueItem[]>(() =>
  props.items.map((item) => ({
    ...item,
    resolvedSpan: clampNumber(item.span ?? 1, 1, resolvedColumns.value, 1, 0) as 1 | 2 | 3,
  }))
);
const descriptionStyle = computed(() => (props.wrapDescription ? undefined : createLineClampStyle(props.maxDescriptionLines)));
const getItemSpanClass = (item: ResolvedKeyValueItem) => (item.resolvedSpan > 1 ? `base-key-value-list__item--span-${item.resolvedSpan}` : "");
const getItemStatusLabel = (item: KeyValueItem) => {
  if (!item.status) return "";
  return `${item.label}状态：${item.statusLabel || statusLabels[item.status]}`;
};
</script>

<template>
  <dl
    class="base-key-value-list"
    :class="[
      `base-key-value-list--cols-${resolvedColumns}`,
      `base-key-value-list--${resolvedSize}`,
      `base-key-value-list--${surface}`,
      {
        'is-bordered': bordered,
        'base-key-value-list--wrap-label': wrapLabel,
        'base-key-value-list--wrap-value': wrapValue,
        'base-key-value-list--wrap-description': wrapDescription,
        'is-loading': loading,
        'is-disabled': disabled,
        'is-empty': isEmpty,
      },
    ]"
    :aria-label="ariaLabel || undefined"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <template v-if="loading">
      <div class="sr-only" role="status" aria-live="polite">{{ resolvedLoadingText }}</div>
      <div v-for="index in skeletonCount" :key="index" class="base-key-value-list__item base-key-value-list__item--skeleton" aria-hidden="true">
        <span></span>
        <strong></strong>
        <em></em>
      </div>
    </template>

    <div v-else-if="isEmpty" class="base-key-value-list__empty" role="status">
      <BaseIcon :name="emptyIcon" size="18" aria-hidden="true" />
      <span>{{ emptyText || t("common.noData") }}</span>
    </div>

    <div
      v-else
      v-for="item in normalizedItems"
      :key="item.key"
      class="base-key-value-list__item"
      :class="getItemSpanClass(item)"
    >
      <div class="base-key-value-list__label-row">
        <BaseIcon v-if="item.icon" :name="item.icon" size="14" class="text-slate-400" aria-hidden="true" />
        <dt class="base-key-value-list__label">{{ item.label }}</dt>
        <BaseStatusDot v-if="item.status" :type="item.status" size="sm" :pulse="item.statusPulse" :aria-label="getItemStatusLabel(item)" />
      </div>
      <dd class="base-key-value-list__value" :title="String(item.value)">{{ item.value }}</dd>
      <dd v-if="item.description" class="base-key-value-list__description" :title="item.description" :style="descriptionStyle">{{ item.description }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.base-key-value-list {
  @apply grid min-w-0 max-w-full gap-3 transition;
}

.base-key-value-list.is-loading {
  @apply pointer-events-none;
}

.base-key-value-list.is-disabled {
  @apply pointer-events-none opacity-70;
}

.base-key-value-list--cols-1 {
  @apply grid-cols-1;
}

.base-key-value-list--cols-2 {
  @apply grid-cols-1 md:grid-cols-2;
}

.base-key-value-list--cols-3 {
  @apply grid-cols-1 md:grid-cols-3;
}

.base-key-value-list__item {
  @apply min-w-0 rounded-2xl p-3;
}

.base-key-value-list--card .base-key-value-list__item {
  @apply bg-white dark:bg-slate-900;
}

.base-key-value-list--muted .base-key-value-list__item {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-key-value-list--plain {
  @apply gap-2;
}

.base-key-value-list--plain .base-key-value-list__item {
  @apply rounded-none bg-transparent p-0 dark:bg-transparent;
}

.base-key-value-list--sm .base-key-value-list__item {
  @apply rounded-xl p-3;
}

.base-key-value-list--lg .base-key-value-list__item {
  @apply p-4;
}

.base-key-value-list.is-bordered .base-key-value-list__item {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-key-value-list--plain.is-bordered .base-key-value-list__item {
  @apply border-0;
}

.base-key-value-list__item--span-2 {
  @apply md:col-span-2;
}

.base-key-value-list__item--span-3 {
  @apply md:col-span-3;
}

.base-key-value-list__label-row {
  @apply flex min-w-0 items-center gap-1.5;
}

.base-key-value-list__label {
  @apply truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-key-value-list--wrap-label .base-key-value-list__label {
  @apply whitespace-normal;
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
}

.base-key-value-list--lg .base-key-value-list__label {
  @apply text-xs;
}

.base-key-value-list__value {
  @apply mt-1 truncate text-sm font-black text-slate-800 dark:text-slate-100;
}

.base-key-value-list--wrap-value .base-key-value-list__value {
  @apply whitespace-normal;
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
}

.base-key-value-list--lg .base-key-value-list__value {
  @apply text-base;
}

.base-key-value-list__description {
  @apply mt-0.5 overflow-hidden text-[10px] font-bold text-slate-400 dark:text-slate-500;
  display: -webkit-box;
  -webkit-box-orient: vertical;
}

.base-key-value-list--wrap-description .base-key-value-list__description {
  @apply whitespace-normal;
  display: block;
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
}

.base-key-value-list--lg .base-key-value-list__description {
  @apply text-xs;
}

.base-key-value-list__empty {
  @apply col-span-full flex min-h-[96px] min-w-0 flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50 p-6 text-center text-xs font-bold text-slate-400 dark:bg-slate-950 dark:text-slate-500;
}

.base-key-value-list.is-bordered .base-key-value-list__empty {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-key-value-list--plain .base-key-value-list__empty {
  @apply rounded-none border-0 bg-transparent p-0 dark:bg-transparent;
}

.base-key-value-list__empty :deep(.base-icon) {
  @apply text-slate-300 dark:text-slate-600;
}

.base-key-value-list__item--skeleton {
  @apply space-y-2;
}

.base-key-value-list__item--skeleton span,
.base-key-value-list__item--skeleton strong,
.base-key-value-list__item--skeleton em {
  @apply block rounded-full bg-slate-100 dark:bg-slate-800;
}

.base-key-value-list__item--skeleton span {
  @apply h-3 w-16;
}

.base-key-value-list__item--skeleton strong {
  @apply h-4 w-24;
}

.base-key-value-list__item--skeleton em {
  @apply h-3 w-20;
}

@media (prefers-reduced-motion: reduce) {
  .base-key-value-list {
    transition: none !important;
  }
}
</style>
