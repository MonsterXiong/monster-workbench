<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch, type CSSProperties } from "vue";
import { useI18n } from "../../composables/useI18n";
import {
  addDomEventListener,
  clampNumber,
  clearTimeoutHandle,
  getKeyboardBoundaryPosition,
  getKeyboardNavigationDirection,
  mergeDomEventCleanups,
  resetTimeoutHandle,
  type DomEventCleanup,
  type TimeoutHandle,
} from "../../utils";

type Side = "left" | "right";
type ThreeColumnLayoutSize = "sm" | "md" | "lg";
type ThreeColumnLayoutSurface = "card" | "muted" | "plain";

interface Props {
  leftWidth?: number;
  rightWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  minRightWidth?: number;
  maxRightWidth?: number;
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
  leftLabel?: string;
  rightLabel?: string;
  mainLabel?: string;
  leftCollapseLabel?: string;
  rightCollapseLabel?: string;
  leftExpandLabel?: string;
  rightExpandLabel?: string;
  ariaLabel?: string;
  size?: ThreeColumnLayoutSize;
  surface?: ThreeColumnLayoutSurface;
  bordered?: boolean;
  disabled?: boolean;
  resizeStep?: number;
}

const props = withDefaults(defineProps<Props>(), {
  leftWidth: 240,
  rightWidth: 280,
  minLeftWidth: 180,
  maxLeftWidth: 360,
  minRightWidth: 220,
  maxRightWidth: 420,
  leftCollapsed: false,
  rightCollapsed: false,
  leftLabel: "",
  rightLabel: "",
  mainLabel: "",
  leftCollapseLabel: "",
  rightCollapseLabel: "",
  leftExpandLabel: "",
  rightExpandLabel: "",
  ariaLabel: "",
  size: "md",
  surface: "card",
  bordered: true,
  disabled: false,
  resizeStep: 16,
});

const emit = defineEmits<{
  (e: "update:leftCollapsed", value: boolean): void;
  (e: "update:rightCollapsed", value: boolean): void;
  (e: "resize", value: { leftWidth: number; rightWidth: number }): void;
  (e: "resize-start", value: { side: Side; leftWidth: number; rightWidth: number }): void;
  (e: "resize-end", value: { side: Side; leftWidth: number; rightWidth: number }): void;
  (e: "collapse", value: { side: Side }): void;
  (e: "expand", value: { side: Side }): void;
}>();

const localLeftWidth = ref(0);
const localRightWidth = ref(0);
const draggingSide = ref<Side | null>(null);
const rootRef = ref<HTMLElement | null>(null);
const dragStartX = ref(0);
const didDrag = ref(false);
let resetDragStateTimer: TimeoutHandle | null = null;
let stopDragListeners: DomEventCleanup | null = null;
const { t } = useI18n();
const layoutId = useId();
const leftPaneId = computed(() => `${layoutId}-left`);
const rightPaneId = computed(() => `${layoutId}-right`);
const mainPaneId = computed(() => `${layoutId}-main`);
const resolvedLeftLabel = computed(() => props.leftLabel || t("common.leftSidebar"));
const resolvedRightLabel = computed(() => props.rightLabel || t("common.rightSidebar"));
const resolvedMainLabel = computed(() => props.mainLabel || "主内容区");
const resolvedLayoutLabel = computed(() => props.ariaLabel || "三栏布局");
const resolvedLeftCollapseLabel = computed(() => props.leftCollapseLabel || `${t("common.collapse")}${resolvedLeftLabel.value}`);
const resolvedRightCollapseLabel = computed(() => props.rightCollapseLabel || `${t("common.collapse")}${resolvedRightLabel.value}`);
const resolvedLeftExpandLabel = computed(() => props.leftExpandLabel || `${t("common.expand")}${resolvedLeftLabel.value}`);
const resolvedRightExpandLabel = computed(() => props.rightExpandLabel || `${t("common.expand")}${resolvedRightLabel.value}`);

const clampLeftWidth = (value: number) => clampNumber(value, props.minLeftWidth, props.maxLeftWidth);
const clampRightWidth = (value: number) => clampNumber(value, props.minRightWidth, props.maxRightWidth);

watch(
  () => [props.leftWidth, props.minLeftWidth, props.maxLeftWidth] as const,
  ([value]) => {
    localLeftWidth.value = clampLeftWidth(value);
  },
  { immediate: true }
);

watch(
  () => [props.rightWidth, props.minRightWidth, props.maxRightWidth] as const,
  ([value]) => {
    localRightWidth.value = clampRightWidth(value);
  },
  { immediate: true }
);

const gridStyle = computed<CSSProperties>(() => ({
  gridTemplateColumns: `${props.leftCollapsed ? 0 : localLeftWidth.value}px minmax(0, 1fr) ${
    props.rightCollapsed ? 0 : localRightWidth.value
  }px`,
  "--left-width": `${localLeftWidth.value}px`,
  "--right-width": `${localRightWidth.value}px`,
} as CSSProperties));

const handlePointerMove = (event: PointerEvent) => {
  if (!draggingSide.value || props.disabled) return;
  const rect = rootRef.value?.getBoundingClientRect();
  if (!rect) return;

  if (Math.abs(event.clientX - dragStartX.value) > 4) {
    didDrag.value = true;
  }

  if (draggingSide.value === "left") {
    localLeftWidth.value = clampNumber(event.clientX - rect.left, props.minLeftWidth, props.maxLeftWidth);
  } else {
    localRightWidth.value = clampNumber(rect.right - event.clientX, props.minRightWidth, props.maxRightWidth);
  }

  emit("resize", { leftWidth: localLeftWidth.value, rightWidth: localRightWidth.value });
};

const stopDrag = () => {
  const side = draggingSide.value;
  draggingSide.value = null;
  stopDragListeners?.();
  stopDragListeners = null;
  if (didDrag.value) {
    resetDragStateTimer = resetTimeoutHandle(resetDragStateTimer, () => {
      didDrag.value = false;
      resetDragStateTimer = null;
    }, 120);
  }
  if (side) {
    emit("resize-end", { side, leftWidth: localLeftWidth.value, rightWidth: localRightWidth.value });
  }
};

const startDrag = (side: Side, event: PointerEvent) => {
  if (props.disabled) return;
  event.preventDefault();
  draggingSide.value = side;
  dragStartX.value = event.clientX;
  didDrag.value = false;
  stopDragListeners?.();
  stopDragListeners = mergeDomEventCleanups([
    addDomEventListener(document, "pointermove", handlePointerMove),
    addDomEventListener(document, "pointerup", stopDrag),
    addDomEventListener(document, "pointercancel", stopDrag),
  ]);
  emit("resize-start", { side, leftWidth: localLeftWidth.value, rightWidth: localRightWidth.value });
};

const collapse = (side: Side) => {
  if (props.disabled) return;
  if (didDrag.value) {
    didDrag.value = false;
    return;
  }
  if (side === "left") {
    emit("update:leftCollapsed", true);
    emit("collapse", { side });
    return;
  }
  emit("update:rightCollapsed", true);
  emit("collapse", { side });
};

const resizeByKeyboard = (side: Side, event: KeyboardEvent) => {
  if (props.disabled) return;
  const boundaryPosition = getKeyboardBoundaryPosition(event);
  const direction = getKeyboardNavigationDirection(event, {
    forwardKeys: side === "left" ? ["ArrowRight"] : ["ArrowLeft"],
    backwardKeys: side === "left" ? ["ArrowLeft"] : ["ArrowRight"],
  });
  if (!boundaryPosition && !direction) return;
  event.preventDefault();
  const keyboardDelta = props.resizeStep * (direction ?? 0);

  if (side === "left") {
    const nextValue =
      boundaryPosition === "first"
        ? props.minLeftWidth
        : boundaryPosition === "last"
          ? props.maxLeftWidth
          : localLeftWidth.value + keyboardDelta;
    localLeftWidth.value = clampNumber(nextValue, props.minLeftWidth, props.maxLeftWidth);
  } else {
    const nextValue =
      boundaryPosition === "first"
        ? props.minRightWidth
        : boundaryPosition === "last"
          ? props.maxRightWidth
          : localRightWidth.value + keyboardDelta;
    localRightWidth.value = clampNumber(nextValue, props.minRightWidth, props.maxRightWidth);
  }

  emit("resize", { leftWidth: localLeftWidth.value, rightWidth: localRightWidth.value });
};

const expand = (side: Side) => {
  if (props.disabled) return;
  if (side === "left") {
    emit("update:leftCollapsed", false);
    emit("expand", { side });
    return;
  }
  emit("update:rightCollapsed", false);
  emit("expand", { side });
};

onBeforeUnmount(() => {
  stopDrag();
  clearTimeoutHandle(resetDragStateTimer);
  resetDragStateTimer = null;
});
</script>

<template>
  <section
    ref="rootRef"
    class="base-three-column-layout"
    :class="[
      `base-three-column-layout--${size}`,
      `base-three-column-layout--surface-${surface}`,
      {
        'is-bordered': bordered,
        'is-disabled': disabled,
        'is-left-collapsed': leftCollapsed,
        'is-right-collapsed': rightCollapsed,
        'is-dragging-left': draggingSide === 'left',
        'is-dragging-right': draggingSide === 'right'
      }
    ]"
    :style="gridStyle"
    :aria-label="resolvedLayoutLabel"
    :aria-disabled="disabled ? 'true' : undefined"
  >
    <aside
      :id="leftPaneId"
      class="base-three-column-layout__side base-three-column-layout__side--left"
      role="region"
      :aria-label="resolvedLeftLabel"
      :aria-hidden="leftCollapsed ? 'true' : undefined"
    >
      <slot name="left" />
    </aside>

    <button
      v-if="!leftCollapsed"
      type="button"
      role="separator"
      class="base-three-column-layout__splitter base-three-column-layout__splitter--left"
      :aria-label="resolvedLeftCollapseLabel"
      :title="resolvedLeftCollapseLabel"
      aria-orientation="vertical"
      aria-keyshortcuts="ArrowLeft ArrowRight Home End"
      :aria-controls="leftPaneId"
      :aria-valuemin="minLeftWidth"
      :aria-valuemax="maxLeftWidth"
      :aria-valuenow="Math.round(localLeftWidth)"
      :aria-disabled="disabled ? 'true' : undefined"
      :disabled="disabled"
      @pointerdown="startDrag('left', $event)"
      @keydown="resizeByKeyboard('left', $event)"
      @click.stop="collapse('left')"
    >
      <BaseIcon name="PanelLeftClose" size="18" aria-hidden="true" />
    </button>

    <main :id="mainPaneId" class="base-three-column-layout__main" role="region" :aria-label="resolvedMainLabel">
      <slot />
    </main>

    <button
      v-if="!rightCollapsed"
      type="button"
      role="separator"
      class="base-three-column-layout__splitter base-three-column-layout__splitter--right"
      :aria-label="resolvedRightCollapseLabel"
      :title="resolvedRightCollapseLabel"
      aria-orientation="vertical"
      aria-keyshortcuts="ArrowLeft ArrowRight Home End"
      :aria-controls="rightPaneId"
      :aria-valuemin="minRightWidth"
      :aria-valuemax="maxRightWidth"
      :aria-valuenow="Math.round(localRightWidth)"
      :aria-disabled="disabled ? 'true' : undefined"
      :disabled="disabled"
      @pointerdown="startDrag('right', $event)"
      @keydown="resizeByKeyboard('right', $event)"
      @click.stop="collapse('right')"
    >
      <BaseIcon name="PanelRightClose" size="18" aria-hidden="true" />
    </button>

    <aside
      :id="rightPaneId"
      class="base-three-column-layout__side base-three-column-layout__side--right"
      role="region"
      :aria-label="resolvedRightLabel"
      :aria-hidden="rightCollapsed ? 'true' : undefined"
    >
      <slot name="right" />
    </aside>

    <div v-if="leftCollapsed" class="base-three-column-layout__edge base-three-column-layout__edge--left">
      <button
        type="button"
        :aria-label="resolvedLeftExpandLabel"
        :title="resolvedLeftExpandLabel"
        :aria-controls="leftPaneId"
        :aria-expanded="!leftCollapsed"
        :disabled="disabled"
        @click="expand('left')"
      >
        <BaseIcon name="PanelLeftOpen" size="15" aria-hidden="true" />
      </button>
    </div>

    <div v-if="rightCollapsed" class="base-three-column-layout__edge base-three-column-layout__edge--right">
      <button
        type="button"
        :aria-label="resolvedRightExpandLabel"
        :title="resolvedRightExpandLabel"
        :aria-controls="rightPaneId"
        :aria-expanded="!rightCollapsed"
        :disabled="disabled"
        @click="expand('right')"
      >
        <BaseIcon name="PanelRightOpen" size="15" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.base-three-column-layout {
  @apply relative grid h-full min-h-0 w-full overflow-hidden text-slate-900 shadow-sm transition dark:text-slate-100;
}

.base-three-column-layout--sm {
  @apply rounded-lg;
}

.base-three-column-layout--md {
  @apply rounded-xl;
}

.base-three-column-layout--lg {
  @apply rounded-2xl;
}

.base-three-column-layout.is-bordered {
  @apply border border-slate-200 dark:border-slate-800;
}

.base-three-column-layout--surface-card {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-three-column-layout--surface-muted {
  @apply bg-slate-100 dark:bg-slate-950;
}

.base-three-column-layout--surface-plain {
  @apply bg-transparent shadow-none dark:bg-transparent;
}

.base-three-column-layout.is-disabled {
  @apply opacity-70;
}

.base-three-column-layout__side,
.base-three-column-layout__main {
  @apply min-h-0 min-w-0 overflow-hidden;
}

.base-three-column-layout__side {
  @apply border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900;
}

.base-three-column-layout--surface-muted .base-three-column-layout__side {
  @apply bg-slate-50 dark:bg-slate-900;
}

.base-three-column-layout--surface-plain .base-three-column-layout__side {
  @apply bg-transparent dark:bg-transparent;
}

.base-three-column-layout__side--left {
  @apply border-r;
}

.base-three-column-layout__side--right {
  @apply border-l;
}

.is-left-collapsed .base-three-column-layout__side--left,
.is-right-collapsed .base-three-column-layout__side--right {
  @apply pointer-events-none border-0;
}

.base-three-column-layout__main {
  @apply bg-slate-50 dark:bg-slate-950;
}

.base-three-column-layout--surface-muted .base-three-column-layout__main {
  @apply bg-slate-100 dark:bg-slate-950;
}

.base-three-column-layout--surface-plain .base-three-column-layout__main {
  @apply bg-transparent dark:bg-transparent;
}

.base-three-column-layout__splitter {
  @apply absolute top-0 z-20 h-full w-6 -translate-x-1/2 cursor-col-resize bg-transparent text-slate-500 outline-none transition;
}

.base-three-column-layout--sm .base-three-column-layout__splitter {
  @apply w-5;
}

.base-three-column-layout--lg .base-three-column-layout__splitter {
  @apply w-7;
}

.base-three-column-layout__splitter:disabled {
  @apply cursor-not-allowed opacity-60;
}

.base-three-column-layout__splitter::before {
  content: "";
  @apply absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-slate-200 transition dark:bg-slate-800;
}

.base-three-column-layout__splitter::after {
  content: "";
  @apply absolute left-1/2 top-1/2 h-11 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition;
  background-color: rgb(100 116 139 / 0.52);
}

.base-three-column-layout--sm .base-three-column-layout__splitter::after {
  @apply h-9;
}

.base-three-column-layout--lg .base-three-column-layout__splitter::after {
  @apply h-14 w-1.5;
}

.base-three-column-layout__splitter:hover::before,
.base-three-column-layout__splitter:focus-visible::before,
.is-dragging-left .base-three-column-layout__splitter--left::before,
.is-dragging-right .base-three-column-layout__splitter--right::before {
  @apply bg-slate-300 dark:bg-slate-700;
}

.base-three-column-layout__splitter:hover::after,
.base-three-column-layout__splitter:focus-visible::after,
.is-dragging-left .base-three-column-layout__splitter--left::after,
.is-dragging-right .base-three-column-layout__splitter--right::after {
  @apply h-16 w-1.5 bg-primary;
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.12);
}

.base-three-column-layout__splitter :deep(svg) {
  @apply pointer-events-none absolute left-1/2 top-1/2 z-10 box-content h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-1.5 opacity-0 shadow-md transition dark:border-slate-700 dark:bg-slate-900;
}

.base-three-column-layout--lg .base-three-column-layout__splitter :deep(svg) {
  @apply h-5 w-5;
}

.base-three-column-layout__splitter:hover :deep(svg),
.base-three-column-layout__splitter:focus-visible :deep(svg),
.is-dragging-left .base-three-column-layout__splitter--left :deep(svg),
.is-dragging-right .base-three-column-layout__splitter--right :deep(svg) {
  @apply opacity-100;
}

.base-three-column-layout__splitter--left {
  left: var(--left-width);
}

.base-three-column-layout__splitter--right {
  right: var(--right-width);
  @apply translate-x-1/2;
}

.base-three-column-layout__edge {
  @apply absolute top-0 z-30 flex h-full w-10 items-center justify-center;
}

.base-three-column-layout__edge--left {
  @apply left-0;
}

.base-three-column-layout__edge--right {
  @apply right-0;
}

.base-three-column-layout__edge button {
  @apply flex h-10 w-8 items-center justify-center rounded-r-xl border border-slate-200 bg-white text-primary opacity-0 shadow-lg transition hover:bg-primary hover:text-white dark:border-slate-800 dark:bg-slate-900;
}

.base-three-column-layout__edge button:disabled {
  @apply cursor-not-allowed opacity-0;
}

.base-three-column-layout__edge--right button {
  @apply rounded-l-xl rounded-r-none;
}

.base-three-column-layout__edge:hover button,
.base-three-column-layout__edge button:focus-visible {
  @apply opacity-100;
}

.base-three-column-layout.is-disabled .base-three-column-layout__edge:hover button,
.base-three-column-layout.is-disabled .base-three-column-layout__edge button:focus-visible {
  @apply opacity-40;
}

@media (prefers-reduced-motion: reduce) {
  .base-three-column-layout,
  .base-three-column-layout__splitter,
  .base-three-column-layout__splitter::before,
  .base-three-column-layout__splitter::after,
  .base-three-column-layout__splitter :deep(svg),
  .base-three-column-layout__edge button {
    transition: none !important;
  }
}
</style>
