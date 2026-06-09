<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import type { ComponentPublicInstance } from "vue";
import { compactMap, findIndexByValue, focusElementPreventScroll, getBoundaryItem, getFirstRecordValue, getKeyboardBoundaryPosition, getKeyboardNavigationDirection, getNextClampedIndex, handleActivationKeydown, isEventFromInteractiveElement, isHTMLElement } from "../../utils";

type ListVariant = "card" | "plain" | "row";
type ListSize = "xs" | "sm" | "md" | "lg";
type ListSurface = "default" | "muted" | "transparent";
type BadgeType = "primary" | "success" | "warning" | "danger" | "neutral";

interface Props {
  items: any[];
  variant?: ListVariant;
  size?: ListSize;
  surface?: ListSurface;
  activeKey?: string | number | null;
  itemKey?: string;
  labelKey?: string;
  descriptionKey?: string;
  disabledKey?: string;
  iconKey?: string;
  badgeKey?: string;
  badgeTypeKey?: string;
  metaKey?: string;
  clickable?: boolean;
  bordered?: boolean;
  divided?: boolean;
  simple?: boolean;
  showIcon?: boolean;
  showBadge?: boolean;
  showMeta?: boolean;
  showDescription?: boolean;
  wrapLabel?: boolean;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "card",
  size: "md",
  surface: "default",
  activeKey: null,
  itemKey: "id",
  labelKey: "title",
  descriptionKey: "description",
  disabledKey: "disabled",
  iconKey: "icon",
  badgeKey: "badge",
  badgeTypeKey: "type",
  metaKey: "meta",
  clickable: false,
  bordered: true,
  divided: false,
  simple: false,
  showIcon: true,
  showBadge: true,
  showMeta: true,
  showDescription: true,
  wrapLabel: false,
  disabled: false,
  loading: false,
  loadingText: "加载中",
  emptyText: "暂无数据",
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "item-click", item: any, index: number): void;
  (e: "select", item: any, index: number): void;
}>();

defineSlots<{
  default?: (props: { item: any; index: number; active: boolean; disabled: boolean }) => any;
  actions?: (props: { item: any; index: number; active: boolean; disabled: boolean }) => any;
  loading?: () => any;
  empty?: () => any;
}>();

const itemRefs = ref(new Map<string | number, HTMLElement>());

const getItemKey = (item: any, index: number) => getFirstRecordValue<string | number>(item, [props.itemKey, "key", "id"], index) ?? index;
const getItemLabel = (item: any): string => getFirstRecordValue<string>(item, [props.labelKey, "title", "label", "name"], "") ?? "";
const getItemDescription = (item: any): string => getFirstRecordValue<string>(item, [props.descriptionKey, "description"], "") ?? "";
const getItemIcon = (item: any): string => getFirstRecordValue<string>(item, [props.iconKey, "icon"], "") ?? "";
const getItemBadge = (item: any): string => getFirstRecordValue<string>(item, [props.badgeKey, "badge", "status"], "") ?? "";
const getItemBadgeType = (item: any): BadgeType => getFirstRecordValue<BadgeType>(item, [props.badgeTypeKey, "badgeType", "type"], "neutral") ?? "neutral";
const getItemMeta = (item: any): string => getFirstRecordValue<string>(item, [props.metaKey, "meta"], "") ?? "";
const isDisabled = (item: any) => Boolean(props.disabled || item?.[props.disabledKey] || item?.disabled);
const isActive = (item: any, index: number) => props.activeKey !== null && getItemKey(item, index) === props.activeKey;
const isInteractive = computed(() => props.clickable && !props.disabled && !props.loading);
const enabledEntries = computed(() =>
  compactMap(props.items, (item, index) => (isDisabled(item) ? undefined : { item, index, key: getItemKey(item, index) })),
);

const setItemRef = (key: string | number, element: Element | ComponentPublicInstance | null) => {
  if (!element) {
    itemRefs.value.delete(key);
    return;
  }

  if (isHTMLElement(element)) {
    itemRefs.value.set(key, element);
  }
};

const selectItem = (item: any, index: number) => {
  if (!isInteractive.value || isDisabled(item)) return;
  emit("item-click", item, index);
  emit("select", item, index);
};

const handleItemClick = (event: MouseEvent, item: any, index: number) => {
  if (isEventFromInteractiveElement(event)) return;
  selectItem(item, index);
};

const focusItem = (key: string | number) => {
  void nextTick(() => {
    focusElementPreventScroll(itemRefs.value.get(key));
  });
};

const moveFocus = (item: any, index: number, offset: 1 | -1) => {
  if (!isInteractive.value || !enabledEntries.value.length) return;
  const currentKey = getItemKey(item, index);
  const currentIndex = findIndexByValue(enabledEntries.value, (entry) => entry.key, currentKey);
  const nextIndex = getNextClampedIndex(enabledEntries.value.length, currentIndex, offset);
  focusItem(enabledEntries.value[nextIndex].key);
};

const handleItemKeydown = (event: KeyboardEvent, item: any, index: number) => {
  if (!isInteractive.value || isDisabled(item)) return;
  if (isEventFromInteractiveElement(event)) return;

  if (handleActivationKeydown(event, () => selectItem(item, index))) {
    return;
  }

  const direction = getKeyboardNavigationDirection(event);
  if (direction) {
    event.preventDefault();
    moveFocus(item, index, direction);
    return;
  }

  const boundaryPosition = getKeyboardBoundaryPosition(event);
  if (boundaryPosition) {
    event.preventDefault();
    const targetEntry = getBoundaryItem(enabledEntries.value, boundaryPosition);
    if (targetEntry) focusItem(targetEntry.key);
  }
};
</script>

<template>
  <transition-group
    tag="ul"
    name="list-transition"
    class="base-list"
    :class="[
      `base-list--${variant}`,
      `base-list--${size}`,
      `base-list--surface-${surface}`,
      {
        'base-list--clickable': clickable,
        'base-list--bordered': bordered,
        'base-list--divided': divided,
        'base-list--simple': simple,
        'base-list--wrap-label': wrapLabel,
        'is-empty': !items.length && !loading,
        'is-disabled': disabled,
        'is-loading': loading,
      },
    ]"
    :aria-label="ariaLabel || undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
  >
    <li
      v-if="loading"
      key="__loading"
      class="base-list__loading"
      role="status"
      aria-live="polite"
    >
      <slot name="loading">
        <BaseIcon name="LoaderCircle" size="15" class="base-list__loading-icon" aria-hidden="true" />
        <span>{{ loadingText }}</span>
      </slot>
    </li>
    <li
      v-else-if="!items.length"
      key="__empty"
      class="base-list__empty"
      role="status"
    >
      <slot name="empty">{{ emptyText }}</slot>
    </li>
    <template v-else>
      <li
        v-for="(item, idx) in items"
        :key="getItemKey(item, idx)"
        :ref="(element) => setItemRef(getItemKey(item, idx), element)"
        class="base-list__item"
        :class="{ 'is-active': isActive(item, idx), 'is-disabled': isDisabled(item) }"
        :role="isInteractive ? 'button' : undefined"
        :tabindex="isInteractive && !isDisabled(item) ? 0 : undefined"
        :aria-current="isInteractive && isActive(item, idx) ? 'page' : undefined"
        :aria-disabled="isDisabled(item) ? 'true' : undefined"
        :aria-label="isInteractive ? getItemLabel(item) : undefined"
        @click="handleItemClick($event, item, idx)"
        @keydown="handleItemKeydown($event, item, idx)"
      >
        <slot :item="item" :index="idx" :active="isActive(item, idx)" :disabled="isDisabled(item)">
          <span v-if="showIcon && !simple && getItemIcon(item)" class="base-list__icon" aria-hidden="true">
            <BaseIcon :name="getItemIcon(item)" size="16" aria-hidden="true" />
          </span>
          <span class="base-list__content">
            <span class="base-list__title-row">
              <span class="base-list__label">{{ getItemLabel(item) }}</span>
              <BaseBadge v-if="showBadge && !simple && getItemBadge(item)" :type="getItemBadgeType(item)" size="xs">{{ getItemBadge(item) }}</BaseBadge>
            </span>
            <span v-if="showDescription && !simple && getItemDescription(item)" class="base-list__description">{{ getItemDescription(item) }}</span>
          </span>
          <span v-if="(showMeta && getItemMeta(item)) || $slots.actions" class="base-list__right">
            <span v-if="showMeta && getItemMeta(item)" class="base-list__meta">{{ getItemMeta(item) }}</span>
            <slot name="actions" :item="item" :index="idx" :active="isActive(item, idx)" :disabled="isDisabled(item)" />
          </span>
        </slot>
      </li>
    </template>
  </transition-group>
</template>

<style scoped>
.base-list {
  @apply m-0 w-full min-w-0 list-none p-0;
}

.base-list.is-disabled {
  @apply opacity-75;
}

.base-list--card {
  @apply space-y-2.5;
}

.base-list--plain {
  @apply space-y-1;
}

.base-list--row {
  @apply overflow-hidden rounded-2xl bg-white dark:bg-slate-900;
}

.base-list--row.base-list--bordered {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-list--surface-muted.base-list--row {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-list--surface-transparent.base-list--row {
  @apply rounded-none bg-transparent dark:bg-transparent;
}

.base-list__item {
  @apply flex min-w-0 items-center justify-between gap-3 select-none transition duration-200;
}

.base-list--card .base-list__item {
  @apply rounded-2xl bg-white p-3.5 shadow-sm hover:shadow-md dark:bg-slate-900;
}

.base-list--card.base-list--bordered .base-list__item {
  @apply border border-slate-200 hover:border-primary dark:border-slate-800;
}

.base-list--card.base-list--surface-muted .base-list__item {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-list--card.base-list--surface-transparent .base-list__item {
  @apply bg-transparent shadow-none dark:bg-transparent;
}

.base-list--plain .base-list__item {
  @apply relative overflow-hidden rounded-xl border border-transparent px-3 py-2 text-left hover:border-slate-200 hover:bg-white hover:shadow-sm dark:hover:border-slate-700 dark:hover:bg-slate-900;
}

.base-list--row .base-list__item {
  @apply px-3.5 py-3 hover:bg-slate-50 dark:hover:bg-slate-950;
}

.base-list--row.base-list--divided .base-list__item + .base-list__item {
  @apply border-t border-slate-100 dark:border-slate-800;
}

.base-list--plain.base-list--sm .base-list__item {
  @apply h-9 px-3 py-0;
}

.base-list--plain.base-list--xs .base-list__item {
  @apply h-8 px-2.5 py-0;
}

.base-list--plain .base-list__item::before {
  content: "";
  @apply absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-transparent transition;
}

.base-list--plain .base-list__item.is-active {
  border-color: rgb(var(--color-primary) / 0.24);
  background: linear-gradient(90deg, rgb(var(--color-primary) / 0.1), rgba(255, 255, 255, 0.92));
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
}

.base-list--plain .base-list__item.is-active::before {
  @apply bg-primary;
}

:global(.dark) .base-list--plain .base-list__item.is-active {
  background: linear-gradient(90deg, rgb(var(--color-primary) / 0.18), rgba(15, 23, 42, 0.94));
  box-shadow: 0 8px 18px rgba(2, 6, 23, 0.2);
}

.base-list--clickable .base-list__item {
  @apply cursor-pointer;
}

.base-list--simple .base-list__item {
  @apply h-8 gap-2 px-2.5 py-0;
}

.base-list--simple.base-list--sm .base-list__item {
  @apply h-8;
}

.base-list--simple.base-list--xs .base-list__item {
  @apply h-7 rounded-lg px-2;
}

.base-list--simple.base-list--md .base-list__item {
  @apply h-9;
}

.base-list--simple.base-list--lg .base-list__item {
  @apply h-10 px-3;
}

.base-list__item.is-disabled {
  @apply cursor-not-allowed opacity-55;
}

.base-list__item:focus-visible {
  @apply outline-none ring-2 ring-primary ring-opacity-20;
}

.base-list__item.is-active {
  color: rgb(var(--color-primary));
}

.base-list--card .base-list__item.is-active,
.base-list--row .base-list__item.is-active {
  background-color: rgba(var(--color-primary), 0.08);
}

.base-list__icon {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300;
}

.base-list__item.is-active .base-list__icon {
  background-color: rgba(var(--color-primary), 0.12);
  @apply text-primary;
}

.base-list__content {
  @apply min-w-0 flex-1;
}

.base-list--simple .base-list__content {
  @apply flex min-h-0 items-center;
}

.base-list__title-row {
  @apply flex min-w-0 items-center gap-2;
}

.base-list--simple .base-list__title-row {
  @apply w-full;
}

.base-list__label {
  @apply min-w-0 truncate text-xs font-black text-slate-700 dark:text-slate-200;
}

.base-list--wrap-label .base-list__label {
  @apply whitespace-normal break-words;
}

.base-list--simple .base-list__label {
  @apply leading-none;
}

.base-list__item.is-active .base-list__label {
  @apply text-primary;
}

.base-list__description {
  @apply mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-list__right {
  @apply ml-auto flex shrink-0 items-center gap-2;
}

.base-list--simple .base-list__right {
  @apply gap-1.5;
}

.base-list__meta {
  @apply hidden text-[10px] font-black text-slate-400 dark:text-slate-500 sm:inline;
}

.base-list--simple .base-list__meta {
  @apply inline text-[10px];
}

.base-list__empty {
  @apply rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs font-black text-slate-400 dark:border-slate-800 dark:text-slate-500;
}

.base-list__loading {
  @apply flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs font-black text-slate-400 dark:border-slate-800 dark:text-slate-500;
}

.base-list__loading-icon {
  @apply shrink-0 animate-spin;
}

.base-list--xs .base-list__item {
  @apply gap-2 text-[11px];
}

.base-list--xs .base-list__icon {
  @apply h-6 w-6 rounded-lg;
}

.base-list--xs .base-list__description,
.base-list--xs .base-list__meta {
  @apply text-[9px];
}

.base-list--sm .base-list__icon {
  @apply h-7 w-7 rounded-lg;
}

.base-list--lg .base-list__item {
  @apply p-4;
}

.base-list--lg .base-list__icon {
  @apply h-10 w-10;
}

.base-list--lg .base-list__label {
  @apply text-sm;
}

.base-list--lg .base-list__description {
  @apply text-xs;
}

.list-transition-enter-active,
.list-transition-leave-active {
  transition: all 0.25s ease;
}
.list-transition-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}
.list-transition-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

@media (prefers-reduced-motion: reduce) {
  .base-list__item,
  .base-list__loading-icon,
  .list-transition-enter-active,
  .list-transition-leave-active {
    transition: none !important;
    animation: none !important;
  }
}
</style>
