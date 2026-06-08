<script setup lang="ts">
import { computed } from "vue";
import { ArrowLeft, ChevronRight, MoreHorizontal } from "lucide-vue-next";
import { useI18n } from "../../composables/useI18n";
import { collapseMiddleItems, findLastItem } from "../../utils";

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
});

const { t } = useI18n();

const emit = defineEmits<{
  (e: "select", item: BreadcrumbItem): void;
  (e: "back"): void;
}>();

defineSlots<{
  item?: (props: { item: BreadcrumbItem; index: number; current: boolean }) => any;
}>();

type RenderedCrumb =
  | { type: "item"; item: BreadcrumbItem; index: number; isLast: boolean }
  | { type: "ellipsis"; key: string; hiddenCount: number };

const renderedItems = computed<RenderedCrumb[]>(() => collapseMiddleItems(props.items, props.maxItems));

const lastSelectableItem = computed(() => {
  return findLastItem(props.items.slice(0, -1), (item) => !item.disabled);
});

const separatorLabel = computed(() => (props.separator === "slash" ? "/" : ""));

const handleSelect = (item: BreadcrumbItem, isLast: boolean) => {
  if (item.disabled || (isLast && !props.currentClickable)) return;
  emit("select", item);
};

const handleBack = () => {
  if (props.backDisabled) return;

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
      },
    ]"
    :aria-label="ariaLabel || t('common.breadcrumb')"
  >
    <button
      v-if="showBack"
      type="button"
      class="base-breadcrumb__back"
      :disabled="backDisabled"
      :aria-label="backLabel"
      :title="backLabel"
      @click="handleBack"
    >
      <ArrowLeft class="base-breadcrumb__back-icon" aria-hidden="true" />
    </button>
    <ol class="base-breadcrumb__list">
      <li v-for="(crumb, visibleIndex) in renderedItems" :key="crumb.type === 'item' ? crumb.item.key : crumb.key" class="base-breadcrumb__item">
        <span
          v-if="crumb.type === 'ellipsis'"
          class="base-breadcrumb__ellipsis"
          :aria-label="`已折叠 ${crumb.hiddenCount} 级路径`"
          :title="`已折叠 ${crumb.hiddenCount} 级路径`"
        >
          <MoreHorizontal class="base-breadcrumb__ellipsis-icon" aria-hidden="true" />
        </span>
        <button
          v-else-if="!crumb.item.href"
          type="button"
          class="base-breadcrumb__button"
          :class="{ 'is-current': crumb.isLast, 'is-disabled': crumb.item.disabled }"
          :disabled="crumb.item.disabled || (crumb.isLast && !currentClickable)"
          :aria-current="crumb.isLast ? 'page' : undefined"
          @click="handleSelect(crumb.item, crumb.isLast)"
        >
          <slot name="item" :item="crumb.item" :index="crumb.index" :current="crumb.isLast">
            <BaseIcon v-if="crumb.item.icon" :name="crumb.item.icon" size="14" aria-hidden="true" />
            <span>{{ crumb.item.label }}</span>
            <BaseBadge v-if="crumb.item.badge" :type="crumb.item.badgeType || 'neutral'" size="xs">{{ crumb.item.badge }}</BaseBadge>
          </slot>
        </button>
        <a
          v-else
          class="base-breadcrumb__button"
          :class="{ 'is-current': crumb.isLast, 'is-disabled': crumb.item.disabled }"
          :href="crumb.item.disabled || (crumb.isLast && !currentClickable) ? undefined : crumb.item.href"
          :aria-current="crumb.isLast ? 'page' : undefined"
          :aria-disabled="crumb.item.disabled || (crumb.isLast && !currentClickable) ? 'true' : undefined"
          @click="handleSelect(crumb.item, crumb.isLast)"
        >
          <slot name="item" :item="crumb.item" :index="crumb.index" :current="crumb.isLast">
            <BaseIcon v-if="crumb.item.icon" :name="crumb.item.icon" size="14" aria-hidden="true" />
            <span>{{ crumb.item.label }}</span>
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
  @apply overflow-hidden;
}

.base-breadcrumb__item {
  @apply flex min-w-0 items-center gap-1;
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

.base-breadcrumb__button span {
  @apply truncate;
}

.base-breadcrumb__ellipsis {
  @apply inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500;
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
  .base-breadcrumb__back {
    transition: none !important;
  }
}
</style>
