<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ArrowLeft, ChevronRight, MoreHorizontal } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { collapseMiddleItems, dropRight, findLastItem, joinBy, preventAndStopDomEvent } from "../../utils";

type BreadcrumbSize = "sm" | "md" | "lg";
type BreadcrumbSurface = "plain" | "muted" | "card";
type BreadcrumbSeparator = "chevron" | "slash";
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
});

const { t } = useI18n();

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
    isLast: index === props.items.length - 1,
  })),
);

const collapsedItems = computed<RenderedCrumb[]>(() => collapseMiddleItems(props.items, props.maxItems));

const renderedItems = computed<RenderedCrumb[]>(() => (expanded.value ? fullItems.value : collapsedItems.value));

const lastSelectableItem = computed(() => {
  return findLastItem(dropRight(props.items, 1), (item) => !item.disabled);
});

const separatorLabel = computed(() => (props.separator === "slash" ? "/" : ""));

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

const handleBack = () => {
  if (props.disabled || props.backDisabled) return;

  if (lastSelectableItem.value) {
    emit("select", lastSelectableItem.value);
  }

  emit("back");
};
</script>

<template>
  <nav
    class="base-breadcrumb"
    :class="[
      `base-breadcrumb--${size}`,
      `base-breadcrumb--${surface}`,
      `base-breadcrumb--separator-${separator}`,
      {
        'base-breadcrumb--nowrap': !wrap,
        'is-disabled': disabled,
        'is-expanded': expanded,
      },
    ]"
    :aria-label="ariaLabel || t('common.breadcrumb')"
    :aria-disabled="disabled ? 'true' : undefined"
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
    <ol class="base-breadcrumb__list">
      <li v-for="(crumb, visibleIndex) in renderedItems" :key="crumb.type === 'item' ? crumb.item.key : crumb.key" class="base-breadcrumb__item">
        <button
          v-if="crumb.type === 'ellipsis' && expandableEllipsis && !disabled"
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
        <span v-if="visibleIndex < renderedItems.length - 1" class="base-breadcrumb__separator" aria-hidden="true">
          <ChevronRight v-if="separator === 'chevron'" class="base-breadcrumb__separator-icon" aria-hidden="true" />
          <span v-else>{{ separatorLabel }}</span>
        </span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.base-breadcrumb {
  @apply flex min-w-0 max-w-full items-center gap-2;
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

.base-breadcrumb__list {
  @apply flex min-w-0 items-center gap-1;
}

.base-breadcrumb:not(.base-breadcrumb--nowrap) .base-breadcrumb__list {
  @apply flex-wrap;
}

.base-breadcrumb--nowrap .base-breadcrumb__list {
  @apply flex-nowrap overflow-x-auto overflow-y-hidden;
  scrollbar-color: #cbd5e1 transparent;
  scrollbar-width: thin;
}

.base-breadcrumb--nowrap .base-breadcrumb__list::-webkit-scrollbar {
  height: 4px;
}

.base-breadcrumb--nowrap .base-breadcrumb__list::-webkit-scrollbar-track {
  background: transparent;
}

.base-breadcrumb--nowrap .base-breadcrumb__list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

.base-breadcrumb__item {
  @apply flex min-w-0 items-center gap-1;
}

.base-breadcrumb--nowrap .base-breadcrumb__item {
  @apply shrink-0;
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

.base-breadcrumb__separator {
  @apply inline-flex h-4 min-w-4 shrink-0 items-center justify-center text-[11px] font-black text-slate-300 dark:text-slate-600;
}

.base-breadcrumb__separator-icon {
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
