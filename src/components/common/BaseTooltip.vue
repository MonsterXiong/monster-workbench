<script setup lang="ts">
import { computed, getCurrentInstance, ref, useSlots, watch } from "vue";
import { clampNumberToBounds, createDomId, formatCssPixelValue, toNonNegativeNumber } from "../../utils";

type TooltipPlacement = "top" | "bottom" | "left" | "right";
type TooltipTrigger = "hover" | "focus";

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
const localOpen = ref(false);
const tooltipId = createDomId("base-tooltip");
const tooltipTrigger: TooltipTrigger[] = ["hover", "focus"];
const isControlled = computed(() => Boolean(instance?.vnode.props && "open" in instance.vnode.props));
const hasContent = computed(() => Boolean(props.content || slots.content));
const canRender = computed(() => !props.disabled && hasContent.value);
const normalizedMaxWidth = computed(() => clampNumberToBounds(props.maxWidth, 120, 520, 224));
const normalizedOffset = computed(() => Math.max(0, toNonNegativeNumber(props.offset)));
const normalizedViewportPadding = computed(() => Math.max(4, toNonNegativeNumber(props.viewportPadding)));
const normalizedShowDelay = computed(() => Math.max(0, toNonNegativeNumber(props.showDelay)));
const normalizedHideDelay = computed(() => Math.max(0, toNonNegativeNumber(props.hideDelay)));
const resolvedPlacement = computed(() => (props.placement === "top" ? "top" : props.placement));
const resolvedPopperClass = computed(() =>
  ["base-tooltip-popper", props.multiline ? "base-tooltip-popper--multiline" : ""].filter(Boolean).join(" ")
);
const popperStyle = computed(() => ({
  maxWidth: formatCssPixelValue(normalizedMaxWidth.value),
}));
const popperOptions = computed(() => ({
  modifiers: [
    { name: "preventOverflow", options: { padding: normalizedViewportPadding.value } },
    { name: "flip", options: { padding: normalizedViewportPadding.value } },
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
    :disabled="!canRender"
    :show-after="normalizedShowDelay"
    :hide-after="normalizedHideDelay"
    :offset="normalizedOffset"
    :popper-class="resolvedPopperClass"
    :popper-style="popperStyle"
    :popper-options="popperOptions"
    :teleported="true"
    :persistent="false"
    :show-arrow="true"
    effect="dark"
    :trigger="tooltipTrigger"
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

:global(.dark .base-tooltip-popper.el-popper) {
  border-color: #e2e8f0;
  background: #f8fafc;
  color: #0f172a;
}

:global(.dark .base-tooltip-popper .el-popper__arrow::before) {
  border-color: #e2e8f0;
  background: #f8fafc;
}

@media (prefers-reduced-motion: reduce) {
  :global(.base-tooltip-popper.el-popper) {
    transition: none !important;
  }
}
</style>
