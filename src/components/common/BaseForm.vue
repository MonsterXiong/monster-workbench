<script setup lang="ts">
import { computed, useId } from "vue";

interface Props {
  title?: string;
  description?: string;
  columns?: 1 | 2 | 3;
  compact?: boolean;
  divided?: boolean;
  disabled?: boolean;
  loading?: boolean;
  noValidate?: boolean;
  autocomplete?: "on" | "off";
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  description: "",
  columns: 1,
  compact: false,
  divided: false,
  disabled: false,
  loading: false,
  noValidate: false,
  autocomplete: undefined,
  ariaLabel: "",
});

const formId = useId();
const titleId = `${formId}-title`;
const descriptionId = `${formId}-description`;
const isDisabled = computed(() => props.disabled || props.loading);
const describedBy = computed(() => (props.description ? descriptionId : undefined));

const emit = defineEmits<{
  (e: "submit", event: SubmitEvent): void;
  (e: "reset", event: Event): void;
}>();

const handleSubmit = (event: SubmitEvent) => {
  if (isDisabled.value) return;
  emit("submit", event);
};
</script>

<template>
  <form
    class="base-form"
    :class="[
      `base-form--cols-${columns}`,
      {
        'base-form--compact': compact,
        'base-form--divided': divided,
        'is-disabled': disabled,
        'is-loading': loading,
      },
    ]"
    :aria-label="ariaLabel || undefined"
    :aria-labelledby="title ? titleId : undefined"
    :aria-describedby="describedBy"
    :aria-busy="loading ? 'true' : undefined"
    :novalidate="noValidate"
    :autocomplete="autocomplete"
    @submit.prevent="handleSubmit"
    @reset="emit('reset', $event)"
  >
    <header v-if="title || description || $slots.actions" class="base-form__header">
      <div class="base-form__title-wrap">
        <div class="min-w-0">
          <h3 v-if="title" :id="titleId">{{ title }}</h3>
          <p v-if="description" :id="descriptionId">{{ description }}</p>
        </div>
      </div>
      <div v-if="$slots.actions" class="base-form__actions">
        <slot name="actions"></slot>
      </div>
    </header>

    <fieldset class="base-form__fieldset" :disabled="isDisabled">
      <div class="base-form__body">
        <slot></slot>
      </div>

      <footer v-if="$slots.footer" class="base-form__footer">
        <slot name="footer"></slot>
      </footer>
    </fieldset>
  </form>
</template>

<style scoped>
.base-form {
  @apply min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}

.base-form--compact {
  @apply rounded-xl p-3;
}

.base-form.is-disabled,
.base-form.is-loading {
  @apply opacity-75;
}

.base-form__header {
  @apply flex min-w-0 items-start justify-between gap-3;
}

.base-form--divided .base-form__header {
  @apply border-b border-slate-200 pb-3 dark:border-slate-800;
}

.base-form__title-wrap {
  @apply min-w-0;
}

.base-form h3 {
  @apply truncate text-sm font-black text-slate-900 dark:text-slate-100;
}

.base-form p {
  @apply mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400;
}

.base-form__actions {
  @apply flex shrink-0 items-center gap-2;
}

.base-form__fieldset {
  @apply min-w-0 border-0 p-0;
}

.base-form__fieldset:disabled {
  @apply cursor-not-allowed;
}

.base-form__body {
  @apply mt-4 grid min-w-0 gap-3;
}

.base-form--compact .base-form__body {
  @apply mt-3 gap-2.5;
}

.base-form--cols-1 .base-form__body {
  @apply grid-cols-1;
}

.base-form--cols-2 .base-form__body {
  @apply grid-cols-1 md:grid-cols-2;
}

.base-form--cols-3 .base-form__body {
  @apply grid-cols-1 md:grid-cols-2 xl:grid-cols-3;
}

.base-form__footer {
  @apply mt-4;
}

@media (prefers-reduced-motion: reduce) {
  .base-form {
    transition: none !important;
  }
}
</style>
