<script setup lang="ts">
import { computed, getCurrentInstance, ref, useSlots, watch } from "vue";
import { clampNumberToBounds, createDomId, formatCssPixelValue, toNonNegativeNumber } from "../../utils";

type TooltipPlacement =
  | "auto"
  | "auto-start"
  | "auto-end"
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end"
  | "right"
  | "right-start"
  | "right-end";
type TooltipTrigger = "hover" | "focus" | "click" | "contextmenu";
type TooltipEffect = "dark" | "light";
type TooltipStrategy = "absolute" | "fixed";

interface Props {
  content?: string;
  placement?: TooltipPlacement;
  fallbackPlacements?: TooltipPlacement[];
  trigger?: TooltipTrigger | TooltipTrigger[];
  disabled?: boolean;
  multiline?: boolean;
  open?: boolean;
  effect?: TooltipEffect;
  maxWidth?: number;
  offset?: number;
  arrowOffset?: number;
  viewportPadding?: number;
  showDelay?: number;
  hideDelay?: number;
  autoClose?: number;
  showArrow?: boolean;
  enterable?: boolean;
  teleported?: boolean;
  persistent?: boolean;
  strategy?: TooltipStrategy;
}

const props = withDefaults(defineProps<Props>(), {
  content: "",
  placement: "top",
  fallbackPlacements: () => [],
  trigger: () => ["hover", "focus"],
  disabled: false,
  multiline: false,
  effect: "dark",
  maxWidth: 224,
  offset: 8,
  arrowOffset: 5,
  viewportPadding: 10,
  showDelay: 80,
  hideDelay: 80,
  autoClose: 0,
  showArrow: true,
  enterable: true,
  teleported: true,
  persistent: false,
  strategy: "absolute",
});

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "show"): void;
  (e: "hide"): void;
}>();

const instance = getCurrentInstance();
const slots = useSlots();
const localOpen = ref(false);
const tooltipId = createDomId("base-tooltip");
const isControlled = computed(() => Boolean(instance?.vnode.props && "open" in instance.vnode.props));
const hasContent = computed(() => Boolean(props.content || slots.content));
const canRender = computed(() => !props.disabled && hasContent.value);
const normalizedMaxWidth = computed(() => clampNumberToBounds(props.maxWidth, 120, 520, 224));
const normalizedOffset = computed(() => Math.max(0, toNonNegativeNumber(props.offset)));
const normalizedArrowOffset = computed(() => Math.max(0, toNonNegativeNumber(props.arrowOffset)));
const normalizedViewportPadding = computed(() => Math.max(4, toNonNegativeNumber(props.viewportPadding)));
const normalizedShowDelay = computed(() => Math.max(0, toNonNegativeNumber(props.showDelay)));
const normalizedHideDelay = computed(() => Math.max(0, toNonNegativeNumber(props.hideDelay)));
const normalizedAutoClose = computed(() => Math.max(0, toNonNegativeNumber(props.autoClose)));
const normalizedTrigger = computed(() => props.trigger);
const resolvedFallbackPlacements = computed(() => (props.fallbackPlacements.length ? props.fallbackPlacements : undefined));
const resolvedPlacement = computed(() => props.placement);
const resolvedPopperClass = computed(() =>
  [
    "base-tooltip-popper",
    `base-tooltip-popper--${props.effect}`,
    props.multiline ? "base-tooltip-popper--multiline" : "",
    props.showArrow ? "" : "base-tooltip-popper--no-arrow",
  ]
    .filter(Boolean)
    .join(" ")
);
const popperStyle = computed(() => ({
  maxWidth: formatCssPixelValue(normalizedMaxWidth.value),
}));
const popperOptions = computed(() => ({
  modifiers: [
    { name: "preventOverflow", options: { padding: normalizedViewportPadding.value } },
    {
      name: "flip",
      options: {
        padding: normalizedViewportPadding.value,
        fallbackPlacements: resolvedFallbackPlacements.value,
      },
    },
  ],
}));

const isOpen = computed(() => (isControlled.value ? Boolean(props.open) : localOpen.value) && canRender.value);

const setOpen = (value: boolean) => {
  const nextValue = value && canRender.value;
  if (!isControlled.value) {
    localOpen.value = nextValue;
  }
  emit("update:open", nextValue);
};

watch(canRender, (enabled) => {
  if (!enabled) {
    setOpen(false);
  }
});
</script>

<template>
  <el-tooltip
    class="base-tooltip"
    :visible="isOpen"
    :content="content"
    :placement="resolvedPlacement"
    :fallback-placements="resolvedFallbackPlacements"
    :disabled="!canRender"
    :show-after="normalizedShowDelay"
    :hide-after="normalizedHideDelay"
    :auto-close="normalizedAutoClose"
    :offset="normalizedOffset"
    :arrow-offset="normalizedArrowOffset"
    :popper-class="resolvedPopperClass"
    :popper-style="popperStyle"
    :popper-options="popperOptions"
    :teleported="teleported"
    :persistent="persistent"
    :show-arrow="showArrow"
    :effect="effect"
    :enterable="enterable"
    :strategy="strategy"
    :trigger="normalizedTrigger"
    @update:visible="setOpen"
    @show="emit('show')"
    @hide="emit('hide')"
  >
    <span class="base-tooltip__trigger" :aria-describedby="canRender ? tooltipId : undefined">
      <slot :tooltip-id="tooltipId" :open="isOpen"></slot>
    </span>

    <template #content>
      <span :id="tooltipId" class="base-tooltip__content">
        <slot name="content">{{ content }}</slot>
      </span>
    </template>
  </el-tooltip>
</template>

<style scoped>
.base-tooltip,
.base-tooltip__trigger {
  @apply inline-flex min-w-0 max-w-full align-middle;
}

:global(.base-tooltip-popper.el-popper) {
  --el-color-primary: rgb(var(--color-primary));
  --el-popper-border-radius: 8px;
  border: 1px solid #1e293b;
  border-radius: 8px;
  background: #0f172a;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.22);
}

:global(.base-tooltip-popper .el-popper__arrow::before) {
  border-color: #1e293b;
  background: #0f172a;
}

:global(.base-tooltip-popper--light.el-popper) {
  border-color: #e2e8f0;
  background: #ffffff;
  color: #334155;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
}

:global(.base-tooltip-popper--light .el-popper__arrow::before) {
  border-color: #e2e8f0;
  background: #ffffff;
}

:global(.base-tooltip-popper .base-tooltip__content) {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.base-tooltip-popper--multiline .base-tooltip__content) {
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
  white-space: normal;
}

:global(.dark .base-tooltip-popper--dark.el-popper) {
  border-color: #e2e8f0;
  background: #f8fafc;
  color: #0f172a;
}

:global(.dark .base-tooltip-popper--dark .el-popper__arrow::before) {
  border-color: #e2e8f0;
  background: #f8fafc;
}

:global(.dark .base-tooltip-popper--light.el-popper) {
  border-color: #334155;
  background: #0f172a;
  color: #e2e8f0;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.34);
}

:global(.dark .base-tooltip-popper--light .el-popper__arrow::before) {
  border-color: #334155;
  background: #0f172a;
}

@media (prefers-reduced-motion: reduce) {
  :global(.base-tooltip-popper.el-popper) {
    transition: none !important;
  }
}
</style>
