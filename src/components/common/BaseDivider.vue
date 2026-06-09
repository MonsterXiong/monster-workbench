<script setup lang="ts">
import { computed, useSlots } from "vue";

type DividerDirection = "horizontal" | "vertical";
type DividerAlign = "start" | "center" | "end";
type DividerTone = "neutral" | "primary" | "success" | "warning" | "danger";
type DividerSpacing = "none" | "sm" | "md" | "lg";
type DividerThickness = "sm" | "md" | "lg";

interface Props {
  label?: string;
  direction?: DividerDirection;
  align?: DividerAlign;
  tone?: DividerTone;
  spacing?: DividerSpacing;
  thickness?: DividerThickness;
  icon?: string;
  dashed?: boolean;
  dotted?: boolean;
  compact?: boolean;
  decorative?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: "",
  direction: "horizontal",
  align: "center",
  tone: "neutral",
  spacing: "md",
  thickness: "sm",
  icon: "",
  dashed: false,
  dotted: false,
  compact: false,
  decorative: false,
  ariaLabel: "",
});

const slots = useSlots();
const hasLabel = computed(() => Boolean(props.label || slots.default));
const resolvedSpacing = computed(() => (props.compact ? "sm" : props.spacing));
const resolvedRole = computed(() => (props.decorative ? undefined : "separator"));
const resolvedAriaOrientation = computed(() => (props.decorative ? undefined : props.direction));
const resolvedAriaLabel = computed(() => {
  if (props.decorative) return undefined;
  return props.ariaLabel || props.label || undefined;
});
</script>

<template>
  <div
    class="base-divider"
    :class="[
      `base-divider--${direction}`,
      `base-divider--${align}`,
      `base-divider--${tone}`,
      `base-divider--spacing-${resolvedSpacing}`,
      `base-divider--thickness-${thickness}`,
      {
        'base-divider--dashed': dashed,
        'base-divider--dotted': dotted,
        'base-divider--compact': compact,
        'base-divider--with-label': hasLabel,
      },
    ]"
    :role="resolvedRole"
    :aria-orientation="resolvedAriaOrientation"
    :aria-label="resolvedAriaLabel"
    :aria-hidden="decorative ? 'true' : undefined"
  >
    <span v-if="hasLabel" class="base-divider__label">
      <BaseIcon v-if="icon" :name="icon" size="12" aria-hidden="true" />
      <slot>{{ label }}</slot>
    </span>
  </div>
</template>

<style scoped>
.base-divider {
  --divider-color: rgb(226 232 240);
  --divider-label-color: rgb(148 163 184);
  border-color: var(--divider-color);
  color: var(--divider-label-color);
}

.base-divider--horizontal {
  @apply flex w-full items-center border-t;
}

.base-divider--horizontal.base-divider--spacing-none {
  @apply my-0;
}

.base-divider--horizontal.base-divider--spacing-sm {
  @apply my-2;
}

.base-divider--horizontal.base-divider--spacing-md {
  @apply my-4;
}

.base-divider--horizontal.base-divider--spacing-lg {
  @apply my-6;
}

.base-divider--vertical {
  @apply h-full min-h-6 border-l self-stretch;
}

.base-divider--vertical.base-divider--spacing-none {
  @apply mx-0;
}

.base-divider--vertical.base-divider--spacing-sm {
  @apply mx-1.5;
}

.base-divider--vertical.base-divider--spacing-md {
  @apply mx-3;
}

.base-divider--vertical.base-divider--spacing-lg {
  @apply mx-5;
}

.base-divider--horizontal.base-divider--thickness-md {
  @apply border-t-2;
}

.base-divider--horizontal.base-divider--thickness-lg {
  border-top-width: 3px;
}

.base-divider--vertical.base-divider--thickness-md {
  @apply border-l-2;
}

.base-divider--vertical.base-divider--thickness-lg {
  border-left-width: 3px;
}

.base-divider--dashed {
  @apply border-dashed;
}

.base-divider--dotted {
  @apply border-dotted;
}

.base-divider--horizontal.base-divider--with-label {
  @apply border-t-0;
}

.base-divider--horizontal.base-divider--with-label::before,
.base-divider--horizontal.base-divider--with-label::after {
  content: "";
  @apply h-px min-w-3 flex-1 border-t border-inherit;
}

.base-divider--horizontal.base-divider--thickness-md.base-divider--with-label::before,
.base-divider--horizontal.base-divider--thickness-md.base-divider--with-label::after {
  @apply border-t-2;
}

.base-divider--horizontal.base-divider--thickness-lg.base-divider--with-label::before,
.base-divider--horizontal.base-divider--thickness-lg.base-divider--with-label::after {
  border-top-width: 3px;
}

.base-divider--horizontal.base-divider--dashed.base-divider--with-label::before,
.base-divider--horizontal.base-divider--dashed.base-divider--with-label::after {
  @apply border-dashed;
}

.base-divider--horizontal.base-divider--dotted.base-divider--with-label::before,
.base-divider--horizontal.base-divider--dotted.base-divider--with-label::after {
  @apply border-dotted;
}

.base-divider--start::before,
.base-divider--end::after {
  @apply max-w-8;
}

.base-divider__label {
  @apply inline-flex min-w-0 max-w-[70%] shrink items-center gap-1.5 truncate px-3 text-[10px] font-black uppercase tracking-wide;
  color: var(--divider-label-color);
}

.base-divider--spacing-none .base-divider__label,
.base-divider--spacing-sm .base-divider__label {
  @apply px-2;
}

.base-divider--vertical .base-divider__label {
  @apply hidden;
}

.base-divider--primary {
  --divider-color: rgb(var(--color-primary) / 0.42);
  --divider-label-color: rgb(var(--color-primary));
}

.base-divider--success {
  --divider-color: rgb(16 185 129 / 0.48);
  --divider-label-color: rgb(5 150 105);
}

.base-divider--warning {
  --divider-color: rgb(245 158 11 / 0.52);
  --divider-label-color: rgb(180 83 9);
}

.base-divider--danger {
  --divider-color: rgb(239 68 68 / 0.46);
  --divider-label-color: rgb(220 38 38);
}

:global(.dark) .base-divider {
  --divider-color: rgb(30 41 59);
  --divider-label-color: rgb(100 116 139);
}

:global(.dark) .base-divider--primary {
  --divider-color: rgb(var(--color-primary) / 0.5);
  --divider-label-color: rgb(147 197 253);
}

:global(.dark) .base-divider--success {
  --divider-color: rgb(16 185 129 / 0.45);
  --divider-label-color: rgb(110 231 183);
}

:global(.dark) .base-divider--warning {
  --divider-color: rgb(245 158 11 / 0.46);
  --divider-label-color: rgb(252 211 77);
}

:global(.dark) .base-divider--danger {
  --divider-color: rgb(239 68 68 / 0.48);
  --divider-label-color: rgb(252 165 165);
}
</style>
