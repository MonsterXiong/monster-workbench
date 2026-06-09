<script setup lang="ts">
import { createDomId } from "../../utils";

const tooltipId = createDomId("base-tooltip");

interface Props {
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
  disabled?: boolean;
  multiline?: boolean;
}

withDefaults(defineProps<Props>(), {
  placement: "top",
  disabled: false,
  multiline: false,
});
</script>

<template>
  <div
    class="base-tooltip"
    :class="{
      'base-tooltip--top': placement === 'top',
      'base-tooltip--bottom': placement === 'bottom',
      'base-tooltip--left': placement === 'left',
      'base-tooltip--right': placement === 'right',
      'base-tooltip--disabled': disabled,
      'base-tooltip--multiline': multiline,
    }"
    :data-tip="content"
    :aria-describedby="disabled ? undefined : tooltipId"
  >
    <slot></slot>
    <span v-if="!disabled" :id="tooltipId" class="sr-only" role="tooltip">{{ content }}</span>
  </div>
</template>

<style scoped>
.base-tooltip {
  @apply relative inline-flex;
}

.base-tooltip::before,
.base-tooltip::after {
  @apply pointer-events-none absolute z-50 opacity-0 transition duration-150;
  content: "";
}

.base-tooltip::before {
  content: attr(data-tip);
  @apply max-w-56 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg dark:bg-slate-100 dark:text-slate-900;
}

.base-tooltip::after {
  @apply h-2 w-2 rotate-45 bg-slate-900 dark:bg-slate-100;
}

.base-tooltip:hover::before,
.base-tooltip:hover::after,
.base-tooltip:focus-within::before,
.base-tooltip:focus-within::after {
  @apply opacity-100;
}

.base-tooltip--disabled::before,
.base-tooltip--disabled::after {
  @apply hidden;
}

.base-tooltip--multiline::before {
  @apply w-56 whitespace-normal leading-5;
}

.base-tooltip--top::before {
  @apply bottom-full left-1/2 mb-2 -translate-x-1/2;
}
.base-tooltip--top::after {
  @apply bottom-full left-1/2 mb-1 -translate-x-1/2;
}

.base-tooltip--bottom::before {
  @apply left-1/2 top-full mt-2 -translate-x-1/2;
}
.base-tooltip--bottom::after {
  @apply left-1/2 top-full mt-1 -translate-x-1/2;
}

.base-tooltip--left::before {
  @apply right-full top-1/2 mr-2 -translate-y-1/2;
}
.base-tooltip--left::after {
  @apply right-full top-1/2 mr-1 -translate-y-1/2;
}

.base-tooltip--right::before {
  @apply left-full top-1/2 ml-2 -translate-y-1/2;
}
.base-tooltip--right::after {
  @apply left-full top-1/2 ml-1 -translate-y-1/2;
}
</style>
