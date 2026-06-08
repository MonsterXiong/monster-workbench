<script setup lang="ts">
import { computed } from "vue";
import { toReversedArray } from "../../utils";

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
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "select", payload: { item: TimelineItem; index: number }): void;
}>();

defineSlots<{
  default?: (props: { item: TimelineItem; index: number }) => any;
  actions?: (props: { item: TimelineItem; index: number }) => any;
}>();

const renderedItems = computed(() => (props.reverse ? toReversedArray(props.items) : props.items));

const canSelect = (item: TimelineItem) => props.clickable && !item.disabled;

const handleSelect = (item: TimelineItem, index: number) => {
  if (!canSelect(item)) return;
  emit("select", { item, index });
};

const handleKeydown = (event: KeyboardEvent, item: TimelineItem, index: number) => {
  if (event.key !== "Enter" && event.key !== " ") return;
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
      },
    ]"
    :aria-label="ariaLabel || undefined"
  >
    <li
      v-for="(item, index) in renderedItems"
      :key="item.key"
      class="base-timeline__item"
      :class="[
        `base-timeline__item--${item.type || 'neutral'}`,
        {
          'is-clickable': canSelect(item),
          'is-disabled': item.disabled,
        },
      ]"
      :role="clickable ? 'button' : undefined"
      :tabindex="canSelect(item) ? 0 : undefined"
      :aria-disabled="item.disabled ? 'true' : undefined"
      @click="handleSelect(item, index)"
      @keydown="handleKeydown($event, item, index)"
    >
      <span class="base-timeline__line" aria-hidden="true"></span>
      <span class="base-timeline__marker" aria-hidden="true">
        <BaseIcon v-if="marker === 'icon' && item.icon" :name="item.icon" size="12" aria-hidden="true" />
        <span v-else-if="marker === 'number'" class="base-timeline__number">{{ index + 1 }}</span>
      </span>
      <div class="base-timeline__content">
        <slot :item="item" :index="index">
          <div class="base-timeline__header">
            <div class="base-timeline__title-group">
              <strong>{{ item.title }}</strong>
              <span v-if="item.meta" class="base-timeline__meta">{{ item.meta }}</span>
            </div>
            <time v-if="item.time">{{ item.time }}</time>
          </div>
          <p v-if="item.description">{{ item.description }}</p>
          <div v-if="item.tag || $slots.actions" class="base-timeline__footer">
            <span v-if="item.tag" class="base-timeline__tag">{{ item.tag }}</span>
            <div v-if="$slots.actions" class="base-timeline__actions">
              <slot name="actions" :item="item" :index="index"></slot>
            </div>
          </div>
        </slot>
      </div>
    </li>
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

.base-timeline__header {
  @apply flex min-w-0 items-start justify-between gap-3;
}

.base-timeline__title-group {
  @apply min-w-0;
}

.base-timeline__header strong {
  @apply block truncate text-xs font-black text-slate-800 dark:text-slate-100;
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
  -webkit-line-clamp: 2;
  overflow: hidden;
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
  .base-timeline__content {
    transition: none !important;
  }
}
</style>
