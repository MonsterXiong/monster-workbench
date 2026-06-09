<script setup lang="ts">
import { computed } from "vue";
import { isActivationKey, preventDomEventDefault, stopDomEventPropagation } from "../../utils";

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

const isInteractive = computed(() => props.clickable && !props.disabled);
const accessibleLabel = computed(() => props.ariaLabel || props.title || "");

const handleClick = (event: MouseEvent | KeyboardEvent) => {
  if (!isInteractive.value) return;
  emit("click", event);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!isInteractive.value || !isActivationKey(event)) return;
  preventDomEventDefault(event);
  emit("click", event);
};

const handleClose = (event: MouseEvent) => {
  stopDomEventPropagation(event);
  if (props.disabled) return;
  emit("close", event);
};
</script>

<template>
  <span
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
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable && !disabled ? 0 : undefined"
    :aria-label="accessibleLabel || undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    :title="title || accessibleLabel || undefined"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <span v-if="dot" class="base-badge__dot" aria-hidden="true"></span>
    <slot></slot>
    <button
      v-if="closable"
      type="button"
      class="base-badge__close"
      :disabled="disabled"
      :aria-label="closeLabel || '移除标签'"
      :title="closeLabel || '移除标签'"
      @click="handleClose"
    >
      <BaseIcon name="X" size="10" aria-hidden="true" />
    </button>
  </span>
</template>

<style scoped>
.base-badge {
  @apply inline-flex w-fit shrink-0 items-center gap-1 rounded-full border font-black leading-none transition-colors;
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

.base-badge__close {
  @apply -mr-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50;
}

.base-badge--lg .base-badge__close {
  @apply h-4 w-4;
}

@media (prefers-reduced-motion: reduce) {
  .base-badge,
  .base-badge__close {
    transition: none !important;
  }
}
</style>
