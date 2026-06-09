<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, useSlots, watch } from "vue";
import {
  addDomEventListener,
  clampNumberToBounds,
  clearAnimationFrameHandle,
  clearTimeoutHandle,
  createAnimationFrame,
  createDomId,
  createTimeout,
  formatCssPixelValue,
  formatRoundedCssPixelValue,
  getViewportAvailableHeight,
  getViewportAvailableWidth,
  isEscapeKey,
  mergeDomEventCleanups,
  toNonNegativeNumber,
  type AnimationFrameHandle,
  type DomEventCleanup,
  type TimeoutHandle,
} from "../../utils";

type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface Props {
  content?: string;
  placement?: TooltipPlacement;
  disabled?: boolean;
  multiline?: boolean;
  open?: boolean;
  maxWidth?: number;
  offset?: number;
  viewportPadding?: number;
  showDelay?: number;
  hideDelay?: number;
}

const props = withDefaults(defineProps<Props>(), {
  content: "",
  placement: "top",
  disabled: false,
  multiline: false,
  maxWidth: 224,
  offset: 8,
  viewportPadding: 10,
  showDelay: 80,
  hideDelay: 80,
});

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "show"): void;
  (e: "hide"): void;
}>();

const instance = getCurrentInstance();
const slots = useSlots();
const rootRef = ref<HTMLElement | null>(null);
const tooltipRef = ref<HTMLElement | null>(null);
const localOpen = ref(false);
const tooltipStyle = ref<Record<string, string>>({});
const arrowStyle = ref<Record<string, string>>({});
const resolvedPlacement = ref<TooltipPlacement>(props.placement);
const tooltipId = createDomId("base-tooltip");
const isControlled = computed(() => Boolean(instance?.vnode.props && "open" in instance.vnode.props));
const hasContent = computed(() => Boolean(props.content || slots.content));
const canRender = computed(() => !props.disabled && hasContent.value);
const isOpen = computed(() => (isControlled.value ? Boolean(props.open) : localOpen.value) && canRender.value);
let showTimer: TimeoutHandle | null = null;
let hideTimer: TimeoutHandle | null = null;
let positionFrame: AnimationFrameHandle | null = null;
let stopGlobalListeners: DomEventCleanup | null = null;

const clearTooltipTimers = () => {
  clearTimeoutHandle(showTimer);
  clearTimeoutHandle(hideTimer);
  showTimer = null;
  hideTimer = null;
};

const getViewportPadding = () => toNonNegativeNumber(props.viewportPadding);
const getOffset = () => toNonNegativeNumber(props.offset);

const setTooltipOpen = (value: boolean) => {
  const nextValue = value && canRender.value;
  if (isOpen.value === nextValue) return;

  if (!isControlled.value) {
    localOpen.value = nextValue;
  }

  emit("update:open", nextValue);
};

const scheduleShow = () => {
  if (!canRender.value) return;
  clearTimeoutHandle(hideTimer);
  hideTimer = null;
  clearTimeoutHandle(showTimer);
  showTimer = createTimeout(() => setTooltipOpen(true), props.showDelay);
};

const showImmediately = () => {
  if (!canRender.value) return;
  clearTooltipTimers();
  setTooltipOpen(true);
};

const scheduleHide = () => {
  clearTimeoutHandle(showTimer);
  showTimer = null;
  clearTimeoutHandle(hideTimer);
  hideTimer = createTimeout(() => setTooltipOpen(false), props.hideDelay);
};

const getResolvedPlacement = (rect: DOMRect, tooltipWidth: number, tooltipHeight: number): TooltipPlacement => {
  const offset = getOffset();
  const padding = getViewportPadding();
  const spaceAbove = toNonNegativeNumber(rect.top - padding - offset);
  const spaceBelow = toNonNegativeNumber(window.innerHeight - rect.bottom - padding - offset);
  const spaceLeft = toNonNegativeNumber(rect.left - padding - offset);
  const spaceRight = toNonNegativeNumber(window.innerWidth - rect.right - padding - offset);

  if (props.placement === "top" && spaceAbove < tooltipHeight && spaceBelow > spaceAbove) return "bottom";
  if (props.placement === "bottom" && spaceBelow < tooltipHeight && spaceAbove > spaceBelow) return "top";
  if (props.placement === "left" && spaceLeft < tooltipWidth && spaceRight > spaceLeft) return "right";
  if (props.placement === "right" && spaceRight < tooltipWidth && spaceLeft > spaceRight) return "left";

  return props.placement;
};

const updateTooltipPosition = () => {
  const root = rootRef.value;
  const tooltip = tooltipRef.value;
  if (!root || !tooltip || !isOpen.value) return;

  const rect = root.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    setTooltipOpen(false);
    return;
  }

  const padding = getViewportPadding();
  const offset = getOffset();
  const maxWidth = clampNumberToBounds(props.maxWidth, 120, getViewportAvailableWidth(padding, 120), 224);
  const maxHeight = getViewportAvailableHeight(padding, 48);
  const tooltipRect = tooltip.getBoundingClientRect();
  const tooltipWidth = Math.min(tooltipRect.width || maxWidth, maxWidth);
  const tooltipHeight = Math.min(tooltipRect.height || 32, maxHeight);
  const placement = getResolvedPlacement(rect, tooltipWidth, tooltipHeight);
  const triggerCenterX = rect.left + rect.width / 2;
  const triggerCenterY = rect.top + rect.height / 2;
  let left = triggerCenterX - tooltipWidth / 2;
  let top = rect.top - tooltipHeight - offset;

  if (placement === "bottom") {
    top = rect.bottom + offset;
  } else if (placement === "left") {
    left = rect.left - tooltipWidth - offset;
    top = triggerCenterY - tooltipHeight / 2;
  } else if (placement === "right") {
    left = rect.right + offset;
    top = triggerCenterY - tooltipHeight / 2;
  }

  const clampedLeft = clampNumberToBounds(left, padding, window.innerWidth - padding - tooltipWidth, padding);
  const clampedTop = clampNumberToBounds(top, padding, window.innerHeight - padding - tooltipHeight, padding);
  const arrowOffset =
    placement === "top" || placement === "bottom"
      ? clampNumberToBounds(triggerCenterX - clampedLeft, 12, tooltipWidth - 12, tooltipWidth / 2)
      : clampNumberToBounds(triggerCenterY - clampedTop, 12, tooltipHeight - 12, tooltipHeight / 2);

  resolvedPlacement.value = placement;
  tooltipStyle.value = {
    left: formatRoundedCssPixelValue(clampedLeft),
    top: formatRoundedCssPixelValue(clampedTop),
    maxWidth: formatCssPixelValue(maxWidth),
    maxHeight: formatCssPixelValue(maxHeight),
  };
  arrowStyle.value =
    placement === "top" || placement === "bottom"
      ? { left: formatRoundedCssPixelValue(arrowOffset) }
      : { top: formatRoundedCssPixelValue(arrowOffset) };
};

const scheduleTooltipPosition = () => {
  if (!isOpen.value) return;
  clearAnimationFrameHandle(positionFrame);
  positionFrame = createAnimationFrame(() => {
    positionFrame = null;
    updateTooltipPosition();
  });
};

const handleFocusout = (event: FocusEvent) => {
  const nextTarget = event.relatedTarget;
  if (nextTarget instanceof Node && rootRef.value?.contains(nextTarget)) return;
  scheduleHide();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!isEscapeKey(event) || !isOpen.value) return;
  event.preventDefault();
  setTooltipOpen(false);
};

onMounted(() => {
  const root = rootRef.value;
  stopGlobalListeners = mergeDomEventCleanups([
    addDomEventListener(root, "pointerenter", scheduleShow),
    addDomEventListener(root, "pointerdown", showImmediately, { capture: true }),
    addDomEventListener(root, "pointerleave", scheduleHide),
    addDomEventListener(root, "focusin", scheduleShow),
    addDomEventListener(root, "focusout", (event) => handleFocusout(event as FocusEvent)),
    addDomEventListener(root, "keydown", (event) => handleKeydown(event as KeyboardEvent)),
    addDomEventListener(root, "click", showImmediately, { capture: true }),
    addDomEventListener(window, "resize", scheduleTooltipPosition),
    addDomEventListener(window, "scroll", scheduleTooltipPosition, true),
  ]);
});

onBeforeUnmount(() => {
  clearTooltipTimers();
  clearAnimationFrameHandle(positionFrame);
  positionFrame = null;
  stopGlobalListeners?.();
  stopGlobalListeners = null;
});

watch(
  () => [props.disabled, props.content],
  () => {
    if (!canRender.value) {
      clearTooltipTimers();
      localOpen.value = false;
      emit("update:open", false);
      return;
    }

    scheduleTooltipPosition();
  },
);

watch(
  () => [props.placement, props.maxWidth, props.offset, props.viewportPadding, props.multiline],
  scheduleTooltipPosition,
);

watch(isOpen, (open, wasOpen) => {
  if (open) {
    emit("show");
    void nextTick(() => {
      updateTooltipPosition();
      void nextTick(updateTooltipPosition);
    });
    return;
  }

  if (wasOpen === undefined) return;
  emit("hide");
  clearAnimationFrameHandle(positionFrame);
  positionFrame = null;
}, { immediate: true });
</script>

<template>
  <span
    ref="rootRef"
    class="base-tooltip"
    :class="{ 'base-tooltip--disabled': disabled }"
    :aria-describedby="canRender ? tooltipId : undefined"
    @pointerenter="scheduleShow"
    @pointerdown.capture="showImmediately"
    @pointerleave="scheduleHide"
    @focusin="scheduleShow"
    @focusout="handleFocusout"
    @keydown="handleKeydown"
    @click.capture="showImmediately"
  >
    <slot :tooltip-id="tooltipId" :open="isOpen"></slot>

    <Teleport to="body">
      <span
        v-if="canRender"
        v-show="isOpen"
        :id="tooltipId"
        ref="tooltipRef"
        class="base-tooltip__floating"
        :class="{ 'base-tooltip__floating--multiline': multiline }"
        :style="tooltipStyle"
        :data-placement="resolvedPlacement"
        role="tooltip"
      >
        <span class="base-tooltip__content">
          <slot name="content">{{ content }}</slot>
        </span>
        <span class="base-tooltip__arrow" :style="arrowStyle" aria-hidden="true"></span>
      </span>
    </Teleport>
  </span>
</template>

<style scoped>
.base-tooltip {
  @apply inline-flex min-w-0 max-w-full align-middle;
}

.base-tooltip--disabled {
  @apply cursor-default;
}

.base-tooltip__floating {
  @apply pointer-events-none fixed z-[1300] overflow-hidden rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.22);
}

.base-tooltip__content {
  @apply block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap;
}

.base-tooltip__floating--multiline .base-tooltip__content {
  @apply whitespace-normal leading-5;
  overflow-wrap: anywhere;
}

.base-tooltip__arrow {
  @apply absolute h-2 w-2 rotate-45 bg-slate-900 dark:bg-slate-100;
}

.base-tooltip__floating[data-placement="top"] .base-tooltip__arrow {
  @apply -bottom-1 -translate-x-1/2;
}

.base-tooltip__floating[data-placement="bottom"] .base-tooltip__arrow {
  @apply -top-1 -translate-x-1/2;
}

.base-tooltip__floating[data-placement="left"] .base-tooltip__arrow {
  @apply -right-1 -translate-y-1/2;
}

.base-tooltip__floating[data-placement="right"] .base-tooltip__arrow {
  @apply -left-1 -translate-y-1/2;
}

@media (prefers-reduced-motion: reduce) {
  .base-tooltip__floating {
    transition: none !important;
  }
}
</style>
