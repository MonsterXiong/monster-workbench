<script setup lang="ts">
import type { TabsInstance } from "element-plus";
import type { StyleValue } from "vue";
import { computed, ref, useAttrs } from "vue";
import { omit } from "../../utils";
import { getElementPlusControlRoot } from "./elementPlusDom";
import BaseIcon from "./BaseIcon.vue";

defineOptions({
  inheritAttrs: false,
});

type Awaitable<T> = T | Promise<T>;
type TabKey = string | number;
type TabElementType = "" | "card" | "border-card";
type TabPosition = "top" | "right" | "bottom" | "left";
type TabEditAction = "add" | "remove";

interface TabItem {
  key: TabKey;
  title: string;
  icon?: any;
  badge?: string | number;
  badgeColor?: string;
  disabled?: boolean;
  closable?: boolean;
  lazy?: boolean;
  ariaLabel?: string;
}

type TabVariant = "pills" | "underline";
type TabSize = "sm" | "md" | "lg";
type TabSurface = "default" | "muted" | "plain";
type TabAlign = "start" | "center" | "end" | "between";

interface ElementPaneLike {
  paneName?: { value?: TabKey } | TabKey;
  props?: {
    name?: TabKey;
    disabled?: boolean;
  };
}

interface Props {
  modelValue: TabKey;
  tabs: TabItem[];
  variant?: TabVariant;
  size?: TabSize;
  surface?: TabSurface;
  align?: TabAlign;
  type?: TabElementType;
  tabPosition?: TabPosition;
  closable?: boolean;
  addable?: boolean;
  editable?: boolean;
  lazy?: boolean;
  tabindex?: string | number;
  beforeLeave?: (newKey: TabKey, oldKey: TabKey) => Awaitable<void | boolean>;
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
  type: "",
  tabPosition: "top",
  closable: false,
  addable: false,
  editable: false,
  lazy: true,
  tabindex: 0,
  ariaLabel: "",
  fullWidth: false,
  equal: false,
  wrap: false,
  disabled: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", key: TabKey): void;
  (e: "select", tab: TabItem): void;
  (e: "tab-click", payload: { key?: TabKey; tab?: TabItem; pane: ElementPaneLike; event?: Event }): void;
  (e: "tab-change", payload: { key: TabKey; tab: TabItem }): void;
  (e: "remove", key: TabKey): void;
  (e: "add"): void;
  (e: "edit", payload: { key?: TabKey; action: TabEditAction }): void;
}>();

defineSlots<{
  tab?: (props: { tab: TabItem; active: boolean; disabled: boolean; index: number }) => any;
  badge?: (props: { tab: TabItem; active: boolean; disabled: boolean }) => any;
}>();

const attrs = useAttrs();
const tabsRef = ref<TabsInstance | null>(null);
const rootClass = computed(() => attrs.class);
const rootStyle = computed(() => attrs.style as StyleValue | undefined);
const tabPassthroughAttrs = computed(() => omit(attrs, ["class", "style", "aria-label", "aria-disabled"]));

const rootClasses = computed(() => [
  rootClass.value,
  `base-tab--${props.variant}`,
  `base-tab--${props.size}`,
  `base-tab--position-${props.tabPosition}`,
  `base-tab--surface-${props.surface}`,
  `base-tab--align-${props.align}`,
  {
    "base-tab--full": props.fullWidth || props.variant === "underline",
    "base-tab--equal": props.equal,
    "base-tab--wrap": props.wrap,
    "is-disabled": props.disabled,
  },
]);

const resolvePaneKey = (pane: ElementPaneLike) => {
  const paneName = pane.paneName;
  if (paneName && typeof paneName === "object") {
    return paneName.value ?? pane.props?.name;
  }

  return paneName ?? pane.props?.name;
};

const isTabDisabled = (tab: TabItem) => Boolean(props.disabled || tab.disabled);

const isTabActive = (tab: TabItem) => tab.key === props.modelValue;

const findTabByKey = (key: string | number) => props.tabs.find((tab) => tab.key === key);

const handleValueUpdate = (key: string | number) => {
  if (props.disabled) return;
  emit("update:modelValue", key);
};

const handleTabChange = (key: string | number) => {
  const tab = findTabByKey(key);
  if (!tab || isTabDisabled(tab)) return;
  emit("tab-change", { key, tab });
  emit("select", tab);
};

const handleTabClick = (pane: ElementPaneLike, event?: Event) => {
  const key = resolvePaneKey(pane);
  const tab = key === undefined ? undefined : findTabByKey(key);
  emit("tab-click", { key, tab, pane, event });
  if (key === undefined) return;

  if (!tab || isTabDisabled(tab) || key !== props.modelValue) return;
  emit("select", tab);
};

const handleBeforeLeave = (newKey: TabKey, oldKey: TabKey) => {
  if (props.disabled) return false;
  return props.beforeLeave?.(newKey, oldKey) ?? true;
};

const handleTabRemove = (key: TabKey) => {
  if (props.disabled) return;
  emit("remove", key);
};

const handleTabAdd = () => {
  if (props.disabled) return;
  emit("add");
};

const handleTabEdit = (key: TabKey | undefined, action: TabEditAction) => {
  if (props.disabled) return;
  emit("edit", { key, action });
};

const getElement = () => getElementPlusControlRoot(tabsRef.value);

const focusActiveTab = () => {
  const target = getElement()?.querySelector<HTMLElement>(".el-tabs__item.is-active");
  target?.focus();
  return target ?? null;
};

defineExpose({
  getNativeTabs: () => tabsRef.value,
  getCurrentName: () => tabsRef.value?.currentName,
  getTabNav: () => tabsRef.value?.tabNavRef,
  getElement,
  focusActiveTab,
});
</script>

<template>
  <el-tabs
    ref="tabsRef"
    v-bind="tabPassthroughAttrs"
    :model-value="modelValue"
    :type="type"
    :tab-position="tabPosition"
    :stretch="equal"
    :closable="closable"
    :addable="addable"
    :editable="editable"
    :before-leave="handleBeforeLeave"
    :tabindex="disabled ? -1 : tabindex"
    class="base-tab"
    :class="rootClasses"
    :style="rootStyle"
    :aria-label="ariaLabel || '标签页'"
    :aria-disabled="disabled ? 'true' : undefined"
    @update:model-value="handleValueUpdate"
    @tab-change="handleTabChange"
    @tab-click="handleTabClick"
    @tab-remove="handleTabRemove"
    @tab-add="handleTabAdd"
    @edit="handleTabEdit"
  >
    <el-tab-pane
      v-for="(tab, index) in tabs"
      :key="tab.key"
      :name="tab.key"
      :disabled="isTabDisabled(tab)"
      :closable="tab.closable ?? closable"
      :lazy="tab.lazy ?? lazy"
    >
      <template #label>
        <span class="base-tab__button-content" :aria-label="tab.ariaLabel || undefined">
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
        </span>
      </template>
    </el-tab-pane>
  </el-tabs>
</template>

<style scoped>
.base-tab {
  @apply min-w-0 max-w-full select-none;
  --base-tab-gap: 0.25rem;
}

.base-tab :deep(.el-tabs__content) {
  display: none;
}

.base-tab :deep(.el-tabs__header) {
  @apply m-0 min-w-0 max-w-full;
}

.base-tab :deep(.el-tabs__nav-wrap) {
  @apply min-w-0 max-w-full;
}

.base-tab :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.base-tab :deep(.el-tabs__nav-scroll) {
  @apply min-w-0 max-w-full;
}

.base-tab :deep(.el-tabs__nav) {
  @apply min-w-0 items-center;
  gap: var(--base-tab-gap);
  width: max-content;
}

.base-tab :deep(.el-tabs__active-bar) {
  display: none;
}

.base-tab :deep(.el-tabs__item) {
  @apply relative inline-flex min-w-0 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap border-0 font-bold text-slate-500 transition-all duration-200 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200;
  padding: 0;
}

.base-tab :deep(.el-tabs__item:focus-visible) {
  @apply outline-none ring-2 ring-primary ring-opacity-20;
  box-shadow: none;
}

.base-tab :deep(.el-tabs__item.is-disabled) {
  @apply cursor-not-allowed opacity-45;
}

.base-tab :deep(.el-tabs__nav-prev),
.base-tab :deep(.el-tabs__nav-next) {
  @apply top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-white/90 text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-primary dark:bg-slate-900/90 dark:text-slate-400 dark:ring-slate-700;
  line-height: 1;
}

.base-tab :deep(.el-tabs__nav-prev.is-disabled),
.base-tab :deep(.el-tabs__nav-next.is-disabled) {
  @apply opacity-35;
}

.base-tab :deep(.el-tabs__nav-wrap.is-scrollable) {
  @apply px-8;
}

.base-tab--pills {
  @apply w-fit rounded-2xl border p-1;
}

.base-tab--underline {
  @apply w-full border-b;
  --base-tab-gap: 1.25rem;
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

.base-tab--full :deep(.el-tabs__header),
.base-tab--full :deep(.el-tabs__nav-wrap),
.base-tab--full :deep(.el-tabs__nav-scroll) {
  @apply w-full;
}

.base-tab--full :deep(.el-tabs__nav) {
  min-width: 100%;
}

.base-tab--equal :deep(.el-tabs__nav) {
  width: 100%;
  max-width: 100%;
}

.base-tab--align-start :deep(.el-tabs__nav) {
  @apply justify-start;
}

.base-tab--align-center :deep(.el-tabs__nav) {
  @apply justify-center;
}

.base-tab--align-end :deep(.el-tabs__nav) {
  @apply justify-end;
}

.base-tab--align-between :deep(.el-tabs__nav) {
  @apply justify-between;
}

.base-tab--position-left,
.base-tab--position-right {
  @apply w-fit;
}

.base-tab--position-left :deep(.el-tabs__header),
.base-tab--position-right :deep(.el-tabs__header) {
  @apply m-0;
}

.base-tab--position-left :deep(.el-tabs__nav),
.base-tab--position-right :deep(.el-tabs__nav) {
  @apply flex-col items-stretch;
  width: 100%;
}

.base-tab--position-left.base-tab--underline,
.base-tab--position-right.base-tab--underline {
  @apply border-b-0;
  --base-tab-gap: 0.5rem;
}

.base-tab--position-left.base-tab--underline :deep(.el-tabs__item),
.base-tab--position-right.base-tab--underline :deep(.el-tabs__item) {
  @apply mb-0 border-b-0 py-2.5;
}

.base-tab--position-left.base-tab--underline :deep(.el-tabs__item.is-active) {
  @apply border-l-2 border-primary pl-3;
}

.base-tab--position-right.base-tab--underline :deep(.el-tabs__item.is-active) {
  @apply border-r-2 border-primary pr-3;
}

.base-tab--wrap :deep(.el-tabs__nav-wrap),
.base-tab--wrap :deep(.el-tabs__nav-scroll) {
  overflow: visible;
}

.base-tab--wrap :deep(.el-tabs__nav) {
  @apply flex-wrap;
  white-space: normal;
}

.base-tab--equal :deep(.el-tabs__item) {
  @apply min-w-0 flex-1 basis-0;
}

.base-tab.is-disabled {
  @apply opacity-70;
}

.base-tab--sm :deep(.el-tabs__item) {
  @apply text-[11px];
}

.base-tab--md :deep(.el-tabs__item) {
  @apply text-xs;
}

.base-tab--lg :deep(.el-tabs__item) {
  @apply text-sm;
}

.base-tab--pills.base-tab--sm :deep(.el-tabs__item) {
  @apply rounded-xl px-2.5 py-1.5;
}

.base-tab--pills.base-tab--md :deep(.el-tabs__item) {
  @apply rounded-xl px-4 py-2;
}

.base-tab--pills.base-tab--lg :deep(.el-tabs__item) {
  @apply rounded-2xl px-5 py-2.5;
}

.base-tab--pills :deep(.el-tabs__item.is-active) {
  @apply border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100;
}

.base-tab--pills :deep(.el-tabs__item:not(.is-active):not(.is-disabled)) {
  @apply hover:bg-white hover:shadow-sm dark:hover:bg-slate-800;
}

.base-tab--underline :deep(.el-tabs__item) {
  @apply -mb-px border-b-2 border-transparent px-1 py-3;
}

.base-tab--underline.base-tab--sm :deep(.el-tabs__item) {
  @apply py-2 text-[11px];
}

.base-tab--underline.base-tab--lg :deep(.el-tabs__item) {
  @apply py-3.5 text-sm;
}

.base-tab--underline :deep(.el-tabs__item.is-active) {
  @apply border-primary text-primary;
}

.base-tab__button-content {
  @apply flex min-w-0 items-center justify-center gap-2;
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

.base-tab :deep(.el-tabs__new-tab) {
  @apply ml-2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400;
}

.base-tab--position-left :deep(.el-tabs__new-tab),
.base-tab--position-right :deep(.el-tabs__new-tab) {
  @apply ml-0 mt-2;
}

@media (prefers-reduced-motion: reduce) {
  .base-tab :deep(.el-tabs__nav),
  .base-tab :deep(.el-tabs__item),
  .base-tab :deep(.el-tabs__nav-prev),
  .base-tab :deep(.el-tabs__nav-next) {
    transition: none !important;
  }
}
</style>
