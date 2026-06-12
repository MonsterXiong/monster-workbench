<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { hasItem } from "../../utils";

type Awaitable<T> = T | Promise<T>;
type AccordionSize = "sm" | "md" | "lg";
type AccordionSurface = "card" | "muted" | "plain";
type BadgeType = "primary" | "success" | "warning" | "danger" | "neutral";
type CollapseIconPosition = "left" | "right";
type CollapseName = string | number;
type CollapseModelValue = CollapseName | CollapseName[];

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
  expandIconPosition?: CollapseIconPosition;
  beforeCollapse?: (key: string, item: AccordionItem) => Awaitable<void | boolean>;
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
  expandIconPosition: "right",
  ariaLabel: "",
  disabled: false,
  showChevron: true,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string[]): void;
  (e: "change", value: string[]): void;
  (e: "toggle", payload: { key: string; expanded: boolean }): void;
}>();

defineSlots<{
  default?: (props: { item: AccordionItem; expanded: boolean }) => any;
  actions?: (props: { item: AccordionItem; expanded: boolean }) => any;
  [name: string]: ((props: { item: AccordionItem; expanded: boolean }) => any) | undefined;
}>();

const internalValue = ref<string[]>([...props.defaultValue]);
const pendingToggleKey = ref("");

const activeKeys = computed(() => props.modelValue ?? internalValue.value);
const isExpanded = (key: string) => hasItem(activeKeys.value, key);
const isItemDisabled = (item: AccordionItem) => Boolean(props.disabled || item.disabled);

const normalizeCollapseValue = (value: CollapseModelValue): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => String(item)).filter(Boolean);
};

const getChangedKey = (previousValue: readonly string[], nextValue: readonly string[]) => {
  return nextValue.find((key) => !hasItem(previousValue, key)) || previousValue.find((key) => !hasItem(nextValue, key)) || "";
};

const isSameValue = (previousValue: readonly string[], nextValue: readonly string[]) => {
  return previousValue.length === nextValue.length && previousValue.every((key, index) => key === nextValue[index]);
};

const collapseValue = computed<CollapseModelValue>({
  get: () => (props.multiple ? activeKeys.value : activeKeys.value[0] || ""),
  set: (value) => {
    const nextValue = props.multiple ? normalizeCollapseValue(value) : normalizeCollapseValue(value).slice(0, 1);
    if (isSameValue(activeKeys.value, nextValue)) return;

    const changedKey = pendingToggleKey.value || getChangedKey(activeKeys.value, nextValue);
    pendingToggleKey.value = "";

    if (props.modelValue === undefined) {
      internalValue.value = nextValue;
    }

    emit("update:modelValue", nextValue);
    emit("change", nextValue);
    if (changedKey) {
      emit("toggle", { key: changedKey, expanded: hasItem(nextValue, changedKey) });
    }
  },
});

const handleBeforeCollapse = async (name: CollapseName) => {
  const key = String(name);
  const item = props.items.find((current) => current.key === key);
  pendingToggleKey.value = key;

  if (!item || isItemDisabled(item)) return false;
  if (!props.allowCollapse && isExpanded(key)) return false;
  if (props.beforeCollapse && (await props.beforeCollapse(key, item)) === false) return false;
  return true;
};

watch(
  () => props.defaultValue,
  (value) => {
    if (props.modelValue === undefined) {
      internalValue.value = [...value];
    }
  }
);
</script>

<template>
  <el-collapse
    v-model="collapseValue"
    class="base-accordion"
    :class="[
      `base-accordion--${size}`,
      `base-accordion--${surface}`,
      {
        'base-accordion--compact': compact,
        'base-accordion--bordered': bordered,
        'base-accordion--divided': divided,
        'base-accordion--keep-mounted': keepMounted,
        'base-accordion--hide-chevron': !showChevron,
        [`base-accordion--icon-${expandIconPosition}`]: true,
        'is-disabled': disabled,
      },
    ]"
    :accordion="!multiple"
    :before-collapse="handleBeforeCollapse"
    :expand-icon-position="expandIconPosition"
    :aria-label="ariaLabel || undefined"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <el-collapse-item
      v-for="item in items"
      :key="item.key"
      class="base-accordion__item"
      :class="{ 'is-disabled': isItemDisabled(item), 'is-expanded': isExpanded(item.key) }"
      :name="item.key"
      :disabled="isItemDisabled(item)"
    >
      <template #title>
        <div class="base-accordion__trigger">
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
          </div>
        </div>
      </template>

      <div
        v-if="keepMounted || isExpanded(item.key)"
        v-show="isExpanded(item.key)"
        class="base-accordion__content"
      >
        <slot :name="item.key" :item="item" :expanded="isExpanded(item.key)">
          <slot :item="item" :expanded="isExpanded(item.key)">
            <p v-if="item.description" class="base-accordion__fallback">{{ item.description }}</p>
          </slot>
        </slot>
      </div>
    </el-collapse-item>
  </el-collapse>
</template>

<style scoped>
.base-accordion {
  @apply overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-900;
  border: 0;
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

.base-accordion__item {
  @apply min-w-0;
}

.base-accordion :deep(.el-collapse-item__wrap),
.base-accordion :deep(.el-collapse-item__header) {
  border: 0;
}

.base-accordion--divided :deep(.el-collapse-item + .el-collapse-item) {
  @apply border-t border-slate-100 dark:border-slate-800;
}

.base-accordion :deep(.el-collapse-item__header) {
  @apply h-auto min-w-0 bg-transparent px-0 py-0 text-left leading-normal transition hover:bg-slate-50 dark:hover:bg-slate-950;
}

.base-accordion :deep(.el-collapse-item__header.is-active) {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-accordion--muted :deep(.el-collapse-item__header:hover),
.base-accordion--muted :deep(.el-collapse-item__header.is-active) {
  @apply bg-white dark:bg-slate-900;
}

.base-accordion--plain :deep(.el-collapse-item__header) {
  @apply rounded-xl;
}

.base-accordion--plain :deep(.el-collapse-item__header.is-active) {
  @apply bg-slate-50 dark:bg-slate-900;
}

.base-accordion :deep(.el-collapse-item__header:focus-visible) {
  @apply outline-none ring-2 ring-primary ring-opacity-20;
}

.base-accordion :deep(.el-collapse-item__arrow) {
  @apply mr-4 shrink-0 text-slate-400 transition-transform duration-150 dark:text-slate-500;
}

.base-accordion--icon-left :deep(.el-collapse-item__arrow) {
  @apply ml-4 mr-0;
}

.base-accordion :deep(.el-collapse-item__arrow.is-active) {
  @apply text-primary;
}

.base-accordion--hide-chevron :deep(.el-collapse-item__arrow) {
  @apply hidden;
}

.base-accordion :deep(.el-collapse-item__content) {
  @apply p-0;
}

.base-accordion :deep(.el-collapse-item.is-disabled .el-collapse-item__header) {
  @apply cursor-not-allowed opacity-55;
}

.base-accordion__trigger {
  @apply flex w-full min-w-0 items-center justify-between gap-3 px-4 py-3;
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
  .base-accordion :deep(.el-collapse-item__header),
  .base-accordion :deep(.el-collapse-item__arrow) {
    transition: none !important;
  }
}
</style>
