<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from "vue";
import type { ComponentPublicInstance } from "vue";
import {
  filterByFalsyValue,
  findIndexByValue,
  getNextCircularIndex,
  hasItem,
  sanitizeDomIdSegment,
  toggleItem as toggleArrayItem,
} from "../../utils";

type AccordionSize = "sm" | "md" | "lg";
type AccordionSurface = "card" | "muted" | "plain";
type BadgeType = "primary" | "success" | "warning" | "danger" | "neutral";

export interface AccordionItem {
  key: string;
  title: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
  badge?: string;
  badgeType?: BadgeType;
  meta?: string;
}

interface Props {
  modelValue?: string[];
  defaultValue?: string[];
  items: AccordionItem[];
  multiple?: boolean;
  compact?: boolean;
  size?: AccordionSize;
  surface?: AccordionSurface;
  bordered?: boolean;
  divided?: boolean;
  allowCollapse?: boolean;
  keepMounted?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  showChevron?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultValue: () => [],
  multiple: false,
  compact: false,
  size: "md",
  surface: "card",
  bordered: true,
  divided: true,
  allowCollapse: true,
  keepMounted: false,
  ariaLabel: "",
  disabled: false,
  showChevron: true,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string[]): void;
  (e: "toggle", payload: { key: string; expanded: boolean }): void;
}>();

defineSlots<{
  default?: (props: { item: AccordionItem; expanded: boolean }) => any;
  actions?: (props: { item: AccordionItem; expanded: boolean }) => any;
  [name: string]: ((props: { item: AccordionItem; expanded: boolean }) => any) | undefined;
}>();

const accordionId = useId();
const internalValue = ref<string[]>([...props.defaultValue]);
const triggerRefs = ref(new Map<string, HTMLButtonElement>());

const activeKeys = computed(() => props.modelValue ?? internalValue.value);
const enabledItems = computed(() => filterByFalsyValue(props.items, isItemDisabled));

const isExpanded = (key: string) => hasItem(activeKeys.value, key);
const isItemDisabled = (item: AccordionItem) => Boolean(props.disabled || item.disabled);
const stableKey = (key: string) => sanitizeDomIdSegment(key);
const panelId = (key: string) => `${accordionId}-panel-${stableKey(key)}`;
const triggerId = (key: string) => `${accordionId}-trigger-${stableKey(key)}`;

watch(
  () => props.defaultValue,
  (value) => {
    if (props.modelValue === undefined) {
      internalValue.value = [...value];
    }
  },
);

const setTriggerRef = (key: string, element: Element | ComponentPublicInstance | null) => {
  if (!element) {
    triggerRefs.value.delete(key);
    return;
  }

  if (element instanceof HTMLButtonElement) {
    triggerRefs.value.set(key, element);
  }
};

const focusTrigger = (key: string) => {
  void nextTick(() => {
    triggerRefs.value.get(key)?.focus({ preventScroll: true });
  });
};

const commitValue = (nextValue: string[], payload: { key: string; expanded: boolean }) => {
  if (props.modelValue === undefined) {
    internalValue.value = nextValue;
  }

  emit("update:modelValue", nextValue);
  emit("toggle", payload);
};

const toggleItem = (item: AccordionItem) => {
  if (isItemDisabled(item)) return;

  const expanded = isExpanded(item.key);
  if (expanded && !props.allowCollapse) return;

  let nextValue: string[] = [];

  if (props.multiple) {
    nextValue = toggleArrayItem(activeKeys.value, item.key, expanded);
  } else {
    nextValue = expanded ? [] : [item.key];
  }

  commitValue(nextValue, { key: item.key, expanded: !expanded });
};

const moveFocus = (item: AccordionItem, direction: 1 | -1) => {
  if (!enabledItems.value.length) return;
  const currentIndex = findIndexByValue(enabledItems.value, (current) => current.key, item.key);
  const nextIndex = getNextCircularIndex(enabledItems.value.length, currentIndex, direction);
  focusTrigger(enabledItems.value[nextIndex].key);
};

const handleTriggerKeydown = (event: KeyboardEvent, item: AccordionItem) => {
  if (isItemDisabled(item)) return;

  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    event.preventDefault();
    moveFocus(item, 1);
  }

  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    event.preventDefault();
    moveFocus(item, -1);
  }

  if (event.key === "Home") {
    event.preventDefault();
    const firstItem = enabledItems.value[0];
    if (firstItem) focusTrigger(firstItem.key);
  }

  if (event.key === "End") {
    event.preventDefault();
    const lastItem = enabledItems.value[enabledItems.value.length - 1];
    if (lastItem) focusTrigger(lastItem.key);
  }
};
</script>

<template>
  <div
    class="base-accordion"
    :class="[
      `base-accordion--${size}`,
      `base-accordion--${surface}`,
      {
        'base-accordion--compact': compact,
        'base-accordion--bordered': bordered,
        'base-accordion--divided': divided,
        'base-accordion--keep-mounted': keepMounted,
        'is-disabled': disabled,
      },
    ]"
    :aria-label="ariaLabel || undefined"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <section
      v-for="item in items"
      :key="item.key"
      class="base-accordion__item"
      :class="{ 'is-disabled': isItemDisabled(item), 'is-expanded': isExpanded(item.key) }"
    >
      <button
        :ref="(element) => setTriggerRef(item.key, element)"
        type="button"
        class="base-accordion__trigger"
        :id="triggerId(item.key)"
        :disabled="isItemDisabled(item)"
        :aria-expanded="isExpanded(item.key)"
        :aria-controls="panelId(item.key)"
        @click="toggleItem(item)"
        @keydown="handleTriggerKeydown($event, item)"
      >
        <div class="base-accordion__meta">
          <span v-if="item.icon" class="base-accordion__icon" aria-hidden="true">
            <BaseIcon :name="item.icon" size="16" aria-hidden="true" />
          </span>
          <div class="base-accordion__text">
            <div class="base-accordion__title-row">
              <strong>{{ item.title }}</strong>
              <BaseBadge v-if="item.badge" :type="item.badgeType || 'neutral'" size="xs">{{ item.badge }}</BaseBadge>
            </div>
            <small v-if="item.description">{{ item.description }}</small>
          </div>
        </div>
        <div class="base-accordion__right">
          <span v-if="item.meta" class="base-accordion__item-meta">{{ item.meta }}</span>
          <slot name="actions" :item="item" :expanded="isExpanded(item.key)"></slot>
          <BaseIcon
            v-if="showChevron"
            name="ChevronDown"
            size="16"
            class="base-accordion__chevron"
            :class="{ 'is-expanded': isExpanded(item.key) }"
            aria-hidden="true"
          />
        </div>
      </button>

      <div
        v-if="keepMounted || isExpanded(item.key)"
        v-show="isExpanded(item.key)"
        :id="panelId(item.key)"
        class="base-accordion__content"
        role="region"
        :aria-labelledby="triggerId(item.key)"
      >
        <slot :name="item.key" :item="item" :expanded="isExpanded(item.key)">
          <slot :item="item" :expanded="isExpanded(item.key)">
            <p v-if="item.description" class="base-accordion__fallback">{{ item.description }}</p>
          </slot>
        </slot>
      </div>
    </section>
  </div>
</template>

<style scoped>
.base-accordion {
  @apply overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-900;
}

.base-accordion.is-disabled {
  @apply opacity-75;
}

.base-accordion--bordered {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-accordion--muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-accordion--plain {
  @apply rounded-none bg-transparent shadow-none dark:bg-transparent;
}

.base-accordion--plain.base-accordion--bordered {
  @apply border-0;
}

.base-accordion--compact {
  @apply rounded-xl;
}

.base-accordion--divided .base-accordion__item + .base-accordion__item {
  @apply border-t border-slate-100 dark:border-slate-800;
}

.base-accordion__item.is-disabled {
  @apply opacity-55;
}

.base-accordion__item.is-expanded .base-accordion__trigger {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-accordion--muted .base-accordion__item.is-expanded .base-accordion__trigger {
  @apply bg-white dark:bg-slate-900;
}

.base-accordion--plain .base-accordion__item.is-expanded .base-accordion__trigger {
  @apply bg-slate-50 dark:bg-slate-900;
}

.base-accordion__trigger {
  @apply flex w-full min-w-0 items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:hover:bg-slate-950;
}

.base-accordion--muted .base-accordion__trigger:hover {
  @apply bg-white dark:bg-slate-900;
}

.base-accordion--plain .base-accordion__trigger {
  @apply rounded-xl;
}

.base-accordion__trigger:focus-visible {
  @apply outline-none ring-2 ring-primary ring-opacity-20;
}

.base-accordion--compact .base-accordion__trigger {
  @apply px-3 py-2.5;
}

.base-accordion__meta {
  @apply flex min-w-0 items-center gap-3;
}

.base-accordion__icon {
  background-color: rgba(var(--color-primary), 0.1);
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-primary;
}

.base-accordion__text {
  @apply min-w-0;
}

.base-accordion__title-row {
  @apply flex min-w-0 items-center gap-2;
}

.base-accordion__text strong {
  @apply block truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-accordion__item.is-expanded .base-accordion__text strong {
  @apply text-primary;
}

.base-accordion__text small {
  @apply mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-accordion__right {
  @apply flex shrink-0 items-center gap-2;
}

.base-accordion__item-meta {
  @apply hidden text-[10px] font-black text-slate-400 dark:text-slate-500 sm:inline;
}

.base-accordion__chevron {
  @apply shrink-0 text-slate-400 transition-transform duration-150;
}

.base-accordion__chevron.is-expanded {
  @apply rotate-180 text-primary;
}

.base-accordion__content {
  @apply border-t border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950;
}

.base-accordion--muted .base-accordion__content {
  @apply bg-white dark:bg-slate-900;
}

.base-accordion--plain .base-accordion__content {
  @apply rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950;
}

.base-accordion--compact .base-accordion__content {
  @apply px-3 py-3;
}

.base-accordion__fallback {
  @apply text-xs font-bold leading-5 text-slate-500 dark:text-slate-400;
}

.base-accordion--sm .base-accordion__trigger {
  @apply px-3 py-2.5;
}

.base-accordion--sm .base-accordion__icon {
  @apply h-7 w-7 rounded-lg;
}

.base-accordion--sm .base-accordion__content {
  @apply px-3 py-3;
}

.base-accordion--lg .base-accordion__trigger {
  @apply px-5 py-4;
}

.base-accordion--lg .base-accordion__icon {
  @apply h-10 w-10;
}

.base-accordion--lg .base-accordion__text strong {
  @apply text-sm;
}

.base-accordion--lg .base-accordion__text small {
  @apply text-xs;
}

.base-accordion--lg .base-accordion__content {
  @apply px-5 py-5;
}

@media (prefers-reduced-motion: reduce) {
  .base-accordion__trigger,
  .base-accordion__chevron {
    transition: none !important;
  }
}
</style>
