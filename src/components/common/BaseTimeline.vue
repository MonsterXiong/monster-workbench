<script setup lang="ts">
import { computed, useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import {
  createDomIdFromParts,
  createLineClampStyle,
  handleActivationKeydown,
  indexItems,
  isEventFromInteractiveElement,
  isNonEmptyArray,
  joinAriaIds,
  toReversedArray,
} from "../../utils";

type TimelineType = "primary" | "success" | "warning" | "danger" | "neutral";
type TimelineSize = "sm" | "md" | "lg";
type TimelineSurface = "card" | "muted" | "plain";
type TimelineMarker = "dot" | "icon" | "number";

export interface TimelineItem {
  key: string;
  title: string;
  time?: string;
  description?: string;
  type?: TimelineType;
  icon?: string;
  meta?: string;
  tag?: string;
  disabled?: boolean;
}

interface Props {
  items: TimelineItem[];
  dense?: boolean;
  size?: TimelineSize;
  surface?: TimelineSurface;
  bordered?: boolean;
  clickable?: boolean;
  reverse?: boolean;
  marker?: TimelineMarker;
  selectedKey?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  wrapTitle?: boolean;
  wrapDescription?: boolean;
  maxDescriptionLines?: number;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  actionsLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  dense: false,
  size: "md",
  surface: "card",
  bordered: true,
  clickable: false,
  reverse: false,
  marker: "icon",
  selectedKey: "",
  disabled: false,
  loading: false,
  loadingText: "",
  emptyText: "",
  wrapTitle: false,
  wrapDescription: false,
  maxDescriptionLines: 2,
  ariaLabel: "",
  ariaLabelledby: "",
  ariaDescribedby: "",
  actionsLabel: "",
});

const emit = defineEmits<{
  (e: "select", payload: { item: TimelineItem; index: number }): void;
}>();

interface TimelineSlotState {
  item: TimelineItem;
  index: number;
  selected: boolean;
  disabled: boolean;
  loading: boolean;
  clickable: boolean;
  interactiveDisabled: boolean;
}

defineSlots<{
  default?: (props: TimelineSlotState) => any;
  actions?: (props: TimelineSlotState) => any;
}>();

const { t } = useI18n();
const timelineId = useId();
const loadingId = createDomIdFromParts([timelineId, "loading"]);
const emptyId = createDomIdFromParts([timelineId, "empty"]);
const renderedEntries = computed(() => {
  const entries = indexItems(props.items);
  return props.reverse ? toReversedArray(entries) : entries;
});
const hasItems = computed(() => isNonEmptyArray(renderedEntries.value));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedEmptyText = computed(() => props.emptyText || t("common.noData"));
const labelledBy = computed(() => (props.ariaLabel ? undefined : props.ariaLabelledby || undefined));
const describedBy = computed(() =>
  joinAriaIds([
    props.loading ? loadingId : undefined,
    !props.loading && !hasItems.value ? emptyId : undefined,
    props.ariaDescribedby,
  ])
);
const resolvedActionsLabel = computed(() => props.actionsLabel || t("common.actionsRegion"));
const descriptionStyle = computed(() => {
  if (props.wrapDescription) return undefined;

  return createLineClampStyle(props.maxDescriptionLines);
});

const isItemDisabled = (item: TimelineItem) => props.disabled || props.loading || Boolean(item.disabled);
const canSelect = (item: TimelineItem) => props.clickable && !isItemDisabled(item);
const isItemSelected = (item: TimelineItem) => props.selectedKey === item.key;

const handleSelect = (item: TimelineItem, index: number) => {
  if (!canSelect(item)) return;
  emit("select", { item, index });
};

const handleClick = (event: MouseEvent, item: TimelineItem, index: number) => {
  if (isEventFromInteractiveElement(event)) return;
  handleSelect(item, index);
};

const handleKeydown = (event: KeyboardEvent, item: TimelineItem, index: number) => {
  if (!canSelect(item)) return;
  if (isEventFromInteractiveElement(event)) return;
  handleActivationKeydown(event, () => handleSelect(item, index));
};

const getItemBaseId = (item: TimelineItem, index: number) => createDomIdFromParts([timelineId, item.key || index]);
const getItemTitleId = (item: TimelineItem, index: number) => createDomIdFromParts([getItemBaseId(item, index), "title"]);
const getItemTimeId = (item: TimelineItem, index: number) => createDomIdFromParts([getItemBaseId(item, index), "time"]);
const getItemDescriptionId = (item: TimelineItem, index: number) => createDomIdFromParts([getItemBaseId(item, index), "description"]);
const getItemMetaId = (item: TimelineItem, index: number) => createDomIdFromParts([getItemBaseId(item, index), "meta"]);
const getItemTagId = (item: TimelineItem, index: number) => createDomIdFromParts([getItemBaseId(item, index), "tag"]);
const getItemDescribedBy = (item: TimelineItem, index: number) =>
  joinAriaIds([
    item.time ? getItemTimeId(item, index) : undefined,
    item.description ? getItemDescriptionId(item, index) : undefined,
    item.meta ? getItemMetaId(item, index) : undefined,
    item.tag ? getItemTagId(item, index) : undefined,
  ]);
const getSlotState = (item: TimelineItem, index: number): TimelineSlotState => ({
  item,
  index,
  selected: isItemSelected(item),
  disabled: props.disabled || Boolean(item.disabled),
  loading: props.loading,
  clickable: props.clickable,
  interactiveDisabled: isItemDisabled(item),
});
</script>

<template>
  <div
    class="base-timeline"
    :class="[
      `base-timeline--${size}`,
      `base-timeline--${surface}`,
      `base-timeline--marker-${marker}`,
      {
        'base-timeline--dense': dense,
        'base-timeline--bordered': bordered,
        'base-timeline--clickable': clickable,
        'base-timeline--wrap-title': wrapTitle,
        'base-timeline--wrap-description': wrapDescription,
        'is-disabled': disabled,
        'is-loading': loading,
      },
    ]"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <div
      v-if="loading"
      class="base-timeline__item base-timeline__item--state"
      aria-live="polite"
    >
      <span class="base-timeline__marker" aria-hidden="true">
        <BaseIcon name="LoaderCircle" size="13" aria-hidden="true" />
      </span>
      <div class="base-timeline__content">
        <span :id="loadingId" class="base-timeline__state-text">{{ resolvedLoadingText }}</span>
      </div>
    </div>
    <div
      v-else-if="!hasItems"
      class="base-timeline__item base-timeline__item--state"
    >
      <span class="base-timeline__marker" aria-hidden="true">
        <BaseIcon name="Inbox" size="13" aria-hidden="true" />
      </span>
      <div class="base-timeline__content">
        <span :id="emptyId" class="base-timeline__state-text">{{ resolvedEmptyText }}</span>
      </div>
    </div>
    <el-timeline v-else class="base-timeline__list">
      <el-timeline-item
        v-for="(entry, visualIndex) in renderedEntries"
        :key="entry.item.key"
        class="base-timeline__item"
        :class="[
          `base-timeline__item--${entry.item.type || 'neutral'}`,
          {
            'is-clickable': canSelect(entry.item),
            'is-disabled': isItemDisabled(entry.item),
            'is-selected': isItemSelected(entry.item),
          },
        ]"
        :hide-timestamp="true"
        :aria-disabled="isItemDisabled(entry.item) ? 'true' : undefined"
        :aria-current="isItemSelected(entry.item) ? 'step' : undefined"
      >
        <template #dot>
          <span class="base-timeline__marker" aria-hidden="true">
            <BaseIcon v-if="marker === 'icon' && entry.item.icon" :name="entry.item.icon" size="12" aria-hidden="true" />
            <span v-else-if="marker === 'number'" class="base-timeline__number">{{ visualIndex + 1 }}</span>
          </span>
        </template>
        <div class="base-timeline__content">
          <div
            class="base-timeline__main"
            :role="clickable ? 'button' : undefined"
            :tabindex="canSelect(entry.item) ? 0 : undefined"
            :aria-labelledby="clickable && !$slots.default ? getItemTitleId(entry.item, entry.index) : undefined"
            :aria-describedby="clickable && !$slots.default ? getItemDescribedBy(entry.item, entry.index) : undefined"
            :aria-disabled="clickable && isItemDisabled(entry.item) ? 'true' : undefined"
            @click="handleClick($event, entry.item, entry.index)"
            @keydown="handleKeydown($event, entry.item, entry.index)"
          >
            <slot v-bind="getSlotState(entry.item, entry.index)">
              <div class="base-timeline__header">
                <div class="base-timeline__title-group">
                  <strong :id="getItemTitleId(entry.item, entry.index)">{{ entry.item.title }}</strong>
                  <span v-if="entry.item.meta" :id="getItemMetaId(entry.item, entry.index)" class="base-timeline__meta">{{ entry.item.meta }}</span>
                </div>
                <time v-if="entry.item.time" :id="getItemTimeId(entry.item, entry.index)">{{ entry.item.time }}</time>
              </div>
              <p v-if="entry.item.description" :id="getItemDescriptionId(entry.item, entry.index)" :style="descriptionStyle">{{ entry.item.description }}</p>
              <div v-if="entry.item.tag" class="base-timeline__footer">
                <span :id="getItemTagId(entry.item, entry.index)" class="base-timeline__tag">{{ entry.item.tag }}</span>
              </div>
            </slot>
          </div>
          <div v-if="$slots.actions" class="base-timeline__actions" role="group" :aria-label="resolvedActionsLabel">
            <slot name="actions" v-bind="getSlotState(entry.item, entry.index)"></slot>
          </div>
        </div>
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<style scoped>
.base-timeline {
  @apply min-w-0;
}

.base-timeline__list {
  @apply min-w-0 p-0;
}

.base-timeline__item {
  @apply relative min-w-0;
  padding-bottom: 0.75rem;
}

.base-timeline--dense .base-timeline__item {
  padding-bottom: 0.5rem;
}

.base-timeline__item:last-child {
  padding-bottom: 0;
}

.base-timeline__item--state {
  @apply flex min-w-0 items-start gap-2;
}

.base-timeline__item.is-disabled {
  @apply opacity-60;
}

.base-timeline__item.is-clickable .base-timeline__main {
  @apply cursor-pointer;
}

.base-timeline__item.is-clickable .base-timeline__main:focus-visible {
  outline: none;
  border-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.14);
}

.base-timeline__item.is-selected .base-timeline__content {
  border-color: rgb(var(--color-primary) / 0.42);
  background-color: rgb(var(--color-primary) / 0.05);
}

.base-timeline__item.is-selected .base-timeline__marker {
  background-color: rgb(var(--color-primary));
  color: #fff;
}

.base-timeline__item :deep(.el-timeline-item__tail) {
  left: 12px;
  top: 24px;
  height: calc(100% - 24px);
  border-left-width: 1px;
  @apply border-slate-200 dark:border-slate-800;
}

.base-timeline__item :deep(.el-timeline-item__wrapper) {
  top: 0;
  padding-left: 2rem;
}

.base-timeline__item :deep(.el-timeline-item__dot) {
  left: 0;
  top: 0;
}

.base-timeline__marker {
  @apply flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white dark:bg-slate-900;
  border-color: var(--timeline-color);
  color: var(--timeline-color);
}

.base-timeline--marker-dot .base-timeline__marker::after {
  @apply h-2 w-2 rounded-full;
  background-color: var(--timeline-color);
  content: "";
}

.base-timeline__item--state .base-timeline__marker {
  border-color: rgb(var(--color-primary) / 0.28);
  color: rgb(var(--color-primary));
}

.base-timeline.is-loading .base-timeline__item--state .base-timeline__marker :deep(svg) {
  animation: base-timeline-spin 0.9s linear infinite;
}

.base-timeline__number {
  @apply text-[10px] font-black leading-none;
}

.base-timeline__content {
  @apply flex min-w-0 flex-wrap items-start gap-2 rounded-2xl bg-white p-3 shadow-sm transition-colors dark:bg-slate-900;
  container-type: inline-size;
}

.base-timeline--bordered .base-timeline__content {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-timeline--muted .base-timeline__content {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-timeline--plain .base-timeline__content {
  @apply rounded-none bg-transparent p-0 shadow-none dark:bg-transparent;
}

.base-timeline--plain.base-timeline--bordered .base-timeline__content {
  @apply border-0;
}

.base-timeline__item.is-clickable:hover .base-timeline__content {
  @apply border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950;
}

.base-timeline__item.is-selected.is-clickable:hover .base-timeline__content {
  border-color: rgb(var(--color-primary) / 0.42);
  background-color: rgb(var(--color-primary) / 0.07);
}

.base-timeline__state-text {
  @apply block text-xs font-black text-slate-500 dark:text-slate-400;
}

.base-timeline__main {
  @apply min-w-0 flex-1 rounded-xl;
}

.base-timeline__header {
  @apply flex min-w-0 items-start justify-between gap-3;
}

.base-timeline__title-group {
  @apply min-w-0;
}

.base-timeline__header strong {
  @apply block truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-timeline--wrap-title .base-timeline__header strong {
  @apply whitespace-normal break-words;
  overflow-wrap: anywhere;
}

.base-timeline__header time {
  @apply max-w-full shrink-0 pt-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500;
  overflow-wrap: anywhere;
}

.base-timeline__meta {
  @apply mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-timeline--wrap-title .base-timeline__meta {
  @apply whitespace-normal break-words;
  overflow-wrap: anywhere;
}

.base-timeline__content p {
  @apply mt-1 text-[10px] font-bold leading-5 text-slate-400 dark:text-slate-500;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.base-timeline--wrap-description .base-timeline__content p {
  display: block;
  overflow: visible;
  overflow-wrap: anywhere;
}

.base-timeline__footer {
  @apply mt-2 flex min-w-0 items-center justify-between gap-2;
}

.base-timeline__tag {
  @apply min-w-0 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300;
}

.base-timeline__actions {
  @apply flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2;
}

.base-timeline__actions :deep(.el-button) {
  @apply min-w-0;
}

.base-timeline__actions :deep(.el-button span) {
  @apply min-w-0 truncate;
}

.base-timeline--sm .base-timeline__item {
  padding-bottom: 0.5rem;
}

.base-timeline--sm .base-timeline__item :deep(.el-timeline-item__tail) {
  left: 10px;
  top: 20px;
  height: calc(100% - 20px);
}

.base-timeline--sm .base-timeline__item :deep(.el-timeline-item__wrapper) {
  padding-left: 1.75rem;
}

.base-timeline--sm .base-timeline__marker {
  @apply h-5 w-5;
}

.base-timeline--sm .base-timeline__content {
  @apply rounded-xl p-2.5;
}

.base-timeline--sm.base-timeline--plain .base-timeline__content {
  @apply p-0;
}

@container (max-width: 360px) {
  .base-timeline__main,
  .base-timeline__actions {
    @apply w-full basis-full;
  }

  .base-timeline__actions {
    @apply justify-start;
  }

  .base-timeline__header {
    @apply flex-wrap;
  }
}

.base-timeline--lg .base-timeline__item {
  padding-bottom: 1rem;
}

.base-timeline--lg .base-timeline__item :deep(.el-timeline-item__tail) {
  left: 16px;
  top: 32px;
  height: calc(100% - 32px);
}

.base-timeline--lg .base-timeline__item :deep(.el-timeline-item__wrapper) {
  padding-left: 2.5rem;
}

.base-timeline--lg .base-timeline__marker {
  @apply h-8 w-8;
}

.base-timeline--lg .base-timeline__content {
  @apply p-4;
}

.base-timeline--lg .base-timeline__header strong {
  @apply text-sm;
}

.base-timeline--lg .base-timeline__meta,
.base-timeline--lg .base-timeline__content p {
  @apply text-xs;
}

.base-timeline__item--primary {
  --timeline-color: rgb(var(--color-primary));
}

.base-timeline__item--success {
  --timeline-color: #10b981;
}

.base-timeline__item--warning {
  --timeline-color: #f59e0b;
}

.base-timeline__item--danger {
  --timeline-color: #ef4444;
}

.base-timeline__item--neutral {
  --timeline-color: #64748b;
}

@media (prefers-reduced-motion: reduce) {
  .base-timeline__content,
  .base-timeline__item--state .base-timeline__marker :deep(svg) {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes base-timeline-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
