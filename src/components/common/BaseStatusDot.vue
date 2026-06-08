<script setup lang="ts">
import { computed } from "vue";

interface Props {
  type?: "primary" | "success" | "warning" | "danger" | "neutral";
  label?: string;
  description?: string;
  pulse?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  orientation?: "horizontal" | "vertical";
  disabled?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: "neutral",
  label: "",
  description: "",
  pulse: false,
  size: "md",
  orientation: "vertical",
  disabled: false,
  ariaLabel: "",
});

const accessibleLabel = computed(() => props.ariaLabel || props.label || props.description || "");
</script>

<template>
  <span
    class="base-status-dot"
    :class="[
      `base-status-dot--${type}`,
      `base-status-dot--${size}`,
      `base-status-dot--${orientation}`,
      {
        'is-disabled': disabled,
      },
    ]"
    :aria-label="accessibleLabel || undefined"
    :aria-hidden="accessibleLabel ? undefined : 'true'"
    :aria-disabled="disabled ? 'true' : undefined"
    :title="accessibleLabel || undefined"
  >
    <span class="base-status-dot__mark" :class="{ 'base-status-dot__mark--pulse': pulse }" aria-hidden="true"></span>
    <span v-if="label || description" class="base-status-dot__text">
      <span v-if="label" class="base-status-dot__label">{{ label }}</span>
      <span v-if="description" class="base-status-dot__description">{{ description }}</span>
    </span>
  </span>
</template>

<style scoped>
.base-status-dot {
  @apply inline-flex min-w-0 items-center gap-2 align-middle;
}

.base-status-dot--vertical {
  @apply items-center;
}

.base-status-dot--horizontal .base-status-dot__text {
  @apply flex min-w-0 items-center gap-1.5;
}

.base-status-dot.is-disabled {
  @apply opacity-60;
}

.base-status-dot__mark {
  @apply relative shrink-0 rounded-full;
  background-color: var(--status-dot-color);
}

.base-status-dot--xs .base-status-dot__mark {
  @apply h-1.5 w-1.5;
}

.base-status-dot--sm .base-status-dot__mark {
  @apply h-2 w-2;
}

.base-status-dot--md .base-status-dot__mark {
  @apply h-2.5 w-2.5;
}

.base-status-dot--lg .base-status-dot__mark {
  @apply h-3 w-3;
}

.base-status-dot__mark--pulse::after {
  @apply absolute inset-0 rounded-full opacity-40;
  animation: base-status-pulse 1.8s ease-out infinite;
  background-color: var(--status-dot-color);
  content: "";
}

.base-status-dot__text {
  @apply min-w-0;
}

.base-status-dot__label {
  @apply block truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-status-dot--xs .base-status-dot__label,
.base-status-dot--sm .base-status-dot__label {
  @apply text-[11px];
}

.base-status-dot--lg .base-status-dot__label {
  @apply text-sm;
}

.base-status-dot__description {
  @apply mt-0.5 block truncate text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

.base-status-dot--horizontal .base-status-dot__description {
  @apply mt-0;
}

.base-status-dot--lg .base-status-dot__description {
  @apply text-xs;
}

.base-status-dot--primary {
  --status-dot-color: rgb(var(--color-primary));
}

.base-status-dot--success {
  --status-dot-color: #10b981;
}

.base-status-dot--warning {
  --status-dot-color: #f59e0b;
}

.base-status-dot--danger {
  --status-dot-color: #ef4444;
}

.base-status-dot--neutral {
  --status-dot-color: #64748b;
}

@keyframes base-status-pulse {
  from {
    opacity: 0.45;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(2.6);
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-status-dot__mark--pulse::after {
    animation: none;
  }
}
</style>
