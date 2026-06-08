<script setup lang="ts">
interface Props {
  label?: string;
  direction?: "horizontal" | "vertical";
  align?: "start" | "center" | "end";
  dashed?: boolean;
  compact?: boolean;
}

withDefaults(defineProps<Props>(), {
  label: "",
  direction: "horizontal",
  align: "center",
  dashed: false,
  compact: false,
});
</script>

<template>
  <div
    class="base-divider"
    :class="[
      `base-divider--${direction}`,
      `base-divider--${align}`,
      {
        'base-divider--dashed': dashed,
        'base-divider--compact': compact,
        'base-divider--with-label': label,
      },
    ]"
    role="separator"
    :aria-orientation="direction"
    :aria-label="label || undefined"
  >
    <span v-if="label" class="base-divider__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.base-divider {
  @apply border-slate-200 dark:border-slate-800;
}

.base-divider--horizontal {
  @apply my-4 flex w-full items-center border-t;
}

.base-divider--horizontal.base-divider--compact {
  @apply my-2;
}

.base-divider--vertical {
  @apply mx-3 h-full min-h-6 border-l;
}

.base-divider--vertical.base-divider--compact {
  @apply mx-1.5;
}

.base-divider--dashed {
  @apply border-dashed;
}

.base-divider--with-label {
  @apply border-t-0;
}

.base-divider--with-label::before,
.base-divider--with-label::after {
  content: "";
  @apply h-px min-w-4 flex-1 border-t border-inherit;
}

.base-divider--dashed.base-divider--with-label::before,
.base-divider--dashed.base-divider--with-label::after {
  @apply border-dashed;
}

.base-divider--start::before,
.base-divider--end::after {
  @apply max-w-8;
}

.base-divider__label {
  @apply shrink-0 px-3 text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500;
}

.base-divider--vertical .base-divider__label {
  @apply hidden;
}
</style>
