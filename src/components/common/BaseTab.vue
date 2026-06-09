<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import type { ComponentPublicInstance } from "vue";
import { filterByFalsyValue, findByValue, findNextCircularItem, firstItem, getKeyboardBoundaryPosition, getKeyboardNavigationDirection, lastItem } from "../../utils";
import BaseIcon from "./BaseIcon.vue";

interface TabItem {
  key: string | number;
  title: string;
  icon?: any; // 可以是字符串(图标名)或 Vue 组件
  badge?: string | number;
  badgeColor?: string; // 如 bg-red-500 text-white 等标准的 Tailwind 类名
  disabled?: boolean;
  ariaLabel?: string;
}

type TabVariant = "pills" | "underline";
type TabSize = "sm" | "md" | "lg";
type TabSurface = "default" | "muted" | "plain";
type TabAlign = "start" | "center" | "end" | "between";

interface Props {
  modelValue: string | number;
  tabs: TabItem[];
  variant?: TabVariant;
  size?: TabSize;
  surface?: TabSurface;
  align?: TabAlign;
  ariaLabel?: string;
  fullWidth?: boolean;
  equal?: boolean;
  wrap?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "pills",
  size: "md",
  surface: "default",
  align: "start",
  ariaLabel: "",
  fullWidth: false,
  equal: false,
  wrap: false,
  disabled: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", key: string | number): void;
  (e: "select", tab: TabItem): void;
}>();

defineSlots<{
  tab?: (props: { tab: TabItem; active: boolean; disabled: boolean; index: number }) => any;
  badge?: (props: { tab: TabItem; active: boolean; disabled: boolean }) => any;
}>();

const tabButtonRefs = ref(new Map<TabItem["key"], HTMLButtonElement>());

const enabledTabs = computed(() => filterByFalsyValue(props.tabs, (tab) => tab.disabled));

const focusableKey = computed(() => {
  if (props.disabled) return undefined;
  return findByValue(enabledTabs.value, (tab) => tab.key, props.modelValue)?.key ?? firstItem(enabledTabs.value)?.key;
});

const isTabDisabled = (tab: TabItem) => Boolean(props.disabled || tab.disabled);

const isTabActive = (tab: TabItem) => tab.key === props.modelValue;

const getTabIndex = (tab: TabItem) => {
  if (isTabDisabled(tab)) return -1;
  return tab.key === focusableKey.value ? 0 : -1;
};

const setTabButtonRef = (key: TabItem["key"], element: Element | ComponentPublicInstance | null) => {
  if (!element) {
    tabButtonRefs.value.delete(key);
    return;
  }

  if (element instanceof HTMLButtonElement) {
    tabButtonRefs.value.set(key, element);
  }
};

const focusTab = (key: TabItem["key"]) => {
  void nextTick(() => {
    tabButtonRefs.value.get(key)?.focus({ preventScroll: true });
  });
};

const selectTab = (tab: TabItem, options: { focus?: boolean } = {}) => {
  if (isTabDisabled(tab)) return;
  emit("update:modelValue", tab.key);
  emit("select", tab);

  if (options.focus) {
    focusTab(tab.key);
  }
};

const moveTab = (direction: 1 | -1) => {
  if (!enabledTabs.value.length) return;
  const nextTab = findNextCircularItem(enabledTabs.value, (tab) => tab.key === props.modelValue, direction);
  if (nextTab) selectTab(nextTab, { focus: true });
};

const handleKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return;

  const direction = getKeyboardNavigationDirection(event);
  if (direction) {
    event.preventDefault();
    moveTab(direction);
    return;
  }

  const boundaryPosition = getKeyboardBoundaryPosition(event);
  if (boundaryPosition === "first") {
    event.preventDefault();
    const firstTab = firstItem(enabledTabs.value);
    if (firstTab) selectTab(firstTab, { focus: true });
    return;
  }

  if (boundaryPosition === "last") {
    event.preventDefault();
    const lastTab = lastItem(enabledTabs.value);
    if (lastTab) selectTab(lastTab, { focus: true });
  }
};
</script>

<template>
  <div
    class="base-tab"
    :class="[
      `base-tab--${variant}`,
      `base-tab--${size}`,
      `base-tab--surface-${surface}`,
      `base-tab--align-${align}`,
      {
        'base-tab--full': fullWidth || variant === 'underline',
        'base-tab--equal': equal,
        'base-tab--wrap': wrap,
        'is-disabled': disabled,
      },
    ]"
    role="tablist"
    :aria-label="ariaLabel || '标签页'"
    :aria-disabled="disabled ? 'true' : undefined"
    @keydown="handleKeydown"
  >
    <button
      v-for="(tab, index) in tabs"
      :key="tab.key"
      :ref="(element) => setTabButtonRef(tab.key, element)"
      type="button"
      role="tab"
      class="base-tab__button"
      :class="{
        'is-active': isTabActive(tab),
        'is-disabled': isTabDisabled(tab),
      }"
      :disabled="isTabDisabled(tab)"
      :aria-selected="isTabActive(tab)"
      :aria-label="tab.ariaLabel"
      :tabindex="getTabIndex(tab)"
      @click="selectTab(tab)"
    >
      <slot name="tab" :tab="tab" :active="isTabActive(tab)" :disabled="isTabDisabled(tab)" :index="index">
        <span v-if="tab.icon" class="base-tab__icon" aria-hidden="true">
          <BaseIcon v-if="typeof tab.icon === 'string'" :name="tab.icon" size="15" aria-hidden="true" />
          <component :is="tab.icon" v-else class="h-3.5 w-3.5" aria-hidden="true" />
        </span>

        <span class="base-tab__title">{{ tab.title }}</span>

        <slot name="badge" :tab="tab" :active="isTabActive(tab)" :disabled="isTabDisabled(tab)">
          <span
            v-if="tab.badge !== undefined && tab.badge !== ''"
            class="base-tab__badge"
            :class="tab.badgeColor || 'base-tab__badge--default'"
          >
            {{ tab.badge }}
          </span>
        </slot>
      </slot>
    </button>
  </div>
</template>

<style scoped>
.base-tab {
  @apply flex min-w-0 max-w-full select-none items-center overflow-x-auto overflow-y-hidden;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.base-tab::-webkit-scrollbar {
  display: none;
}

.base-tab--pills {
  @apply w-fit gap-1 rounded-2xl border p-1;
}

.base-tab--underline {
  @apply w-full gap-5 border-b;
}

.base-tab--surface-default.base-tab--pills {
  @apply border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900;
}

.base-tab--surface-muted.base-tab--pills {
  @apply border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950;
}

.base-tab--surface-plain.base-tab--pills {
  @apply border-transparent bg-transparent p-0;
}

.base-tab--surface-default.base-tab--underline,
.base-tab--surface-muted.base-tab--underline {
  @apply border-slate-200 dark:border-slate-800;
}

.base-tab--surface-plain.base-tab--underline {
  @apply border-transparent;
}

.base-tab--full {
  @apply w-full;
}

.base-tab--align-start {
  @apply justify-start;
}

.base-tab--align-center {
  @apply justify-center;
}

.base-tab--align-end {
  @apply justify-end;
}

.base-tab--align-between {
  @apply justify-between;
}

.base-tab--wrap {
  @apply flex-wrap overflow-visible;
}

.base-tab.is-disabled {
  @apply opacity-70;
}

.base-tab__button {
  @apply relative inline-flex min-w-0 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-bold text-slate-500 transition-all duration-200 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-400 dark:hover:text-slate-200;
}

.base-tab__button:focus-visible {
  @apply outline-none ring-2 ring-primary ring-opacity-20;
}

.base-tab--equal .base-tab__button {
  @apply min-w-0 flex-1 basis-0;
}

.base-tab--sm .base-tab__button {
  @apply text-[11px];
}

.base-tab--md .base-tab__button {
  @apply text-xs;
}

.base-tab--lg .base-tab__button {
  @apply text-sm;
}

.base-tab--pills.base-tab--sm .base-tab__button {
  @apply rounded-xl px-2.5 py-1.5;
}

.base-tab--pills.base-tab--md .base-tab__button {
  @apply rounded-xl px-4 py-2;
}

.base-tab--pills.base-tab--lg .base-tab__button {
  @apply rounded-2xl px-5 py-2.5;
}

.base-tab--pills .base-tab__button.is-active {
  @apply border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100;
}

.base-tab--pills .base-tab__button:not(.is-active):not(.is-disabled) {
  @apply hover:bg-white hover:shadow-sm dark:hover:bg-slate-800;
}

.base-tab--underline .base-tab__button {
  @apply -mb-px border-b-2 border-transparent px-1 py-3;
}

.base-tab--underline.base-tab--sm .base-tab__button {
  @apply py-2 text-[11px];
}

.base-tab--underline.base-tab--lg .base-tab__button {
  @apply py-3.5 text-sm;
}

.base-tab--underline .base-tab__button.is-active {
  @apply border-primary text-primary;
}

.base-tab__icon {
  @apply flex shrink-0 items-center;
}

.base-tab__title {
  @apply min-w-0 truncate;
}

.base-tab__badge {
  @apply shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none shadow-sm;
}

.base-tab__badge--default {
  @apply bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300;
}

@media (prefers-reduced-motion: reduce) {
  .base-tab__button {
    transition: none !important;
  }
}
</style>
