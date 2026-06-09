<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../../composables/useI18n";
import { createLineClampStyle, isActivationKey, toReversedArray } from "../../utils";

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
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  wrapTitle?: boolean;
  wrapDescription?: boolean;
  maxDescriptionLines?: number;
  ariaLabel?: string;
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
  loading: false,
  loadingText: "",
  emptyText: "",
  wrapTitle: false,
  wrapDescription: false,
  maxDescriptionLines: 2,
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "select", payload: { item: TimelineItem; index: number }): void;
}>();

defineSlots<{
  default?: (props: { item: TimelineItem; index: number }) => any;
  actions?: (props: { item: TimelineItem; index: number }) => any;
}>();

const { t } = useI18n();
const renderedEntries = computed(() => {
  const entries = props.items.map((item, index) => ({ item, index }));
  return props.reverse ? toReversedArray(entries) : entries;
});
const hasItems = computed(() => renderedEntries.value.length > 0);
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedEmptyText = computed(() => props.emptyText || t("common.noData"));
const descriptionStyle = computed(() => {
  if (props.wrapDescription) return undefined;

  return createLineClampStyle(props.maxDescriptionLines);
});

const canSelect = (item: TimelineItem) => props.clickable && !item.disabled;

const handleSelect = (item: TimelineItem, index: number) => {
  if (!canSelect(item)) return;
  emit("select", { item, index });
};

const handleKeydown = (event: KeyboardEvent, item: TimelineItem, index: number) => {
  if (!isActivationKey(event)) return;
  event.preventDefault();
  handleSelect(item, index);
};
</script>

<template>
  <ol
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
        'is-loading': loading,
      },
    ]"
    :aria-label="ariaLabel || undefined"
    :aria-busy="loading ? 'true' : undefined"
  >
    <li
      v-if="loading"
      class="base-timeline__item base-timeline__item--state"
      aria-live="polite"
    >
      <span class="base-timeline__marker" aria-hidden="true">
        <BaseIcon name="LoaderCircle" size="13" aria-hidden="true" />
      </span>
      <div class="base-timeline__content">
        <span class="base-timeline__state-text">{{ resolvedLoadingText }}</span>
      </div>
    </li>
    <li
      v-else-if="!hasItems"
      class="base-timeline__item base-timeline__item--state"
    >
      <span class="base-timeline__marker" aria-hidden="true">
        <BaseIcon name="Inbox" size="13" aria-hidden="true" />
      </span>
      <div class="base-timeline__content">
        <span class="base-timeline__state-text">{{ resolvedEmptyText }}</span>
      </div>
    </li>
    <template v-else>
      <li
        v-for="(entry, visualIndex) in renderedEntries"
        :key="entry.item.key"
        class="base-timeline__item"
        :class="[
          `base-timeline__item--${entry.item.type || 'neutral'}`,
          {
            'is-clickable': canSelect(entry.item),
            'is-disabled': entry.item.disabled,
            'is-selected': selectedKey === entry.item.key,
          },
        ]"
        :role="clickable ? 'button' : undefined"
        :tabindex="canSelect(entry.item) ? 0 : undefined"
        :aria-disabled="entry.item.disabled ? 'true' : undefined"
        :aria-current="selectedKey === entry.item.key ? 'step' : undefined"
        @click="handleSelect(entry.item, entry.index)"
        @keydown="handleKeydown($event, entry.item, entry.index)"
      >
        <span class="base-timeline__line" aria-hidden="true"></span>
        <span class="base-timeline__marker" aria-hidden="true">
          <BaseIcon v-if="marker === 'icon' && entry.item.icon" :name="entry.item.icon" size="12" aria-hidden="true" />
          <span v-else-if="marker === 'number'" class="base-timeline__number">{{ visualIndex + 1 }}</span>
        </span>
        <div class="base-timeline__content">
          <slot :item="entry.item" :index="entry.index">
            <div class="base-timeline__header">
              <div class="base-timeline__title-group">
                <strong>{{ entry.item.title }}</strong>
                <span v-if="entry.item.meta" class="base-timeline__meta">{{ entry.item.meta }}</span>
              </div>
              <time v-if="entry.item.time">{{ entry.item.time }}</time>
            </div>
            <p v-if="entry.item.description" :style="descriptionStyle">{{ entry.item.description }}</p>
            <div v-if="entry.item.tag || $slots.actions" class="base-timeline__footer">
              <span v-if="entry.item.tag" class="base-timeline__tag">{{ entry.item.tag }}</span>
              <div v-if="$slots.actions" class="base-timeline__actions">
                <slot name="actions" :item="entry.item" :index="entry.index"></slot>
              </div>
            </div>
          </slot>
        </div>
      </li>
    </template>
  </ol>
</template>

<style scoped>
.base-timeline {
  @apply flex min-w-0 flex-col gap-3;
}

.base-timeline--dense {
  @apply gap-2;
}

.base-timeline__item {
  @apply relative min-w-0 pl-8;
}

.base-timeline__item.is-disabled {
  @apply opacity-60;
}

.base-timeline__item.is-clickable {
  @apply cursor-pointer;
}

.base-timeline__item.is-clickable:focus-visible {
  outline: none;
}

.base-timeline__item.is-clickable:focus-visible .base-timeline__content {
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

.base-timeline__line {
  @apply absolute left-3 top-6 h-[calc(100%+0.75rem)] w-px bg-slate-200 dark:bg-slate-800;
}

.base-timeline__item:last-child .base-timeline__line {
  @apply hidden;
}

.base-timeline__marker {
  @apply absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white dark:bg-slate-900;
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
  @apply min-w-0 rounded-2xl bg-white p-3 shadow-sm transition-colors dark:bg-slate-900;
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
}

.base-timeline__header time {
  @apply shrink-0 pt-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-timeline__meta {
  @apply mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
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
}

.base-timeline__footer {
  @apply mt-2 flex min-w-0 items-center justify-between gap-2;
}

.base-timeline__tag {
  @apply min-w-0 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300;
}

.base-timeline__actions {
  @apply shrink-0;
}

.base-timeline--sm .base-timeline__item {
  @apply pl-7;
}

.base-timeline--sm .base-timeline__line {
  @apply left-2.5 top-5;
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

.base-timeline--lg .base-timeline__item {
  @apply pl-10;
}

.base-timeline--lg .base-timeline__line {
  @apply left-4 top-8;
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
