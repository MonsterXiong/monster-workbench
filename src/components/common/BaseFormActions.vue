<script setup lang="ts">
import { computed } from "vue";
import { createRandomId } from "../../utils";

interface Props {
  title?: string;
  description?: string;
  compact?: boolean;
  divided?: boolean;
  sticky?: boolean;
  align?: "start" | "center";
  justify?: "between" | "end" | "start";
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  description: "",
  compact: false,
  divided: true,
  sticky: false,
  align: "center",
  justify: "between",
});

const actionsId = createRandomId("");
const titleId = `base-form-actions-title-${actionsId}`;
const descriptionId = `base-form-actions-description-${actionsId}`;
const labelledBy = computed(() => (props.title ? titleId : undefined));
const describedBy = computed(() => (props.description ? descriptionId : undefined));
</script>

<template>
  <footer
    class="base-form-actions"
    :class="[
      `base-form-actions--align-${align}`,
      `base-form-actions--justify-${justify}`,
      {
        'base-form-actions--compact': compact,
        'base-form-actions--divided': divided,
        'base-form-actions--sticky': sticky,
      },
    ]"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
  >
    <div v-if="title || description || $slots.meta" class="base-form-actions__meta">
      <div class="base-form-actions__text">
        <strong v-if="title" :id="titleId">{{ title }}</strong>
        <p v-if="description" :id="descriptionId">{{ description }}</p>
      </div>
      <div v-if="$slots.meta" class="base-form-actions__extra">
        <slot name="meta"></slot>
      </div>
    </div>

    <div class="base-form-actions__buttons">
      <slot></slot>
    </div>
  </footer>
</template>

<style scoped>
.base-form-actions {
  @apply flex min-w-0 flex-wrap gap-3;
}

.base-form-actions--justify-between {
  @apply justify-between;
}

.base-form-actions--justify-end {
  @apply justify-end;
}

.base-form-actions--justify-start {
  @apply justify-start;
}

.base-form-actions--divided {
  @apply border-t border-slate-200 pt-3 dark:border-slate-800;
}

.base-form-actions--compact {
  @apply gap-2 pt-2.5;
}

.base-form-actions--sticky {
  @apply sticky bottom-0 z-10 bg-white/95 pb-1 backdrop-blur dark:bg-slate-900/95;
}

.base-form-actions--align-start {
  @apply items-start;
}

.base-form-actions--align-center {
  @apply items-center;
}

.base-form-actions__meta {
  @apply flex min-w-0 flex-1 flex-wrap items-center gap-2.5;
}

.base-form-actions__text {
  @apply min-w-0;
}

.base-form-actions__text strong {
  @apply block truncate text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-form-actions__text p {
  @apply mt-0.5 text-[11px] font-medium leading-5 text-slate-500 dark:text-slate-400;
}

.base-form-actions__extra {
  @apply flex min-w-0 flex-wrap items-center gap-2;
}

.base-form-actions__buttons {
  @apply flex min-w-0 flex-wrap items-center justify-end gap-2;
}
</style>
