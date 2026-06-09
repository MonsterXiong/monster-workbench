<script setup lang="ts">
import { computed, ref, useSlots } from "vue";
import { useI18n } from "../../composables/useI18n";
import {
  focusElementIntoView,
  formatCssLengthValue,
  getBoundaryItem,
  getKeyboardBoundaryPosition,
  getKeyboardNavigationDirection,
  getNextCircularItem,
  hasArrayLengthAtMost,
  isEditableEventTarget,
  queryFocusableElements,
} from "../../utils";

type ToolbarSize = "sm" | "md" | "lg";
type ToolbarSurface = "default" | "muted" | "plain";
type ToolbarJustify = "between" | "start" | "center" | "end";
type ToolbarMainAlign = "start" | "center" | "end";
type ToolbarOrientation = "horizontal" | "vertical";

interface Props {
  size?: ToolbarSize;
  surface?: ToolbarSurface;
  compact?: boolean;
  wrap?: boolean;
  justify?: ToolbarJustify;
  mainAlign?: ToolbarMainAlign;
  sticky?: boolean;
  divided?: boolean;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  emptyIcon?: string;
  stickyOffset?: number | string;
  orientation?: ToolbarOrientation;
  keyboardNavigation?: boolean;
  role?: string;
  ariaLabel?: string;
  leftLabel?: string;
  mainLabel?: string;
  rightLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  surface: "default",
  compact: false,
  wrap: true,
  justify: "between",
  mainAlign: "center",
  sticky: false,
  divided: false,
  disabled: false,
  loading: false,
  loadingText: "",
  emptyText: "",
  emptyIcon: "Inbox",
  stickyOffset: 0,
  orientation: "horizontal",
  keyboardNavigation: true,
  role: "toolbar",
  ariaLabel: "",
  leftLabel: "",
  mainLabel: "",
  rightLabel: "",
});

const { t } = useI18n();
const slots = useSlots();
const rootRef = ref<HTMLElement | null>(null);
const toolbarLabel = computed(() => props.ariaLabel || (props.role === "toolbar" ? t("common.toolbar") : ""));
const resolvedLoadingText = computed(() => props.loadingText || t("common.loading"));
const resolvedEmptyText = computed(() => props.emptyText || t("common.noData"));
const hasToolbarContent = computed(() => Boolean(slots.left || slots.default || slots.right));
const isInteractionDisabled = computed(() => props.disabled || props.loading);
const toolbarStyle = computed(() => ({ "--base-toolbar-sticky-top": formatCssLengthValue(props.stickyOffset) } as Record<string, string>));

const getToolbarFocusableElements = () => queryFocusableElements(rootRef.value);

const focusToolbarItem = (element?: HTMLElement) => {
  focusElementIntoView(element);
};

const handleToolbarKeydown = (event: KeyboardEvent) => {
  if (!props.keyboardNavigation || props.role !== "toolbar" || isInteractionDisabled.value) return;
  if (event.altKey || event.ctrlKey || event.metaKey || isEditableEventTarget(event.target)) return;

  const navigationKeys = props.orientation === "vertical"
    ? { forwardKeys: ["ArrowDown"], backwardKeys: ["ArrowUp"] }
    : { forwardKeys: ["ArrowRight"], backwardKeys: ["ArrowLeft"] };
  const direction = getKeyboardNavigationDirection(event, navigationKeys);
  const boundary = getKeyboardBoundaryPosition(event);

  if (!direction && !boundary) return;

  const items = getToolbarFocusableElements();
  if (hasArrayLengthAtMost(items, 1)) return;

  event.preventDefault();

  if (boundary) {
    focusToolbarItem(getBoundaryItem(items, boundary));
    return;
  }

  focusToolbarItem(getNextCircularItem(items, items.indexOf(document.activeElement as HTMLElement), direction ?? 1));
};
</script>

<template>
  <div
    ref="rootRef"
    class="base-toolbar"
    :class="[
      `base-toolbar--${size}`,
      `base-toolbar--surface-${surface}`,
      `base-toolbar--justify-${justify}`,
      `base-toolbar--main-${mainAlign}`,
      `base-toolbar--${orientation}`,
      {
        'base-toolbar--compact': compact,
        'base-toolbar--nowrap': !wrap,
        'base-toolbar--sticky': sticky,
        'base-toolbar--divided': divided,
        'is-disabled': disabled,
        'is-loading': loading,
      },
    ]"
    :role="role || undefined"
    :aria-label="toolbarLabel || undefined"
    :aria-orientation="role === 'toolbar' ? orientation : undefined"
    :aria-disabled="isInteractionDisabled ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :inert="disabled"
    :style="toolbarStyle"
    @keydown="handleToolbarKeydown"
  >
    <div
      v-if="$slots.left"
      class="base-toolbar__group base-toolbar__group--left"
      :role="leftLabel ? 'group' : undefined"
      :aria-label="leftLabel || undefined"
      :inert="isInteractionDisabled"
    >
      <slot name="left"></slot>
    </div>
    <div
      v-if="$slots.default"
      class="base-toolbar__group base-toolbar__group--main"
      :role="mainLabel ? 'group' : undefined"
      :aria-label="mainLabel || undefined"
      :inert="isInteractionDisabled"
    >
      <slot></slot>
    </div>
    <div
      v-if="$slots.right"
      class="base-toolbar__group base-toolbar__group--right"
      :role="rightLabel ? 'group' : undefined"
      :aria-label="rightLabel || undefined"
      :inert="isInteractionDisabled"
    >
      <slot name="right"></slot>
    </div>
    <div v-if="!hasToolbarContent" class="base-toolbar__empty" role="status">
      <BaseIcon :name="emptyIcon" size="15" aria-hidden="true" />
      <span>{{ resolvedEmptyText }}</span>
    </div>
    <div v-if="loading" class="base-toolbar__loading" role="status" aria-live="polite">
      <BaseIcon name="LoaderCircle" size="14" aria-hidden="true" />
      <span>{{ resolvedLoadingText }}</span>
    </div>
  </div>
</template>

<style scoped>
.base-toolbar {
  @apply relative flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition dark:border-slate-800 dark:bg-slate-900;
}

.base-toolbar--compact {
  @apply gap-2 p-2;
}

.base-toolbar--sm {
  @apply rounded-xl p-2;
}

.base-toolbar--lg {
  @apply p-4;
}

.base-toolbar--surface-muted {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-toolbar--surface-plain {
  @apply rounded-none border-transparent bg-transparent p-0 shadow-none dark:border-transparent dark:bg-transparent;
}

.base-toolbar--justify-between {
  @apply justify-between;
}

.base-toolbar--justify-start {
  @apply justify-start;
}

.base-toolbar--justify-center {
  @apply justify-center;
}

.base-toolbar--justify-end {
  @apply justify-end;
}

.base-toolbar--nowrap {
  @apply flex-nowrap overflow-x-auto;
  scrollbar-width: thin;
  scrollbar-color: rgb(203 213 225) transparent;
}

.base-toolbar--vertical {
  @apply flex-col items-stretch;
}

.base-toolbar--sticky {
  top: var(--base-toolbar-sticky-top, 0);
  @apply sticky z-20;
}

.base-toolbar--divided {
  @apply border-b-slate-200 dark:border-b-slate-800;
}

.base-toolbar--divided:not(.base-toolbar--vertical) .base-toolbar__group + .base-toolbar__group {
  @apply border-l border-slate-200 pl-3 dark:border-slate-800;
}

.base-toolbar--divided.base-toolbar--compact:not(.base-toolbar--vertical) .base-toolbar__group + .base-toolbar__group {
  @apply pl-2;
}

.base-toolbar--divided.base-toolbar--vertical .base-toolbar__group + .base-toolbar__group {
  @apply border-t border-slate-200 pt-2 dark:border-slate-800;
}

.base-toolbar.is-disabled {
  @apply pointer-events-none opacity-60;
}

.base-toolbar.is-loading {
  @apply overflow-hidden;
}

.base-toolbar__group {
  @apply flex min-w-0 max-w-full flex-wrap items-center gap-2;
}

.base-toolbar--vertical .base-toolbar__group {
  @apply w-full;
}

.base-toolbar.is-loading .base-toolbar__group {
  @apply pointer-events-none opacity-50;
}

.base-toolbar--nowrap .base-toolbar__group {
  @apply flex-nowrap;
}

.base-toolbar__group--main {
  @apply flex-1;
}

.base-toolbar--main-start .base-toolbar__group--main {
  @apply justify-start;
}

.base-toolbar--main-center .base-toolbar__group--main {
  @apply justify-center;
}

.base-toolbar--main-end .base-toolbar__group--main {
  @apply justify-end;
}

.base-toolbar__group--right {
  @apply ml-auto justify-end;
}

.base-toolbar--vertical .base-toolbar__group--right {
  @apply ml-0;
}

.base-toolbar--justify-start .base-toolbar__group--right,
.base-toolbar--justify-center .base-toolbar__group--right {
  @apply ml-0;
}

.base-toolbar__loading {
  @apply absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-[inherit] bg-white/80 text-xs font-black text-primary backdrop-blur-sm dark:bg-slate-900/80;
}

.base-toolbar__empty {
  @apply flex min-h-8 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500;
  overflow-wrap: anywhere;
}

.base-toolbar__loading :deep(svg) {
  animation: toolbar-spin 0.9s linear infinite;
}

@keyframes toolbar-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-toolbar,
  .base-toolbar__loading :deep(svg) {
    transition: none !important;
    animation: none !important;
  }
}
</style>
