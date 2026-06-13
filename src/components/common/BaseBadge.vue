<script setup lang="ts">
import { computed, ref, useAttrs, watchEffect } from "vue";
import { handleActivationKeydown, stopDomEventPropagation } from "../../utils";
import { getElementPlusControlRoot, syncElementPlusClearButtonLabel, type ElementPlusControlRef } from "./elementPlusDom";

defineOptions({
  inheritAttrs: false,
});

interface Props {
  type?: "primary" | "success" | "warning" | "danger" | "neutral";
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "soft" | "solid" | "outline";
  dot?: boolean;
  clickable?: boolean;
  closable?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  title?: string;
  closeLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: "primary",
  size: "sm",
  variant: "soft",
  dot: false,
  clickable: false,
  closable: false,
  disabled: false,
  ariaLabel: "",
  title: "",
  closeLabel: "",
});

const emit = defineEmits<{
  (e: "click", event: MouseEvent | KeyboardEvent): void;
  (e: "close", event: MouseEvent): void;
}>();

const attrs = useAttrs();
const isInteractive = computed(() => props.clickable && !props.disabled);
const accessibleLabel = computed(() => props.ariaLabel || props.title || "");
const badgeRef = ref<ElementPlusControlRef>(null);
const resolvedCloseLabel = computed(() => props.closeLabel || "移除标签");
const elementTagType = computed(() => (props.type === "neutral" ? "info" : props.type));
const elementTagEffect = computed(() => {
  if (props.variant === "solid") return "dark";
  if (props.variant === "outline") return "plain";
  return "light";
});
const elementTagSize = computed(() => {
  if (props.size === "lg") return "large";
  if (props.size === "md") return "default";
  return "small";
});

const handleClick = (event: MouseEvent | KeyboardEvent) => {
  if (!isInteractive.value) return;
  emit("click", event);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!isInteractive.value) return;
  handleActivationKeydown(event, () => emit("click", event));
};

const handleClose = (event: MouseEvent) => {
  stopDomEventPropagation(event);
  if (props.disabled) return;
  emit("close", event);
};

watchEffect(() => {
  if (!props.closable) return;
  void syncElementPlusClearButtonLabel(badgeRef.value, ".el-tag__close", resolvedCloseLabel.value);
});

const getElement = () => getElementPlusControlRoot(badgeRef.value);
const focus = () => {
  const element = getElement();
  element?.focus();
  return element;
};

defineExpose({
  focus,
  getNativeTag: () => badgeRef.value,
  getElement,
  getTagElement: getElement,
});
</script>

<template>
  <el-tag
    v-bind="attrs"
    ref="badgeRef"
    class="base-badge"
    :class="[
      `base-badge--${type}`,
      `base-badge--${size}`,
      `base-badge--${variant}`,
      {
        'base-badge--dot': dot,
        'is-clickable': clickable,
        'is-disabled': disabled,
      }
    ]"
    :type="elementTagType"
    :effect="elementTagEffect"
    :size="elementTagSize"
    :round="true"
    :closable="closable"
    :disable-transitions="false"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable && !disabled ? 0 : undefined"
    :aria-label="accessibleLabel || undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    :title="title || accessibleLabel || undefined"
    @click="handleClick"
    @keydown="handleKeydown"
    @close="handleClose"
  >
    <span v-if="dot" class="base-badge__dot" aria-hidden="true"></span>
    <slot></slot>
  </el-tag>
</template>

<style scoped>
.base-badge {
  @apply inline-flex w-fit shrink-0 items-center gap-1 rounded-full border font-black leading-none transition-colors;
  height: auto;
  max-width: 100%;
  white-space: normal;
}

.base-badge :deep(.el-tag__content) {
  @apply inline-flex min-w-0 max-w-full items-center gap-1;
}

.base-badge--xs {
  @apply px-1.5 py-0.5 text-[9px];
}
.base-badge--sm {
  @apply px-2 py-1 text-[10px];
}
.base-badge--md {
  @apply px-2.5 py-1.5 text-[11px];
}
.base-badge--lg {
  @apply px-3 py-2 text-xs;
}

.base-badge.is-clickable {
  @apply cursor-pointer select-none;
}

.base-badge.is-clickable:focus-visible {
  @apply outline-none ring-2 ring-primary ring-opacity-20;
}

.base-badge.is-disabled {
  @apply cursor-not-allowed opacity-60;
}

.base-badge__dot {
  @apply h-1.5 w-1.5 rounded-full;
}

.base-badge--primary {
  --badge-color: var(--color-primary);
}
.base-badge--success {
  --badge-color: 16 185 129;
}
.base-badge--warning {
  --badge-color: 245 158 11;
}
.base-badge--danger {
  --badge-color: 239 68 68;
}
.base-badge--neutral {
  --badge-color: 100 116 139;
}

.base-badge--soft {
  color: rgb(var(--badge-color));
  background-color: rgba(var(--badge-color), 0.1);
  border-color: rgba(var(--badge-color), 0.18);
}

.base-badge--outline {
  color: rgb(var(--badge-color));
  background-color: transparent;
  border-color: rgba(var(--badge-color), 0.34);
}

.base-badge--solid {
  color: #ffffff;
  background-color: rgb(var(--badge-color));
  border-color: rgb(var(--badge-color));
}

.base-badge--soft .base-badge__dot,
.base-badge--outline .base-badge__dot {
  background-color: rgb(var(--badge-color));
}

.base-badge--solid .base-badge__dot {
  background-color: #ffffff;
}

.base-badge :deep(.el-tag__close) {
  @apply -mr-0.5 ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full transition hover:bg-black/10;
  color: currentColor;
}

.base-badge--lg :deep(.el-tag__close) {
  @apply h-4 w-4;
}

.base-badge.is-disabled :deep(.el-tag__close) {
  @apply cursor-not-allowed opacity-50;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .base-badge,
  .base-badge :deep(.el-tag__close) {
    transition: none !important;
  }
}
</style>
