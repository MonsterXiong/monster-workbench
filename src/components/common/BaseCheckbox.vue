<script setup lang="ts">
import { computed, useId } from "vue";
import { Check, Minus } from "lucide-vue-next";

interface Props {
  modelValue: boolean;
  label?: string;
  description?: string;
  disabled?: boolean;
  readonly?: boolean;
  indeterminate?: boolean;
  compact?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: "",
  description: "",
  disabled: false,
  readonly: false,
  indeterminate: false,
  compact: false,
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "change", value: boolean): void;
  (e: "focus", value: FocusEvent): void;
  (e: "blur", value: FocusEvent): void;
  (e: "keydown", value: KeyboardEvent): void;
}>();

const checkboxId = useId();
const labelId = `${checkboxId}-label`;
const descriptionId = `${checkboxId}-description`;
const isReadonly = computed(() => props.disabled || props.readonly);
const resolvedAriaLabel = computed(() => props.ariaLabel || props.label || undefined);
const describedBy = computed(() => (props.description ? descriptionId : undefined));

const checked = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (isReadonly.value) return;
    emit("update:modelValue", value);
    emit("change", value);
  },
});

const toggle = () => {
  if (isReadonly.value) return;
  checked.value = !checked.value;
};

const handleKeydown = (event: KeyboardEvent) => {
  emit("keydown", event);
  if (event.key === "Enter") {
    event.preventDefault();
    toggle();
  }
};
</script>

<template>
  <label
    class="base-checkbox"
    :class="{
      'base-checkbox--checked': checked,
      'base-checkbox--disabled': disabled,
      'base-checkbox--readonly': readonly,
      'base-checkbox--indeterminate': indeterminate,
      'base-checkbox--compact': compact
    }"
  >
    <input
      v-model="checked"
      class="sr-only"
      type="checkbox"
      :disabled="disabled"
      :readonly="readonly"
      :aria-label="resolvedAriaLabel"
      :aria-labelledby="label ? labelId : undefined"
      :aria-describedby="describedBy"
      :aria-checked="indeterminate ? 'mixed' : checked"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
      @keydown="handleKeydown"
    />
    <span class="base-checkbox__box" aria-hidden="true">
      <Minus v-if="indeterminate" class="h-3.5 w-3.5" aria-hidden="true" />
      <Check v-else-if="checked" class="h-3.5 w-3.5" aria-hidden="true" />
    </span>
    <span v-if="label || description" class="base-checkbox__text">
      <span v-if="label" :id="labelId" class="base-checkbox__label">{{ label }}</span>
      <span v-if="description" :id="descriptionId" class="base-checkbox__description">{{ description }}</span>
    </span>
  </label>
</template>

<style scoped>
.base-checkbox {
  @apply flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-colors dark:border-slate-800 dark:bg-slate-900;
}

.base-checkbox:hover {
  @apply border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950;
}

.base-checkbox--checked,
.base-checkbox--indeterminate {
  border-color: rgba(var(--color-primary), 0.34);
  background-color: rgba(var(--color-primary), 0.06);
}

.base-checkbox--disabled {
  @apply cursor-not-allowed opacity-60;
}

.base-checkbox--readonly {
  @apply cursor-default bg-slate-50 dark:bg-slate-950;
}

.base-checkbox--compact {
  @apply gap-2 rounded-xl p-2;
}

.base-checkbox__box {
  @apply mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-white transition-colors dark:border-slate-700 dark:bg-slate-950;
}

.base-checkbox--checked .base-checkbox__box,
.base-checkbox--indeterminate .base-checkbox__box {
  border-color: rgb(var(--color-primary));
  background-color: rgb(var(--color-primary));
}

.base-checkbox__text {
  @apply min-w-0;
}

.base-checkbox__label {
  @apply block text-xs font-black text-slate-800 dark:text-slate-100;
}

.base-checkbox__description {
  @apply mt-0.5 block text-[10px] font-bold text-slate-400 dark:text-slate-500;
}

@media (prefers-reduced-motion: reduce) {
  .base-checkbox,
  .base-checkbox__box {
    transition: none !important;
  }
}
</style>
