<script setup lang="ts">
import { computed, useSlots } from "vue";
import { useI18n } from "../../composables/useI18n";
import { clampNumber, createLineClampStyle, isEmptyArray, toIntegerAtLeast } from "../../utils";

type DescriptionStatus = "primary" | "success" | "warning" | "danger" | "neutral";
type DescriptionDirection = "horizontal" | "vertical";
type DescriptionAlign = "left" | "center" | "right";
type DescriptionLabelWidth = string | number;

export interface DescriptionListItem {
  key: string;
  label: string;
  value: string | number;
  description?: string;
  status?: DescriptionStatus;
  statusLabel?: string;
  statusPulse?: boolean;
  span?: 1 | 2 | 3;
  rowspan?: number;
  width?: string | number;
  minWidth?: string | number;
  labelWidth?: DescriptionLabelWidth;
  align?: DescriptionAlign;
  labelAlign?: DescriptionAlign;
}

type ResolvedDescriptionListItem = DescriptionListItem & {
  resolvedSpan: 1 | 2 | 3;
};

interface Props {
  items: DescriptionListItem[];
  title?: string;
  description?: string;
  extraText?: string;
  columns?: 1 | 2 | 3;
  bordered?: boolean;
  compact?: boolean;
  surface?: "card" | "muted" | "plain";
  size?: "sm" | "md" | "lg";
  direction?: DescriptionDirection;
  labelWidth?: DescriptionLabelWidth;
  labelAlign?: DescriptionAlign;
  valueAlign?: DescriptionAlign;
  colon?: boolean;
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
  title: "",
  description: "",
  extraText: "",
  columns: 2,
  bordered: true,
  compact: false,
  surface: "card",
  size: "md",
  direction: "horizontal",
  labelWidth: "",
  labelAlign: "left",
  valueAlign: "left",
  colon: false,
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
const slots = useSlots();
const resolvedSize = computed(() => (props.compact ? "sm" : props.size));
const resolvedColumns = computed(() => clampNumber(props.columns, 1, 3, 2, 0) as 1 | 2 | 3);
const elementSize = computed(() => (resolvedSize.value === "sm" ? "small" : resolvedSize.value === "lg" ? "large" : "default"));
const isEmpty = computed(() => !props.loading && isEmptyArray(props.items));
const skeletonCount = computed(() => toIntegerAtLeast(props.skeletonRows, 1, 4));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const hasHeading = computed(() => Boolean(props.title || props.description || slots.title));
const hasExtra = computed(() => Boolean(props.extraText || slots.extra));
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
const getItemContentClass = (item: ResolvedDescriptionListItem) =>
  ["base-description-list__content-cell", getItemSpanClass(item)].filter(Boolean).join(" ");
const getItemRowspan = (item: DescriptionListItem) => (item.rowspan && item.rowspan > 1 ? Math.floor(item.rowspan) : 1);
const getItemLabelWidth = (item: DescriptionListItem) => item.labelWidth ?? (props.labelWidth || undefined);
const getItemStatusLabel = (item: DescriptionListItem) => {
  if (!item.status) return "";
  return `${item.label}状态：${item.statusLabel || statusLabels[item.status]}`;
};
</script>

<template>
  <div
    class="base-description-list"
    :class="[
      `base-description-list--cols-${resolvedColumns}`,
      `base-description-list--${resolvedSize}`,
      `base-description-list--${surface}`,
      `base-description-list--direction-${direction}`,
      `base-description-list--label-${labelAlign}`,
      `base-description-list--value-${valueAlign}`,
      {
        'base-description-list--bordered': bordered,
        'base-description-list--colon': colon,
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
      <div class="base-description-list__fallback-grid">
        <div v-for="index in skeletonCount" :key="index" class="base-description-list__item base-description-list__item--skeleton" aria-hidden="true">
          <span></span>
          <strong></strong>
          <em></em>
        </div>
      </div>
    </template>

    <div v-else-if="isEmpty" class="base-description-list__empty" role="status">
      <BaseIcon :name="emptyIcon" size="18" aria-hidden="true" />
      <span>{{ emptyText || t("common.noData") }}</span>
    </div>

    <el-descriptions
      v-else
      class="base-description-list__descriptions"
      :column="resolvedColumns"
      :border="bordered"
      :size="elementSize"
      :direction="direction"
      :title="title"
      :extra="extraText"
      :label-width="labelWidth || undefined"
    >
      <template v-if="hasHeading" #title>
        <div class="base-description-list__heading">
          <slot name="title">
            <span class="base-description-list__heading-title">{{ title }}</span>
          </slot>
          <small v-if="description" class="base-description-list__heading-description">{{ description }}</small>
        </div>
      </template>

      <template v-if="hasExtra" #extra>
        <div class="base-description-list__extra">
          <slot name="extra">
            <span>{{ extraText }}</span>
          </slot>
        </div>
      </template>

      <el-descriptions-item
        v-for="item in normalizedItems"
        :key="item.key"
        :span="item.resolvedSpan"
        :rowspan="getItemRowspan(item)"
        :width="item.width"
        :min-width="item.minWidth"
        :label-width="getItemLabelWidth(item)"
        :align="item.align || valueAlign"
        :label-align="item.labelAlign || labelAlign"
        label-class-name="base-description-list__label-cell"
        :class-name="getItemContentClass(item)"
      >
        <template #label>
          <span class="base-description-list__label-text">
            {{ item.label }}<span v-if="colon" class="base-description-list__colon" aria-hidden="true">:</span>
          </span>
          <BaseStatusDot v-if="item.status" :type="item.status" size="sm" :pulse="item.statusPulse" :aria-label="getItemStatusLabel(item)" />
        </template>
        <div class="base-description-list__value" :title="String(item.value)">{{ item.value }}</div>
        <p v-if="item.description" class="base-description-list__description" :title="item.description" :style="descriptionStyle">{{ item.description }}</p>
      </el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<style scoped>
.base-description-list {
  @apply min-w-0 max-w-full overflow-hidden rounded-2xl bg-white transition dark:bg-slate-900;
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

.base-description-list__fallback-grid {
  @apply grid min-w-0 max-w-full;
}

.base-description-list--cols-1 .base-description-list__fallback-grid {
  @apply grid-cols-1;
}

.base-description-list--cols-2 .base-description-list__fallback-grid {
  @apply grid-cols-1 md:grid-cols-2;
}

.base-description-list--cols-3 .base-description-list__fallback-grid {
  @apply grid-cols-1 md:grid-cols-3;
}

.base-description-list__descriptions {
  @apply min-w-0 max-w-full;
}

.base-description-list :deep(.el-descriptions__body) {
  @apply bg-transparent text-slate-800 dark:bg-transparent dark:text-slate-100;
}

.base-description-list :deep(.el-descriptions__header) {
  @apply m-0 flex min-w-0 items-start justify-between gap-3 px-4 pt-4 pb-3;
}

.base-description-list--sm :deep(.el-descriptions__header) {
  @apply px-3 pt-3 pb-2.5;
}

.base-description-list--lg :deep(.el-descriptions__header) {
  @apply px-5 pt-5 pb-4;
}

.base-description-list--plain :deep(.el-descriptions__header) {
  @apply px-0 pt-0;
}

.base-description-list :deep(.el-descriptions__title),
.base-description-list :deep(.el-descriptions__extra) {
  @apply min-w-0;
}

.base-description-list__heading {
  @apply grid min-w-0 gap-1;
}

.base-description-list__heading-title {
  @apply min-w-0 truncate text-sm font-black text-slate-800 dark:text-slate-100;
}

.base-description-list__heading-description {
  @apply min-w-0 text-xs font-bold leading-5 text-slate-400 dark:text-slate-500;
  overflow-wrap: anywhere;
}

.base-description-list__extra {
  @apply flex min-w-0 shrink-0 items-center justify-end gap-2 text-xs font-black text-slate-500 dark:text-slate-400;
}

.base-description-list :deep(.el-descriptions__table) {
  @apply m-0 w-full table-fixed;
}

.base-description-list :deep(.el-descriptions__label),
.base-description-list :deep(.el-descriptions__content) {
  @apply border-slate-200 bg-transparent align-top dark:border-slate-800;
}

.base-description-list :deep(.el-descriptions__label) {
  @apply w-32 text-slate-400 dark:text-slate-500;
}

.base-description-list :deep(.el-descriptions__content) {
  @apply min-w-0 text-slate-800 dark:text-slate-100;
}

.base-description-list--plain :deep(.el-descriptions__table),
.base-description-list--plain :deep(.el-descriptions__label),
.base-description-list--plain :deep(.el-descriptions__content) {
  @apply border-0;
}

.base-description-list__item {
  @apply min-w-0 border-slate-200 p-4 dark:border-slate-800;
}

.base-description-list :deep(.base-description-list__label-cell),
.base-description-list :deep(.base-description-list__content-cell) {
  @apply p-4;
}

.base-description-list--sm .base-description-list__item {
  @apply p-3;
}

.base-description-list--sm :deep(.base-description-list__label-cell),
.base-description-list--sm :deep(.base-description-list__content-cell) {
  @apply p-3;
}

.base-description-list--lg .base-description-list__item {
  @apply p-5;
}

.base-description-list--lg :deep(.base-description-list__label-cell),
.base-description-list--lg :deep(.base-description-list__content-cell) {
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

.base-description-list :deep(.base-description-list__label-cell) {
  @apply flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500;
}

.base-description-list--label-center :deep(.base-description-list__label-cell) {
  @apply justify-center text-center;
}

.base-description-list--label-right :deep(.base-description-list__label-cell) {
  @apply justify-end text-right;
}

.base-description-list--value-center :deep(.base-description-list__content-cell) {
  @apply text-center;
}

.base-description-list--value-right :deep(.base-description-list__content-cell) {
  @apply text-right;
}

.base-description-list--lg :deep(.base-description-list__label-cell) {
  @apply text-xs;
}

.base-description-list__label-text {
  @apply truncate;
}

.base-description-list__colon {
  @apply text-slate-300 dark:text-slate-600;
}

.base-description-list--wrap-label .base-description-list__label-text {
  @apply whitespace-normal;
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
}

.base-description-list__value {
  @apply mt-1 truncate text-sm font-black text-slate-800 dark:text-slate-100;
}

.base-description-list--wrap-value .base-description-list__value {
  @apply whitespace-normal;
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
}

.base-description-list--lg .base-description-list__value {
  @apply text-base;
}

.base-description-list__description {
  @apply mt-0.5 overflow-hidden text-[10px] font-bold text-slate-400 dark:text-slate-500;
  display: -webkit-box;
  -webkit-box-orient: vertical;
}

.base-description-list--wrap-description .base-description-list__description {
  @apply whitespace-normal;
  display: block;
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
}

.base-description-list--lg .base-description-list__description {
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
