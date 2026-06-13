<script setup lang="ts">
import type { BreadcrumbInstance } from "element-plus";
import type { StyleValue } from "vue";
import { computed, nextTick, ref, useAttrs, watch, watchEffect } from "vue";
import { ArrowLeft, ChevronRight, MoreHorizontal } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { collapseMiddleItems, dropRight, findLastItem, isLastIndex, joinBy, omit, preventAndStopDomEvent } from "../../utils";
import { getElementPlusControlRoot } from "./elementPlusDom";

defineOptions({
  inheritAttrs: false,
});

type BreadcrumbSize = "sm" | "md" | "lg";
type BreadcrumbSurface = "plain" | "muted" | "card";
type BreadcrumbSeparator = "chevron" | "slash";
type BreadcrumbEllipsisMode = "expand" | "dropdown";
type BadgeType = "primary" | "success" | "warning" | "danger" | "neutral";

export interface BreadcrumbItem {
  key: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  href?: string;
  badge?: string;
  badgeType?: BadgeType;
}

interface Props {
  items: BreadcrumbItem[];
  ariaLabel?: string;
  size?: BreadcrumbSize;
  surface?: BreadcrumbSurface;
  separator?: BreadcrumbSeparator;
  maxItems?: number;
  showBack?: boolean;
  backLabel?: string;
  backDisabled?: boolean;
  currentClickable?: boolean;
  wrap?: boolean;
  disabled?: boolean;
  expandableEllipsis?: boolean;
  ellipsisMode?: BreadcrumbEllipsisMode;
}

const props = withDefaults(defineProps<Props>(), {
  ariaLabel: "",
  size: "md",
  surface: "plain",
  separator: "chevron",
  maxItems: 0,
  showBack: false,
  backLabel: "返回上级",
  backDisabled: false,
  currentClickable: false,
  wrap: true,
  disabled: false,
  expandableEllipsis: true,
  ellipsisMode: "expand",
});

const { t } = useI18n();
const attrs = useAttrs();
const breadcrumbRef = ref<BreadcrumbInstance | null>(null);

const emit = defineEmits<{
  (e: "select", item: BreadcrumbItem): void;
  (e: "back"): void;
  (e: "expand", hiddenCount: number): void;
}>();

defineSlots<{
  item?: (props: { item: BreadcrumbItem; index: number; current: boolean }) => any;
}>();

type RenderedCrumb =
  | { type: "item"; item: BreadcrumbItem; index: number; isLast: boolean }
  | { type: "ellipsis"; key: string; hiddenCount: number };

const expanded = ref(false);

const fullItems = computed<RenderedCrumb[]>(() =>
  props.items.map((item, index) => ({
    type: "item",
    item,
    index,
    isLast: isLastIndex(props.items, index),
  })),
);

const collapsedItems = computed<RenderedCrumb[]>(() => collapseMiddleItems(props.items, props.maxItems));

const renderedItems = computed<RenderedCrumb[]>(() => (expanded.value ? fullItems.value : collapsedItems.value));

const lastSelectableItem = computed(() => {
  return findLastItem(dropRight(props.items, 1), (item) => !item.disabled);
});
const hiddenItems = computed(() => {
  if (props.maxItems < 3 || props.items.length <= props.maxItems) return [];
  const tailCount = props.maxItems - 2;
  const tailStart = props.items.length - tailCount;
  return props.items.slice(1, tailStart).map((item, offset) => ({ item, index: offset + 1 }));
});

const separatorText = computed(() => (props.separator === "slash" ? "/" : ""));
const separatorIcon = computed(() => (props.separator === "chevron" ? ChevronRight : undefined));
const resolvedAriaLabel = computed(() => props.ariaLabel || t("common.breadcrumb"));
const resolvedEllipsisMode = computed(() => (props.expandableEllipsis ? props.ellipsisMode : "expand"));
const breadcrumbPopperClass = computed(() => `base-breadcrumb-popper base-breadcrumb-popper--${props.size}`);
const rootClass = computed(() => attrs.class);
const rootStyle = computed(() => attrs.style as StyleValue | undefined);
const breadcrumbPassthroughAttrs = computed(() => omit(attrs, ["class", "style", "aria-label", "aria-disabled"]));

const itemsFingerprint = computed(() => joinBy(props.items, (item) => item.key, "|"));

watch([itemsFingerprint, () => props.maxItems], () => {
  expanded.value = false;
});

const isItemUnavailable = (item: BreadcrumbItem, isLast: boolean) => {
  return props.disabled || item.disabled || (isLast && !props.currentClickable);
};

const getEllipsisLabel = (hiddenCount: number) => {
  return props.expandableEllipsis ? `展开 ${hiddenCount} 级路径` : `已折叠 ${hiddenCount} 级路径`;
};

const handleSelect = (item: BreadcrumbItem, isLast: boolean) => {
  if (isItemUnavailable(item, isLast)) return;
  emit("select", item);
};

const handleLinkSelect = (event: MouseEvent, item: BreadcrumbItem, isLast: boolean) => {
  if (isItemUnavailable(item, isLast)) {
    preventAndStopDomEvent(event);
    return;
  }

  emit("select", item);
};

const handleEllipsisClick = (hiddenCount: number) => {
  if (props.disabled || !props.expandableEllipsis) return;

  expanded.value = true;
  emit("expand", hiddenCount);
};

const handleHiddenItemSelect = (command: unknown) => {
  const payload = command as { item?: BreadcrumbItem };
  const item = payload.item;
  if (!item || props.disabled || item.disabled) return;
  emit("select", item);
};

const handleDropdownVisibleChange = (visible: boolean, hiddenCount: number) => {
  if (visible) emit("expand", hiddenCount);
};

const handleBack = () => {
  if (props.disabled || props.backDisabled) return;

  if (lastSelectableItem.value) {
    emit("select", lastSelectableItem.value);
  }

  emit("back");
};

const syncBreadcrumbAttributes = async () => {
  await nextTick();
  const breadcrumbElement = getElementPlusControlRoot(breadcrumbRef.value);
  if (!breadcrumbElement) return;

  breadcrumbElement.setAttribute("aria-label", resolvedAriaLabel.value);
  if (props.disabled) {
    breadcrumbElement.setAttribute("aria-disabled", "true");
  } else {
    breadcrumbElement.removeAttribute("aria-disabled");
  }

  breadcrumbElement.querySelectorAll<HTMLElement>(".el-breadcrumb__inner").forEach((inner) => {
    inner.removeAttribute("role");
  });
};

watchEffect(() => {
  void resolvedAriaLabel.value;
  void props.disabled;
  void expanded.value;
  void itemsFingerprint.value;
  void renderedItems.value.length;
  void syncBreadcrumbAttributes();
});

const getElement = () => getElementPlusControlRoot(breadcrumbRef.value);

const focusFirstItem = () => {
  const target = getElement()?.querySelector<HTMLElement>(
    ".base-breadcrumb__back:not(:disabled), .base-breadcrumb__button:not(:disabled):not(.is-disabled), .base-breadcrumb__ellipsis:not(.base-breadcrumb__ellipsis--static)"
  );
  target?.focus();
  return target ?? null;
};

const focusCurrentItem = () => {
  const target = getElement()?.querySelector<HTMLElement>("[aria-current='page']");
  target?.focus();
  return target ?? null;
};

defineExpose({
  getNativeBreadcrumb: () => breadcrumbRef.value,
  getElement,
  focusFirstItem,
  focusCurrentItem,
});
</script>

<template>
  <el-breadcrumb
    ref="breadcrumbRef"
    v-bind="breadcrumbPassthroughAttrs"
    class="base-breadcrumb"
    :class="[
      rootClass,
      `base-breadcrumb--${size}`,
      `base-breadcrumb--${surface}`,
      `base-breadcrumb--separator-${separator}`,
      {
        'base-breadcrumb--nowrap': !wrap,
        'is-disabled': disabled,
        'is-expanded': expanded,
      },
    ]"
    :style="rootStyle"
    :separator="separatorText"
    :separator-icon="separatorIcon"
  >
    <button
      v-if="showBack"
      type="button"
      class="base-breadcrumb__back"
      :disabled="disabled || backDisabled"
      :aria-label="backLabel"
      :title="backLabel"
      @click="handleBack"
    >
      <ArrowLeft class="base-breadcrumb__back-icon" aria-hidden="true" />
    </button>
    <el-breadcrumb-item
      v-for="crumb in renderedItems"
      :key="crumb.type === 'item' ? `${crumb.item.key}-${crumb.index}` : crumb.key"
    >
      <el-dropdown
        v-if="crumb.type === 'ellipsis' && resolvedEllipsisMode === 'dropdown' && !disabled"
        trigger="click"
        placement="bottom-start"
        :disabled="!hiddenItems.length"
        :hide-on-click="true"
        :show-arrow="false"
        :teleported="true"
        :popper-class="breadcrumbPopperClass"
        @command="handleHiddenItemSelect"
        @visible-change="handleDropdownVisibleChange($event, crumb.hiddenCount)"
      >
        <button
          type="button"
          class="base-breadcrumb__ellipsis"
          :aria-label="getEllipsisLabel(crumb.hiddenCount)"
          :title="getEllipsisLabel(crumb.hiddenCount)"
        >
          <MoreHorizontal class="base-breadcrumb__ellipsis-icon" aria-hidden="true" />
        </button>
        <template #dropdown>
          <el-dropdown-menu class="base-breadcrumb__hidden-menu" :aria-label="getEllipsisLabel(crumb.hiddenCount)">
            <el-dropdown-item
              v-for="{ item, index } in hiddenItems"
              :key="`${item.key}-${index}`"
              class="base-breadcrumb__hidden-item"
              :command="{ item, index }"
              :disabled="item.disabled"
              :text-value="item.label"
            >
              <BaseIcon v-if="item.icon" :name="item.icon" size="14" aria-hidden="true" />
              <span class="base-breadcrumb__hidden-label">{{ item.label }}</span>
              <BaseBadge v-if="item.badge" :type="item.badgeType || 'neutral'" size="xs">{{ item.badge }}</BaseBadge>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <button
        v-else-if="crumb.type === 'ellipsis' && expandableEllipsis && !disabled"
        type="button"
        class="base-breadcrumb__ellipsis"
        :aria-label="getEllipsisLabel(crumb.hiddenCount)"
        :title="getEllipsisLabel(crumb.hiddenCount)"
        :aria-expanded="expanded"
        @click="handleEllipsisClick(crumb.hiddenCount)"
      >
        <MoreHorizontal class="base-breadcrumb__ellipsis-icon" aria-hidden="true" />
      </button>
      <span
        v-else-if="crumb.type === 'ellipsis'"
        class="base-breadcrumb__ellipsis base-breadcrumb__ellipsis--static"
        :aria-label="getEllipsisLabel(crumb.hiddenCount)"
        :title="getEllipsisLabel(crumb.hiddenCount)"
      >
        <MoreHorizontal class="base-breadcrumb__ellipsis-icon" aria-hidden="true" />
      </span>
      <button
        v-else-if="!crumb.item.href"
        type="button"
        class="base-breadcrumb__button"
        :class="{ 'is-current': crumb.isLast, 'is-disabled': isItemUnavailable(crumb.item, crumb.isLast) }"
        :disabled="isItemUnavailable(crumb.item, crumb.isLast)"
        :aria-current="crumb.isLast ? 'page' : undefined"
        @click="handleSelect(crumb.item, crumb.isLast)"
      >
        <slot name="item" :item="crumb.item" :index="crumb.index" :current="crumb.isLast">
          <BaseIcon v-if="crumb.item.icon" :name="crumb.item.icon" size="14" aria-hidden="true" />
          <span class="base-breadcrumb__label">{{ crumb.item.label }}</span>
          <BaseBadge v-if="crumb.item.badge" :type="crumb.item.badgeType || 'neutral'" size="xs">{{ crumb.item.badge }}</BaseBadge>
        </slot>
      </button>
      <a
        v-else
        class="base-breadcrumb__button"
        :class="{ 'is-current': crumb.isLast, 'is-disabled': isItemUnavailable(crumb.item, crumb.isLast) }"
        :href="isItemUnavailable(crumb.item, crumb.isLast) ? undefined : crumb.item.href"
        :aria-current="crumb.isLast ? 'page' : undefined"
        :aria-disabled="isItemUnavailable(crumb.item, crumb.isLast) ? 'true' : undefined"
        @click="handleLinkSelect($event, crumb.item, crumb.isLast)"
      >
        <slot name="item" :item="crumb.item" :index="crumb.index" :current="crumb.isLast">
          <BaseIcon v-if="crumb.item.icon" :name="crumb.item.icon" size="14" aria-hidden="true" />
          <span class="base-breadcrumb__label">{{ crumb.item.label }}</span>
          <BaseBadge v-if="crumb.item.badge" :type="crumb.item.badgeType || 'neutral'" size="xs">{{ crumb.item.badge }}</BaseBadge>
        </slot>
      </a>
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<style scoped>
.base-breadcrumb {
  @apply flex min-w-0 max-w-full items-center gap-1;
}

.base-breadcrumb.is-disabled {
  @apply opacity-75;
}

.base-breadcrumb--card {
  @apply rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.base-breadcrumb--muted {
  @apply rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950;
}

.base-breadcrumb:not(.base-breadcrumb--nowrap) {
  @apply flex-wrap;
}

.base-breadcrumb--nowrap {
  @apply flex-nowrap overflow-x-auto overflow-y-hidden;
  scrollbar-color: #cbd5e1 transparent;
  scrollbar-width: thin;
}

.base-breadcrumb--nowrap::-webkit-scrollbar {
  height: 4px;
}

.base-breadcrumb--nowrap::-webkit-scrollbar-track {
  background: transparent;
}

.base-breadcrumb--nowrap::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

.base-breadcrumb :deep(.el-breadcrumb__item) {
  @apply inline-flex min-w-0 items-center gap-1;
}

.base-breadcrumb--nowrap :deep(.el-breadcrumb__item) {
  @apply shrink-0;
}

.base-breadcrumb :deep(.el-breadcrumb__inner) {
  @apply inline-flex min-w-0 items-center text-inherit;
}

.base-breadcrumb :deep(.el-breadcrumb__inner.is-link) {
  @apply text-inherit;
  font-weight: inherit;
}

.base-breadcrumb :deep(.el-breadcrumb__inner:hover),
.base-breadcrumb :deep(.el-breadcrumb__inner.is-link:hover) {
  @apply text-inherit;
}

.base-breadcrumb__back {
  @apply inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

.base-breadcrumb__back-icon {
  @apply h-3.5 w-3.5;
}

.base-breadcrumb__button {
  @apply inline-flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-black text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-default disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100;
}

.base-breadcrumb__button:focus-visible,
.base-breadcrumb__back:focus-visible {
  @apply outline-none ring-2 ring-primary ring-opacity-20;
}

.base-breadcrumb__button.is-current {
  @apply text-slate-800 dark:text-slate-100;
}

.base-breadcrumb__button.is-disabled {
  @apply pointer-events-none opacity-60;
}

.base-breadcrumb__button[aria-disabled="true"] {
  @apply pointer-events-none opacity-60;
}

.base-breadcrumb__label {
  @apply truncate;
}

.base-breadcrumb__ellipsis {
  @apply inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200;
}

.base-breadcrumb__ellipsis:focus-visible {
  @apply outline-none ring-2 ring-primary ring-opacity-20;
}

.base-breadcrumb__ellipsis--static {
  @apply hover:border-transparent hover:bg-transparent hover:text-slate-400 dark:hover:border-transparent dark:hover:bg-transparent dark:hover:text-slate-500;
}

.base-breadcrumb__ellipsis-icon {
  @apply h-3.5 w-3.5;
}

:global(.base-breadcrumb-popper.el-popper) {
  --el-dropdown-menuItem-hover-fill: #f1f5f9;
  --el-dropdown-menuItem-hover-color: #0f172a;
  --el-color-primary: rgb(var(--color-primary));
}

:global(.base-breadcrumb-popper .el-popper__arrow) {
  display: none;
}

:global(.base-breadcrumb-popper .el-dropdown-menu) {
  min-width: 164px;
  max-width: min(280px, calc(100vw - 24px));
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  padding: 6px;
  box-shadow:
    0 18px 42px rgba(15, 23, 42, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

:global(.base-breadcrumb-popper .base-breadcrumb__hidden-item.el-dropdown-menu__item) {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  padding: 8px 10px;
  color: #475569;
  font-size: 11px;
  font-weight: 900;
  line-height: 1.2;
}

:global(.base-breadcrumb-popper .base-breadcrumb__hidden-item.el-dropdown-menu__item:not(.is-disabled):hover),
:global(.base-breadcrumb-popper .base-breadcrumb__hidden-item.el-dropdown-menu__item:not(.is-disabled):focus) {
  background: #f1f5f9;
  color: #0f172a;
}

:global(.base-breadcrumb-popper .base-breadcrumb__hidden-label) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.base-breadcrumb-popper .base-breadcrumb__hidden-item svg) {
  flex-shrink: 0;
  color: #94a3b8;
}

:global(.dark .base-breadcrumb-popper.el-popper) {
  --el-dropdown-menuItem-hover-fill: #1e293b;
  --el-dropdown-menuItem-hover-color: #f8fafc;
}

:global(.dark .base-breadcrumb-popper .el-dropdown-menu) {
  border-color: #1e293b;
  background: #0f172a;
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(148, 163, 184, 0.08);
}

:global(.dark .base-breadcrumb-popper .base-breadcrumb__hidden-item.el-dropdown-menu__item) {
  color: #cbd5e1;
}

:global(.dark .base-breadcrumb-popper .base-breadcrumb__hidden-item.el-dropdown-menu__item:not(.is-disabled):hover),
:global(.dark .base-breadcrumb-popper .base-breadcrumb__hidden-item.el-dropdown-menu__item:not(.is-disabled):focus) {
  background: #1e293b;
  color: #f8fafc;
}

:global(.dark .base-breadcrumb-popper .base-breadcrumb__hidden-item svg) {
  color: #64748b;
}

.base-breadcrumb :deep(.el-breadcrumb__separator) {
  @apply inline-flex h-4 min-w-4 shrink-0 items-center justify-center text-[11px] font-black text-slate-300 dark:text-slate-600;
  margin: 0;
}

.base-breadcrumb :deep(.el-breadcrumb__item:last-child .el-breadcrumb__separator) {
  display: none;
}

.base-breadcrumb :deep(.el-breadcrumb__separator svg) {
  @apply h-3.5 w-3.5;
}

.base-breadcrumb--sm .base-breadcrumb__button {
  @apply px-1.5 py-0.5 text-[10px];
}

.base-breadcrumb--sm .base-breadcrumb__back,
.base-breadcrumb--sm .base-breadcrumb__ellipsis {
  @apply h-6 w-6 rounded-lg;
}

.base-breadcrumb--lg .base-breadcrumb__button {
  @apply px-2.5 py-1.5 text-xs;
}

.base-breadcrumb--lg .base-breadcrumb__back,
.base-breadcrumb--lg .base-breadcrumb__ellipsis {
  @apply h-8 w-8;
}

.base-breadcrumb--separator-slash .base-breadcrumb__item {
  @apply gap-1.5;
}

@media (prefers-reduced-motion: reduce) {
  .base-breadcrumb__button,
  .base-breadcrumb__back,
  .base-breadcrumb__ellipsis {
    transition: none !important;
  }
}
</style>
