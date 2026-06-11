<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../composables/useI18n";
import { clampNumber, createLineClampStyle, isEmptyArray, toIntegerAtLeast } from "../../utils";

type DescriptionStatus = "primary" | "success" | "warning" | "danger" | "neutral";

export interface DescriptionListItem {
  key: string;
  label: string;
  value: string | number;
  description?: string;
  status?: DescriptionStatus;
  statusLabel?: string;
  statusPulse?: boolean;
  span?: 1 | 2 | 3;
}

type ResolvedDescriptionListItem = DescriptionListItem & {
  resolvedSpan: 1 | 2 | 3;
};

interface Props {
  items: DescriptionListItem[];
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
  surface: "card",
  size: "md",
  loading: false,
  disabled: false,
  emptyText: "",
  emptyIcon: "ListTodo",
  loadingText: "",
  skeletonRows: 4,
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
const skeletonCount = computed(() => toIntegerAtLeast(props.skeletonRows, 1, 4));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const statusLabels: Record<DescriptionStatus, string> = {
  primary: "重点",
  success: "正常",
  warning: "警告",
  danger: "异常",
  neutral: "普通",
};
const normalizedItems = computed<ResolvedDescriptionListItem[]>(() =>
  props.items.map((item) => ({
    ...item,
    resolvedSpan: clampNumber(item.span ?? 1, 1, resolvedColumns.value, 1, 0) as 1 | 2 | 3,
  }))
);
const descriptionStyle = computed(() => (props.wrapDescription ? undefined : createLineClampStyle(props.maxDescriptionLines)));
const getItemSpanClass = (item: ResolvedDescriptionListItem) =>
  item.resolvedSpan > 1 ? `base-description-list__item--span-${item.resolvedSpan}` : "";
const getItemStatusLabel = (item: DescriptionListItem) => {
  if (!item.status) return "";
  return `${item.label}状态：${item.statusLabel || statusLabels[item.status]}`;
};
</script>

<template>
  <dl
    class="base-description-list"
    :class="[
      `base-description-list--cols-${resolvedColumns}`,
      `base-description-list--${resolvedSize}`,
      `base-description-list--${surface}`,
      {
        'base-description-list--bordered': bordered,
        'base-description-list--wrap-label': wrapLabel,
        'base-description-list--wrap-value': wrapValue,
        'base-description-list--wrap-description': wrapDescription,
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
      <div v-for="index in skeletonCount" :key="index" class="base-description-list__item base-description-list__item--skeleton" aria-hidden="true">
        <span></span>
        <strong></strong>
        <em></em>
      </div>
    </template>

    <div v-else-if="isEmpty" class="base-description-list__empty" role="status">
      <BaseIcon :name="emptyIcon" size="18" aria-hidden="true" />
      <span>{{ emptyText || t("common.noData") }}</span>
    </div>

    <div
      v-else
      v-for="item in normalizedItems"
      :key="item.key"
      class="base-description-list__item"
      :class="getItemSpanClass(item)"
    >
      <dt>
        <span>{{ item.label }}</span>
        <BaseStatusDot v-if="item.status" :type="item.status" size="sm" :pulse="item.statusPulse" :aria-label="getItemStatusLabel(item)" />
      </dt>
      <dd :title="String(item.value)">{{ item.value }}</dd>
      <p v-if="item.description" :title="item.description" :style="descriptionStyle">{{ item.description }}</p>
    </div>
  </dl>
</template>

<style scoped>
.base-description-list {
  @apply grid min-w-0 max-w-full overflow-hidden rounded-2xl bg-white transition dark:bg-slate-900;
}

.base-description-list--bordered {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-description-list--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-description-list--plain {
  @apply rounded-none bg-transparent dark:bg-transparent;
}

.base-description-list--plain.base-description-list--bordered {
  @apply border-0;
}

.base-description-list.is-disabled {
  @apply pointer-events-none opacity-70;
}

.base-description-list.is-loading {
  @apply pointer-events-none;
}

.base-description-list--cols-1 {
  @apply grid-cols-1;
}

.base-description-list--cols-2 {
  @apply grid-cols-1 md:grid-cols-2;
}

.base-description-list--cols-3 {
  @apply grid-cols-1 md:grid-cols-3;
}

.base-description-list__item {
  @apply min-w-0 border-slate-200 p-4 dark:border-slate-800;
}

.base-description-list--sm .base-description-list__item {
  @apply p-3;
}

.base-description-list--lg .base-description-list__item {
  @apply p-5;
}

.base-description-list--bordered .base-description-list__item {
  @apply border-b md:border-r;
}

.base-description-list__item--span-2 {
  @apply md:col-span-2;
}

.base-description-list__item--span-3 {
  @apply md:col-span-3;
}

.base-description-list dt {
  @apply flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500;
}

.base-description-list--lg dt {
  @apply text-xs;
}

.base-description-list dt span {
  @apply truncate;
}

.base-description-list--wrap-label dt span {
  @apply whitespace-normal;
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
}

.base-description-list dd {
  @apply mt-1 truncate text-sm font-black text-slate-800 dark:text-slate-100;
}

.base-description-list--wrap-value dd {
  @apply whitespace-normal;
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
}

.base-description-list--lg dd {
  @apply text-base;
}

.base-description-list p {
  @apply mt-0.5 overflow-hidden text-[10px] font-bold text-slate-400 dark:text-slate-500;
  display: -webkit-box;
  -webkit-box-orient: vertical;
}

.base-description-list--wrap-description p {
  @apply whitespace-normal;
  display: block;
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
}

.base-description-list--lg p {
  @apply text-xs;
}

.base-description-list__empty {
  @apply col-span-full flex min-h-[104px] min-w-0 flex-col items-center justify-center gap-2 p-6 text-center text-xs font-bold text-slate-400 dark:text-slate-500;
}

.base-description-list__empty :deep(.base-icon) {
  @apply text-slate-300 dark:text-slate-600;
}

.base-description-list__item--skeleton {
  @apply space-y-2;
}

.base-description-list__item--skeleton span,
.base-description-list__item--skeleton strong,
.base-description-list__item--skeleton em {
  @apply block rounded-full bg-slate-100 dark:bg-slate-800;
}

.base-description-list__item--skeleton span {
  @apply h-3 w-20;
}

.base-description-list__item--skeleton strong {
  @apply h-4 w-32;
}

.base-description-list__item--skeleton em {
  @apply h-3 w-24;
}

@media (prefers-reduced-motion: reduce) {
  .base-description-list {
    transition: none !important;
  }
}
</style>
